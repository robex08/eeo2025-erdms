import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faChartPie,
  faFilter,
  faGripVertical,
  faLayerGroup,
  faMoneyBillWave,
  faMinus,
  faPlus,
  faReceipt,
  faRefresh,
  faSearch,
  faTable,
  faTriangleExclamation,
  faXmark,
  faFileContract,
  faCoins,
  faPaperclip,
  faClipboardList,
  faGraduationCap,
  faDownload,
  faPercent,
  faChevronRight,
  faFile,
  faFileInvoice,
  faEye,
  faCheck,
  faExpand,
  faCompress,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFileImage,
  faFileArchive,
  faFileAlt,
  faExternalLinkAlt,
  faBolt,
  faBoltLightning,
  faCheckCircle,
  faLock,
  faInfoCircle,
  faSpinner,
  faPen,
  faHourglassHalf
} from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { ToastContext } from '../context/ToastContext';
import { SmartTooltip } from '../styles/SmartTooltip';
import { 
  listAttachmentsV2, 
  listInvoiceAttachmentsV2,
  getOrderAttachmentsStatsV2,
  getInvoiceAttachmentsStatsV2,
  getOrderAttachmentsByTypeV2,
  getInvoiceAttachmentsByTypeV2,
  getOrdersWithoutAttachmentsV2,
  getInvoicesWithoutAttachmentsV2,
  downloadOrderAttachment,
  downloadInvoiceAttachment,
  listAllOrderAttachments,
  uploadOrderAttachment,
  getOrderV2
} from '../services/apiOrderV2';
import AttachmentViewer from '../components/invoices/AttachmentViewer';
import DatePicker from '../components/DatePicker';
import ConfirmDialog from '../components/ConfirmDialog';
import FinancialControlConfirmationModal from '../components/FinancialControlConfirmationModal';
import FinancialControlPDF from '../components/FinancialControlPDF';
import { pdf } from '@react-pdf/renderer';
import { getOrganizaceDetail } from '../services/apiv2Dictionaries';
import { getUserDetail } from '../services/apiEntityDetail';
import { getFakturaLPCerpani, saveFakturaLPCerpani } from '../services/apiFakturyLPCerpani';
import { listOrdersV3, fetchOrderTimelineV3 } from '../services/apiOrdersV3';
import { getOrderAttachmentsV3 } from '../services/apiOrderV3';
import { listInvoices25 } from '../services/api25invoices';
import { getSmlouvyList } from '../services/apiSmlouvy';
import { getAllAnnualFeeAttachments, downloadAnnualFeeAttachmentBlob } from '../services/apiAnnualFees';
import { fetchCiselniky, fetchUseky, fetchLimitovanePrisliby } from '../services/api2auth';
import { LPCerpaniEditor } from '../components/invoices';
import { getStrediska25, completeOrder25 } from '../services/api25orders';
import FkInlineCell from '../components/FkInlineCell';
import { getCashbookOverview, getCashbookOverviewEntries } from '../services/apiCashbookOverview';
import { fetchDohadnePolozky } from '../services/api25reports';
import { exportToExcel } from '../utils/excelExport';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

const PAGE_TABS = [
  { id: 'control', label: 'Finanční kontrola', icon: faTriangleExclamation },
  { id: 'vzdel', label: 'Vzdělávání', icon: faGraduationCap },
  { id: 'spend', label: 'Čerpání', icon: faMoneyBillWave },
  { id: 'reports', label: 'Reporty', icon: faReceipt },
  { id: 'stats', label: 'Statistiky', icon: faChartLine },
  { id: 'attachments', label: 'Přílohy', icon: faPaperclip },
  { id: 'pivot', label: 'Agregační tabulka - vlastní', icon: faTable },
  { id: 'cashbook', label: 'Přehled pokladen', icon: faCoins },
  { id: 'dohadne', label: 'Dohadné položky', icon: faHourglassHalf }
];

const TAB_TONES = {
  control: { base: '#b91c1c', soft: '#fee2e2' },
  vzdel:   { base: '#059669', soft: '#d1fae5' },
  spend: { base: '#0f766e', soft: '#ccfbf1' },
  stats: { base: '#1d4ed8', soft: '#dbeafe' },
  reports: { base: '#b45309', soft: '#fef3c7' },
  attachments: { base: '#7c3aed', soft: '#ede9fe' },
  pivot: { base: '#0891b2', soft: '#cffafe' },
  cashbook: { base: '#1e40af', soft: '#dbeafe' },
  dohadne: { base: '#c2410c', soft: '#ffedd5' }
};

// ─── Vzdělávání: klíčová slova pro filtrování dle Druhu objednávky ──────────
// TODO: doplnit/upřesnit přesné kódy dle číselníku DRUH_OBJEDNAVKY
const VZDEL_LEKARSKY_KW  = ['vzdělávání'];
const VZDEL_NELEKARSKY_KW = ['školení', 'nelékař', 'nelekar'];
const matchDruhKw = (label, kws) => kws.some(kw => label.toLowerCase().includes(kw));

const SECTION_BLOCKS = {
  control: [
    { key: 'ordersOverLimit', label: 'Faktury vyšší než schválená objednávka' },
    { key: 'ordersAfterInvoice', label: 'Objednávka vytvořená po doručení faktury' },
    { key: 'ordersInvoicesWithoutAttachments', label: 'Objednávky s fakturami bez příloh' },
    { key: 'invoicesWithoutAttachments', label: 'Faktury bez přílohy' },
    { key: 'overdueInvoices', label: 'Faktury po splatnosti 14+ dní' },
    { key: 'cancelledOrders', label: 'Zrušené a zamítnuté objednávky' }
  ],
  spend: [
    { key: 'spendByFinancingUsek', label: 'Čerpání s rozpadem po úsecích' },
    { key: 'spendByUsekFinancing', label: 'Čerpání: Úsek → Financování' },
    { key: 'spendByDruhFinancing', label: 'Čerpání: Druh → Financování' },
    { key: 'spendByFinancingUsekDruh', label: 'Čerpání: Financování → Úsek → Druh' },
    { key: 'spendByLpKod', label: 'Čerpání LP: podle LP kódu' },
    { key: 'spendBySmlouvy', label: 'Čerpání ze Smluv' }
  ],
  reports: [
    { key: 'topSuppliers', label: 'Dodavatelé → Financování → Objednávky' },
    { key: 'ordersWithoutInvoice', label: 'Objednávky bez faktury 2+ měsíce (schváleno+)' },
    { key: 'ordersWithInvoiceNotDone', label: 'Objednávky s fakturou, nedokončené' },
    { key: 'ordersWithMissingLpCerpani', label: 'Objednávky financované z LP s fakturou bez rozkladu na LP' }
  ],
  stats: [
    { key: 'chartTimeline', label: 'Vývoj částek objednávek (timeline)' },
    { key: 'chartFinancing', label: 'Financování – počet a částka' },
    { key: 'chartUsek', label: 'Úseky – počet a částka' },
    { key: 'chartDruh', label: 'Druhy objednávek – počet a částka' },
    { key: 'chartLpKod', label: 'LP kódy – počet a částka' },
    { key: 'chartTopSuppliers', label: 'Top dodavatelé (částka)' },
    { key: 'chartTopBuyers', label: 'Top objednatelé (počet a částka)' },
    { key: 'chartDonutFinancing', label: 'Koláčový: členění dle financování' },
    { key: 'chartDonutStav', label: 'Koláčový: členění dle stavu objednávek' }
  ],
  attachments: [
    { key: 'orderAttachmentsByType', label: 'Přílohy objednávek podle typu' },
    { key: 'invoiceAttachmentsByType', label: 'Přílohy faktur podle typu' },
    { key: 'invoiceAttachmentsList', label: 'Přehled všech příloh' },
    { key: 'ordersWithoutAttachments', label: 'Objednávky bez příloh' },
    { key: 'invoicesWithoutAttachments', label: 'Faktury bez příloh' }
  ],
  pivot: [
    { key: 'pivotTable', label: 'Agregační tabulka' }
  ],
  vzdel: [
    { key: 'vzdelLekarsky',   label: 'Vzdělávání – kurzy zdravotnické a lékařské' },
    { key: 'vzdelNelekarsky', label: 'Školení – nelékařské' },
    { key: 'vzdelByUsek',     label: 'Přehled dle střediska / úseku' }
  ],
  cashbook: [
    { key: 'cashbookOverview', label: 'Přehled pokladen' },
    { key: 'cashbookCharts', label: 'Grafy' }
  ],
  dohadne: [
    { key: 'dohadneLpUctu', label: 'Dohadné položky — Limitované přísliby - dle LP účtu' },
    { key: 'dohadneLp', label: 'Dohadné položky — Limitované přísliby - dle LP kódu' },
    { key: 'dohadneSmlouvy', label: 'Dohadné položky — Smlouvy' }
  ]
};

// ─── Číselník typů příloh → lidsky čitelný popis ───────────────────────────
const ATTACHMENT_TYPE_LABELS = {
  OBJEDNAVKA:            'Objednávka',
  POTVRZENA_OBJEDNAVKA:  'Potvrzená objednávka',
  KOSILKA:               'Košilka',
  CESTOVNI_PRIKAZ:       'Cestovní příkaz',
  FAKTURA:               'Faktura',
  FAKTURA_OBJEDNAVKA:    'Faktura k objednávce',
  CENOVA_NABIDKA:        'Cenová nabídka',
  DOKLAD:                'Doklad',
  ROCNI_POPLATEK:        'Roční poplatek',
  DODACI_LIST:           'Dodací list',
  PODKLADY:              'Podklady',
  KOMUNIKACE_DODAVATEL:  'Komunikace s dodavatelem',
  CERTIFIKAT:            'Certifikát',
  TECHNICKA_DOKUMENTACE: 'Technická dokumentace',
  JINE:                  'Jiné',
  KOMUNIKACE:            'Komunikace',
  OBJ:                   'Objednávka',
  FA:                    'Faktura',
};
const prettyAttachType = (code) => {
  if (!code) return code;
  if (ATTACHMENT_TYPE_LABELS[code]) return ATTACHMENT_TYPE_LABELS[code];
  // fallback: split podtržítka → Title Case
  return code.split('_').filter(Boolean)
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
};

// ─── Kategorie typů příloh pro accordion blok ────────────────────────────────
const ATTACHMENT_ORDER_CATEGORIES = [
  {
    key: 'objednavka',
    label: 'Objednávka',
    color: '#1e40af',
    bg: '#dbeafe',
    types: ['OBJEDNAVKA', 'POTVRZENA_OBJEDNAVKA', 'KOSILKA', 'CESTOVNI_PRIKAZ']
  },
  {
    key: 'faktura',
    label: 'Faktura & Finance',
    color: '#b45309',
    bg: '#fef3c7',
    types: ['FAKTURA_OBJEDNAVKA', 'CENOVA_NABIDKA', 'DOKLAD', 'ROCNI_POPLATEK']
  },
  {
    key: 'ostatni',
    label: 'Ostatní',
    color: '#475569',
    bg: '#f1f5f9',
    types: [] // catch-all – vše, co nepatří výše
  }
];

const ATTACHMENT_INVOICE_CATEGORIES = [
  {
    key: 'faktura',
    label: 'Faktura',
    color: '#b45309',
    bg: '#fef3c7',
    types: ['FAKTURA', 'DODACI_LIST']
  },
  {
    key: 'ostatni',
    label: 'Ostatní',
    color: '#475569',
    bg: '#f1f5f9',
    types: [] // catch-all
  }
];

/** Přiřadí typy příloh do kategorií, catch-all jde do poslední */
const groupAttachmentTypesByCategory = (stats, categories) => {
  const typesArr = (stats && stats.types) || [];
  const knownTypes = new Set(categories.flatMap(c => c.types));
  return categories.map(cat => {
    const catTypes = cat.types.length > 0
      ? typesArr.filter(item => cat.types.includes(item.type))
      : typesArr.filter(item => !knownTypes.has(item.type));
    return { ...cat, items: catTypes, total: catTypes.reduce((s, i) => s + i.count, 0) };
  }).filter(cat => cat.items.length > 0);
};

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

const LOCAL_STORAGE_PREFIX = 'stats_reports';
const MAX_ORDERS_BATCH = 1000;
const MAX_INVOICE_PAGE = 500;
const MAX_PAGES = 20;
const TABLE_PAGE_SIZES = [5, 10, 25, 50, 100, 200, 250, 500];
const DEFAULT_TABLE_PAGE_SIZE = 25;
const CHART_COLORS = ['#1d4ed8', '#7c3aed', '#06b6d4', '#f97316', '#f43f5e', '#10b981', '#0ea5e9', '#f59e0b'];

const PageWrapper = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(1200px 700px at 10% -20%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(900px 600px at 90% -10%, rgba(34, 211, 238, 0.22), transparent 55%),
    linear-gradient(160deg, #f8fafc 0%, #eef2ff 45%, #f1f5f9 100%);
  color: #0f172a;
  padding: 2.5rem 1.5rem 3.5rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  opacity: ${props => props.$isInitialized ? 1 : 0};
  transition: opacity 0.4s ease-in-out;
`;

// 🎬 Loading Gate Overlay
const LoadingGate = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 250, 252, 0.97);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.5s ease-in-out;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const LoadingGateSpinner = styled.div`
  width: 64px;
  height: 64px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: gatespin 1s linear infinite;
  margin-bottom: 1.5rem;
  transform: scale(${props => props.$visible ? 1 : 0.8});
  transition: transform 0.5s ease-in-out;

  @keyframes gatespin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingGateMessage = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
  margin-bottom: 0.5rem;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.1s, opacity 0.5s ease-in-out 0.1s;
`;

const LoadingGateSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.15s, opacity 0.5s ease-in-out 0.15s;
`;

const PageContainer = styled.div`
  max-width: 100%;
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1rem;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const HeaderTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  order: 2;
  text-align: right;
  align-items: flex-end;
  
  @media (max-width: 768px) {
    order: 1;
    width: 100%;
    text-align: left;
    align-items: flex-start;
  }
`;

const Title = styled.h1`
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const BetaTag = styled.span`
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

const Subtitle = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  order: 1;
  
  @media (max-width: 768px) {
    order: 2;
    width: 100%;
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 0.9rem;
    animation: ${props => props.$loading ? 'spin 1s linear infinite' : 'none'};
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
`;

const SummaryCard = styled.div`
  background: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  padding: 1.2rem 1.4rem;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const SummaryLabel = styled.div`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
  margin-bottom: 0.35rem;
`;

const SummaryValue = styled.div`
  font-size: 1.7rem;
  font-weight: 700;
  color: #0f172a;
`;

const SummaryMeta = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.35rem;
`;

const TabsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  position: sticky;
  top: -1em;
  z-index: 50;
  background: #f1f5f9;
  padding: 0.75rem 1.5rem 1rem;
  margin-left: -1.5rem;
  margin-right: -1.5rem;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.10);
`;

const Tabs = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  border: none;
  padding: 0.7rem 1.2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  background: ${props => props.$active ? (props.$tone?.base || '#111827') : (props.$tone?.soft || 'rgba(255,255,255,0.9)')};
  color: ${props => props.$active ? '#fff' : (props.$tone?.base || '#1f2937')};
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid ${props => props.$active ? 'transparent' : (props.$tone?.base || 'rgba(148, 163, 184, 0.35)')};

  &:hover {
    background: ${props => props.$active ? (props.$tone?.base || '#111827') : (props.$tone?.soft || 'rgba(255,255,255,0.95)')};
    border-color: ${props => props.$tone?.base || 'rgba(148, 163, 184, 0.5)'};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: rgba(255, 255, 255, 0.96);
  border-radius: 16px;
  padding: 1.5rem 1.4rem 3rem;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
  position: sticky;
  top: 4.5rem;
  margin-bottom: 3rem;
`;
const PivotPanel = styled.div`
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 0.9fr);
  gap: 1.25rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const PivotZonesStack = styled.div`
  display: grid;
  gap: 1rem;
`;

const PivotZone = styled.div`
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PivotZoneTitle = styled.div`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
`;

const PivotZoneBody = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const PivotHint = styled.div`
  color: #64748b;
  font-size: 0.85rem;
`;

const PivotChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: ${props => props.$tone?.bg || '#eef2f7'};
  color: ${props => props.$tone?.text || '#334155'};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
`;

const PivotChipButton = styled.button`
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
`;

const PivotChipIndex = styled.sup`
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  margin-left: 0.25rem;
  line-height: 1;
`;

const PivotOptionsPanel = styled.div`
  display: grid;
  gap: 1rem;
`;

const PivotOptionsGroup = styled.div`
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
`;

const PivotOptionsTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PivotChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const PivotTreeToggle = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  color: #2563eb;
  padding: 0;
  display: inline-flex;
  align-items: center;
`;

const PanelTitle = styled.div`
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FieldLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  font-size: 0.9rem;
  outline: none;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  font-size: 0.9rem;
  outline: none;
  background: #fff;
`;

const FilterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  & > * { width: 100%; box-sizing: border-box; }
`;

const FilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const FilterApplyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  background: ${props => props.$dirty ? '#16a34a' : '#15803d'};
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #15803d; }
  &:disabled { opacity: 0.6; cursor: default; }
`;

const FilterResetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #e2e8f0; color: #334155; }
  &:disabled { opacity: 0.5; cursor: default; }
`;

const FilterDirtyBadge = styled.div`
  font-size: 0.72rem;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 5px;
  padding: 0.2rem 0.5rem;
  margin-top: 0.6rem;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
`;

const SectionCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 1.2rem 1.4rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.div`
  font-weight: 700;
  font-size: 1rem;
`;

const SectionBadge = styled.span`
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: ${props => props.$tone === 'danger' ? '#fee2e2' : props.$tone === 'warn' ? '#fef3c7' : '#e0f2fe'};
  color: ${props => props.$tone === 'danger' ? '#b91c1c' : props.$tone === 'warn' ? '#b45309' : '#0369a1'};
  font-size: 0.75rem;
  font-weight: 700;
`;

const SearchBox = styled.div`
  margin-bottom: 1rem;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInputIcon = styled.div`
  position: absolute;
  left: 0.875rem;
  color: #94a3b8;
  font-size: 0.875rem;
  pointer-events: none;
  display: flex;
  align-items: center;
  z-index: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.65rem 2.75rem 0.65rem 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.875rem;
  z-index: 1;
  transition: all 0.15s ease;

  &:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
  }
`;

const HighlightedText = styled.mark`
  background: #fef08a;
  color: #854d0e;
  padding: 0.1rem 0.2rem;
  border-radius: 3px;
  font-weight: 600;
`;

const PivotHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const BlockSelect = styled.div`
  position: relative;
`;

const BlockSelectButton = styled.button`
  border: 1px solid ${props => props.$tone?.base || '#cbd5e1'};
  background: ${props => props.$tone?.soft || '#ffffff'};
  color: ${props => props.$tone?.base || '#1f2937'};
  border-radius: 10px;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
`;

const ExcelExportButton = styled.button`
  border: 1px solid #10b981;
  background: #10b981;
  color: #ffffff;
  border-radius: 10px;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  margin-right: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: #059669;
    border-color: #059669;
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const TabsBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`;


const BlockMenu = styled.div`
  position: absolute;
  right: 0;
  margin-top: 0.4rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
  min-width: 260px;
  z-index: 20;
`;

const BlockItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.4rem;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    background: #f8fafc;
  }
`;

const BlockCheckbox = styled.input`
  width: 16px;
  height: 16px;
`;

const TableWrapperInner = styled.div`
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;

  /* Custom scrollbar */
  &::-webkit-scrollbar { height: 8px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; min-width: 40px; }
  &::-webkit-scrollbar-thumb:hover { background: #64748b; }
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

const TableWrapperOuter = styled.div`
  position: relative;
`;

const ScrollFade = styled.div`
  position: absolute;
  top: 0;
  bottom: 8px;
  width: 36px;
  pointer-events: none;
  z-index: 5;
  transition: opacity 0.35s ease;
  opacity: ${props => props.$visible ? 1 : 0};
  display: flex;
  align-items: center;
  justify-content: center;
  ${props => props.$side === 'left' ? `
    left: 0;
    background: linear-gradient(to left, transparent, rgba(241,245,249,0.85) 70%, #f1f5f9);
  ` : `
    right: 0;
    background: linear-gradient(to right, transparent, rgba(241,245,249,0.85) 70%, #f1f5f9);
  `}
`;

const ScrollChevron = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(51,65,85,0.12);
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  ${props => props.$side === 'left' ? `
    animation: pulseLeft 1.8s ease-in-out infinite;
    @keyframes pulseLeft {
      0%, 100% { transform: translateX(0); opacity: 0.7; }
      50% { transform: translateX(-3px); opacity: 1; }
    }
  ` : `
    animation: pulseRight 1.8s ease-in-out infinite;
    @keyframes pulseRight {
      0%, 100% { transform: translateX(0); opacity: 0.7; }
      50% { transform: translateX(3px); opacity: 1; }
    }
  `}
`;

/* eslint-disable react/display-name */
const TableWrapper = React.memo(({ children, style, className }) => {
  const scrollRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf;
    const check = () => {
      raf = requestAnimationFrame(() => {
        const hasOverflow = el.scrollWidth > el.clientWidth + 4;
        const atStart = el.scrollLeft <= 4;
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
        setCanScrollLeft(hasOverflow && !atStart);
        setCanScrollRight(hasOverflow && !atEnd);
      });
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <TableWrapperOuter className={className}>
      <TableWrapperInner ref={scrollRef} style={style}>{children}</TableWrapperInner>
      <ScrollFade $side="left" $visible={canScrollLeft}><ScrollChevron $side="left">‹</ScrollChevron></ScrollFade>
      <ScrollFade $side="right" $visible={canScrollRight}><ScrollChevron $side="right">›</ScrollChevron></ScrollFade>
    </TableWrapperOuter>
  );
});
/* eslint-enable react/display-name */

const Table = styled.table`
  min-width: 100%;
  width: max-content;
  table-layout: auto;
  border-collapse: collapse;
  font-size: 0.88rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;

  a, button {
    font: inherit;
    letter-spacing: inherit;
  }

  /* Sticky první sloupec */
  thead th:first-child,
  tbody td:first-child {
    position: sticky;
    left: 0;
    z-index: 10;
  }
  thead th:first-child {
    z-index: 11;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.15);
  }
  /* Ostatní buňky mají nižší z-index */
  tbody td:not(:first-child) {
    z-index: 1;
  }
  /* Globální tbody td:first-child pravidla ODSTRANĚNA - řeší se v TbodyGroup */
`;

const Tr = styled.tr`
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;

  ${props => props.$inactive ? `
    color: #94a3b8;
    text-decoration: line-through;
  ` : ''}

  &:nth-of-type(even) {
    background-color: #f8fafc;
  }

  &:hover {
    background-color: #e2e8f0 !important;
  }

  /* ✅ FIX: Sticky první sloupec musí mít stejné pozadí jako zbytek řádku */
  & td:first-child {
    background: #fff !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.12);
  }

  &:nth-of-type(even) td:first-child {
    background: #f8fafc !important;
  }

  &:hover td:first-child {
    background: #e2e8f0 !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.15);
  }
`;

/* Vzdělávání – tbody per objednávka: zebra + group hover */
const TbodyGroup = styled.tbody`
  /* Oddělení mezi objednávkami (tbody skupinami) - VÝRAZNÉ */
  border-bottom: 3px solid #cbd5e1;
  
  & tr {
    border-bottom: 1px solid #e2e8f0;
    transition: background-color 0.15s ease;
  }
  
  /* ✅ LICHÉ tbody skupiny (liché objednávky) - bílá barva pro VŠECHNY řádky */
  &:nth-of-type(odd) tr {
    background-color: #fff;
  }
  &:nth-of-type(odd) tr td:first-child { 
    background: #fff !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.12);
  }
  
  /* ✅ SUDÉ tbody skupiny (sudé objednávky) - světle šedá pro VŠECHNY řádky */
  &:nth-of-type(even) tr {
    background-color: #f8fafc;
  }
  &:nth-of-type(even) tr td:first-child { 
    background: #f8fafc !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.12);
  }
  
  /* Hover přes celou skupinu */
  &:hover tr {
    background-color: #e8f0fe !important;
  }
  &:hover tr td:first-child { 
    background: #e8f0fe !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.15);
  }
  
  /* Čárkovaná čára mezi fakturami v rámci jedné objednávky */
  & tr:not(:first-child) {
    border-top: 1px dashed #c7d2fe;
  }
`;

// Zvýrazněná skupina řádků pro objednávky se zálohovou + vyúčtovací fakturou
const TbodyGroupHighlighted = styled(TbodyGroup)`
  /* Zelený border na levé straně první buňky */
  & tr:first-child td:first-child {
    border-left: 4px solid #16a34a;
    padding-left: 0.6rem;
  }
  
  /* ✅ LICHÉ zvýrazněné skupiny - světle zelené pro VŠECHNY řádky */
  &:nth-of-type(odd) tr {
    background-color: #f0fdf4;
  }
  &:nth-of-type(odd) tr td:first-child { 
    background: #f0fdf4 !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.12);
  }
  
  /* ✅ SUDÉ zvýrazněné skupiny - světle zelené (stejná barva) */
  &:nth-of-type(even) tr {
    background-color: #f0fdf4;
  }
  &:nth-of-type(even) tr td:first-child { 
    background: #f0fdf4 !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.12);
  }
  
  /* Hover - tmavší zelená */
  &:hover tr {
    background-color: #dcfce7 !important;
  }
  &:hover tr td:first-child { 
    background: #dcfce7 !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.15);
  }
`;

// Oranžová skupina řádků pro objednávky blízko dokončení (chybí jen certifikát)
const TbodyGroupOrange = styled(TbodyGroup)`
  /* Oranžový border na levé straně první buňky */
  & tr:first-child td:first-child {
    border-left: 4px solid #f59e0b;
    padding-left: 0.6rem;
  }
  
  /* 🟠 LICHÉ oranžové skupiny - světle oranžové pro VŠECHNY řádky */
  &:nth-of-type(odd) tr {
    background-color: #fff7ed;
  }
  &:nth-of-type(odd) tr td:first-child { 
    background: #fff7ed !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.12);
  }
  
  /* 🟠 SUDÉ oranžové skupiny - světle oranžové (stejná barva) */
  &:nth-of-type(even) tr {
    background-color: #fff7ed;
  }
  &:nth-of-type(even) tr td:first-child { 
    background: #fff7ed !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.12);
  }
  
  /* Hover - tmavší oranžová */
  &:hover tr {
    background-color: #fed7aa !important;
  }
  &:hover tr td:first-child { 
    background: #fed7aa !important;
    box-shadow: 3px 0 10px rgba(0, 0, 0, 0.15);
  }
`;

const Th = styled.th`
  text-align: left;
  padding: 0.5rem 0.35rem;
  color: #334155;
  font-weight: 600;
  border-bottom: 2px solid #cbd5e1;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  font-size: 0.8rem;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  position: sticky;
  top: 0;
`;

const ThWrap = styled(Th)`
  white-space: normal;
  line-height: 1.1;
`;

const Td = styled.td`
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
`;

const SubjectTd = styled(Td)`
  white-space: normal;
  word-break: break-word;
  padding-right: 1em;
  min-width: 180px;
  max-width: 300px;
`;

// Úzký sloupec pro Druh objednávky
const ThNarrow = styled(Th)`
  max-width: 140px;
  min-width: 80px;
  white-space: normal;
  line-height: 1.1;
`;
const ThNarrowSort = styled(ThNarrow)`
  cursor: pointer;
  user-select: none;
  &:hover { background-color: #e2e8f0; }
`;
const TdNarrow = styled(Td)`
  white-space: nowrap;
  font-size: 0.78rem;
  line-height: 1.2;
`;

const ThR = styled(Th)`text-align: right;`;
const ThC = styled(Th)`text-align: center;`;

// Klikatelné Th pro třídění – styl kompatibilní s OrdersTableV3
const ThSort = styled(Th)`
  cursor: pointer;
  user-select: none;
  &:hover { background-color: #e2e8f0; }
`;
const ThRSort = styled(ThR)`
  cursor: pointer;
  user-select: none;
  &:hover { background-color: #e2e8f0; }
`;

// Tlačítko hromadného rozbalení/sbalení skupin v záhlaví bloku
const ExpandAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1.5px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  background: #f8fafc;
  color: #475569;
  white-space: nowrap;
  transition: background 0.15s;
  &:hover { background: #e2e8f0; color: #1e293b; }
`;

const TdR = styled(Td)`text-align: right; white-space: nowrap;`;
const TdC = styled(Td)`text-align: center; white-space: nowrap;`;

const NameStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  line-height: 1.1;
`;

const NameLine = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.35rem;
  white-space: nowrap;
`;

const NameDate = styled.span`
  color: #64748b;
  font-size: 0.78rem;
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
`;

const NoteInput = styled.input`
  width: 140px;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.82rem;
`;

const Toggle = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #6366f1;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  padding-bottom: 3rem;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem 1.2rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
  position: relative;
  overflow: hidden;
  min-width: 0;
`;

const ChartCardWide = styled(ChartCard)`
  grid-column: span 2;
  @media (max-width: 900px) {
    grid-column: span 1;
  }
`;

const ChartWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 420px;
`;

const ChartToggleBtn = styled.button`
  position: absolute;
  top: 0.6rem;
  right: 2.2rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  line-height: 1;
  z-index: 2;
  &:hover { color: #1d4ed8; background: #eff6ff; }
`;

const ChartExpandBtn = styled.button`
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  line-height: 1;
  z-index: 2;
  &:hover { color: #1d4ed8; background: #eff6ff; }
`;

const ChartLegendScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem 0.75rem;
  align-content: start;
  padding-right: 0.25rem;
  
  /* Custom scrollbar - decentní styl */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
    
    &:hover {
      background: #94a3b8;
    }
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
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

const EmptyState = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: #94a3b8;
`;

const LpEditBox = styled.div`
  background: #fff;
  border-radius: 14px;
  padding: 1.5rem 1.5rem;
  width: min(720px, 96vw);
  min-width: 0;
  max-height: 92vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
`;

const LpEditHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.75rem;
`;

const LpEditTitle = styled.div`
  font-weight: 700;
  font-size: 1rem;
  color: #1e293b;
`;

const LpEditClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.3rem;
  color: #94a3b8;
  line-height: 1;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  &:hover { background: #f1f5f9; color: #1e293b; }
`;

const LpEditFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
`;

const LpEditBtn = styled.button`
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const LpEditIconBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  margin-left: 0.4rem;
  border-radius: 5px;
  color: #64748b;
  font-size: 0.78rem;
  vertical-align: middle;
  transition: background 0.15s, color 0.15s;
  &:hover { background: #e0f2fe; color: #0369a1; }
`;

const SearchEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 1rem;
  color: #94a3b8;
  
  svg {
    font-size: 3rem;
    opacity: 0.3;
  }
  
  p {
    font-size: 0.95rem;
    margin: 0;
  }
`;

const TabEmptyStateWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  gap: 1.5rem;
  color: #94a3b8;
`;

const TabEmptyStateText = styled.div`
  text-align: center;
  h3 { font-size: 1.15rem; font-weight: 600; color: #64748b; margin: 0 0 0.4rem; }
  p  { font-size: 0.9rem; color: #94a3b8; margin: 0; }
`;

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

const Pill = styled.span`
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: ${props => props.$tone === 'success' ? '#dcfce7' : props.$tone === 'danger' ? '#fee2e2' : '#e2e8f0'};
  color: ${props => props.$tone === 'success' ? '#15803d' : props.$tone === 'danger' ? '#b91c1c' : '#475569'};
  font-weight: 600;
  font-size: 0.75rem;
`;

// ===== SMLOUVY ČERPÁNÍ – jezevčík progress bar =====
const SmlouvyJezWrap = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
`;
const SmlouvyJezHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3px;
  padding: 0 1px;
`;
const SmlouvyJezBarOuter = styled.div`
  position: relative;
  height: 20px;
  width: 100%;
  background: #f1f5f9;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.5);
  &:hover .sm-month-num {
    color: rgba(148, 163, 184, 0.7) !important;
  }
`;
const SmlouvyJezBarFill = styled.div`
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  z-index: 10;
  transition: width 0.6s ease;
  background: ${props => props.$color || '#10b981'};
  width: ${props => Math.min(props.$percent || 0, 100)}%;
`;
const SmlouvyJezBarPlanned = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 5;
  opacity: 0.42;
  background-color: ${props => props.$color || '#86efac'};
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.3) 25%, transparent 25%,
    transparent 50%, rgba(255,255,255,0.3) 50%,
    rgba(255,255,255,0.3) 75%, transparent 75%, transparent
  );
  background-size: 8px 8px;
  left: ${props => props.$left || 0}%;
  width: ${props => {
    const maxW = 100 - (props.$left || 0);
    return Math.min(props.$percent || 0, maxW);
  }}%;
`;
const SmlouvyJezTargetLine = styled.div`
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: rgba(100, 116, 139, 0.55);
  z-index: 30;
  left: ${props => props.$percent || 0}%;
`;
const SmlouvyJezLegend = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding: 0 1px;
`;
const SmlouvyJezStatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  border-radius: 7px;
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border: 1px solid;
  ${props => {
    if (props.$level === 'critical') return `background:#fef2f2;color:#dc2626;border-color:#fecaca;`;
    if (props.$level === 'warning') return `background:#fff7ed;color:#ea580c;border-color:#fed7aa;`;
    return `background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;`;
  }}
`;
const SmlouvySummaryRow = styled.div`
  display: grid;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 1rem;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 2px solid #cbd5e1;
  border-radius: 0 0 12px 12px;
  margin-top: 0.3rem;
`;

const fmtCurrency = (value) => {
  const num = Number(value || 0);
  return `${num.toLocaleString('cs-CZ')} Kč`;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateOnly = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDateCz = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString('cs-CZ').replace(/ /g, '') : '-';
};

const daysBetween = (fromDate, toDateValue) => {
  if (!fromDate || !toDateValue) return null;
  const diff = toDateValue.getTime() - fromDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const parseFinancing = (financovani) => {
  if (!financovani) return null;
  if (typeof financovani === 'string') {
    try {
      return JSON.parse(financovani);
    } catch (e) {
      return { nazev: financovani };
    }
  }
  return financovani;
};

const getOrderAmount = (order) => {
  const invoiceTotal = parseFloat(order?.faktury_celkova_castka_s_dph || 0);
  if (!Number.isNaN(invoiceTotal) && invoiceTotal > 0) return invoiceTotal;

  const itemsTotal = parseFloat(
    order?.cena_s_dph || order?.polozky_celkova_cena_s_dph || order?.polozky_cena_s_dph || 0
  );
  if (!Number.isNaN(itemsTotal) && itemsTotal > 0) return itemsTotal;

  if (Array.isArray(order?.polozky) && order.polozky.length > 0) {
    return order.polozky.reduce((sum, item) => {
      const price = parseFloat(item?.cena_s_dph || 0);
      return sum + (Number.isNaN(price) ? 0 : price);
    }, 0);
  }

  const limit = parseFloat(order?.max_cena_s_dph || order?.max_cena || 0);
  return Number.isNaN(limit) ? 0 : limit;
};

const getOrderPlannedAmount = (order) => {
  const itemsTotal = parseFloat(
    order?.cena_s_dph || order?.polozky_celkova_cena_s_dph || order?.polozky_cena_s_dph || 0
  );
  if (!Number.isNaN(itemsTotal) && itemsTotal > 0) return itemsTotal;

  if (Array.isArray(order?.polozky) && order.polozky.length > 0) {
    return order.polozky.reduce((sum, item) => {
      const price = parseFloat(item?.cena_s_dph || 0);
      return sum + (Number.isNaN(price) ? 0 : price);
    }, 0);
  }

  return 0;
};

const getOrderInvoicedAmount = (order, invoicesForOrder = []) => {
  const invoiceTotal = parseFloat(order?.faktury_celkova_castka_s_dph || 0);
  if (!Number.isNaN(invoiceTotal) && invoiceTotal > 0) return invoiceTotal;
  if (Array.isArray(invoicesForOrder) && invoicesForOrder.length > 0) {
    return invoicesForOrder.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
  }
  return 0;
};

const getOrderLimit = (order) => {
  const limit = parseFloat(order?.max_cena_s_dph || order?.max_cena || 0);
  return Number.isNaN(limit) ? 0 : limit;
};

const getOrderDate = (order) => {
  return order?.datum_vytvoreni || order?.dt_vytvoreni || order?.dt_objednavky || order?.datum_objednavky || null;
};

const getOrderApprovalDate = (order) => {
  return order?.dt_schvaleni
    || order?.datum_schvaleni
    || order?.datum_schvaleno
    || order?.dt_schvaleno
    || order?.schvaleni_datum
    || order?.schvaleno_datum
    || order?.datum_schvaleni_objednavky
    || null;
};

const getOrderSubject = (order) => order?.predmet || order?.predmet_objednavky || order?.nazev || '';

// Pomocná funkce - sestavi celé jméno z oddělených polí – pořadí: Příjmení Jméno
const buildFullName = (jmeno, prijmeni) => {
  const j = (jmeno || '').trim();
  const p = (prijmeni || '').trim();
  if (j && p) return `${p} ${j}`;
  return p || j || '';
};

const getOrdererName = (order) => {
  if (order?.objednatel_uzivatel?.cele_jmeno) return order.objednatel_uzivatel.cele_jmeno;
  if (order?.objednatel?.cele_jmeno) return order.objednatel.cele_jmeno;
  const fromFields = buildFullName(order?.objednatel_jmeno, order?.objednatel_prijmeni);
  return fromFields || order?.objednatel || '';
};

const getGarantName = (order) => {
  if (order?.garant_uzivatel?.cele_jmeno) return order.garant_uzivatel.cele_jmeno;
  if (order?.garant?.cele_jmeno) return order.garant.cele_jmeno;
  const fromFields = buildFullName(order?.garant_jmeno, order?.garant_prijmeni);
  return fromFields || order?.garant || '';
};

const getPrikazceName = (order) => {
  if (order?.prikazce_uzivatel?.cele_jmeno) return order.prikazce_uzivatel.cele_jmeno;
  if (order?.prikazce?.cele_jmeno) return order.prikazce.cele_jmeno;
  const fromFields = buildFullName(order?.prikazce_jmeno, order?.prikazce_prijmeni);
  return fromFields || order?.prikazce || '';
};

const getSchvalovatelName = (order) => {
  if (order?.schvalovatel_uzivatel?.cele_jmeno) return order.schvalovatel_uzivatel.cele_jmeno;
  if (order?.schvalovatel?.cele_jmeno) return order.schvalovatel.cele_jmeno;
  const fromFields = buildFullName(order?.schvalovatel_jmeno, order?.schvalovatel_prijmeni);
  return fromFields || order?.schvalovatel || '';
};

const getApproverName = (order) => {
  if (order?.prikazce_uzivatel?.cele_jmeno) return order.prikazce_uzivatel.cele_jmeno;
  if (order?.schvalovatel_uzivatel?.cele_jmeno) return order.schvalovatel_uzivatel.cele_jmeno;
  const fromPrikazce = buildFullName(order?.prikazce_jmeno, order?.prikazce_prijmeni);
  if (fromPrikazce) return fromPrikazce;
  const fromSchval = buildFullName(order?.schvalovatel_jmeno, order?.schvalovatel_prijmeni);
  return fromSchval || order?.schvalovatel || order?.prikazce || '';
};

const shortenPersonName = (value) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  const commaParts = raw.split(',').map(part => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const last = commaParts[0].replace(/[.]/g, '');
    const first = commaParts[1].split(/\s+/)[0]?.replace(/[.]/g, '') || '';
    if (!first || !last) return raw;
    return `${last} ${first.charAt(0)}.`;
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  const titlePrefixes = ['Ing.', 'Mgr.', 'Bc.', 'MUDr.', 'JUDr.', 'PhDr.', 'RNDr.', 'PharmDr.', 'Ing.arch.', 'Doc.', 'Prof.'];
  while (parts.length > 2 && titlePrefixes.includes(parts[0])) {
    parts.shift();
  }
  if (parts.length === 1) return parts[0];
  const last = parts[0].replace(/[.,]/g, '');
  const first = parts[1].replace(/[.,]/g, '');
  if (!first || !last) return raw;
  return `${last} ${first.charAt(0)}.`;
};

const renderNameLine = (name) => (
  <NameLine>
    <span>{shortenPersonName(name) || '-'}</span>
  </NameLine>
);

const renderDateLine = (dateValue, showEmptyDate = false) => (
  <NameLine>
    {(showEmptyDate || dateValue) ? (
      <NameDate>{dateValue ? formatDateCz(dateValue) : '-'}</NameDate>
    ) : null}
  </NameLine>
);

const renderOrdererStack = (order) => (
  <NameStack>
    {renderNameLine(getOrdererName(order))}
    {renderDateLine(getOrderDate(order), true)}
  </NameStack>
);

const renderPrikazceStack = (order) => (
  <NameStack>
    {renderNameLine(getPrikazceName(order))}
  </NameStack>
);

const renderApproverStack = (order, getOrderStatusCodeFn, getInvoiceApprovalDateFn) => {
  const approvalDate = getOrderApprovalDate(order) || (getInvoiceApprovalDateFn ? getInvoiceApprovalDateFn(order) : null);
  const status = getOrderStatusCodeFn ? getOrderStatusCodeFn(order) : '';
  const isApproved = Boolean(approvalDate) || status.includes('SCHVAL');
  if (!isApproved) {
    return (
      <NameStack>
        {renderNameLine(getPrikazceName(order))}
      </NameStack>
    );
  }
  return (
    <NameStack>
      {renderNameLine(getSchvalovatelName(order))}
      {renderDateLine(approvalDate, true)}
    </NameStack>
  );
};

const getUsekLabel = (order) => {
  const direct = order?.usek_zkr || order?.usek?.usek_zkr || order?.usek_nazev;
  if (direct) return String(direct);
  // Fallback: z objednatele nebo z čísla objednávky (2025/ZMZ/001 → ZMZ)
  const fromObjednatel = order?.objednatel_usek_zkr || order?.objednatel?.usek_zkr || order?.objednatel_uzivatel?.usek_zkr || order?.usek_objednatele;
  if (fromObjednatel) return String(fromObjednatel);
  const evNum = order?.ev_cislo || order?.cislo_objednavky || '';
  return parseUsekFromOrderNumber(evNum);
};

const parseUsekFromOrderNumber = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/20\d{2}\s*\/\s*([^\/\s]+)/i);
  return match ? match[1].trim() : '';
};

const getSupplierName = (order) => order?.dodavatel_nazev || order?.dodavatel || order?.dodavatel_jmeno || '';

const getInvoiceAmount = (invoice) => {
  const value = parseFloat(invoice?.castka || invoice?.fa_castka || 0);
  return Number.isNaN(value) ? 0 : value;
};

const normalizeInvoice = (invoice) => ({
  id: invoice.id,
  objednavka_id: invoice.objednavka_id,
  smlouva_id: invoice.smlouva_id,
  cislo_smlouvy: invoice.cislo_smlouvy || invoice.smlouva_cislo || '',
  cislo_objednavky: invoice.cislo_objednavky || '',
  cislo_faktury: invoice.fa_cislo_vema || invoice.cislo_faktury || '',
  fa_vema_kod: invoice.fa_vema_kod || null,  // ✅ PŘIDÁNO: FA VEMA kód
  castka: parseFloat(invoice.fa_castka || invoice.castka || 0) || 0,
  datum_vystaveni: invoice.fa_datum_vystaveni || invoice.datum_vystaveni,
  datum_splatnosti: invoice.fa_datum_splatnosti || invoice.datum_splatnosti,
  datum_doruceni: invoice.fa_datum_doruceni || invoice.datum_doruceni,
  stav: invoice.stav || invoice.fa_stav || 'ZAEVIDOVANA',
  zaplacena: invoice.fa_zaplacena === 1 || invoice.fa_zaplacena === true || invoice.zaplacena === true,
  ma_prilohy: invoice.ma_prilohy || false,
  pocet_priloh: invoice.pocet_priloh || 0,
  prilohy: Array.isArray(invoice.prilohy) ? invoice.prilohy : [],
  fa_typ: invoice.fa_typ || invoice.typ || 'BEZNA',
  fa_typ_nazev: invoice.fa_typ_nazev || null,
  usek_zkr: invoice.objednavka_usek_zkr || invoice.usek_zkr || '',
  vytvoril_uzivatel_zkracene: invoice.vytvoril_uzivatel_zkracene || invoice.vytvoril_uzivatel || null,
  dt_vytvoreni: invoice.dt_vytvoreni || null,
  fa_predana_zam_jmeno_cele: invoice.fa_predana_zam_jmeno_cele || null,
  fa_datum_predani_zam: invoice.fa_datum_predani_zam || null,
  fa_poznamka: invoice.fa_poznamka || null,
  potvrdil_vecnou_spravnost_zkracene: invoice.potvrdil_vecnou_spravnost_zkracene || null,
  potvrdil_vecnou_spravnost_id: invoice.potvrdil_vecnou_spravnost_id || null,
  dt_potvrzeni_vecne_spravnosti: invoice.dt_potvrzeni_vecne_spravnosti || null,
  vecna_spravnost_poznamka: invoice.vecna_spravnost_poznamka || null,
  lp_cerpani_count: parseInt(invoice.lp_cerpani_count || 0, 10),
});

const getContractLimit = (contract) => {
  const limit = parseFloat(contract?.limit_celkem || contract?.limit || contract?.limit_celkovy || 0);
  return Number.isNaN(limit) ? 0 : limit;
};

const getContractSpent = (contract) => {
  const spent = parseFloat(contract?.cerpano_celkem || contract?.cerpano || contract?.celkem_cerpano || 0);
  return Number.isNaN(spent) ? 0 : spent;
};

const getContractUsek = (contract) => contract?.usek_zkr || contract?.usek_nazev || '';

const getContractNumber = (contract) => {
  return contract?.cislo_smlouvy || contract?.smlouva_cislo || contract?.cislo || '';
};

const getAttachmentType = (attachment) =>
  attachment?.typ_prilohy || attachment?.type || attachment?.typ || attachment?.nazev_typu || attachment?.typ_nazev || 'Neurčeno';

const parseOrdersResponse = (response) => {
  const base = response?.data ?? response ?? {};
  const payload = base?.data ?? base ?? {};
  const orders = Array.isArray(payload.orders)
    ? payload.orders
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(base.orders)
        ? base.orders
        : Array.isArray(response?.orders)
          ? response.orders
          : [];
  const pagination = payload?.pagination || base?.pagination || response?.pagination || null;
  const status = base?.status || response?.status || null;
  const message = base?.message || response?.message || null;
  return { orders, pagination, status, message };
};

/* ─── Vlastní MultiSelect filtr (V3 styl) ───────────────────────── */
function FilterMultiSelect({ options, values, onChange, placeholder, disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const valueSet = useMemo(() => new Set(values.map(v => String(v))), [values]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const s = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return options.filter(o =>
      (o.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(s)
    );
  }, [options, search]);

  const toggle = (val) => {
    const str = String(val);
    onChange(valueSet.has(str) ? values.filter(v => v !== str) : [...values, str]);
  };

  const isActive = values.length > 0;
  const triggerLabel = !isActive
    ? placeholder
    : values.length === options.length
      ? 'Vše'
      : `Vybráno: ${values.length}`;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {/* Trigger tlačítko */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        title={disabled ? 'Filtr úseků je nastaven dle vašeho oprávnění' : undefined}
        style={{
          width: '100%', padding: '0.5rem 2rem 0.5rem 0.75rem',
          border: isActive ? '2px solid #f59e0b' : '1px solid #e5e7eb',
          borderRadius: '6px', fontSize: '0.875rem',
          background: disabled ? '#f3f4f6' : (isActive ? '#fffbeb' : '#ffffff'),
          cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'relative',
          color: disabled ? '#6b7280' : (!isActive ? '#9ca3af' : '#1f2937'),
          fontWeight: isActive ? '600' : '400',
          boxShadow: isActive ? '0 0 0 2px rgba(245,158,11,0.2)' : 'none',
          minHeight: '38px', userSelect: 'none', boxSizing: 'border-box',
          opacity: disabled ? 0.7 : 1
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{triggerLabel}</span>
        <svg
          style={{ position: 'absolute', right: '0.5rem', width: '16px', height: '16px', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '2px solid #3b82f6', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 9999, display: 'flex', flexDirection: 'column', maxHeight: '360px' }}>
          {/* Vyhledávací pole */}
          <div style={{ padding: '0.6rem', borderBottom: '2px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.75rem', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Hledat..."
                onClick={e => e.stopPropagation()}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={e => { e.target.style.borderColor = '#d1d5db'; }}
                style={{ width: '100%', padding: '0.45rem 2rem 0.45rem 2rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
              {search && (
                <button onClick={e => { e.stopPropagation(); setSearch(''); }} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: '0.8rem' }} />
                </button>
              )}
            </div>
          </div>
          {/* Seznam options */}
          <div style={{ overflowY: 'auto', maxHeight: '280px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Žádné výsledky</div>
            ) : filtered.map((opt, idx) => {
              const checked = valueSet.has(String(opt.value));
              return (
                <div
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', background: checked ? '#eff6ff' : 'transparent', borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = checked ? '#eff6ff' : 'transparent'; }}
                >
                  <input type="checkbox" checked={checked} onChange={() => {}} style={{ width: '15px', height: '15px', accentColor: '#3b82f6', pointerEvents: 'none', flexShrink: 0, cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.875rem', color: checked ? '#1e3a8a' : '#374151', fontWeight: checked ? '600' : '400', userSelect: 'none' }}>{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zvolené tagy */}
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {values.map(v => {
            const opt = options.find(o => String(o.value) === v);
            return opt ? (
              <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: disabled ? '#e5e7eb' : '#dbeafe', color: disabled ? '#6b7280' : '#1d4ed8', borderRadius: '3px', padding: disabled ? '0.15rem 0.65rem' : '0.15rem 0.5rem 0.15rem 0.65rem', fontSize: '0.74rem', fontWeight: '600' }}>
                {opt.label}
                {!disabled && <button type="button" onClick={() => toggle(v)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '0.85rem', fontWeight: '700' }}>×</button>}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Attachment popup styled-components (stejný design jako InvoiceAttachmentsTooltip) ───
const AttachPopupContainer = styled.div`
  position: fixed;
  z-index: 10000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  min-width: 280px;
  max-width: min(400px, calc(100vw - 40px));
  overflow: hidden;
  font-family: 'Roboto Condensed','Roboto',-apple-system,BlinkMacSystemFont,sans-serif;
  animation: apFadeIn 0.15s ease-out;
  @keyframes apFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
`;
const AttachPopupHeader = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
  letter-spacing: 0.01em;
  border-radius: 8px 8px 0 0;
`;
const AttachPopupList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem 0;
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
`;
const AttachPopupItem = styled.div`
  padding: 0.75rem 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: default;
  transition: background-color 0.15s;
  &:hover { background: #f8fafc; }
  &:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
`;
const AttachPopupFileIconBox = styled.div`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: ${props => props.$bg || 'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)'};
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  svg { color: ${props => props.$ic || '#64748b'}; font-size: 1.25rem; }
`;
const AttachPopupFileInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;
const AttachPopupFileName = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.01em;
`;
const AttachPopupFileMeta = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;
const AttachPopupExtBadge = styled.span`
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.$bg || 'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)'};
  color: ${props => props.$cl || '#64748b'};
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
`;
const AttachPopupClassificationTag = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  margin-top: 0.25rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
  letter-spacing: 0.02em;
  align-self: flex-start;
`;
const AttachPopupOpenBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: #ffffff;
  color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  svg { font-size: 0.9rem; }
  &:hover { background: #eff6ff; color: #1d4ed8; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;
// ─── Attachment popup helpers ───
const ATTACH_FILE_ICONS = {
  pdf:  { icon: faFilePdf,     color: '#dc2626', bg: 'linear-gradient(135deg,#fee2e2 0%,#fecaca 100%)' },
  doc:  { icon: faFileWord,    color: '#1d4ed8', bg: 'linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)' },
  docx: { icon: faFileWord,    color: '#1d4ed8', bg: 'linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)' },
  xls:  { icon: faFileExcel,   color: '#047857', bg: 'linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)' },
  xlsx: { icon: faFileExcel,   color: '#047857', bg: 'linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)' },
  png:  { icon: faFileImage,   color: '#7e22ce', bg: 'linear-gradient(135deg,#f3e8ff 0%,#e9d5ff 100%)' },
  jpg:  { icon: faFileImage,   color: '#7e22ce', bg: 'linear-gradient(135deg,#f3e8ff 0%,#e9d5ff 100%)' },
  jpeg: { icon: faFileImage,   color: '#7e22ce', bg: 'linear-gradient(135deg,#f3e8ff 0%,#e9d5ff 100%)' },
  gif:  { icon: faFileImage,   color: '#7e22ce', bg: 'linear-gradient(135deg,#f3e8ff 0%,#e9d5ff 100%)' },
  zip:  { icon: faFileArchive, color: '#c2410c', bg: 'linear-gradient(135deg,#ffedd5 0%,#fed7aa 100%)' },
  rar:  { icon: faFileArchive, color: '#c2410c', bg: 'linear-gradient(135deg,#ffedd5 0%,#fed7aa 100%)' },
  txt:  { icon: faFileAlt,     color: '#374151', bg: 'linear-gradient(135deg,#f9fafb 0%,#f3f4f6 100%)' },
};
const getAttachFileInfo = (name) => {
  const ext = (name || '').split('.').pop().toLowerCase();
  return ATTACH_FILE_ICONS[ext] || { icon: faFile, color: '#64748b', bg: 'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)' };
};
const getAttachExt = (name) => ((name || '').split('.').pop().toUpperCase()) || 'FILE';
const fmtAttachSize = (b) => {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
};
const getAttachUser = (a) => {
  if (a.nahral_jmeno && a.nahral_prijmeni) return `${a.nahral_jmeno} ${a.nahral_prijmeni}`.trim();
  if (a.nahrano_jmeno && a.nahrano_prijmeni) return `${a.nahrano_jmeno} ${a.nahrano_prijmeni}`.trim();
  if (a.nahrano_uzivatel) {
    if (typeof a.nahrano_uzivatel === 'object') {
      const u = a.nahrano_uzivatel;
      if (u.jmeno || u.prijmeni) return `${u.jmeno || ''} ${u.prijmeni || ''}`.trim();
      return null;
    }
    return a.nahrano_uzivatel;
  }
  return null;
};

const getFinancingIcon = (label) => {
  if (!label) return faMoneyBillWave;
  const l = label.toLowerCase();
  if (l.includes('příslib') || l.includes('lp')) return faCoins;
  if (l.includes('smlouv')) return faFileContract;
  if (l.includes('schválení') || l.includes('individuál')) return faCheck;
  if (l.includes('pojist')) return faPaperclip;
  return faMoneyBillWave;
};

export default function StatsReportsPage() {
  const { token, username, user, user_id, fullName, userDetail, userPermissions, hasPermission, hasAdminRole } = useContext(AuthContext);
  const progress = useContext(ProgressContext);
  const { showToast } = useContext(ToastContext) || {};
  const navigate = useNavigate();
  const userKey = user_id || user?.id || username || 'guest';

  // Viditelné taby dle oprávnění uživatele – admin vidí vše
  const isAdminUser = typeof hasAdminRole === 'function' && hasAdminRole();

  // Uživatelův úsek
  const userUsekId = user?.usek_id
    || userDetail?.usek_id
    || userDetail?.usek?.id
    || userDetail?.usek?.usek_id
    || userDetail?.usek_id_detail
    || userDetail?.usek
    || null;

  const hasBasePermission = useCallback((code) => {
    if (!code) return false;
    const norm = code.toString().trim().toUpperCase();
    return Array.isArray(userPermissions) && userPermissions.some(p => String(p).toUpperCase() === norm);
  }, [userPermissions]);

  // Může uživatel měnit filtr úseků? (jen admin nebo globální read-all z BASE práv)
  const canChangeUsekFilter = useMemo(() => {
    if (isAdminUser) return true;
    if (!hasBasePermission) return false;
    return hasBasePermission('ORDER_READ_ALL') || hasBasePermission('ORDER_VIEW_ALL') ||
      hasBasePermission('SPENDING_VIEW_ALL');
  }, [isAdminUser, hasBasePermission]);
  const visibleTabs = useMemo(() => {
    if (isAdminUser) return PAGE_TABS;
    if (typeof hasPermission !== 'function') return [];
    return PAGE_TABS.filter(tab => {
      switch (tab.id) {
        case 'control':
          return hasPermission('FIN_CONTROL_VIEW') || hasPermission('FIN_CONTROL_EDIT') || hasPermission('FIN_CONTROL_MANAGE');
        case 'vzdel':
          return hasPermission('EDUCATION_VIEW') || hasPermission('EDUCATION_EDIT') || hasPermission('EDUCATION_MANAGE') || hasPermission('EDUCATION_VIEW_ALL');
        case 'spend':
          return hasPermission('SPENDING_VIEW_ALL') || hasPermission('SPENDING_VIEW_OWN') || hasPermission('SPENDING_MANAGE');
        case 'reports':
          return hasPermission('REPORT_VIEW') || hasPermission('REPORT_EDIT') || hasPermission('REPORT_MANAGE');
        case 'stats':
          return hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_EDIT') || hasPermission('STATISTICS_MANAGE');
        case 'attachments':
          return hasPermission('ATTACHMENTS_VIEW') || hasPermission('ATTACHMENTS_MANAGE');
        case 'pivot':
          return hasPermission('PIVOT_VIEW') || hasPermission('PIVOT_EDIT') || hasPermission('PIVOT_MANAGE');
        case 'cashbook':
          return hasPermission('CASHBOOK_REPORTS_VIEW') || hasPermission('CASHBOOK_REPORTS_MANAGE') || hasPermission('CASHBOOK_REPORTS_EXPORT');
        case 'dohadne':
          return hasPermission('DEFERRALS_VIEW') || hasPermission('DEFERRALS_EDIT') || hasPermission('DEFERRALS_MANAGE');
        default:
          return false;
      }
    });
  }, [isAdminUser, hasPermission]);

  const activeTabLsKey = `${LOCAL_STORAGE_PREFIX}_active_tab_${userKey}`;
  const filterLsKey = `${LOCAL_STORAGE_PREFIX}_filters_${userKey}`;
  // Lazy init — načte tab přímo z LS při prvním renderu (synchronně), takže F5 nevyžaduje async useEffect
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const key = user_id || user?.id || username || 'guest';
      if (!key || key === 'guest') return 'control';
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_active_tab_${key}`);
      if (saved && PAGE_TABS.some(t => t.id === saved)) return saved;
    } catch (e) {}
    return 'control';
  });

  // Pokud aktuálně aktivní tab není ve visibleTabs (nemá oprávnění), přepni na první dostupný
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);
  // Ref pro detekci prvního načtení per-user dat (fallback pro async auth)
  const lsLoadedForKey = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState(null);
  const lastViewerCloseAtRef = useRef(0);
  const attachCacheRef = useRef({});
  const [badgeColors, setBadgeColors] = useState({}); // Ukládání barev ikon
  const [attachPopup, setAttachPopup] = useState(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  // --- Dokončení objednávky ---
  const [completionTarget, setCompletionTarget] = useState(null);
  const [showCompletionModeDialog, setShowCompletionModeDialog] = useState(false);
  const [showFinancialPreviewModal, setShowFinancialPreviewModal] = useState(false);
  const [completionInProgress, setCompletionInProgress] = useState(false);
  // Vzdělávání – zobrazit i dokončené objednávky
  const [showVzdelDokoncene, setShowVzdelDokoncene] = useState(false);
  const [showFkIgnorovano, setShowFkIgnorovano] = useState(false);
  const [showFkVyreseno,   setShowFkVyreseno]   = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  useEffect(() => {
    if (!fullscreenChart) return;
    const onKey = (e) => { if (e.key === 'Escape') setFullscreenChart(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreenChart]);
  const [orders, setOrders] = useState([]);
  const [ordersVzdel, setOrdersVzdel] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [lpEditModal, setLpEditModal] = useState(null); // { invoice, order, lpCerpani, availableLPCodes, loading, saving }
  const [contracts, setContracts] = useState([]);
  const [orderAttachments, setOrderAttachments] = useState([]); // 🆕 OBJ přílohy (všechny najednou)
  const [annualFeeAttachments, setAnnualFeeAttachments] = useState([]);
  const [timelineData, setTimelineData] = useState(null);
  
  // 🚀 PER-TAB LOADING TRACKING - které taby mají načtená data
  const [loadedTabs, setLoadedTabs] = useState(() => new Set());
  const [loadingTabs, setLoadingTabs] = useState(() => new Set());
  const [failedTabs, setFailedTabs] = useState(() => new Set());
  
  // ⚡ REFS pro aktuální hodnoty - řeší stale closure problém
  const loadedTabsRef = useRef(loadedTabs);
  const loadingTabsRef = useRef(loadingTabs);
  const failedTabsRef = useRef(failedTabs);
  useEffect(() => { loadedTabsRef.current = loadedTabs; }, [loadedTabs]);
  useEffect(() => { loadingTabsRef.current = loadingTabs; }, [loadingTabs]);
  useEffect(() => { failedTabsRef.current = failedTabs; }, [failedTabs]);
  
  const [timelineCumulative, setTimelineCumulative] = useState(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_timeline_cumulative`);
      return saved === null ? false : saved === 'true';
    } catch (_) { return false; }
  });
  const [attachmentsStats, setAttachmentsStats] = useState(null);
  // Attachments tab state
  const [orderAttachmentsStats, setOrderAttachmentsStats] = useState(null);
  const [invoiceAttachmentsStats, setInvoiceAttachmentsStats] = useState(null);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [expandedAttachmentType, setExpandedAttachmentType] = useState({ orders: null, invoices: null });
  const [attachmentsByType, setAttachmentsByType] = useState({ orders: null, invoices: null });
  const [attachmentsByTypePage, setAttachmentsByTypePage] = useState({ orders: 1, invoices: 1 });
  const [ordersWithoutAttachments, setOrdersWithoutAttachments] = useState(null);
  const [invoicesWithoutAttachments, setInvoicesWithoutAttachments] = useState(null);
  const [ordersWithoutAttachmentsPage, setOrdersWithoutAttachmentsPage] = useState(1);
  const [invoicesWithoutAttachmentsPage, setInvoicesWithoutAttachmentsPage] = useState(1);
  const [dictionaryUseky, setDictionaryUseky] = useState([]);
  const [dictionaryFinancing, setDictionaryFinancing] = useState([]);
  const [dictionaryOrderTypes, setDictionaryOrderTypes] = useState([]);
  const [dictionaryOrderStates, setDictionaryOrderStates] = useState([]);
  const [dictionaryInvoiceStates, setDictionaryInvoiceStates] = useState([]);
  const [strediskaMap, setStrediskaMap] = useState({});
  const [dataMeta, setDataMeta] = useState({ loadedAt: null, truncated: false });
  const [loadError, setLoadError] = useState('');
  const [tablePaging, setTablePaging] = useState({});
  const [searchQueries, setSearchQueries] = useState({});
  const [expandedSpendFinancing, setExpandedSpendFinancing] = useState(() => new Set());
  const [expandedSpendUseks, setExpandedSpendUseks] = useState(() => new Set());
  const [expandedSpendUsekF, setExpandedSpendUsekF] = useState(() => new Set());
  const [expandedSpendUsekFSub, setExpandedSpendUsekFSub] = useState(() => new Set());
  const [expandedSpendDruh, setExpandedSpendDruh] = useState(() => new Set());
  const [expandedSpendDruhSub, setExpandedSpendDruhSub] = useState(() => new Set());
  const [expandedSpendLp, setExpandedSpendLp] = useState(() => new Set());
  const [expandedSpendFinDruh, setExpandedSpendFinDruh] = useState(() => new Set());
  const [expandedSpendFinDruhUsek, setExpandedSpendFinDruhUsek] = useState(() => new Set());
  const [expandedSpendFinDruhDetail, setExpandedSpendFinDruhDetail] = useState(() => new Set());
  const [expandedSpendSmlouvy, setExpandedSpendSmlouvy] = useState(() => new Set());
  const [expandedVzdelByUsek, setExpandedVzdelByUsek] = useState(() => new Set());
  const [expandedVzdelUsek, setExpandedVzdelUsek] = useState(() => new Set());
  const [expandedVzdelNelUsek, setExpandedVzdelNelUsek] = useState(() => new Set());
  const [expandedVzdelNelFin, setExpandedVzdelNelFin] = useState(() => new Set());
  const [expandedVzdelByTyp, setExpandedVzdelByTyp] = useState(() => new Set());
  const [expandedTopSuppDod, setExpandedTopSuppDod] = useState(() => new Set());
  const [expandedTopSuppFin, setExpandedTopSuppFin] = useState(() => new Set());
  const [expandedTopSuppDetail, setExpandedTopSuppDetail] = useState(() => new Set());
  
  // Cashbook Overview state
  const [cashbookData, setCashbookData] = useState(null);
  const [cashbookLoading, setCashbookLoading] = useState(false);
  const [cashbookFilters, setCashbookFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_cashbook_filters`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          rok: parsed.rok || new Date().getFullYear(),
          mesic: parsed.mesic !== undefined ? parsed.mesic : (new Date().getMonth() + 1)
        };
      }
    } catch (e) {}
    return { rok: new Date().getFullYear(), mesic: new Date().getMonth() + 1 };
  });
  const [expandedCashbookRows, setExpandedCashbookRows] = useState(() => new Set());
  const [cashbookEntries, setCashbookEntries] = useState({});
  const [cashbookSearch, setCashbookSearch] = useState('');
  const [cashbookSearchActive, setCashbookSearchActive] = useState('');

  // ─── Dohadné položky ──────────────────────────────────────────────────────
  const [dohadneData, setDohadneData] = useState(null);
  const [dohadneLoading, setDohadneLoading] = useState(false);
  const [dohadneDatumOd, setDohadneDatumOd] = useState('');
  const [dohadneDatumDo, setDohadneDatumDo] = useState('');
  const dohadneDatumRef = React.useRef({ od: '', ddo: '' });
  const setDohadneDatumy = (od, ddo) => {
    dohadneDatumRef.current = { od, ddo };
    setDohadneDatumOd(od);
    setDohadneDatumDo(ddo);
  };
  const [expandedDohadneLpUctu, setExpandedDohadneLpUctu] = useState(() => new Set());
  const [expandedDohadneLp, setExpandedDohadneLp] = useState(() => new Set());
  const [expandedDohadneSmlouvy, setExpandedDohadneSmlouvy] = useState(() => new Set());
  const [dohadneSelectedQ, setDohadneSelectedQ] = useState(() => {
    try {
      const saved = localStorage.getItem('stats_reports_dohadne_q');
      if (saved && ['Q1','Q2','Q3','Q4','ALL'].includes(saved)) return saved;
    } catch {}
    // Fallback: poslední kvartál, jehož první měsíc již nastal
    const m = new Date().getMonth() + 1;
    if (m >= 10) return 'Q4';
    if (m >= 7) return 'Q3';
    if (m >= 4) return 'Q2';
    return 'Q1';
  });

  // Filtr stavů pro dohadné položky (Set stavů, prázdný = vše)
  const DOHADNE_STAV_CHECKBOXES = ['Ke schválení', 'Schválená', 'Rozpracovaná'];
  const [dohadneStavFilter, setDohadneStavFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('stats_reports_dohadne_stavy');
      if (saved !== null) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set(['Ke schválení', 'Schválená', 'Rozpracovaná']); // výchozí: vše zobrazeno
  });
  const dohadneStavFilterRef = React.useRef([...new Set(['Ke schválení', 'Schválená', 'Rozpracovaná'])]);
  // Synchronizace ref s iniciálním stavem
  React.useEffect(() => { dohadneStavFilterRef.current = [...dohadneStavFilter]; }, []); // eslint-disable-line
  const toggleDohadneStav = (stav) => {
    setDohadneStavFilter(prev => {
      const next = new Set(prev);
      next.has(stav) ? next.delete(stav) : next.add(stav);
      const arr = [...next];
      dohadneStavFilterRef.current = arr;
      try { localStorage.setItem('stats_reports_dohadne_stavy', JSON.stringify(arr)); } catch {}
      return next;
    });
  };

  // Stav třídění flat tabulek: { [tableKey]: { field, dir } }
  const [tableSorts, setTableSorts] = useState({});
  // FK stav mapa pro řazení dle FK sloupce (ref – nepotřebuje re-render)
  const fkStavMapRef = useRef({});
  // Verze pro triggering useMemo filtrů po asynchronním načtení FK stavů
  const [fkStavVersion, setFkStavVersion] = useState(0);
  const fkStavVersionTimer = useRef(null);
  const handleFkLoad = useCallback((key, stav) => {
    fkStavMapRef.current[key] = stav || null;
    // Debounce – přepočítáme filtry až po ustálení všech FK loadů
    if (fkStavVersionTimer.current) clearTimeout(fkStavVersionTimer.current);
    fkStavVersionTimer.current = setTimeout(() => setFkStavVersion(v => v + 1), 120);
  }, []);
  const blockSelectRef = useRef(null);
  const [blockSelectOpen, setBlockSelectOpen] = useState(false);
  const [visibleBlocks, setVisibleBlocks] = useState(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_visible_blocks_${userKey}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return Object.entries(SECTION_BLOCKS).reduce((acc, [tab, blocks]) => {
      acc[tab] = blocks.reduce((tabAcc, block) => {
        tabAcc[block.key] = true;
        return tabAcc;
      }, {});
      return acc;
    }, {});
  });

  const FILTER_DEFAULTS = {
    dateFrom: '',
    dateTo: '',
    year: new Date().getFullYear(),
    orderYear: new Date().getFullYear().toString(),
    cashbookRok: new Date().getFullYear(),
    usekIds: [],
    financingValues: [],
    orderTypes: []
  };

  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [pendingFilters, setPendingFilters] = useState(FILTER_DEFAULTS);
  const [filtersReady, setFiltersReady] = useState(false);

  // Načtení uloženého tabu + filtrů po znám userKey (řeší async auth kontext)
  useEffect(() => {
    if (!userKey || userKey === 'guest') {
      setFiltersReady(true);
      return;
    }
    if (lsLoadedForKey.current === userKey) {
      setFiltersReady(true);
      return;
    }
    lsLoadedForKey.current = userKey;
    try {
      const savedTab = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_active_tab_${userKey}`);
      if (savedTab && PAGE_TABS.some(t => t.id === savedTab)) setActiveTab(savedTab);
    } catch (e) {}
    try {
      const savedFilters = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_filters_${userKey}`);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        const merged = { ...FILTER_DEFAULTS, ...parsed };
        setFilters(merged);
        setPendingFilters(merged);
      }
    } catch (e) {}
    setFiltersReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);

  // Omezení filtru úseků pro uživatele bez *_MANAGE práv → přednastavit jejich úsek
  // Výjimka: PTN (id=6) → předvybrat PTN + PTN-dílny (id=6,7)
  const PTN_USEK_ID = '6';
  const PTN_DILNY_USEK_ID = '7';
  const resolvedUserUsekId = useMemo(() => {
    if (!userUsekId) return null;
    const raw = String(userUsekId);
    if (/^\d+$/.test(raw)) return raw;
    const match = (dictionaryUseky || []).find(u => {
      const zkr = String(u.usek_zkr || '').toUpperCase();
      const name = String(u.usek_nazev || '').toUpperCase();
      const rawUpper = raw.toUpperCase();
      return (zkr && zkr === rawUpper) || (name && name === rawUpper);
    });
    if (match) return String(match.id || match.usek_id || '') || null;
    return null;
  }, [userUsekId, dictionaryUseky]);
  const userLockedUsekIds = useMemo(() => {
    if (!resolvedUserUsekId) return [];
    if (String(resolvedUserUsekId) === PTN_USEK_ID) return [PTN_USEK_ID, PTN_DILNY_USEK_ID];
    return [String(resolvedUserUsekId)];
  }, [resolvedUserUsekId]);

  useEffect(() => {
    if (canChangeUsekFilter) return; // admin nebo MANAGE → neomezovat
    if (!userUsekId) return; // ještě nemáme info o úseku
    const targetIds = userLockedUsekIds;
    // Nastavit úseky uživatele do filtru (pokud tam ještě nejsou)
    const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    setFilters(prev => {
      if (arraysEqual(prev.usekIds, targetIds)) return prev;
      return { ...prev, usekIds: targetIds };
    });
    setPendingFilters(prev => {
      if (arraysEqual(prev.usekIds, targetIds)) return prev;
      return { ...prev, usekIds: targetIds };
    });
  }, [canChangeUsekFilter, userUsekId, userLockedUsekIds]);

  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_notes_${userKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const [checks, setChecks] = useState(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_checks_${userKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (blockSelectRef.current && !blockSelectRef.current.contains(event.target)) {
        setBlockSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_visible_blocks_${userKey}`, JSON.stringify(visibleBlocks));
    } catch (e) {}
  }, [userKey, visibleBlocks]);

  // Tab a filtry se ukládají přímo v handlerech — oprava race condition při LS restore
  // (staré useEffecty způsobovaly přepis LS hodnotou 'control' před načtením uložené hodnoty)

  // (filtry se ukládají přímo v handleApplyFilters / handleResetFilters)

  const updateNotes = useCallback((key, value) => {
    setNotes(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_notes_${userKey}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, [userKey]);

  const updateChecks = useCallback((key, value) => {
    setChecks(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_checks_${userKey}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, [userKey]);

  const activeBlocks = useMemo(() => SECTION_BLOCKS[activeTab] || [], [activeTab]);
  const activeTone = TAB_TONES[activeTab] || TAB_TONES.control;

  const isBlockVisible = useCallback((tabKey, blockKey) => {
    return visibleBlocks?.[tabKey]?.[blockKey] !== false;
  }, [visibleBlocks]);

  // ── Dispatch navigačních sekcí pro Layout FAB ──────────────────────────────
  useEffect(() => {
    const sections = (SECTION_BLOCKS[activeTab] || []).filter(b =>
      activeTab === 'pivot' ? true : isBlockVisible(activeTab, b.key)
    );
    window.dispatchEvent(new CustomEvent('statsNavSections', {
      detail: { sections: sections.map(b => ({ key: b.key, label: b.label })) }
    }));
  }, [activeTab, visibleBlocks, isBlockVisible]);

  useEffect(() => {
    const handler = (e) => {
      const el = document.getElementById(`section-${e.detail.key}`);
      if (!el) return;
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
    };
    window.addEventListener('statsScrollToSection', handler);
    return () => window.removeEventListener('statsScrollToSection', handler);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  const toggleBlockVisibility = useCallback((tabKey, blockKey) => {
    setVisibleBlocks(prev => {
      const nextTab = { ...(prev[tabKey] || {}) };
      nextTab[blockKey] = !nextTab[blockKey];
      return { ...prev, [tabKey]: nextTab };
    });
  }, []);

  const setAllBlocksVisibility = useCallback((tabKey, value) => {
    setVisibleBlocks(prev => {
      const nextTab = (SECTION_BLOCKS[tabKey] || []).reduce((acc, block) => {
        acc[block.key] = value;
        return acc;
      }, {});
      return { ...prev, [tabKey]: nextTab };
    });
  }, []);

  const activeVisibleCount = useMemo(() => {
    return activeBlocks.reduce((count, block) => (isBlockVisible(activeTab, block.key) ? count + 1 : count), 0);
  }, [activeBlocks, activeTab, isBlockVisible]);

  const activeAllSelected = activeBlocks.length > 0 && activeVisibleCount === activeBlocks.length;

  const getTablePaging = useCallback((key) => {
    return tablePaging[key] || { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE };
  }, [tablePaging]);

  const setTablePage = useCallback((key, page) => {
    setTablePaging(prev => {
      const current = prev[key] || { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE };
      return { ...prev, [key]: { ...current, page } };
    });
  }, []);

  const setTablePageSize = useCallback((key, pageSize) => {
    setTablePaging(prev => {
      const current = prev[key] || { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE };
      return { ...prev, [key]: { ...current, page: 1, pageSize } };
    });
  }, []);

  const getSearchQuery = useCallback((key) => {
    return searchQueries[key] || '';
  }, [searchQueries]);

  const setSearchQuery = useCallback((key, query) => {
    setSearchQueries(prev => ({ ...prev, [key]: query }));
    // Reset na první stránku při vyhledávání
    setTablePaging(prev => {
      const current = prev[key] || { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE };
      return { ...prev, [key]: { ...current, page: 1 } };
    });
  }, []);

  // Odstranění diakritiky pro vyhledávání
  const removeDiacritics = useCallback((str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }, []);

  // Zvýraznění nalezeného výrazu v textu (cashbook fulltext) — přijímá již normalizovaný term
  const cbHighlightText = useCallback((text, normTerm) => {
    if (!normTerm) return text ?? '-';
    const str = String(text ?? '');
    if (!str) return '-';
    const normStr = removeDiacritics(str.toLowerCase());
    const idx = normStr.indexOf(normTerm);
    if (idx < 0) return str;
    return <>{str.slice(0, idx)}<mark style={{ background: '#fde047', color: '#1e293b', borderRadius: '2px', padding: '0 1px' }}>{str.slice(idx, idx + normTerm.length)}</mark>{str.slice(idx + normTerm.length)}</>;
  }, [removeDiacritics]);

  // Vyhledávání pouze ve viditelných sloupcích (nikoliv v ID, technických polích apod.)
  const searchInVisibleColumns = useCallback((item, query, searchKey) => {
    if (!query || !item) return true;
    const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
    if (!normalizedQuery) return true;

    const matchesText = (val) => {
      if (val == null || val === '') return false;
      const normalizedVal = removeDiacritics(String(val).toLowerCase());
      return normalizedVal.includes(normalizedQuery);
    };

    // Pro objednávky — pokrýváme všechna pole která jsou ve viditelných sloupcích V3
    if (item.ev_cislo || item.cislo_objednavky || item.predmet || item.predmet_objednavky || item.stav_objednavky || item.max_cena_s_dph != null) {
      // Rozbalit financovani objekt / JSON pro LP kódy a smlouvu
      var fin = null;
      if (item.financovani && typeof item.financovani === 'object') {
        fin = item.financovani;
      } else if (item.financovani && typeof item.financovani === 'string' && item.financovani.trim().startsWith('{')) {
        try { fin = JSON.parse(item.financovani); } catch (e) { fin = null; }
      }
      var lpNazvy = (fin && Array.isArray(fin.lp_nazvy)) ? fin.lp_nazvy : [];
      var lpStrings = lpNazvy.flatMap(function(lp) { return [lp.cislo_lp, lp.kod, lp.nazev_uctu].filter(Boolean); });
      var objednatelUziv = item.objednatel_uzivatel || {};
      var objednatelObj = item.objednatel && typeof item.objednatel === 'object' ? item.objednatel : {};
      var schvalUziv = item.schvalovatel_uzivatel || {};
      var schvalObj = item.schvalovatel && typeof item.schvalovatel === 'object' ? item.schvalovatel : {};
      var prikazceUziv = item.prikazce_uzivatel || {};
      var druhObj = item.druh_objednavky && typeof item.druh_objednavky === 'object' ? item.druh_objednavky : {};
      var druhKodObj = item.druh_objednavky_kod && typeof item.druh_objednavky_kod === 'object' ? item.druh_objednavky_kod : {};

      var visibleValues = [
        // Čísla objednávky
        item.ev_cislo,
        item.cislo_objednavky,
        // Datumy
        item.datum_vytvoreni, item.dt_vytvoreni, item.dt_objednavky, item.datum_objednavky,
        item.datum_schvaleni, item.dt_schvaleni,
        // Předmět
        item.predmet, item.predmet_objednavky, item.nazev,
        // Stav
        item.stav_objednavky, item.stav,
        // Objednatel
        item.objednatel_jmeno, item.objednatel_prijmeni,
        objednatelUziv.cele_jmeno, objednatelObj.cele_jmeno,
        // Schvalovatel / příkazce
        item.schvalovatel_jmeno, item.schvalovatel_prijmeni,
        schvalUziv.cele_jmeno, schvalObj.cele_jmeno,
        item.prikazce_jmeno, item.prikazce_prijmeni, prikazceUziv.cele_jmeno,
        // Úsek (V3 pole)
        item.objednatel_usek_zkr, item.objednatel_usek, item.usek_objednatele,
        objednatelUziv.usek_zkr, objednatelObj.usek_zkr,
        item.usek_nazev,
        // Financování label
        fin ? fin.typ_nazev : null, fin ? fin.nazev : null, fin ? fin.nazev_stavu : null,
        typeof item.financovani === 'string' && !item.financovani.trim().startsWith('{') ? item.financovani : null,
        // LP kódy
        ...lpStrings,
        // Smlouva
        fin ? fin.cislo_smlouvy : null, item.cislo_smlouvy,
        // Druh objednávky
        item.druh_objednavky_nazev, item.druh_objednavky_label,
        typeof item.druh_objednavky === 'string' && !item.druh_objednavky.trim().startsWith('{') ? item.druh_objednavky : null,
        druhObj.nazev_stavu, druhObj.nazev,
        druhKodObj.nazev_stavu, druhKodObj.nazev,
        item.druh_nazev,
        // Částky
        item.castka, item.max_cena_s_dph, item.cena_s_dph,
        // Poznámka
        item.poznamka,
      ].filter(function(v) { return v != null; });
      return visibleValues.some(matchesText);
    }

    // Pro faktury - vyhledávání ve viditelných sloupcích (přímo z vlastností)
    if (item.cislo_faktury || item.fa_cislo_vema || item.fa_stav) {
      const visibleValues = [
        item.cislo_faktury,
        item.fa_cislo_vema,
        item.datum_vystaveni, item.fa_datum_vystaveni,
        item.datum_doruceni, item.fa_datum_doruceni,
        item.datum_splatnosti, item.fa_datum_splatnosti,
        item.stav, item.fa_stav,
        item.castka, item.fa_castka,
        item.cislo_smlouvy,
        item.vytvoril_uzivatel_zkracene,
        item.fa_predana_zam_jmeno_cele,
        item.fa_poznamka,
      ].filter(v => v != null);
      return visibleValues.some(matchesText);
    }

    // ✅ Pro přílohy (všechny kombinované: OBJ + FA + RP) - fulltext ve všech sloupcích tabulky
    if (searchKey === 'invoiceAttachmentsList' || item.attachmentSource || item.objednavka_predmet != null || item.rocni_poplatek_nazev) {
      const visibleValues = [
        // Název souboru
        item.original_name, item.original_filename, item.originalni_nazev_souboru, item.nazev_souboru,
        // Typ přílohy
        item.typ_prilohy, item.type, item.attachment_type,
        // Čísla
        item.cislo_objednavky, item.order_number,
        item.cislo_faktury, item.invoice_number,
        // Dodavatel
        item.dodavatel,
        // Druh obj / název RP
        item.druh_objednavky_label,
        item.rocni_poplatek_nazev, item.cislo_poplatku,
        // Předmět obj
        item.objednavka_predmet,
        // Poznámka FA
        item.fa_poznamka,
        // Zdroj
        item.attachmentSource,
      ].filter(v => v != null);
      return visibleValues.some(matchesText);
    }

    // Fallback - standardní rekurzivní vyhledávání (pro jiné typy)
    const searchValue = (val) => {
      if (val == null) return false;
      if (typeof val === 'string' || typeof val === 'number') {
        return matchesText(val);
      }
      if (typeof val === 'object' && !Array.isArray(val)) {
        return Object.values(val).some(searchValue);
      }
      if (Array.isArray(val)) {
        return val.some(searchValue);
      }
      return false;
    };
    
    return Object.values(item).some(searchValue);
  }, [removeDiacritics]);

  // Funkce pro zvýraznění hledaného textu
  const highlightText = useCallback((text, searchKey) => {
    const query = searchQueries[searchKey] || '';
    if (!query || !text) return text;
    
    const textStr = String(text);
    const normalizedText = removeDiacritics(textStr.toLowerCase());
    const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
    
    if (!normalizedQuery || !normalizedText.includes(normalizedQuery)) return text;
    
    const parts = [];
    let lastIndex = 0;
    let searchIndex = 0;
    let partKey = 0;
    
    while (searchIndex < normalizedText.length) {
      const index = normalizedText.indexOf(normalizedQuery, searchIndex);
      if (index === -1) break;
      
      // Text před shodou
      if (index > lastIndex) {
        parts.push(<span key={`text-${partKey++}`}>{textStr.substring(lastIndex, index)}</span>);
      }
      // Zvýrazněný text (originální s diakritikou)
      parts.push(
        <HighlightedText key={`hl-${partKey++}`}>
          {textStr.substring(index, index + normalizedQuery.length)}
        </HighlightedText>
      );
      lastIndex = index + normalizedQuery.length;
      searchIndex = lastIndex;
    }
    
    // Zbývající text
    if (lastIndex < textStr.length) {
      parts.push(<span key={`text-${partKey++}`}>{textStr.substring(lastIndex)}</span>);
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
  }, [searchQueries, removeDiacritics]);

  const getPagedItems = useCallback((items, key) => {
    // Nejdříve aplikovat search filter
    const query = getSearchQuery(key);
    const filteredItems = query ? items.filter(item => searchInVisibleColumns(item, query, key)) : items;
    
    const { page, pageSize } = getTablePaging(key);
    const total = filteredItems.length;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: filteredItems.slice(start, end),
      page: safePage,
      pageSize,
      total,
      totalPages,
      originalTotal: items.length,
      isFiltered: query ? true : false
    };
  }, [getTablePaging, getSearchQuery, searchInVisibleColumns]);

  const renderPagination = useCallback((key, paging) => {
    if (!paging.total || paging.total <= paging.pageSize) return null;
    return (
      <PaginationContainer>
        <PaginationInfo>
          Zobrazeno {((paging.page - 1) * paging.pageSize) + 1} - {Math.min(paging.page * paging.pageSize, paging.total)} z {paging.total}
        </PaginationInfo>
        <PaginationControls>
          <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
            Zobrazit:
          </span>
          <PageSizeSelect
            value={paging.pageSize}
            onChange={(event) => setTablePageSize(key, Number(event.target.value))}
          >
            {TABLE_PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </PageSizeSelect>

          <PageButton onClick={() => setTablePage(key, 1)} disabled={paging.page === 1}>
            ««
          </PageButton>
          <PageButton onClick={() => setTablePage(key, paging.page - 1)} disabled={paging.page === 1}>
            ‹
          </PageButton>

          <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
            Stránka {paging.page} z {paging.totalPages}
          </span>

          <PageButton onClick={() => setTablePage(key, paging.page + 1)} disabled={paging.page >= paging.totalPages}>
            ›
          </PageButton>
          <PageButton onClick={() => setTablePage(key, paging.totalPages)} disabled={paging.page >= paging.totalPages}>
            »»
          </PageButton>
        </PaginationControls>
      </PaginationContainer>
    );
  }, [setTablePage, setTablePageSize]);

  const loadLookups = useCallback(async () => {
    if (!token || !username) return;
    try {
      const [usekyRaw, financovaniRaw, druhyRaw, stavyRaw, faStavyRaw, faStatusRaw, strediskaRaw] = await Promise.all([
        fetchUseky({ token, username }),
        fetchCiselniky({ token, username, typ: 'FINANCOVANI_ZDROJ' }),
        fetchCiselniky({ token, username, typ: 'DRUH_OBJEDNAVKY' }),
        fetchCiselniky({ token, username, typ: 'OBJEDNAVKA' }),
        fetchCiselniky({ token, username, typ: 'FAKTURA_STAV' }),
        fetchCiselniky({ token, username, typ: 'FAKTURA_STATUS' }),
        getStrediska25({ token, username, aktivni: null })
      ]);
      setDictionaryUseky(usekyRaw || []);
      setDictionaryFinancing(financovaniRaw || []);
      setDictionaryOrderTypes(druhyRaw || []);
      setDictionaryOrderStates(stavyRaw || []);
      const invoiceStates = [...(faStavyRaw || []), ...(faStatusRaw || [])];
      const invoiceStatesByCode = {};
      invoiceStates.forEach((item) => {
        const code = item?.kod_stavu || item?.kod || '';
        if (!code || invoiceStatesByCode[code]) return;
        invoiceStatesByCode[code] = item;
      });
      setDictionaryInvoiceStates(Object.values(invoiceStatesByCode));
      const sMap = {};
      (Array.isArray(strediskaRaw) ? strediskaRaw : []).forEach(s => {
        if (s?.value) sMap[String(s.value)] = s.label || s.value;
      });
      setStrediskaMap(sMap);
    } catch (e) {
      setDictionaryUseky([]);
      setDictionaryFinancing([]);
      setDictionaryOrderTypes([]);
      setDictionaryOrderStates([]);
      setDictionaryInvoiceStates([]);
      setStrediskaMap({});
    }
  }, [token, username]);

  const loadOrders = useCallback(async (options = {}) => {
    const { accessContext = null } = options;
    const all = [];
    const backendFilters = {};
    if (filters.dateFrom) backendFilters.datum_od = filters.dateFrom;
    if (filters.dateTo) backendFilters.datum_do = filters.dateTo;

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await listOrdersV3({
        token,
        username,
        page,
        per_page: MAX_ORDERS_BATCH,
        period: 'all',
        filters: backendFilters,
        access_context: accessContext || undefined,
        exclude_cancelled: true
      });

      const { orders: batch, pagination, status, message } = parseOrdersResponse(response);

          if (status) {
            const normalized = String(status).toLowerCase();
            if (normalized !== 'ok' && normalized !== 'success') {
              throw new Error(message || 'Nepodařilo se načíst objednávky.');
            }
          }

      all.push(...batch);
      if (pagination?.total_pages && page >= pagination.total_pages) {
        return { data: all, truncated: false, accessContext };
      }
      if (!pagination && batch.length < MAX_ORDERS_BATCH) {
        return { data: all, truncated: false, accessContext };
      }
    }

    return { data: all, truncated: true, accessContext };
  }, [token, username, filters.dateFrom, filters.dateTo]);

  const loadInvoices = useCallback(async () => {
    const all = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await listInvoices25({
        token,
        username,
        page,
        per_page: MAX_INVOICE_PAGE,
        year: filters.year || undefined,
        datum_od: filters.dateFrom || undefined,
        datum_do: filters.dateTo || undefined,
        usek_id: filters.usekIds.length === 1 ? filters.usekIds[0] : undefined
      });
      const batch = (response.faktury || []).map(normalizeInvoice);
      all.push(...batch);
      if (batch.length < MAX_INVOICE_PAGE) {
        return { data: all, truncated: false };
      }
    }
    return { data: all, truncated: true };
  }, [token, username, filters.year, filters.dateFrom, filters.dateTo, filters.usekIds]);

  const loadContracts = useCallback(async () => {
    const response = await getSmlouvyList({
      token,
      username,
      usek_id: filters.usekIds.length === 1 ? filters.usekIds[0] : null,
      platnost_od: filters.dateFrom || null,
      platnost_do: filters.dateTo || null
    });
    return response?.smlouvy || response?.data || [];
  }, [token, username, filters.usekIds, filters.dateFrom, filters.dateTo]);

  const loadCashbookData = useCallback(async () => {
    if (!token || !username) return;
    
    setCashbookLoading(true);
    // Použít cashbookFilters (vlastní filtr tabu Přehled pokladen)
    const cbRok = cashbookFilters.rok || new Date().getFullYear();
    const cbMesic = cashbookFilters.mesic || null; // null = celý rok
    
    try {
      const response = await getCashbookOverview({
        username,
        token,
        rok: cbRok,
        mesic: cbMesic
      });
      
      if (response.status === 'ok' && response.data) {
        setCashbookData(response.data);
      } else {
        setCashbookData(null);
        if (showToast) showToast(response.message || 'Nepodařilo se načíst data pokladen', 'error');
      }
    } catch (e) {
      setCashbookData(null);
      if (showToast) showToast(e?.message || 'Chyba při načítání přehledu pokladen', 'error');
    } finally {
      setCashbookLoading(false);
    }
  }, [token, username, cashbookFilters.rok, cashbookFilters.mesic, showToast]);

  const loadCashbookEntries = useCallback(async (knihaId) => {
    if (!token || !username || !knihaId) return;
    try {
      const response = await getCashbookOverviewEntries({
        username,
        token,
        kniha_id: knihaId,
        page: 1,
        limit: 100
      });
      if (response.status === 'ok' && response.data) {
        setCashbookEntries(prev => ({
          ...prev,
          [knihaId]: response.data.entries || []
        }));
      }
    } catch (e) {
      console.error('Chyba při načítání položek pokladní knihy:', e);
    }
  }, [token, username]);

  const loadDohadnePolozky = useCallback(async (overrideDatumOd, overrideDatumDo) => {
    if (!token || !username) return;
    setDohadneLoading(true);
    try {
      const od = overrideDatumOd !== undefined ? overrideDatumOd : dohadneDatumRef.current.od;
      const ddo = overrideDatumDo !== undefined ? overrideDatumDo : dohadneDatumRef.current.ddo;
      const stavFilter = dohadneStavFilterRef.current;
      const result = await fetchDohadnePolozky({
        token,
        username,
        datum_od: od || undefined,
        datum_do: ddo || undefined,
        stav_filter: stavFilter.length > 0 ? stavFilter : [],
      });
      if (result?.status === 'success') {
        setDohadneData(result.data);
      } else {
        setDohadneData(null);
        if (showToast) showToast(result?.message || 'Nepodařilo se načíst dohadné položky', 'error');
      }
    } catch (e) {
      setDohadneData(null);
      if (showToast) showToast(e?.message || 'Chyba při načítání dohadných položek', 'error');
    } finally {
      setDohadneLoading(false);
    }
  }, [token, username, showToast]);

  // 🚀 PER-TAB DATA LOADING FUNCTIONS
  
  // Common data - číselníky potřebuje každý tab
  const loadCommonData = useCallback(async () => {
    if (!token || !username) return;
    if (progress?.setProgress) progress.setProgress(5);
    await loadLookups();
    if (progress?.setProgress) progress.setProgress(15);
  }, [token, username, loadLookups, progress]);

  // Control tab - potřebuje orders + invoices + orderAttachments
  const loadControlTabData = useCallback(async (silent = false, forceReload = false) => {
    if (!token || !username) return;
    if (loadingTabsRef.current.has('control')) return;
    if (!forceReload && loadedTabsRef.current.has('control')) return;
    if (!forceReload && failedTabsRef.current.has('control')) return;
    if (forceReload && failedTabsRef.current.has('control')) {
      setFailedTabs(prev => {
        const next = new Set(prev);
        next.delete('control');
        return next;
      });
    }
    
    if (!silent) setLoading(true);
    setLoadingTabs(prev => new Set([...prev, 'control']));
    try {
      let completedTasks = 0;
      const totalTasks = 3;
      const trackProgress = (promise) => promise.then(result => {
        completedTasks++;
        // ✅ Progress tracking jen pokud NENÍ silent mode
        if (!silent && progress?.setProgress) {
          progress.setProgress(15 + Math.round((completedTasks / totalTasks) * 80));
        }
        return result;
      });

      const [ordersResult, invoicesResult, orderAttachmentsResult] = await Promise.all([
        trackProgress(loadOrders()),
        trackProgress(loadInvoices()),
        trackProgress(listAllOrderAttachments(username, token, 10000, 0).catch(err => { console.error('❌ OBJ attachments failed:', err); return { data: [] }; }))
      ]);
      
      setOrders(ordersResult.data || []);
      setInvoices(invoicesResult.data || []);
      setOrderAttachments(orderAttachmentsResult?.data || []);
      setDataMeta({
        loadedAt: new Date().toISOString(),
        truncated: ordersResult.truncated || invoicesResult.truncated
      });
      
      setLoadedTabs(prev => new Set([...prev, 'control']));
    } catch (e) {
      console.error('❌ Control tab data load failed:', e);
      setFailedTabs(prev => new Set([...prev, 'control']));
      if (!silent) {
        setLoadError(e?.message || 'Nepodařilo se načíst data pro Finanční kontrolu.');
      }
    } finally {
      if (!silent) setLoading(false);
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete('control');
        return next;
      });
    }
  }, [token, username, loadOrders, loadInvoices, progress]);

  // Stats tab - potřebuje orders + timelineData
  const loadStatsTabData = useCallback(async (silent = false, forceReload = false) => {
    if (!token || !username) return;
    if (loadingTabsRef.current.has('stats')) return;
    if (!forceReload && loadedTabsRef.current.has('stats')) return;
    if (!forceReload && failedTabsRef.current.has('stats')) return;
    if (forceReload && failedTabsRef.current.has('stats')) {
      setFailedTabs(prev => {
        const next = new Set(prev);
        next.delete('stats');
        return next;
      });
    }
    
    // Pokud už máme orders z jiného tabu, načíst jen timeline
    const needsOrders = forceReload ? true : orders.length === 0;
    
    if (!silent) setLoading(true);
    setLoadingTabs(prev => new Set([...prev, 'stats']));
    try {
      if (needsOrders) {
        const [ordersResult, timelineResult] = await Promise.all([
          loadOrders(),
          fetchOrderTimelineV3({ token, username, year: new Date().getFullYear() })
        ]);
        setOrders(ordersResult.data || []);
        setTimelineData(timelineResult?.data?.timeline || []);
        setDataMeta(prev => ({
          ...prev,
          loadedAt: new Date().toISOString(),
          truncated: prev.truncated || ordersResult.truncated
        }));
      } else {
        // Jen timeline
        const timelineResult = await fetchOrderTimelineV3({ token, username, year: new Date().getFullYear() });
        setTimelineData(timelineResult?.data?.timeline || []);
      }
      
      setLoadedTabs(prev => new Set([...prev, 'stats']));
    } catch (e) {
      console.error('❌ Stats tab data load failed:', e);
      setFailedTabs(prev => new Set([...prev, 'stats']));
      if (!silent) setLoadError(e?.message || 'Chyba při načítání dat pro Statistiky.');
    } finally {
      if (!silent) setLoading(false);
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete('stats');
        return next;
      });
    }
  }, [token, username, loadOrders, orders.length]);

  // Spend tab - potřebuje orders + invoices + contracts
  const loadSpendTabData = useCallback(async (silent = false, forceReload = false) => {
    if (!token || !username) return;
    if (loadingTabsRef.current.has('spend')) return;
    if (!forceReload && loadedTabsRef.current.has('spend')) return;
    if (!forceReload && failedTabsRef.current.has('spend')) return;
    if (forceReload && failedTabsRef.current.has('spend')) {
      setFailedTabs(prev => {
        const next = new Set(prev);
        next.delete('spend');
        return next;
      });
    }
    
    const needsOrders = forceReload ? true : orders.length === 0;
    const needsInvoices = forceReload ? true : invoices.length === 0;
    
    if (!silent) setLoading(true);
    setLoadingTabs(prev => new Set([...prev, 'spend']));
    try {
      const promises = [];
      if (needsOrders) promises.push(loadOrders());
      if (needsInvoices) promises.push(loadInvoices());
      promises.push(loadContracts());
      
      const results = await Promise.all(promises);
      let idx = 0;
      if (needsOrders) {
        setOrders(results[idx].data || []);
        idx++;
      }
      if (needsInvoices) {
        setInvoices(results[idx].data || []);
        idx++;
      }
      setContracts(results[idx] || []);
      
      setLoadedTabs(prev => new Set([...prev, 'spend']));
    } catch (e) {
      console.error('❌ Spend tab data load failed:', e);
      setFailedTabs(prev => new Set([...prev, 'spend']));
      if (!silent) setLoadError(e?.message || 'Chyba při načítání dat pro Čerpání.');
    } finally {
      if (!silent) setLoading(false);
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete('spend');
        return next;
      });
    }
  }, [token, username, loadOrders, loadInvoices, loadContracts, orders.length, invoices.length]);

  // Reports tab - potřebuje orders + invoices + orderAttachments + annualFeeAttachments
  const loadReportsTabData = useCallback(async (silent = false, forceReload = false) => {
    if (!token || !username) return;
    if (loadingTabsRef.current.has('reports')) return;
    if (!forceReload && loadedTabsRef.current.has('reports')) return;
    if (!forceReload && failedTabsRef.current.has('reports')) return;
    if (forceReload && failedTabsRef.current.has('reports')) {
      setFailedTabs(prev => {
        const next = new Set(prev);
        next.delete('reports');
        return next;
      });
    }
    
    const needsOrders = forceReload ? true : orders.length === 0;
    const needsInvoices = forceReload ? true : invoices.length === 0;
    const needsOrderAttachments = forceReload ? true : orderAttachments.length === 0;
    
    if (!silent) setLoading(true);
    setLoadingTabs(prev => new Set([...prev, 'reports']));
    try {
      const promises = [];
      if (needsOrders) promises.push(loadOrders());
      if (needsInvoices) promises.push(loadInvoices());
      if (needsOrderAttachments) promises.push(listAllOrderAttachments(username, token, 10000, 0).catch(err => { console.error('❌ OBJ attachments failed:', err); return { data: [] }; }));
      promises.push(getAllAnnualFeeAttachments({ token, username }).catch(() => ({ success: false, data: [] })));
      
      const results = await Promise.all(promises);
      let idx = 0;
      if (needsOrders) {
        setOrders(results[idx].data || []);
        idx++;
      }
      if (needsInvoices) {
        setInvoices(results[idx].data || []);
        idx++;
      }
      if (needsOrderAttachments) {
        setOrderAttachments(results[idx]?.data || []);
        idx++;
      }
      setAnnualFeeAttachments(results[idx]?.data || []);
      
      setLoadedTabs(prev => new Set([...prev, 'reports']));
    } catch (e) {
      console.error('❌ Reports tab data load failed:', e);
      setFailedTabs(prev => new Set([...prev, 'reports']));
      if (!silent) setLoadError(e?.message || 'Chyba při načítání dat pro Reporty.');
    } finally {
      if (!silent) setLoading(false);
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete('reports');
        return next;
      });
    }
  }, [token, username, loadOrders, loadInvoices, orders.length, invoices.length, orderAttachments.length]);

  // Vzdel tab - potřebuje jen orders
  const loadVzdelTabData = useCallback(async (silent = false, forceReload = false) => {
    if (!token || !username) return;
    if (loadingTabsRef.current.has('vzdel')) return;
    if (!forceReload && loadedTabsRef.current.has('vzdel')) return;
    if (!forceReload && failedTabsRef.current.has('vzdel')) return;
    if (forceReload && failedTabsRef.current.has('vzdel')) {
      setFailedTabs(prev => {
        const next = new Set(prev);
        next.delete('vzdel');
        return next;
      });
    }
    if (!forceReload && ordersVzdel.length > 0) {
      setLoadedTabs(prev => new Set([...prev, 'vzdel']));
      return;
    }
    
    if (!silent) setLoading(true);
    setLoadingTabs(prev => new Set([...prev, 'vzdel']));
    try {
      const ordersResult = await loadOrders({ accessContext: 'vzdel' });
      setOrdersVzdel(ordersResult.data || []);
      setLoadedTabs(prev => new Set([...prev, 'vzdel']));
    } catch (e) {
      console.error('❌ Vzdel tab data load failed:', e);
      setFailedTabs(prev => new Set([...prev, 'vzdel']));
      if (!silent) setLoadError(e?.message || 'Chyba při načítání dat pro Vzdělávání.');
    } finally {
      if (!silent) setLoading(false);
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete('vzdel');
        return next;
      });
    }
  }, [token, username, loadOrders, ordersVzdel.length]);

  // Pivot tab - potřebuje jen orders
  const loadPivotTabData = useCallback(async (silent = false, forceReload = false) => {
    if (!token || !username) return;
    if (loadingTabsRef.current.has('pivot')) return;
    if (!forceReload && loadedTabsRef.current.has('pivot')) return;
    if (!forceReload && failedTabsRef.current.has('pivot')) return;
    if (forceReload && failedTabsRef.current.has('pivot')) {
      setFailedTabs(prev => {
        const next = new Set(prev);
        next.delete('pivot');
        return next;
      });
    }
    if (!forceReload && orders.length > 0) {
      setLoadedTabs(prev => new Set([...prev, 'pivot']));
      return;
    }
    
    if (!silent) setLoading(true);
    setLoadingTabs(prev => new Set([...prev, 'pivot']));
    try {
      const ordersResult = await loadOrders();
      setOrders(ordersResult.data || []);
      setLoadedTabs(prev => new Set([...prev, 'pivot']));
    } catch (e) {
      console.error('❌ Pivot tab data load failed:', e);
      setFailedTabs(prev => new Set([...prev, 'pivot']));
      if (!silent) setLoadError(e?.message || 'Chyba při načítání dat pro Pivot.');
    } finally {
      if (!silent) setLoading(false);
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete('pivot');
        return next;
      });
    }
  }, [token, username, loadOrders, orders.length]);

  // 🔄 REFACTORED: Main data loader - nyní načte jen common data + první tab
  const handleLoadData = useCallback(async () => {
    if (!token || !username) return;
    backgroundLoadRef.current = false;
    setLoading(true);
    setLoadError('');
    setLoadedTabs(new Set());
    setLoadingTabs(new Set());
    setFailedTabs(new Set());
    if (progress?.start) progress.start();
    try {
      // 1. Načíst common data (číselníky)
      await loadCommonData();
      
      // 2. Načíst data pro aktivní tab (default: control)
      // ⚠️ Per-tab funkce si už samy řídí setLoading() a progress
      const currentTab = activeTab || 'control';
      if (currentTab === 'control') await loadControlTabData(false, true);
      else if (currentTab === 'stats') await loadStatsTabData(false, true);
      else if (currentTab === 'spend') await loadSpendTabData(false, true);
      else if (currentTab === 'reports') await loadReportsTabData(false, true);
      else if (currentTab === 'vzdel') await loadVzdelTabData(false, true);
      else if (currentTab === 'pivot') await loadPivotTabData(false, true);
      // attachments, cashbook, dohadne mají vlastní lazy loading
      
      if (progress?.done) progress.done();
    } catch (e) {
      setLoadError(e?.message || 'Nepodařilo se načíst data.');
      if (progress?.fail) progress.fail();
    } finally {
      setLoading(false);
      setTimeout(() => setIsInitialized(true), 300);
    }
  }, [token, username, activeTab, loadCommonData, loadControlTabData, loadStatsTabData, loadSpendTabData, loadReportsTabData, loadVzdelTabData, loadPivotTabData, progress]);

  const initialLoadRef = useRef(false);

  // ⚡ REFS pro load funkce - eliminují re-firing useEffectů kvůli měnícím se ref na funkce
  const handleLoadDataRef = useRef(handleLoadData);
  const loadControlTabDataRef = useRef(loadControlTabData);
  const loadStatsTabDataRef = useRef(loadStatsTabData);
  const loadSpendTabDataRef = useRef(loadSpendTabData);
  const loadReportsTabDataRef = useRef(loadReportsTabData);
  const loadVzdelTabDataRef = useRef(loadVzdelTabData);
  const loadPivotTabDataRef = useRef(loadPivotTabData);
  useEffect(() => { handleLoadDataRef.current = handleLoadData; }, [handleLoadData]);
  useEffect(() => { loadControlTabDataRef.current = loadControlTabData; }, [loadControlTabData]);
  useEffect(() => { loadStatsTabDataRef.current = loadStatsTabData; }, [loadStatsTabData]);
  useEffect(() => { loadSpendTabDataRef.current = loadSpendTabData; }, [loadSpendTabData]);
  useEffect(() => { loadReportsTabDataRef.current = loadReportsTabData; }, [loadReportsTabData]);
  useEffect(() => { loadVzdelTabDataRef.current = loadVzdelTabData; }, [loadVzdelTabData]);
  useEffect(() => { loadPivotTabDataRef.current = loadPivotTabData; }, [loadPivotTabData]);

  // 🚀 INITIAL LOAD - jednorázově po přihlášení
  useEffect(() => {
    if (!token || !username || initialLoadRef.current) return;
    if (!filtersReady) return;
    if (userKey && userKey !== 'guest' && lsLoadedForKey.current !== userKey) return;
    try {
      if (userKey && userKey !== 'guest') {
        const savedTab = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_active_tab_${userKey}`);
        if (savedTab && PAGE_TABS.some(t => t.id === savedTab) && savedTab !== activeTab) return;
      }
    } catch (e) {}
    initialLoadRef.current = true;
    handleLoadDataRef.current();
  }, [token, username, userKey, activeTab, filtersReady]);

  // 🚀 LAZY LOADING: Načíst data pro aktivní tab při přepnutí
  useEffect(() => {
    if (!token || !username || !initialLoadRef.current) return;
    if (loading) return;
    
    // ✅ Voláme přes refs - useEffect se nespustí znovu kvůli změně ref funkcí
    if (activeTab === 'control' && !loadedTabsRef.current.has('control') && !loadingTabsRef.current.has('control') && !failedTabsRef.current.has('control')) {
      loadControlTabDataRef.current();
    } else if (activeTab === 'stats' && !loadedTabsRef.current.has('stats') && !loadingTabsRef.current.has('stats') && !failedTabsRef.current.has('stats')) {
      loadStatsTabDataRef.current();
    } else if (activeTab === 'spend' && !loadedTabsRef.current.has('spend') && !loadingTabsRef.current.has('spend') && !failedTabsRef.current.has('spend')) {
      loadSpendTabDataRef.current();
    } else if (activeTab === 'reports' && !loadedTabsRef.current.has('reports') && !loadingTabsRef.current.has('reports') && !failedTabsRef.current.has('reports')) {
      loadReportsTabDataRef.current();
    } else if (activeTab === 'vzdel' && !loadedTabsRef.current.has('vzdel') && !loadingTabsRef.current.has('vzdel') && !failedTabsRef.current.has('vzdel')) {
      loadVzdelTabDataRef.current();
    } else if (activeTab === 'pivot' && !loadedTabsRef.current.has('pivot') && !loadingTabsRef.current.has('pivot') && !failedTabsRef.current.has('pivot')) {
      loadPivotTabDataRef.current();
    }
  }, [activeTab, token, username, loading]);

  // 🚀 BACKGROUND LAZY LOADING: Po načtení prvního tabu načíst ostatní na pozadí (po 2s)
  const backgroundLoadRef = useRef(false);
  const lastStableUserKeyRef = useRef(null);

  // Při změně userKey (typicky username -> user_id) resetni init/load stavy,
  // aby se taby nenačetly „potichu" pod jiným klíčem a gate mizela předčasně.
  useEffect(() => {
    const normalizedUserKey = userKey || 'guest';

    if (lastStableUserKeyRef.current === null) {
      lastStableUserKeyRef.current = normalizedUserKey;
      return;
    }
    if (lastStableUserKeyRef.current === normalizedUserKey) return;

    lastStableUserKeyRef.current = normalizedUserKey;

    // Nový user context -> znovu načíst LS tab/filtry a data pod správným klíčem.
    lsLoadedForKey.current = null;
    setFiltersReady(normalizedUserKey === 'guest');
    initialLoadRef.current = false;
    backgroundLoadRef.current = false;
    setIsInitialized(false);
    setLoadedTabs(new Set());
    setLoadingTabs(new Set());
    setFailedTabs(new Set());
  }, [userKey]);

  // 🚀 BACKGROUND PRELOAD (SAFE MODE)
  // Spouští se až po korektním načtení aktivního LS ouška,
  // takže nikdy neovlivní loading gate pro právě zobrazený tab.
  useEffect(() => {
    if (!token || !username) return;
    if (!filtersReady || !initialLoadRef.current || !isInitialized) return;
    if (userKey && userKey !== 'guest' && lsLoadedForKey.current !== userKey) return;
    if (backgroundLoadRef.current) return;

    const preloadTabs = ['control', 'stats', 'spend', 'reports', 'vzdel', 'pivot'];
    if (!preloadTabs.includes(activeTab)) return;

    // Aktivní tab MUSÍ být opravdu načtený, jinak preload nespouštíme.
    if (loading) return;
    if (loadingTabsRef.current.has(activeTab)) return;
    if (failedTabsRef.current.has(activeTab)) return;
    if (!loadedTabsRef.current.has(activeTab)) return;

    backgroundLoadRef.current = true;

    const timer = setTimeout(async () => {
      const orderedTabs = [activeTab].concat(preloadTabs.filter(t => t !== activeTab));
      for (const tab of orderedTabs) {
        if (tab === activeTab) continue;
        if (loadedTabsRef.current.has(tab) || loadingTabsRef.current.has(tab) || failedTabsRef.current.has(tab)) continue;
        await new Promise(resolve => setTimeout(resolve, 350));
        if (tab === 'control') await loadControlTabDataRef.current(true);
        else if (tab === 'stats') await loadStatsTabDataRef.current(true);
        else if (tab === 'spend') await loadSpendTabDataRef.current(true);
        else if (tab === 'reports') await loadReportsTabDataRef.current(true);
        else if (tab === 'vzdel') await loadVzdelTabDataRef.current(true);
        else if (tab === 'pivot') await loadPivotTabDataRef.current(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [token, username, filtersReady, isInitialized, userKey, activeTab, loading]);

  const [applyTrigger, setApplyTrigger] = useState(0);
  useEffect(() => {
    if (applyTrigger === 0) return;
    handleLoadDataRef.current();
  }, [applyTrigger]);

  const handleLoadAttachmentsStats = useCallback(async () => {
    if (!token || !username) return;
    if (progress?.start) progress.start();
    if (progress?.setProgress) progress.setProgress(10);
    try {
      let attDone = 0;
      const trackAtt = (p) => p.then(r => { attDone++; if (progress?.setProgress) progress.setProgress(10 + attDone * 40); return r; });
      const [orderAttachments, invoiceAttachments] = await Promise.all([
        trackAtt(listAttachmentsV2(null, token, username)),
        trackAtt(listInvoiceAttachmentsV2(null, token, username))
      ]);
      console.log('📎 Order Attachments loaded:', orderAttachments?.length || 0);
      console.log('📎 Invoice Attachments loaded:', invoiceAttachments?.length || 0);
      const summarize = (items) => {
        return items.reduce((acc, item) => {
          const key = getAttachmentType(item);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
      };
      const stats = {
        orders: summarize(orderAttachments || []),
        invoices: summarize(invoiceAttachments || []),
        totalOrders: (orderAttachments || []).length,
        totalInvoices: (invoiceAttachments || []).length
      };
      console.log('📎 Attachment Stats:', stats);
      setAttachmentsStats(stats);
      if (progress?.done) progress.done();
    } catch (e) {
      console.error('📎 Attachment Stats Error:', e);
      setAttachmentsStats(null);
      if (progress?.fail) progress.fail();
    }
  }, [token, username, progress]);

  // === ATTACHMENTS TAB HANDLERS ===
  const handleLoadAttachmentsTabStats = useCallback(async () => {
    if (!token || !username) return;
    setAttachmentsLoading(true);
    try {
      const [orderStats, invoiceStats] = await Promise.all([
        getOrderAttachmentsStatsV2(token, username),
        getInvoiceAttachmentsStatsV2(token, username)
      ]);
      setOrderAttachmentsStats(orderStats);
      setInvoiceAttachmentsStats(invoiceStats);
    } catch (e) {
      console.error('📎 Attachments Tab Stats Error:', e);
      setOrderAttachmentsStats({ total: 0, types: [] });
      setInvoiceAttachmentsStats({ total: 0, types: [] });
    } finally {
      setAttachmentsLoading(false);
    }
  }, [token, username]);

  const handleLoadOrderAttachmentsByType = useCallback(async (type, page = 1) => {
    if (!token || !username || !type) return;
    setAttachmentsLoading(true);
    try {
      const result = await getOrderAttachmentsByTypeV2(type, token, username, { page, per_page: 25 });
      setAttachmentsByType(prev => ({ ...prev, orders: result }));
      setAttachmentsByTypePage(prev => ({ ...prev, orders: page }));
      setExpandedAttachmentType(prev => ({ ...prev, orders: type }));
    } catch (e) {
      console.error('📎 Order Attachments By Type Error:', e);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [token, username]);

  const handleLoadInvoiceAttachmentsByType = useCallback(async (type, page = 1) => {
    if (!token || !username || !type) return;
    setAttachmentsLoading(true);
    try {
      const result = await getInvoiceAttachmentsByTypeV2(type, token, username, { page, per_page: 25 });
      setAttachmentsByType(prev => ({ ...prev, invoices: result }));
      setAttachmentsByTypePage(prev => ({ ...prev, invoices: page }));
      setExpandedAttachmentType(prev => ({ ...prev, invoices: type }));
    } catch (e) {
      console.error('📎 Invoice Attachments By Type Error:', e);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [token, username]);

  const handleLoadOrdersWithoutAttachments = useCallback(async (page = 1) => {
    if (!token || !username) return;
    setAttachmentsLoading(true);
    try {
      const sort = tableSorts['ordersWithoutAttachments'];
      const params = { 
        page, 
        per_page: 25,
        ...(sort?.field && { sort_by: sort.field, sort_dir: sort.dir.toUpperCase() })
      };
      const result = await getOrdersWithoutAttachmentsV2(token, username, params);
      setOrdersWithoutAttachments(result);
      setOrdersWithoutAttachmentsPage(page);
    } catch (e) {
      console.error('📎 Orders Without Attachments Error:', e);
      setOrdersWithoutAttachments({ data: [], pagination: { total: 0, total_pages: 1, per_page: 25 } });
      setOrdersWithoutAttachmentsPage(page);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [token, username, tableSorts]);

  const handleLoadInvoicesWithoutAttachments = useCallback(async (page = 1) => {
    if (!token || !username) return;
    setAttachmentsLoading(true);
    try {
      const sort = tableSorts['invoicesWithoutAttachments'];
      const params = { 
        page, 
        per_page: 25,
        ...(sort?.field && { sort_by: sort.field, sort_dir: sort.dir.toUpperCase() })
      };
      const result = await getInvoicesWithoutAttachmentsV2(token, username, params);
      setInvoicesWithoutAttachments(result);
      setInvoicesWithoutAttachmentsPage(page);
    } catch (e) {
      console.error('📎 Invoices Without Attachments Error:', e);
      setInvoicesWithoutAttachments({ data: [], pagination: { total: 0, total_pages: 1, per_page: 25 } });
      setInvoicesWithoutAttachmentsPage(page);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [token, username, tableSorts]);

  // Reload data when sorting changes for API tables (stringify pro prevenci nekonečného loop)
  useEffect(() => {
    const sortKey = JSON.stringify(tableSorts['ordersWithoutAttachments']);
    if (ordersWithoutAttachments && activeTab === 'attachments') {
      handleLoadOrdersWithoutAttachments(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tableSorts['ordersWithoutAttachments']), activeTab]);

  useEffect(() => {
    const sortKey = JSON.stringify(tableSorts['invoicesWithoutAttachments']);
    if (invoicesWithoutAttachments && activeTab === 'attachments') {
      handleLoadInvoicesWithoutAttachments(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tableSorts['invoicesWithoutAttachments']), activeTab]);

  // Load attachments tab data when tab is activated
  // ⚡ PROGRESSIVE LOADING: Prioritní data hned, ostatní na pozadí
  useEffect(() => {
    if (activeTab === 'attachments') {
      // 1. PRIORITA: Stats pro accordion (hned)
      if (!orderAttachmentsStats && !invoiceAttachmentsStats) {
        handleLoadAttachmentsTabStats();
      }
      
      // 2. LAZY LOADING: Ostatní bloky na pozadí (po 500ms)
      const lazyTimer = setTimeout(() => {
        if (!ordersWithoutAttachments) {
          handleLoadOrdersWithoutAttachments(1);
        }
        if (!invoicesWithoutAttachments) {
          handleLoadInvoicesWithoutAttachments(1);
        }
      }, 500);
      
      return () => clearTimeout(lazyTimer);
    }
  }, [activeTab, orderAttachmentsStats, invoiceAttachmentsStats, ordersWithoutAttachments, invoicesWithoutAttachments, handleLoadAttachmentsTabStats, handleLoadOrdersWithoutAttachments, handleLoadInvoicesWithoutAttachments]);

  // Load cashbook data when tab is active or cashbook filters change
  useEffect(() => {
    if ((activeTab === 'cashbook' || activeTab === 'spend') && token && username) {
      setCashbookEntries({}); // Reset při změně filtru
      loadCashbookData();
    }
  }, [activeTab, token, username, cashbookFilters.rok, cashbookFilters.mesic, loadCashbookData]);

  // Load dohadné položky when tab becomes active (initial load only)
  useEffect(() => {
    if (activeTab === 'dohadne' && token && username && !dohadneData && !dohadneLoading) {
      loadDohadnePolozky();
    }
  }, [activeTab, token, username, dohadneData, dohadneLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: spočítá datumový rozsah pro aktuální Q + rok
  const getDohadneDateRange = useCallback((q, rok) => {
    const QUARTERS = {
      Q1:  [`${rok}-01-01`, `${rok}-03-31`],
      Q2:  [`${rok}-04-01`, `${rok}-06-30`],
      Q3:  [`${rok}-07-01`, `${rok}-09-30`],
      Q4:  [`${rok}-10-01`, `${rok}-12-31`],
      ALL: [`${rok}-01-01`, `${rok}-12-31`],
    };
    return QUARTERS[q] || [undefined, undefined];
  }, []);

  // Reload dohadné položky při změně kvartálu (pokud je tab aktivní)
  const prevDohadneQRef = React.useRef(dohadneSelectedQ);
  useEffect(() => {
    if (prevDohadneQRef.current === dohadneSelectedQ) return;
    prevDohadneQRef.current = dohadneSelectedQ;
    if (activeTab !== 'dohadne' || !token || !username) return;
    const rok = parseInt(filters.orderYear || new Date().getFullYear(), 10);
    try { localStorage.setItem('stats_reports_dohadne_q', dohadneSelectedQ); } catch {}
    const [od, ddo] = getDohadneDateRange(dohadneSelectedQ, rok);
    setDohadneDatumy(od || '', ddo || '');
    setDohadneData(null);
    loadDohadnePolozky(od, ddo);
  }, [dohadneSelectedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload dohadné při změně globálního roku (pokud je tab dohadne aktivní)
  const prevDohadneYearRef = React.useRef(filters.orderYear);
  useEffect(() => {
    if (prevDohadneYearRef.current === filters.orderYear) return;
    prevDohadneYearRef.current = filters.orderYear;
    if (activeTab !== 'dohadne' || !token || !username) return;
    const rok = parseInt(filters.orderYear || new Date().getFullYear(), 10);
    const [od, ddo] = getDohadneDateRange(dohadneSelectedQ, rok);
    setDohadneDatumy(od || '', ddo || '');
    setDohadneData(null);
    loadDohadnePolozky(od, ddo);
  }, [filters.orderYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload dohadné při změně stav filtru (checkboxy Ke schválení/Schválená/Rozpracovaná)
  const prevDohadneStavRef = React.useRef(JSON.stringify([...dohadneStavFilter]));
  useEffect(() => {
    const current = JSON.stringify([...dohadneStavFilter]);
    if (prevDohadneStavRef.current === current) return;
    prevDohadneStavRef.current = current;
    if (activeTab !== 'dohadne' || !token || !username) return;
    setDohadneData(null);
    loadDohadnePolozky();
  }, [dohadneStavFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Po načtení dat automaticky načíst položky všech knih (pro LP grafy)
  useEffect(() => {
    if (!cashbookData?.books?.length || !token || !username) return;
    const allKnihaIds = [];
    cashbookData.books.forEach(book => {
      if (book.mesic && book.kniha_id) {
        allKnihaIds.push(book.kniha_id);
      } else if (book.mesice) {
        book.mesice.forEach(m => { if (m.kniha_id) allKnihaIds.push(m.kniha_id); });
      }
    });
    allKnihaIds.forEach(id => loadCashbookEntries(id));
  }, [cashbookData, token, username, loadCashbookEntries]);

  // Normalizovaný hledaný výraz
  const cashbookNormSearch = useMemo(() =>
    removeDiacritics((cashbookSearchActive || '').toLowerCase().trim()),
    [cashbookSearchActive, removeDiacritics]);

  // Fulltext shody přes pokladny a jejich položky
  const cbMatchData = useMemo(() => {
    if (!cashbookNormSearch || !cashbookData?.books?.length) return null;
    const hit = (v) => removeDiacritics(String(v ?? '').toLowerCase()).includes(cashbookNormSearch);
    const bookMatches = new Set();
    const entryMatchSets = {};
    cashbookData.books.forEach(book => {
      const uk = book.mesic ? `month_${book.kniha_id}` : `year_${book.pokladna_id}_${book.rok}`;
      if (hit(book.pokladna_nazev) || hit(book.cislo_pokladny)) bookMatches.add(uk);
      const scanEntries = (entries, kId) => {
        if (!Array.isArray(entries)) return false;
        let any = false;
        entries.forEach((e, idx) => {
          const ok = hit(e.cislo_dokladu) || hit(e.obsah_zapisu) || hit(e.komu_od_koho)
            || (e.castka_prijem > 0 && hit(e.castka_prijem))
            || (e.castka_vydaj > 0 && hit(e.castka_vydaj))
            || (e.lp_kod && hit(e.lp_kod))
            || (e.detail_items || []).some(di => hit(di.lp_kod));
          if (ok) {
            if (!entryMatchSets[kId]) entryMatchSets[kId] = new Set();
            entryMatchSets[kId].add(idx);
            any = true;
          }
        });
        return any;
      };
      if (book.mesic && book.kniha_id) {
        if (scanEntries(cashbookEntries[book.kniha_id], book.kniha_id)) bookMatches.add(uk);
      } else if (book.mesice) {
        book.mesice.forEach(m => { if (scanEntries(cashbookEntries[m.kniha_id], m.kniha_id)) bookMatches.add(uk); });
      }
    });
    return { bookMatches, entryMatchSets };
  }, [cashbookNormSearch, cashbookData, cashbookEntries, removeDiacritics]);

  // Knihy viditelné po aplikaci fulltextového filtru
  const cashbookBooksToRender = useMemo(() => {
    if (!cashbookData?.books) return [];
    if (!cbMatchData) return cashbookData.books;
    return cashbookData.books.filter(b => {
      const uk = b.mesic ? `month_${b.kniha_id}` : `year_${b.pokladna_id}_${b.rok}`;
      return cbMatchData.bookMatches.has(uk);
    });
  }, [cashbookData, cbMatchData]);

  // Automatické rozbalení řádků se shodami
  useEffect(() => {
    if (!cbMatchData?.bookMatches?.size) return;
    setExpandedCashbookRows(prev => {
      const next = new Set(prev);
      cbMatchData.bookMatches.forEach(k => next.add(k));
      return next;
    });
  }, [cbMatchData]);

  const baseOrders = useMemo(() => (activeTab === 'vzdel' ? ordersVzdel : orders), [activeTab, ordersVzdel, orders]);
  const ordersById = useMemo(() => new Map(baseOrders.map(order => [String(order.id), order])), [baseOrders]);
  const invoicesByOrderId = useMemo(() => {
    return invoices.reduce((acc, invoice) => {
      if (!invoice.objednavka_id) return acc;
      const key = String(invoice.objednavka_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(invoice);
      return acc;
    }, {});
  }, [invoices]);

  const contractsById = useMemo(() => {
    const map = new Map();
    (contracts || []).forEach((contract) => {
      if (contract?.id != null) map.set(String(contract.id), contract);
    });
    return map;
  }, [contracts]);

  const contractsByNumber = useMemo(() => {
    const map = new Map();
    (contracts || []).forEach((contract) => {
      const number = getContractNumber(contract);
      if (number) map.set(String(number), contract);
    });
    return map;
  }, [contracts]);

  const orderStatesMap = useMemo(() => {
    const map = {};
    (dictionaryOrderStates || []).forEach((item) => {
      const code = item.kod_stavu || item.kod || '';
      const label = item.nazev_stavu || item.nazev || item.popis || '';
      if (code) map[String(code).toUpperCase()] = label || String(code);
    });
    return map;
  }, [dictionaryOrderStates]);

  const financingMap = useMemo(() => {
    const map = {};
    (dictionaryFinancing || []).forEach((item) => {
      const code = item.kod_stavu || item.kod || '';
      const label = item.nazev_stavu || item.nazev || item.popis || '';
      if (code) map[String(code)] = label || String(code);
    });
    return map;
  }, [dictionaryFinancing]);

  const invoiceStatesMap = useMemo(() => {
    const map = {};
    (dictionaryInvoiceStates || []).forEach((item) => {
      const code = item.kod_stavu || item.kod || '';
      const label = item.nazev_stavu || item.nazev || item.popis || '';
      if (code) map[String(code).toUpperCase()] = label || String(code);
    });
    return map;
  }, [dictionaryInvoiceStates]);

  const orderTypeMap = useMemo(() => {
    const map = {};
    (dictionaryOrderTypes || []).forEach((item) => {
      const code = item.kod_stavu || item.kod || item.id || item.value || '';
      const label = item.nazev_stavu || item.nazev || item.popis || '';
      if (code) map[String(code)] = label || String(code);
      if (item.id != null) map[String(item.id)] = label || String(item.id);
    });
    return map;
  }, [dictionaryOrderTypes]);

  // Set kódů druhů objednávek klasifikovaných jako majetkové (atribut_objektu = 1)
  const majetekDruhCodes = useMemo(() => {
    const s = new Set();
    (dictionaryOrderTypes || []).forEach((item) => {
      if (item.atribut_objektu === 1 || item.atribut_objektu === '1') {
        const code = item.kod_stavu || item.kod || '';
        if (code) s.add(String(code));
        if (item.id != null) s.add(String(item.id));
      }
    });
    return s;
  }, [dictionaryOrderTypes]);

  const getOrderStatusCode = useCallback((order) => {
    if (Array.isArray(order?.stav_workflow_kod) && order.stav_workflow_kod.length > 0) {
      return String(order.stav_workflow_kod[order.stav_workflow_kod.length - 1] || '').toUpperCase();
    }
    if (typeof order?.stav_workflow_kod === 'string') {
      return String(order.stav_workflow_kod || '').toUpperCase();
    }
    if (order?.stav_workflow?.kod_stavu) {
      return String(order.stav_workflow.kod_stavu || '').toUpperCase();
    }
    return String(order?.stav_objednavky || order?.stav || '').toUpperCase();
  }, []);

  const getOrderStatusLabel = useCallback((order) => {
    const raw = order?.stav_objednavky || order?.stav || '';
    if (raw) {
      const rawUpper = String(raw).toUpperCase();
      if (orderStatesMap[rawUpper]) return orderStatesMap[rawUpper];
      return raw;
    }
    const code = getOrderStatusCode(order);
    return orderStatesMap[code] || code || '';
  }, [getOrderStatusCode, orderStatesMap]);

  // ─── Třídění vlastních (flat) tabulek ─────────────────────────────────────────
  const getTableSort = useCallback((key) => tableSorts[key] || { field: null, dir: 'asc' }, [tableSorts]);

  const handleTableSort = useCallback((key, field) => {
    setTableSorts(prev => {
      const cur = prev[key] || {};
      if (cur.field !== field) return { ...prev, [key]: { field, dir: 'asc' } };
      if (cur.dir === 'asc') return { ...prev, [key]: { field, dir: 'desc' } };
      // třetí stav = bez třídění
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const sortTableData = useCallback((data, key, accessors) => {
    const s = tableSorts[key];
    if (!s?.field) return data;
    const fn = accessors[s.field];
    if (!fn) return data;
    return [...data].sort((a, b) => {
      const va = String(fn(a) ?? '');
      const vb = String(fn(b) ?? '');
      const cmp = va.localeCompare(vb, 'cs-CZ', { numeric: true, sensitivity: 'base' });
      return s.dir === 'asc' ? cmp : -cmp;
    });
  }, [tableSorts]);

  // Render ikony třídění do hlavičky sloupce
  const sortIcon = useCallback((key, field) => {
    const s = tableSorts[key];
    const isActive = s?.field === field;
    return (
      <span style={{ marginLeft: '0.2rem', fontSize: '0.65rem', opacity: isActive ? 1 : 0.3, color: isActive ? '#2563eb' : 'inherit' }}>
        {!isActive ? '⇅' : s.dir === 'asc' ? '↑' : '↓'}
      </span>
    );
  }, [tableSorts]);

  const invoiceAttachmentAcc = useMemo(() => ({
    nazev_souboru: att => att.original_filename || att.original_name || att.originalni_nazev_souboru || att.nazev_souboru || '',
    velikost:      att => att.velikost_souboru_b || att.velikost_b || att.velikost || 0,
    typ_prilohy:   att => att.typ_prilohy || att.type || att.attachment_type || '',
    zdroj:         att => att.attachmentSource || '',
    faktura:       att => att.cislo_faktury || '',
    objednavka:    att => att.cislo_objednavky || '',
    dodavatel:     att => att.dodavatel || '',
    druh:          att => att.druh_objednavky_label || '',
  }), []);

  const orderAttachmentsByTypeAcc = useMemo(() => ({
    original_name: att => att.original_name || att.nazev_souboru || '',
    order_number:  att => att.order_number || '',
    order_stav:    att => att.order_stav || '',
    supplier:      att => att.supplier || '',
    uploaded_by:   att => att.uploaded_by || '',
    created_at:    att => att.created_at || ''
  }), []);

  const invoiceAttachmentsByTypeAcc = useMemo(() => ({
    original_name:  att => att.original_name || att.nazev_souboru || '',
    invoice_number: att => att.invoice_number || '',
    invoice_stav:   att => att.invoice_stav || '',
    order_number:   att => att.order_number || '',
    uploaded_by:    att => att.uploaded_by || '',
    created_at:     att => att.created_at || ''
  }), []);
  // ──────────────────────────────────────────────────────────────────────────────

  const getOrderTypeCode = useCallback((order) => {
    let code = order?.druh_objednavky_kod
      || order?.druh_objednavky_id
      || order?.druh_objednavky
      || '';
      if (code && typeof code === 'object') {
      return String(code.kod_stavu || code.kod || code.id || code.value || '');
      }
    if (typeof code === 'string') {
      try {
        const parsed = JSON.parse(code);
        if (parsed && parsed.kod_stavu) code = parsed.kod_stavu;
          if (parsed && parsed.kod) code = parsed.kod;
        if (parsed && parsed.id) code = parsed.id;
      } catch (e) {}
    }
    return String(code || '');
  }, []);

  const getOrderTypeLabel = useCallback((order) => {
    const enriched = order?._enriched || {};
    const explicit = order?.druh_objednavky_nazev
      || order?.druh_objednavky_label
      || enriched?.druh_objednavky?.nazev
      || enriched?.druh_objednavky?.nazev_stavu
      || '';
    if (explicit) return explicit;
    const raw = order?.druh_objednavky;
    if (raw && typeof raw === 'object') {
      const label = raw.nazev_stavu || raw.nazev || raw.popis || '';
      if (label) return label;
      const code = raw.kod_stavu || raw.kod || '';
      if (code) return orderTypeMap[String(code)] || String(code);
    }
    const rawCode = order?.druh_objednavky_kod;
    if (rawCode && typeof rawCode === 'object') {
      const label = rawCode.nazev_stavu || rawCode.nazev || rawCode.popis || '';
      if (label) return label;
      const code = rawCode.kod_stavu || rawCode.kod || '';
      if (code) return orderTypeMap[String(code)] || String(code);
    }
    if (typeof rawCode === 'string' && rawCode.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rawCode);
        const label = parsed?.nazev_stavu || parsed?.nazev || parsed?.popis || '';
        if (label) return label;
        const code = parsed?.kod_stavu || parsed?.kod || '';
        if (code) return orderTypeMap[String(code)] || String(code);
      } catch (e) {}
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const label = parsed.nazev_stavu || parsed.nazev || parsed.popis || '';
          if (label) return label;
          const code = parsed.kod_stavu || parsed.kod || '';
          if (code) return orderTypeMap[String(code)] || String(code);
        }
      } catch (e) {}
    }
    const code = getOrderTypeCode(order);
    return orderTypeMap[code] || code || '';
  }, [getOrderTypeCode, orderTypeMap]);

  // Vrací true pokud je druh objednávky klasifikován jako majetkový (atribut_objektu = 1)
  // Přístup shodný s OrderForm25: find() v dictionaryOrderTypes (ciselník DRUH_OBJEDNAVKY)
  const isOrderMajetek = useCallback((order) => {
    if (!order) return false;
    const druhCode = getOrderTypeCode(order);
    // 1. Primární: přímý find v číselníku (stejně jako OrderForm25 v druhyObjednavkyOptions)
    if (druhCode && dictionaryOrderTypes?.length) {
      const item = dictionaryOrderTypes.find(d =>
        d.kod_stavu === druhCode ||
        String(d.id) === druhCode
      );
      if (item) return item.atribut_objektu === 1 || item.atribut_objektu === '1';
    }
    // 2. Záloha: Set-based lookup (pokud dictionaryOrderTypes ještě nenačten)
    if (druhCode && majetekDruhCodes.has(druhCode)) return true;
    // 3. Přímá pole na objektu objednávky (V3 detail endpoint enrichment)
    if (order.druh_objednavky_atribut === 1 || order.druh_objednavky_atribut === '1') return true;
    if (order.atribut_objektu === 1 || order.atribut_objektu === '1') return true;
    const enriched = order._enriched || {};
    if (enriched.druh_objednavky?.atribut_objektu === 1 || enriched.druh_objednavky?.atribut_objektu === '1') return true;
    if (order.druh_objednavky && typeof order.druh_objednavky === 'object') {
      if (order.druh_objednavky.atribut_objektu === 1 || order.druh_objednavky.atribut_objektu === '1') return true;
    }
    if (order.druh_objednavky_kod && typeof order.druh_objednavky_kod === 'object') {
      if (order.druh_objednavky_kod.atribut_objektu === 1 || order.druh_objednavky_kod.atribut_objektu === '1') return true;
    }
    return false;
  }, [dictionaryOrderTypes, majetekDruhCodes, getOrderTypeCode]);

  const getOrderFinancingCode = useCallback((order) => {
    const fin = parseFinancing(order?.financovani);
    return String(fin?.typ || fin?.kod_stavu || order?.financovani || '');
  }, []);

  const getOrderFinancingLabel = useCallback((order) => {
    const fin = parseFinancing(order?.financovani);
    const code = fin?.typ || fin?.kod_stavu || '';
    return fin?.typ_nazev || fin?.nazev || fin?.nazev_stavu || financingMap[String(code)] || code || '';
  }, [financingMap]);

  // Vrátí poznámku k financování (typově specifické pole)
  const getOrderFinancingNote = useCallback(function(order) {
    var fin = parseFinancing(order ? order.financovani : null);
    if (!fin) return '';
    var typ = String(fin.typ || '').toUpperCase();
    if (typ === 'LP') return fin.lp_poznamka || '';
    if (typ === 'SMLOUVA') return fin.smlouva_poznamka || '';
    if (typ === 'INDIVIDUALNI_SCHVALENI') return fin.individualni_poznamka || '';
    if (typ === 'POJISTNA_UDALOST') return fin.pojistna_udalost_poznamka || '';
    return fin.poznamka || '';
  }, []);

  // Renderuje buňku Financování s druhým řádkem poznámky a SmartTooltipem
  const renderFinancingLabelCell = useCallback(function(order, sectionKey) {
    var label = getOrderFinancingLabel(order) || '-';
    var note = getOrderFinancingNote(order);
    var inner = (
      <div style={ note ? { cursor: 'help', maxWidth: '160px' } : { maxWidth: '160px' } }>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{highlightText(label, sectionKey)}</div>
        {note && (
          <div style={{ fontSize: '0.65rem', color: '#6b7280', lineHeight: 1.3, marginTop: '2px', maxHeight: '2.6em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>
            {note}
          </div>
        )}
      </div>
    );
    if (!note) return inner;
    return (
      <SmartTooltip text={label + '\n' + note} preferredPosition="top" icon="none" multiline={true}>
        {inner}
      </SmartTooltip>
    );
  }, [getOrderFinancingLabel, getOrderFinancingNote, highlightText]);

  // Vrátí referenční číslo/kód podle typu financování
  const getOrderFinancingRef = useCallback((order) => {
    const fin = parseFinancing(order?.financovani);
    const typ = String(fin?.typ || '').toUpperCase();
    if (typ === 'LP') {
      const lpNazvy = Array.isArray(fin?.lp_nazvy) ? fin.lp_nazvy : [];
      if (lpNazvy.length > 0) {
        return lpNazvy.map(lp => lp.cislo_lp || lp.kod || '').filter(Boolean).join(', ');
      }
      return '';
    }
    if (typ === 'SMLOUVA') {
      return fin?.cislo_smlouvy || order?.cislo_smlouvy || (order?.smlouva_id ? `#${order.smlouva_id}` : '') || '';
    }
    if (typ === 'INDIVIDUALNI_SCHVALENI') {
      return fin?.individualni_schvaleni || fin?.ind_schvaleni || '';
    }
    if (typ === 'POJISTNA_UDALOST') {
      return fin?.pojistna_udalost_cislo || '';
    }
    if (typ === 'INDIVIDUALNI') {
      return order?.cislo_objednavky || '';
    }
    return '';
  }, []);

  // Vrátí zkrácený popisek sloupce ref. čísla dle typu financování
  const getOrderFinancingRefLabel = useCallback((order) => {
    const fin = parseFinancing(order?.financovani);
    const typ = String(fin?.typ || '').toUpperCase();
    if (typ === 'LP') return 'LP kód';
    if (typ === 'SMLOUVA') return 'Č. smlouvy';
    if (typ === 'INDIVIDUALNI_SCHVALENI') return 'Č. schválení';
    if (typ === 'POJISTNA_UDALOST') return 'Č. poj. ud.';
    if (typ === 'INDIVIDUALNI') return 'Č. obj.';
    return 'Ref.';
  }, []);

  // Vrátí název smlouvy z enriched dat nebo z contractsByNumber mapy
  const getOrderContractName = useCallback((order) => {
    var smInfo = order && order._enriched ? order._enriched.smlouva_info : null;
    if (smInfo && smInfo.nazev_smlouvy) return smInfo.nazev_smlouvy;
    // Fallback: zkusit najít v contractsByNumber mapě
    var ref = getOrderFinancingRef(order);
    if (ref && contractsByNumber.has(String(ref))) {
      var c = contractsByNumber.get(String(ref));
      return c ? (c.nazev_smlouvy || c.nazev || '') : '';
    }
    return '';
  }, [getOrderFinancingRef, contractsByNumber]);

  // Renderuje buňku ref. čísla s druhým řádkem názvu smlouvy (pokud jde o SMLOUVA)
  const renderFinancingRefCell = useCallback(function(order, sectionKey) {
    var ref = getOrderFinancingRef(order) || '-';
    var fin = parseFinancing(order ? order.financovani : null);
    var typ = String(fin ? fin.typ || '' : '').toUpperCase();
    if (typ !== 'SMLOUVA') {
      return highlightText(ref, sectionKey);
    }
    var nazev = getOrderContractName(order);
    var inner = (
      <div style={ nazev ? { cursor: 'help' } : undefined }>
        <div>{highlightText(ref, sectionKey)}</div>
        {nazev && (
          <div style={{ fontSize: '0.65rem', color: '#6b7280', lineHeight: 1.3, marginTop: '2px', maxHeight: '2.6em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>
            {nazev}
          </div>
        )}
      </div>
    );
    if (!nazev) return inner;
    return (
      <SmartTooltip text={nazev} preferredPosition="top" icon="none" multiline={true}>
        {inner}
      </SmartTooltip>
    );
  }, [getOrderFinancingRef, getOrderContractName, highlightText]);

  const getInvoiceStatusLabel = useCallback((invoice) => {
    const raw = invoice?.stav || invoice?.fa_stav || '';
    const code = String(raw || '').toUpperCase();
    if (invoiceStatesMap[code]) return invoiceStatesMap[code];
    const fallbackMap = {
      NOVA: 'Nová',
      ZAEVIDOVANA: 'Zaevidovaná',
      V_RESENI: 'V řešení',
      PREDANA_PO: 'Předaná PO',
      PREDANO_PO: 'Předaná PO',
      NEZAPLACENO: 'Nezaplaceno',
      K_ZAPLACENI: 'K zaplacení',
      ZAPLACENO: 'Zaplaceno',
      DOKONCENA: 'Dokončena',
      STORNO: 'Storno',
      STORNO_PLUS: 'Storno+',
      'STORNO+': 'Storno+',
      VECNA_SPRAVNOST: 'Věcná správnost',
      SCHVALENO: 'Schváleno'
    };
    return fallbackMap[code] || raw || '';
  }, [invoiceStatesMap]);

  const isInvoiceSettled = useCallback((invoice) => {
    if (invoice?.zaplacena) return true;
    const raw = invoice?.stav || invoice?.fa_stav || '';
    const code = String(raw || '').toUpperCase();
    const settledCodes = new Set(['ZAPLACENO', 'DOKONCENA', 'DOKON', 'UHRAD', 'UHRADENA']);
    if (settledCodes.has(code)) return true;
    const label = getInvoiceStatusLabel(invoice).toLowerCase();
    return label.includes('zaplacen') || label.includes('uhrazen') || label.includes('dokonc');
  }, [getInvoiceStatusLabel]);

  // Mapa numeric ID → usek_zkr pro překlad filtrů (dropdown ukládá ID, ale objednávky mají zkratku)
  const usekIdToZkrMap = useMemo(() => {
    return (dictionaryUseky || []).reduce((acc, usek) => {
      const id = String(usek.id || usek.usek_id || '');
      const zkr = String(usek.usek_zkr || '');
      if (id && zkr) acc[id] = zkr;
      return acc;
    }, {});
  }, [dictionaryUseky]);

  const ignoreUsekFilter = activeTab === 'vzdel'
    && typeof hasPermission === 'function'
    && hasPermission('EDUCATION_VIEW_ALL');

  const filteredOrders = useMemo(() => {
    return baseOrders.filter(order => {
      const orderDate = toDate(getOrderDate(order));
      if (filters.dateFrom && orderDate && orderDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && orderDate && orderDate > new Date(filters.dateTo)) return false;
      if (filters.financingValues.length > 0) {
        const code = String(getOrderFinancingCode(order) ?? '');
        if (!filters.financingValues.includes(code)) return false;
      }
      if (filters.orderTypes.length > 0) {
        const code = String(getOrderTypeCode(order) ?? '');
        if (!filters.orderTypes.includes(code)) return false;
      }
      if (filters.usekIds.length > 0 && !ignoreUsekFilter) {
        // Přeložit vybrané numeric ID na zkratky (dropdown ukládá ID, V3 objednávky mají zkratku)
        var selectedZkr = filters.usekIds.map(function(id) { return usekIdToZkrMap[id] || ''; }).filter(Boolean);
        // Inline logika getOrdererUsekCode (definován až níže, nelze použít před inicializací)
        var directUsek = order.objednatel_usek_zkr
          || order.objednatel_usek
          || (order.objednatel && order.objednatel.usek_zkr)
          || (order.objednatel_uzivatel && order.objednatel_uzivatel.usek_zkr)
          || order.usek_objednatele
          || '';
        if (!directUsek) {
          var evNum = order.ev_cislo || order.cislo_objednavky || '';
          var m = String(evNum || '').trim().match(/20\d{2}\s*\/\s*([^\/\s]+)/i);
          directUsek = m ? m[1].trim() : '';
        }
        var usekCode = String(directUsek);
        if (selectedZkr.length > 0 && !selectedZkr.includes(usekCode)) return false;
      }
      if (filters.orderYear) {
        const oDate = toDate(getOrderDate(order));
        if (!oDate || String(oDate.getFullYear()) !== String(filters.orderYear)) return false;
      }
      return true;
    });
  }, [baseOrders, filters.dateFrom, filters.dateTo, filters.financingValues, filters.orderTypes, filters.usekIds, filters.orderYear, getOrderFinancingCode, getOrderTypeCode, getOrderDate, usekIdToZkrMap, ignoreUsekFilter]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const invoiceDate = toDate(invoice.datum_doruceni || invoice.datum_vystaveni);
      if (filters.dateFrom && invoiceDate && invoiceDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && invoiceDate && invoiceDate > new Date(filters.dateTo)) return false;
      return true;
    });
  }, [invoices, filters.dateFrom, filters.dateTo]);

  const financingOptions = useMemo(() => {
    return (dictionaryFinancing || [])
      .map((item) => {
        const value = item.kod_stavu || item.kod || item.id || '';
        const label = item.nazev_stavu || item.nazev || item.popis || '';
        return value || label ? { value: String(value || label), label: label || String(value) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, 'cs-CZ'));
  }, [dictionaryFinancing]);

  const orderTypeOptions = useMemo(() => {
    return (dictionaryOrderTypes || [])
      .map((item) => {
        const value = item.kod_stavu || item.kod || item.id || '';
        const baseLabel = item.nazev_stavu || item.nazev || item.popis || '';
        const isMajetek = item.atribut_objektu === 1 || item.atribut_objektu === '1';
        const label = isMajetek ? `${baseLabel} (majetek)` : baseLabel;
        return value || label ? { value: String(value || label), label: label || String(value) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, 'cs-CZ'));
  }, [dictionaryOrderTypes]);

  const usekOptions = useMemo(() => {
    return (dictionaryUseky || [])
      .map((usek) => {
        const value = usek.id || usek.usek_id || '';
        const label = [usek.usek_zkr, usek.usek_nazev].filter(Boolean).join(' - ') || usek.usek_nazev || usek.usek_zkr || '';
        return value || label ? { value: String(value || label), label } : null;
      })
      .filter(Boolean);
  }, [dictionaryUseky]);

  const usekLabelMap = useMemo(() => {
    return (dictionaryUseky || []).reduce((acc, usek) => {
      const zkr = usek.usek_zkr || '';
      const label = [usek.usek_zkr, usek.usek_nazev].filter(Boolean).join(' - ') || usek.usek_nazev || '';
      if (zkr) acc[String(zkr)] = label || String(zkr);
      return acc;
    }, {});
  }, [dictionaryUseky]);

  const getOrdererUsekCode = useCallback((order) => {
    const direct = order?.objednatel_usek_zkr
      || order?.objednatel_usek
      || order?.objednatel?.usek_zkr
      || order?.objednatel_uzivatel?.usek_zkr
      || order?.usek_objednatele
      || '';
    if (direct) return String(direct);
    const evNumber = order?.ev_cislo || order?.cislo_objednavky || '';
    return parseUsekFromOrderNumber(evNumber);
  }, []);

  const getOrdererUsekLabel = useCallback((order) => {
    const code = getOrdererUsekCode(order);
    if (!code) return 'Neurčeno';
    return usekLabelMap[code] || code;
  }, [getOrdererUsekCode, usekLabelMap]);

  // Sdílené accessory pro třídění detail tabulek objednávek v sekci Čerpání
  const spendOrderAcc = useMemo(() => ({
    ev_cislo:    o => o.ev_cislo || o.cislo || '',
    dt_obj:      o => getOrderDate(o) || '',
    predmet:     o => getOrderSubject(o) || '',
    objednatel:  o => getOrdererName(o) || '',
    schvalovatel: o => getSchvalovatelName(o) || '',
    usek:        o => getOrdererUsekCode(o) || '',
    financovani: o => getOrderFinancingLabel(o) || '',
    detail_fin:  o => getOrderFinancingRef(o) || '',
    stav:        o => getOrderStatusLabel(o) || '',
    castka:          o => String(getOrderAmount(o) || 0),
    fa_vs:           o => (invoicesByOrderId[String(o.id)] || [])[0]?.cislo_faktury || '',
    fa_typ:          o => (invoicesByOrderId[String(o.id)] || [])[0]?.fa_typ || '',
    fa_stav:         o => getInvoiceStatusLabel((invoicesByOrderId[String(o.id)] || [])[0]) || '',
    fa_castka:       o => (invoicesByOrderId[String(o.id)] || []).reduce((s, inv) => s + getInvoiceAmount(inv), 0),
    castka_polozek:  o => getOrderPlannedAmount(o) || 0,
    max_dph:         o => getOrderLimit(o) || 0,
    fk_stav:     o => ({OPEN:'4',IN_PROGRESS:'3',RESOLVED:'2',IGNORED:'1'})[fkStavMapRef.current[`ordersWithoutInvoice_${o.id}_0`]] || '0',
  }), [getOrderDate, getOrdererUsekCode, getOrderFinancingLabel, getOrderFinancingRef, getOrderStatusLabel, getOrderAmount, invoicesByOrderId, getInvoiceStatusLabel]);

  const getOrderActualAmount = useCallback((order) => {
    const invoicesForOrder = invoicesByOrderId[String(order?.id)] || [];
    const invoiceSum = invoicesForOrder.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
    if (invoiceSum > 0) return invoiceSum;
    return getOrderAmount(order);
  }, [invoicesByOrderId]);

  const getInvoiceApprovalDate = useCallback((order) => {
    const invoicesForOrder = invoicesByOrderId[String(order?.id)] || [];
    const dates = invoicesForOrder
      .map(inv => toDate(inv.datum_doruceni || inv.datum_vystaveni))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());
    return dates[0] || null;
  }, [invoicesByOrderId]);

  const summary = useMemo(() => {
    const activeOrders = filteredOrders.filter(order => {
      const status = getOrderStatusCode(order);
      return !status.includes('STORNO') && !status.includes('SMAZ');
    });
    const totalOrderAmount = activeOrders.reduce((sum, order) => sum + getOrderActualAmount(order), 0);
    const totalInvoiceAmount = filteredInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);

    const referencedContractIds = new Set();
    const referencedContractNumbers = new Set();
    filteredOrders.forEach(order => {
      if (order?.smlouva_id) referencedContractIds.add(String(order.smlouva_id));
      if (order?.cislo_smlouvy) referencedContractNumbers.add(String(order.cislo_smlouvy));
    });
    filteredInvoices.forEach(invoice => {
      if (invoice?.smlouva_id) referencedContractIds.add(String(invoice.smlouva_id));
      if (invoice?.cislo_smlouvy) referencedContractNumbers.add(String(invoice.cislo_smlouvy));
    });

    const activeContracts = contracts.filter(contract => {
      const spent = getContractSpent(contract);
      if (spent > 0) return true;
      const contractId = contract?.id != null ? String(contract.id) : '';
      const contractNumber = getContractNumber(contract);
      if (contractId && referencedContractIds.has(contractId)) return true;
      if (contractNumber && referencedContractNumbers.has(String(contractNumber))) return true;
      return false;
    });

    const totalContractLimit = activeContracts.reduce((sum, c) => sum + getContractLimit(c), 0);

    // Výpočet čerpání ze smluv - součet faktur navázaných na smlouvy
    // Preferujeme hodnotu ze smlouvy (cerpano), pokud není, počítáme z faktur
    let totalContractSpent = activeContracts.reduce((sum, c) => sum + getContractSpent(c), 0);
    
    // Pokud smlouvy nemají vyplněné čerpání, spočítáme ho z faktur
    if (totalContractSpent === 0 && filteredInvoices.length > 0) {
      // Sečteme faktury, které mají vazbu na smlouvu
      totalContractSpent = filteredInvoices.reduce((sum, invoice) => {
        const hasContractLink = invoice?.smlouva_id || invoice?.cislo_smlouvy;
        if (hasContractLink) {
          return sum + getInvoiceAmount(invoice);
        }
        return sum;
      }, 0);
    }

    return {
      totalOrders: activeOrders.length,
      totalInvoices: filteredInvoices.length,
      totalContracts: activeContracts.length,
      totalOrderAmount,
      totalInvoiceAmount,
      totalContractLimit,
      totalContractSpent
    };
  }, [filteredOrders, filteredInvoices, contracts, getOrderActualAmount, getOrderStatusCode]);

  const financingSummary = useMemo(() => {
    const activeOrders = filteredOrders.filter(order => {
      const status = getOrderStatusCode(order);
      return !status.includes('STORNO') && !status.includes('SMAZ');
    });
    const map = activeOrders.reduce((acc, order) => {
      const label = getOrderFinancingLabel(order) || 'Neurčeno';
      if (!acc[label]) acc[label] = { label, count: 0, amount: 0 };
      acc[label].count += 1;
      acc[label].amount += getOrderActualAmount(order);
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filteredOrders, getOrderFinancingLabel, getOrderStatusCode, getOrderActualAmount]);

  const controlSections = useMemo(() => {
    const now = new Date();

    const isCancelledOrder = (order) => {
      const statusCode = getOrderStatusCode(order);
      const statusLabel = getOrderStatusLabel(order);
      const statusRaw = `${statusCode} ${statusLabel}`.toUpperCase();
      return statusRaw.includes('STORNO') || statusRaw.includes('SMAZ') || statusRaw.includes('ZRUS') || statusRaw.includes('ZAMIT');
    };
    const activeOrders = filteredOrders.filter(o => !isCancelledOrder(o));

    const ordersOverLimit = activeOrders.filter(order => {
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      if (!invoicesForOrder.length) return false;
      const invoiceSum = invoicesForOrder.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
      const limit = getOrderLimit(order);
      return limit > 0 && invoiceSum > limit;
    });

    const ordersAfterInvoice = activeOrders.flatMap(order => {
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      const orderDate = toDateOnly(getOrderDate(order));
      return invoicesForOrder
        .filter(inv => {
          const invoiceDate = toDateOnly(inv.datum_doruceni || inv.datum_vystaveni);
          return orderDate && invoiceDate && invoiceDate < orderDate;
        })
        .map(inv => ({ order, invoice: inv }));
    });

    const ordersInvoicesWithoutAttachments = activeOrders.filter(order => {
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      if (!invoicesForOrder.length) return false;
      return invoicesForOrder.some(inv => {
        if (inv.ma_prilohy) return false;
        const invStatusRaw = String(inv.stav || inv.fa_stav || '').toUpperCase();
        if (invStatusRaw.includes('STORNO') || invStatusRaw.includes('SMAZ')) return false;
        return true;
      });
    });

    const invoicesWithoutAttachments = filteredInvoices.filter(inv => {
      if (inv.ma_prilohy) return false;
      // Vyloučit storno/smazané faktury
      const invStatusRaw = String(inv.stav || inv.fa_stav || '').toUpperCase();
      if (invStatusRaw.includes('STORNO') || invStatusRaw.includes('SMAZ')) return false;
      // Vyloučit faktury navázané na storno/zrušenou/zamítnutou objednávku
      if (inv.objednavka_id) {
        const order = ordersById.get(String(inv.objednavka_id));
        if (order && isCancelledOrder(order)) return false;
      }
      return true;
    });

    const overdueInvoices = filteredInvoices.filter(inv => {
      const dueDate = toDate(inv.datum_splatnosti);
      if (!dueDate) return false;
      const days = daysBetween(dueDate, now);
      if (days === null || days <= 14) return false;
      if (isInvoiceSettled(inv)) return false;
      // Vyloučit storno/smazané faktury
      const invStatusRaw = String(inv.stav || inv.fa_stav || '').toUpperCase();
      if (invStatusRaw.includes('STORNO') || invStatusRaw.includes('SMAZ')) return false;
      // Vyloučit faktury navázané na storno/zrušenou/zamítnutou objednávku
      if (inv.objednavka_id) {
        const order = ordersById.get(String(inv.objednavka_id));
        if (order && isCancelledOrder(order)) return false;
      }
      return true;
    });

    const cancelledOrders = filteredOrders.filter(order => {
      const statusCode = getOrderStatusCode(order);
      const statusLabel = getOrderStatusLabel(order);
      const statusRaw = `${statusCode} ${statusLabel}`.toUpperCase();
      return statusRaw.includes('STORNO') || statusRaw.includes('SMAZ') || statusRaw.includes('ZRUS') || statusRaw.includes('ZAMIT');
    });

    return {
      ordersOverLimit,
      ordersAfterInvoice,
      ordersInvoicesWithoutAttachments,
      invoicesWithoutAttachments,
      overdueInvoices,
      cancelledOrders
    };
  }, [filteredOrders, filteredInvoices, invoicesByOrderId, ordersById, getOrderStatusCode, getOrderStatusLabel, isInvoiceSettled]);

  // ─── Fin. kontrola: součty FA částek ────────────────────────────────────────
  const fkTotals = useMemo(() => {
    const ordersOverLimitFA = controlSections.ordersOverLimit.reduce((sum, o) =>
      sum + (invoicesByOrderId[String(o.id)] || []).reduce((s, inv) => s + getInvoiceAmount(inv), 0), 0);
    const ordersAfterInvoiceFA = controlSections.ordersAfterInvoice.reduce((sum, { invoice }) =>
      sum + getInvoiceAmount(invoice), 0);
    const ordersInvoicesWithoutAttachmentsFA = controlSections.ordersInvoicesWithoutAttachments.reduce((sum, o) =>
      sum + (invoicesByOrderId[String(o.id)] || []).reduce((s, inv) => s + getInvoiceAmount(inv), 0), 0);
    const invoicesWithoutAttachmentsFA = controlSections.invoicesWithoutAttachments.reduce((sum, inv) =>
      sum + getInvoiceAmount(inv), 0);
    const overdueInvoicesFA = controlSections.overdueInvoices.reduce((sum, inv) =>
      sum + getInvoiceAmount(inv), 0);
    return { ordersOverLimitFA, ordersAfterInvoiceFA, ordersInvoicesWithoutAttachmentsFA, invoicesWithoutAttachmentsFA, overdueInvoicesFA };
  }, [controlSections, invoicesByOrderId, getInvoiceAmount]);

  // ─── Vzdělávání: sekce ───────────────────────────────────────────────────────
  const vzdelSections = useMemo(() => {
    const allOrders = filteredOrders || [];
    // Vyloučit zrušené, zamítnuté, stornované objednávky
    const activeOrders = allOrders.filter(o => {
      const st = `${getOrderStatusCode(o)} ${getOrderStatusLabel(o)}`.toUpperCase();
      return !st.includes('STORNO') && !st.includes('SMAZ') && !st.includes('ZRUS') && !st.includes('ZAMIT');
    });
    // Standardně skrýt dokončené objednávky; zobrazit je jen při zaškrtnutém checkboxu (pouze lékařský blok)
    const vzdelBaseLek = showVzdelDokoncene
      ? activeOrders
      : activeOrders.filter(o => !String(o.stav_workflow_kod || '').toUpperCase().includes('DOKONCENA'));
    // Nelékařský zobrazuje vždy vše (bez filtru dokončených)
    const lekarsky = vzdelBaseLek.filter(o => matchDruhKw(getOrderTypeLabel(o), VZDEL_LEKARSKY_KW));
    const nelekarsky = activeOrders.filter(o => matchDruhKw(getOrderTypeLabel(o), VZDEL_NELEKARSKY_KW));
    // Strom: středisko → objednávky (union lékařský + nelékářský) – vždy vše
    const vzdelAll = activeOrders.filter(o =>
      matchDruhKw(getOrderTypeLabel(o), VZDEL_LEKARSKY_KW) ||
      matchDruhKw(getOrderTypeLabel(o), VZDEL_NELEKARSKY_KW)
    );
    const byStredisko = {};
    vzdelAll.forEach(o => {
      // strediska_kod: V3 list vrací JSON string nebo array
      const raw = o.strediska_kod;
      let strediskaCodes = [];
      if (Array.isArray(raw)) {
        strediskaCodes = raw.filter(Boolean);
      } else if (typeof raw === 'string' && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          strediskaCodes = Array.isArray(parsed) ? parsed.filter(Boolean) : [raw];
        } catch (e) {
          strediskaCodes = [raw];
        }
      }
      // ✅ OPTIMALIZACE: Přeskočit položky bez střediska (dříve NEURCENO)
      if (strediskaCodes.length === 0) return;
      
      const usekCode = getOrdererUsekCode(o) || 'NEURCENO';
      const usekLabel = getUsekLabel(o) || usekCode;
      strediskaCodes.forEach(sCode => {
        const sLabel = strediskaMap[String(sCode)] || String(sCode);
        if (!byStredisko[sCode]) byStredisko[sCode] = { code: sCode, label: sLabel, byUsek: {} };
        if (!byStredisko[sCode].byUsek[usekCode]) {
          byStredisko[sCode].byUsek[usekCode] = { code: usekCode, label: usekLabel, orders: [] };
        }
        byStredisko[sCode].byUsek[usekCode].orders.push(o);
      });
    });
    return { lekarsky, nelekarsky, byStredisko };
  }, [filteredOrders, showVzdelDokoncene, getOrderTypeLabel, getOrdererUsekCode, getUsekLabel, strediskaMap, getOrderStatusCode, getOrderStatusLabel]);

  // Helper: Výpočet priority pro defaultní třídění vzdělávání (čím nižší, tím vyšší priorita)
  const getVzdelOrderPriority = useCallback((order) => {
    const invoices = invoicesByOrderId[String(order.id)] || [];
    const hasZalohova = invoices.some(inv => (inv.fa_typ || inv.typ) === 'ZALOHOVA');
    const hasVyuctovaci = invoices.some(inv => (inv.fa_typ || inv.typ) === 'VYUCTOVACI');
    const isHighlighted = hasZalohova && hasVyuctovaci;
    const isZkontrolovana = String(order.stav_workflow_kod || '').toUpperCase().includes('ZKONTROLOVANA');
    const isEnabled = isZkontrolovana && isHighlighted && order.attachment_color === '#16a34a';
    
    // Priorita 1: Připravené k dokončení (zelené, aktivní tlačítko)
    if (isEnabled) return 1000000 - (order.id || 0); // Čím vyšší ID, tím výš (novější první)
    
    // Priorita 2: Blízko k dokončení (hodně příloh, ale ještě ne všechny)
    const orderAttachCount = order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0;
    const invoiceAttachCount = invoices.reduce((sum, inv) => sum + (inv.pocet_priloh ?? inv.prilohy_count ?? inv.prilohy?.length ?? 0), 0);
    const totalAttachCount = orderAttachCount + invoiceAttachCount;
    if (totalAttachCount > 0) {
      return 2000000 - totalAttachCount * 1000 - (order.id || 0); // Více příloh = vyšší (nižší prioritní číslo)
    }
    
    // Priorita 3: Ostatní dle ID (jak přibývaly do systému)
    return 3000000 + (order.id || 0);
  }, [invoicesByOrderId]);

  const pagedVzdelLekarsky = useMemo(() => {
    const acc = {
      ev_cislo:     o => o.ev_cislo || o.cislo_objednavky || '',
      fa_vs:        o => (invoicesByOrderId[String(o.id)] || [])[0]?.cislo_faktury || '',
      fa_typ:       o => (invoicesByOrderId[String(o.id)] || [])[0]?.fa_typ || '',
      fa_poznamka:  o => (invoicesByOrderId[String(o.id)] || [])[0]?.fa_poznamka || '',
      dt_dorucena:  o => (invoicesByOrderId[String(o.id)] || [])[0]?.datum_doruceni || '',
      splatnost:    o => (invoicesByOrderId[String(o.id)] || [])[0]?.datum_splatnosti || '',
      castka:       o => getOrderAmount(o),
      ev_cislo_obj: o => o.ev_cislo || o.cislo_objednavky || '',
      usek:         o => getOrdererUsekCode(o) || '',
      detail_fin:   o => getOrderFinancingRef(o),
      castka_celk:  o => { const invs = invoicesByOrderId[String(o.id)] || []; const faSum = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0); const pol = getOrderPlannedAmount(o) || 0; const mx = getOrderLimit(o) || 0; return faSum > 0 ? faSum : pol > 0 ? pol : mx; },
      stav_obj:     o => getOrderStatusLabel(o),
      stav_fa:      o => getInvoiceStatusLabel((invoicesByOrderId[String(o.id)] || [])[0]) || '',
    };
    
    // Defaultní třídění podle priority (pokud není aktivní třídění na sloupci)
    const s = tableSorts['vzdelLekarsky'];
    let dataToSort = vzdelSections.lekarsky;
    if (!s?.field) {
      // Aplikuj defaultní třídění podle priority
      dataToSort = [...vzdelSections.lekarsky].sort((a, b) => getVzdelOrderPriority(a) - getVzdelOrderPriority(b));
    }
    
    return getPagedItems(sortTableData(dataToSort, 'vzdelLekarsky', acc), 'vzdelLekarsky');
  }, [vzdelSections.lekarsky, getPagedItems, sortTableData, invoicesByOrderId, getOrderAmount, getOrdererUsekCode, getOrderFinancingRef, getOrderStatusLabel, getInvoiceStatusLabel, getInvoiceAmount, getOrderPlannedAmount, getOrderLimit, getVzdelOrderPriority, tableSorts]);

  // Školení nelékařské – seskupení Úsek → Financování (styl jako dodavatelé)
  const vzdelNelByUsekFin = useMemo(() => {
    const groups = {};
    (vzdelSections.nelekarsky || []).forEach(order => {
      const usekCode = getOrdererUsekCode(order) || '__none__';
      const usekLabel = getOrdererUsekLabel(order) || 'Neurčeno';
      const finCode = getOrderFinancingCode(order) || '__none__';
      const finLabel = getOrderFinancingLabel(order) || 'Neurčeno';
      if (!groups[usekCode]) groups[usekCode] = { code: usekCode, label: usekLabel, financing: {}, totalCount: 0, totalAmount: 0 };
      if (!groups[usekCode].financing[finCode]) groups[usekCode].financing[finCode] = { code: finCode, label: finLabel, orders: [], count: 0, amount: 0 };
      const amt = getOrderAmount(order);
      groups[usekCode].financing[finCode].orders.push(order);
      groups[usekCode].financing[finCode].count += 1;
      groups[usekCode].financing[finCode].amount += amt;
      groups[usekCode].totalCount += 1;
      groups[usekCode].totalAmount += amt;
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [vzdelSections.nelekarsky, getOrdererUsekCode, getOrdererUsekLabel, getOrderFinancingCode, getOrderFinancingLabel, getOrderAmount]);

  const vzdelLekarskyTotal = useMemo(() => vzdelSections.lekarsky.reduce((sum, o) => {
    const invs = invoicesByOrderId[String(o.id)] || [];
    const faSum = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
    const pol = getOrderPlannedAmount(o) || 0;
    const mx = getOrderLimit(o) || 0;
    return sum + (faSum > 0 ? faSum : pol > 0 ? pol : mx);
  }, 0), [vzdelSections.lekarsky, invoicesByOrderId, getInvoiceAmount, getOrderPlannedAmount, getOrderLimit]);

  const vzdelNelekarskyTotal = useMemo(() => vzdelSections.nelekarsky.reduce((sum, o) => {
    const invs = invoicesByOrderId[String(o.id)] || [];
    const faSum = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
    const pol = getOrderPlannedAmount(o) || 0;
    const mx = getOrderLimit(o) || 0;
    return sum + (faSum > 0 ? faSum : pol > 0 ? pol : mx);
  }, 0), [vzdelSections.nelekarsky, invoicesByOrderId, getInvoiceAmount, getOrderPlannedAmount, getOrderLimit]);

  // Blok 3 – Typ (lékařské / nelékařské) → Středisko → Úsek
  const vzdelByTypStredisko = useMemo(() => {
    const calcAmt = (o) => {
      const invs = invoicesByOrderId[String(o.id)] || [];
      const faSum = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
      const pol = getOrderPlannedAmount(o) || 0;
      const mx = getOrderLimit(o) || 0;
      return faSum > 0 ? faSum : pol > 0 ? pol : mx;
    };
    const typDefs = [
      { key: 'lekarsky',   label: 'Vzdělávání – kurzy zdravotnické a lékařské', kws: VZDEL_LEKARSKY_KW,   tone: 'info' },
      { key: 'nelekarsky', label: 'Školení nezdravotnické',                      kws: VZDEL_NELEKARSKY_KW, tone: 'warn' },
    ];
    return typDefs.map(typDef => {
      const orders = vzdelSections[typDef.key] || [];
      const byStredisko = {};
      orders.forEach(o => {
        const raw = o.strediska_kod;
        let sCodes = [];
        if (Array.isArray(raw)) { sCodes = raw.filter(Boolean); }
        else if (typeof raw === 'string' && raw.trim()) {
          try { const p = JSON.parse(raw); sCodes = Array.isArray(p) ? p.filter(Boolean) : [raw]; } catch (e) { sCodes = [raw]; }
        }
        // ✅ OPTIMALIZACE: Přeskočit položky bez střediska (dříve NEURCENO)
        if (sCodes.length === 0) return;
        
        const usekCode = getOrdererUsekCode(o) || 'NEURCENO';
        const usekLabel = getUsekLabel(o) || usekCode;
        sCodes.forEach(sCode => {
          const sLabel = strediskaMap[String(sCode)] || String(sCode);
          if (!byStredisko[sCode]) byStredisko[sCode] = { code: sCode, label: sLabel, byUsek: {}, totalCount: 0, completedCount: 0, totalAmount: 0 };
          if (!byStredisko[sCode].byUsek[usekCode]) byStredisko[sCode].byUsek[usekCode] = { code: usekCode, label: usekLabel, orders: [], count: 0, completedCount: 0, amount: 0 };
          const amt = calcAmt(o);
          const statusCode = getOrderStatusCode(o);
          const isCompleted = statusCode.includes('DOKON') || statusCode.includes('UZAVR');
          byStredisko[sCode].byUsek[usekCode].orders.push(o);
          byStredisko[sCode].byUsek[usekCode].count += 1;
          if (isCompleted) byStredisko[sCode].byUsek[usekCode].completedCount += 1;
          byStredisko[sCode].byUsek[usekCode].amount += amt;
          byStredisko[sCode].totalCount += 1;
          if (isCompleted) byStredisko[sCode].completedCount += 1;
          byStredisko[sCode].totalAmount += amt;
        });
      });
      const strediskaArr = Object.values(byStredisko).sort((a, b) => (a.label || a.code).localeCompare(b.label || b.code, 'cs-CZ'));
      const totalCount = strediskaArr.reduce((s, st) => s + st.totalCount, 0);
      const totalCompleted = strediskaArr.reduce((s, st) => s + (st.completedCount || 0), 0);
      const totalAmount = strediskaArr.reduce((s, st) => s + st.totalAmount, 0);
      return { key: typDef.key, label: typDef.label, tone: typDef.tone, strediska: strediskaArr, totalCount, totalCompleted, totalAmount };
    }).filter(t => t.totalCount > 0);
  }, [vzdelSections, invoicesByOrderId, getOrdererUsekCode, getUsekLabel, strediskaMap, getInvoiceAmount, getOrderPlannedAmount, getOrderLimit, getOrderStatusCode]);

  const reportSections = useMemo(() => {
    const now = new Date();
    const approvedStatuses = ['SCHVAL', 'DOKON', 'K_ZAPLACENI', 'UZAVR', 'UHRAD'];

    const ordersWithoutInvoice = filteredOrders.filter(order => {
      const status = getOrderStatusCode(order);
      const statusOk = approvedStatuses.some(flag => status.includes(flag));
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      if (!statusOk || invoicesForOrder.length) return false;
      const createdAt = toDate(getOrderDate(order));
      if (!createdAt) return false;
      const days = daysBetween(createdAt, now);
      return days !== null && days >= 60;
    });

    const ordersWithInvoiceNotDone = filteredOrders.filter(order => {
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      if (!invoicesForOrder.length) return false;
      const status = getOrderStatusCode(order);
      const isDone = status.includes('DOKON') || status.includes('UZAVR');
      if (isDone) return false;
      const type = getOrderTypeLabel(order).toLowerCase();
      return !type.includes('vzd');
    });

    // Mapa IČO → { total, active, items: [{cislo, isValid}] }
    var todayStr = new Date().toISOString().slice(0, 10);
    var contractsByIcoMap = {};
    (contracts || []).forEach(function(c) {
      var cIco = c ? String(c.ico || '').trim() : '';
      if (cIco) {
        if (!contractsByIcoMap[cIco]) contractsByIcoMap[cIco] = { total: 0, active: 0, items: [] };
        contractsByIcoMap[cIco].total += 1;
        var isAktivni = c.aktivni !== 0 && c.aktivni !== '0' && c.aktivni != null;
        var platnostDo = c.platnost_do ? String(c.platnost_do).slice(0, 10) : '2099-12-31';
        var isValid = isAktivni && platnostDo >= todayStr;
        if (isValid) contractsByIcoMap[cIco].active += 1;
        var cislo = c.cislo_smlouvy || c.cislo || '';
        if (cislo) contractsByIcoMap[cIco].items.push({ cislo: cislo, isValid: isValid });
      }
    });

    const supplierGroups = {};
    filteredOrders.forEach(function(order) {
      var supplier = getSupplierName(order) || 'Neurčeno';
      var finCode = getOrderFinancingCode(order) || '__none__';
      var finLabel = getOrderFinancingLabel(order) || 'Neurčeno';
      var amount = getOrderAmount(order);
      if (!supplierGroups[supplier]) supplierGroups[supplier] = { code: supplier, label: supplier, ico: '', financovani: {}, finCodes: {}, totalCount: 0, totalAmount: 0, smlouvyActive: 0, smlouvyTotal: 0, smlouvyItems: [] };
      // Sbíráme IČO z objednávek (první nenulové)
      if (!supplierGroups[supplier].ico) {
        var orderIco = order ? String(order.dodavatel_ico || '').trim() : '';
        if (orderIco) {
          supplierGroups[supplier].ico = orderIco;
          var icoStats = contractsByIcoMap[orderIco];
          supplierGroups[supplier].smlouvyActive = icoStats ? icoStats.active : 0;
          supplierGroups[supplier].smlouvyTotal = icoStats ? icoStats.total : 0;
          supplierGroups[supplier].smlouvyItems = icoStats ? icoStats.items : [];
        }
      }
      // Sledujeme typy financování pro detekci mix (smlouva + ne-smlouva)
      supplierGroups[supplier].finCodes[finCode] = true;
      if (!supplierGroups[supplier].financovani[finCode]) supplierGroups[supplier].financovani[finCode] = { code: finCode, label: finLabel, orders: [], count: 0, amount: 0 };
      supplierGroups[supplier].financovani[finCode].orders.push(order);
      supplierGroups[supplier].financovani[finCode].count += 1;
      supplierGroups[supplier].financovani[finCode].amount += amount;
      supplierGroups[supplier].totalCount += 1;
      supplierGroups[supplier].totalAmount += amount;
    });
    // Přidáme flagy pro barevné zvýraznění
    Object.values(supplierGroups).forEach(function(g) {
      // ✅ POJISTNÁ UDÁLOST se IGNORUJE při výpočtu barevných stavů (zobrazí se jen v seznamu)
      var codes = Object.keys(g.finCodes || {}).filter(function(c) { return c !== 'POJISTNA_UDALOST'; });
      var hasSmlouvaFin = codes.indexOf('SMLOUVA') >= 0;
      // Chyba (mix) jen pro: LP a INDIVIDUÁLNÍ SCHVÁLENÍ
      var hasOther = codes.some(function(c) { 
        return c !== 'SMLOUVA' && c !== '__none__'; 
      });
      g.hasMixedFinancing = hasSmlouvaFin && hasOther;
      // Má platnou smlouvu ale vůbec z ní nečerpá (žádná obj. se SMLOUVA financováním)
      g.hasContractNoUsage = g.smlouvyActive > 0 && !hasSmlouvaFin;
    });
    var topSuppliers = Object.values(supplierGroups).sort(function(a, b) { return b.totalAmount - a.totalAmount; });

    // Objednávky s LP financováním, které mají fakturu s potvrzenou věcnou správností, ale chybí čerpání LP
    // Detekce pomocí lp_cerpani_count z backendu (subquery v invoices25/list)
    const ordersWithMissingLpCerpani = filteredOrders.filter(order => {
      const finCode = String(getOrderFinancingCode(order) || '').toUpperCase();
      if (finCode !== 'LP') return false;
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      if (!invoicesForOrder.length) return false;
      // Faktura musí mít potvrzenou věcnou správnost A lp_cerpani_count = 0 (z DB subquery)
      return invoicesForOrder.some(invoice => {
        const hasConfirmedMaterialCorrectness = invoice.potvrdil_vecnou_spravnost_id || invoice.potvrdil_vecnou_spravnost_zkracene;
        return hasConfirmedMaterialCorrectness && invoice.lp_cerpani_count === 0;
      });
    });

    return {
      ordersWithoutInvoice,
      ordersWithInvoiceNotDone,
      topSuppliers,
      ordersWithMissingLpCerpani
    };
  }, [filteredOrders, invoicesByOrderId, getOrderStatusCode, getOrderTypeLabel, getOrderFinancingCode, getOrderFinancingLabel, getOrderAmount, contracts]);

  const pagedOrdersOverLimit = useMemo(() => {
    const fkFilter = o => {
      const stav = fkStavMapRef.current[`ordersOverLimit_${o.id}_0`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const acc = {
      ev_cislo:    o => o.ev_cislo || o.cislo_objednavky || '',
      fa_vs:       o => (invoicesByOrderId[String(o.id)] || [])[0]?.cislo_faktury || '',
      fa_typ:      o => (invoicesByOrderId[String(o.id)] || [])[0]?.fa_typ || '',
      dt_obj:      o => getOrderDate(o) || '',
      predmet:     o => getOrderSubject(o) || '',
      limit:       o => getOrderLimit(o) ?? 0,
      fa_castka:   o => (invoicesByOrderId[String(o.id)] || []).reduce((s, inv) => s + getInvoiceAmount(inv), 0),
      objednatel:  o => getOrdererName(o),
      schvalovatel: o => getSchvalovatelName(o),
      usek:        o => getOrdererUsekLabel(o),
      financovani: o => getOrderFinancingLabel(o),
      detail_fin:  o => getOrderFinancingRef(o),
      druh:        o => getOrderTypeLabel(o),
      stav:        o => getOrderStatusLabel(o),
      stav_fa:     o => getInvoiceStatusLabel((invoicesByOrderId[String(o.id)] || [])[0]) || '',
      vecna_spravnost: o => (invoicesByOrderId[String(o.id)] || [])[0]?.potvrdil_vecnou_spravnost_zkracene || '',
      vecna_datum: o => (invoicesByOrderId[String(o.id)] || [])[0]?.dt_potvrzeni_vecne_spravnosti || '',
      vecna_poznamka: o => (invoicesByOrderId[String(o.id)] || [])[0]?.vecna_spravnost_poznamka || '',
      fk_stav:        o => ({OPEN:'4',IN_PROGRESS:'3',RESOLVED:'2',IGNORED:'1'})[fkStavMapRef.current[`ordersOverLimit_${o.id}_0`]] || '0',
    };
    return getPagedItems(sortTableData(controlSections.ordersOverLimit.filter(fkFilter), 'ordersOverLimit', acc), 'ordersOverLimit');
  }, [controlSections.ordersOverLimit, showFkIgnorovano, showFkVyreseno, fkStavVersion, getPagedItems, sortTableData, getOrderDate, getOrdererName, getSchvalovatelName, getOrdererUsekLabel, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrderStatusLabel, invoicesByOrderId, getInvoiceStatusLabel]);

  const pagedOrdersAfterInvoice = useMemo(() => {
    const fkFilter = item => {
      const stav = fkStavMapRef.current[`ordersAfterInvoice_${item.order?.id}_${item.invoice?.id}`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const acc = {
      ev_cislo:       item => item.order?.ev_cislo || item.order?.cislo_objednavky || '',
      fa_vs:          item => item.invoice?.cislo_faktury || '',
      fa_typ:         item => item.invoice?.fa_typ || '',
      dt_fa:          item => item.invoice?.datum_doruceni || item.invoice?.datum_vystaveni || '',
      dt_obj_created: item => getOrderDate(item.order) || '',
      objednatel:     item => getOrdererName(item.order),
      schvalovatel:   item => getSchvalovatelName(item.order),
      usek:           item => getOrdererUsekLabel(item.order),
      financovani:    item => getOrderFinancingLabel(item.order),
      detail_fin:     item => getOrderFinancingRef(item.order),
      druh:           item => getOrderTypeLabel(item.order),
      stav:           item => getOrderStatusLabel(item.order),
      stav_fa:        item => getInvoiceStatusLabel(item.invoice) || '',
      fa_castka:      item => getInvoiceAmount(item.invoice),
      fk_stav:        item => ({OPEN:'4',IN_PROGRESS:'3',RESOLVED:'2',IGNORED:'1'})[fkStavMapRef.current[`ordersAfterInvoice_${item.order?.id}_${item.invoice?.id}`]] || '0',
    };
    return getPagedItems(sortTableData(controlSections.ordersAfterInvoice.filter(fkFilter), 'ordersAfterInvoice', acc), 'ordersAfterInvoice');
  }, [controlSections.ordersAfterInvoice, showFkIgnorovano, showFkVyreseno, fkStavVersion, getPagedItems, sortTableData, getOrderDate, getOrdererName, getSchvalovatelName, getOrdererUsekLabel, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrderStatusLabel, getInvoiceStatusLabel, getInvoiceAmount]);
  const pagedOrdersInvoicesWithoutAttachments = useMemo(() => {
    const fkFilter = o => {
      const stav = fkStavMapRef.current[`ordersInvoicesWithoutAttachments_${o.id}_0`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const acc = {
      ev_cislo:     o => o.ev_cislo || o.cislo_objednavky || '',
      fa_vs:        o => (invoicesByOrderId[String(o.id)] || [])[0]?.cislo_faktury || '',
      fa_typ:       o => (invoicesByOrderId[String(o.id)] || [])[0]?.fa_typ || '',
      dt_obj:       o => getOrderDate(o) || '',
      predmet:      o => getOrderSubject(o) || '',
      objednatel:   o => getOrdererName(o),
      schvalovatel: o => getSchvalovatelName(o),
      usek:         o => getOrdererUsekLabel(o),
      financovani:  o => getOrderFinancingLabel(o),
      detail_fin:   o => getOrderFinancingRef(o),
      druh:         o => getOrderTypeLabel(o),
      stav_obj:     o => getOrderStatusLabel(o),
      stav_fa:      o => (invoicesByOrderId[String(o.id)] || []).map(inv => getInvoiceStatusLabel(inv)).join(' '),
      prilohy_obj:  o => o.prilohy_count ?? (Array.isArray(o.prilohy) ? o.prilohy.length : 0),
      prilohy_fa:   o => (invoicesByOrderId[String(o.id)] || []).reduce((s, inv) => s + (Number(inv.pocet_priloh) || 0), 0),
      fa_castka:    o => (invoicesByOrderId[String(o.id)] || []).reduce((s, inv) => s + getInvoiceAmount(inv), 0),
      fk_stav:      o => ({OPEN:'4',IN_PROGRESS:'3',RESOLVED:'2',IGNORED:'1'})[fkStavMapRef.current[`ordersInvoicesWithoutAttachments_${o.id}_0`]] || '0',
    };
    return getPagedItems(sortTableData(controlSections.ordersInvoicesWithoutAttachments.filter(fkFilter), 'ordersInvoicesWithoutAttachments', acc), 'ordersInvoicesWithoutAttachments');
  }, [controlSections.ordersInvoicesWithoutAttachments, showFkIgnorovano, showFkVyreseno, fkStavVersion, getPagedItems, sortTableData, invoicesByOrderId, getOrderDate, getOrdererName, getSchvalovatelName, getOrdererUsekLabel, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrderStatusLabel, getInvoiceAmount]);
  const pagedInvoicesWithoutAttachments = useMemo(() => {
    const fkFilter = inv => {
      const stav = fkStavMapRef.current[`invoicesWithoutAttachments_0_${inv.id}`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const acc = {
      fa_vs:        inv => inv.cislo_faktury || '',
      fa_typ:       inv => inv.fa_typ || '',
      dt_dorucena:  inv => inv.datum_doruceni || inv.datum_vystaveni || '',
      stav_fa:      inv => getInvoiceStatusLabel(inv) || '',
      ev_cislo:     inv => inv.cislo_objednavky || inv.smlouva_id || '',
      castka:       inv => getInvoiceAmount(inv),
      stav_obj:     inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderStatusLabel(o) : ''; },
      schvalovatel: inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getApproverName(o) : ''; },
      usek:         inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrdererUsekCode(o) : (inv.usek_zkr || ''); },
      financovani:  inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderFinancingLabel(o) : ''; },
      detail_fin:   inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderFinancingRef(o) : ''; },
      druh:         inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderTypeLabel(o) : ''; },
      prilohy_obj:  inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? Number(o.pocet_priloh ?? o.prilohy_count ?? 0) : 0; },
      prilohy_fa:   inv => Number(inv.pocet_priloh ?? (Array.isArray(inv.prilohy) ? inv.prilohy.length : 0)),
      fk_stav:      inv => ({OPEN:'4',IN_PROGRESS:'3',RESOLVED:'2',IGNORED:'1'})[fkStavMapRef.current[`invoicesWithoutAttachments_0_${inv.id}`]] || '0',
    };
    return getPagedItems(sortTableData(controlSections.invoicesWithoutAttachments.filter(fkFilter), 'invoicesWithoutAttachments', acc), 'invoicesWithoutAttachments');
  }, [controlSections.invoicesWithoutAttachments, showFkIgnorovano, showFkVyreseno, fkStavVersion, getPagedItems, sortTableData, getInvoiceStatusLabel, ordersById, getOrderStatusLabel, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrdererUsekCode]);
  const pagedOverdueInvoices = useMemo(() => {
    const fkFilter = inv => {
      const stav = fkStavMapRef.current[`overdueInvoices_0_${inv.id}`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const acc = {
      fa_vs:        inv => inv.cislo_faktury || '',
      fa_typ:       inv => inv.fa_typ || '',
      dt_dorucena:  inv => inv.datum_doruceni || inv.datum_vystaveni || '',
      evidoval:     inv => inv.vytvoril_uzivatel_zkracene || '',
      predana:      inv => inv.fa_predana_zam_jmeno_cele || '',
      stav_fa:      inv => getInvoiceStatusLabel(inv) || '',
      castka:       inv => getInvoiceAmount(inv),
      splatnost:    inv => inv.datum_splatnosti || '',
      ev_cislo:     inv => inv.cislo_objednavky || inv.smlouva_id || '',
      stav_obj:     inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderStatusLabel(o) : ''; },
      usek:         inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrdererUsekCode(o) : (inv.usek_zkr || ''); },
      financovani:  inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderFinancingLabel(o) : ''; },
      detail_fin:   inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderFinancingRef(o) : ''; },
      druh:         inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? getOrderTypeLabel(o) : ''; },
      prilohy_obj:  inv => { const o = ordersById.get(String(inv.objednavka_id)); return o ? Number(o.pocet_priloh ?? o.prilohy_count ?? 0) : 0; },
      prilohy_fa:   inv => Number(inv.pocet_priloh ?? (Array.isArray(inv.prilohy) ? inv.prilohy.length : 0)),
      fk_stav:      inv => ({OPEN:'4',IN_PROGRESS:'3',RESOLVED:'2',IGNORED:'1'})[fkStavMapRef.current[`overdueInvoices_0_${inv.id}`]] || '0',
    };
    return getPagedItems(sortTableData(controlSections.overdueInvoices.filter(fkFilter), 'overdueInvoices', acc), 'overdueInvoices');
  }, [controlSections.overdueInvoices, showFkIgnorovano, showFkVyreseno, fkStavVersion, getPagedItems, sortTableData, getInvoiceStatusLabel, ordersById, getOrderStatusLabel, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrdererUsekCode]);
  const pagedCancelledOrders = useMemo(() => {
    const acc = {
      ev_cislo:    o => o.ev_cislo || o.cislo_objednavky || '',
      dt_obj:      o => getOrderDate(o) || '',
      predmet:     o => getOrderSubject(o) || '',
      stav:        o => getOrderStatusLabel(o),
      objednatel:  o => getOrdererName(o),
      schvalovatel: o => getSchvalovatelName(o),
      usek:        o => getOrdererUsekLabel(o),
      financovani: o => getOrderFinancingLabel(o),
      detail_fin:  o => getOrderFinancingRef(o),
      druh:        o => getOrderTypeLabel(o),
      pocet_fa:    o => (invoicesByOrderId[String(o.id)] || []).length,
    };
    return getPagedItems(sortTableData(controlSections.cancelledOrders, 'cancelledOrders', acc), 'cancelledOrders');
  }, [controlSections.cancelledOrders, getPagedItems, sortTableData, getOrderDate, getOrderStatusLabel, getOrdererName, getSchvalovatelName, getOrdererUsekLabel, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, invoicesByOrderId]);
  const pagedFinancingOptions = useMemo(
    () => getPagedItems(financingOptions, 'financingOptions'),
    [financingOptions, getPagedItems]
  );

  // API tabulky "Objednávky bez příloh" a "Faktury bez příloh" již jsou setříděné z backendu
  const displayOrdersWithoutAttachments = ordersWithoutAttachments?.data || [];
  const displayInvoicesWithoutAttachments = invoicesWithoutAttachments?.data || [];

  const usekSpendSummary = useMemo(() => {
    const map = filteredOrders.reduce((acc, order) => {
      const label = getOrdererUsekLabel(order);
      if (!acc[label]) acc[label] = { label, count: 0, amount: 0 };
      acc[label].count += 1;
      acc[label].amount += getOrderActualAmount(order);
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filteredOrders, getOrdererUsekLabel, getOrderActualAmount]);

  const pagedUseky = useMemo(
    () => getPagedItems(usekSpendSummary, 'usekySpend'),
    [usekSpendSummary, getPagedItems]
  );

  const spendByFinancingGroups = useMemo(() => {
    if (activeTab !== 'spend') return []; // ⚡ Skip výpočet když tab není aktivní
    const groups = {};
    filteredOrders.forEach(order => {
      const finCode = getOrderFinancingCode(order) || '__none__';
      const finLabel = getOrderFinancingLabel(order) || 'Neurčeno';
      const usekCode = getOrdererUsekCode(order) || '__none__';
      const usekLabel = getOrdererUsekLabel(order) || 'Neurčeno';
      if (!groups[finCode]) {
        groups[finCode] = { code: finCode, label: finLabel, useky: {}, totalCount: 0, totalAmount: 0 };
      }
      if (!groups[finCode].useky[usekCode]) {
        groups[finCode].useky[usekCode] = { code: usekCode, label: usekLabel, orders: [], count: 0, amount: 0 };
      }
      const amt = getOrderAmount(order);
      groups[finCode].useky[usekCode].orders.push(order);
      groups[finCode].useky[usekCode].count += 1;
      groups[finCode].useky[usekCode].amount += amt;
      groups[finCode].totalCount += 1;
      groups[finCode].totalAmount += amt;
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [activeTab, filteredOrders, getOrderFinancingCode, getOrderFinancingLabel, getOrdererUsekCode, getOrdererUsekLabel, getOrderAmount]);

  // Úsek → Financování
  const spendByUsekGroups = useMemo(() => {
    if (activeTab !== 'spend') return []; // ⚡ Skip výpočet když tab není aktivní
    const groups = {};
    filteredOrders.forEach(order => {
      const usekCode = getOrdererUsekCode(order) || '__none__';
      const usekLabel = getOrdererUsekLabel(order) || 'Neurčeno';
      const finCode = getOrderFinancingCode(order) || '__none__';
      const finLabel = getOrderFinancingLabel(order) || 'Neurčeno';
      if (!groups[usekCode]) groups[usekCode] = { code: usekCode, label: usekLabel, financing: {}, totalCount: 0, totalAmount: 0 };
      if (!groups[usekCode].financing[finCode]) groups[usekCode].financing[finCode] = { code: finCode, label: finLabel, orders: [], count: 0, amount: 0 };
      const amt = getOrderAmount(order);
      groups[usekCode].financing[finCode].orders.push(order);
      groups[usekCode].financing[finCode].count += 1;
      groups[usekCode].financing[finCode].amount += amt;
      groups[usekCode].totalCount += 1;
      groups[usekCode].totalAmount += amt;
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [activeTab, filteredOrders, getOrderFinancingCode, getOrderFinancingLabel, getOrdererUsekCode, getOrdererUsekLabel, getOrderAmount]);

  // Druh objednávky → Financování
  const spendByDruhGroups = useMemo(() => {
    if (activeTab !== 'spend') return []; // ⚡ Skip výpočet když tab není aktivní
    const groups = {};
    filteredOrders.forEach(order => {
      const druhCode = getOrderTypeCode(order) || '__none__';
      const druhLabel = getOrderTypeLabel(order) || 'Neurčeno';
      const finCode = getOrderFinancingCode(order) || '__none__';
      const finLabel = getOrderFinancingLabel(order) || 'Neurčeno';
      if (!groups[druhCode]) groups[druhCode] = { code: druhCode, label: druhLabel, financing: {}, totalCount: 0, totalAmount: 0 };
      if (!groups[druhCode].financing[finCode]) groups[druhCode].financing[finCode] = { code: finCode, label: finLabel, orders: [], count: 0, amount: 0 };
      const amt = getOrderAmount(order);
      groups[druhCode].financing[finCode].orders.push(order);
      groups[druhCode].financing[finCode].count += 1;
      groups[druhCode].financing[finCode].amount += amt;
      groups[druhCode].totalCount += 1;
      groups[druhCode].totalAmount += amt;
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [activeTab, filteredOrders, getOrderFinancingCode, getOrderFinancingLabel, getOrderTypeCode, getOrderTypeLabel, getOrderAmount]);

  // Financování → Úsek → Druh objednávky
  const spendByFinancingUsekDruhGroups = useMemo(() => {
    if (activeTab !== 'spend') return []; // ⚡ Skip výpočet když tab není aktivní
    const groups = {};
    filteredOrders.forEach(order => {
      const finCode = getOrderFinancingCode(order) || '__none__';
      const finLabel = getOrderFinancingLabel(order) || 'Neurčeno';
      const usekCode = getOrdererUsekCode(order) || '__none__';
      const usekLabel = getOrdererUsekLabel(order) || 'Neurčeno';
      const druhCode = getOrderTypeCode(order) || '__none__';
      const druhLabel = getOrderTypeLabel(order) || 'Neurčeno';
      if (!groups[finCode]) groups[finCode] = { code: finCode, label: finLabel, useky: {}, totalCount: 0, totalAmount: 0 };
      if (!groups[finCode].useky[usekCode]) groups[finCode].useky[usekCode] = { code: usekCode, label: usekLabel, druhy: {}, count: 0, amount: 0 };
      if (!groups[finCode].useky[usekCode].druhy[druhCode]) groups[finCode].useky[usekCode].druhy[druhCode] = { code: druhCode, label: druhLabel, orders: [], count: 0, amount: 0 };
      const amt = getOrderAmount(order);
      groups[finCode].useky[usekCode].druhy[druhCode].orders.push(order);
      groups[finCode].useky[usekCode].druhy[druhCode].count += 1;
      groups[finCode].useky[usekCode].druhy[druhCode].amount += amt;
      groups[finCode].useky[usekCode].count += 1;
      groups[finCode].useky[usekCode].amount += amt;
      groups[finCode].totalCount += 1;
      groups[finCode].totalAmount += amt;
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [activeTab, filteredOrders, getOrderFinancingCode, getOrderFinancingLabel, getOrdererUsekCode, getOrdererUsekLabel, getOrderTypeCode, getOrderTypeLabel, getOrderAmount]);

  // Smlouvy → objednávky čerpající ze smlouvy
  const spendBySmlouvyGroups = useMemo(() => {
    if (activeTab !== 'spend') return []; // ⚡ Skip výpočet když tab není aktivní
    const groups = {};
    filteredOrders.forEach(order => {
      const finCode = String(getOrderFinancingCode(order) || '').toUpperCase();
      if (finCode !== 'SMLOUVA') return;
      const ref = getOrderFinancingRef(order) || (order?.smlouva_id ? '#' + order.smlouva_id : null);
      if (!ref) return;
      const key = ref;
      if (!groups[key]) {
        const smInfo = order?._enriched?.smlouva_info;
        groups[key] = {
          code: key, label: ref, orders: [], count: 0, amount: 0,
          dodavatel: smInfo?.nazev_firmy || null,
          ico: smInfo?.ico || null,
          smlouva_hodnota: smInfo?.hodnota ? parseFloat(smInfo.hodnota) : null
        };
      }
      // Doplnit dodavatele/IČO/hodnotu pokud předchozí objednávka neměla
      if (!groups[key].dodavatel || !groups[key].ico || groups[key].smlouva_hodnota === null) {
        const smInfo = order?._enriched?.smlouva_info;
        if (smInfo?.nazev_firmy && !groups[key].dodavatel) groups[key].dodavatel = smInfo.nazev_firmy;
        if (smInfo?.ico && !groups[key].ico) groups[key].ico = smInfo.ico;
        if (smInfo?.hodnota && groups[key].smlouva_hodnota === null) groups[key].smlouva_hodnota = parseFloat(smInfo.hodnota);
      }
      const amt = getOrderAmount(order);
      groups[key].orders.push(order);
      groups[key].count += 1;
      groups[key].amount += amt;
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [activeTab, filteredOrders, getOrderFinancingCode, getOrderFinancingRef, getOrderAmount]);

  // LP financování → LP kód (cislo_lp) → objednávky
  const spendByLpKodGroups = useMemo(() => {
    if (activeTab !== 'spend') return []; // ⚡ Skip výpočet když tab není aktivní
    const groups = {};
    filteredOrders.forEach(order => {
      const fin = parseFinancing(order?.financovani);
      if (!fin || String(fin?.typ || '').toUpperCase() !== 'LP') return;
      const lpNazvy = Array.isArray(fin?.lp_nazvy) ? fin.lp_nazvy : [];
      if (lpNazvy.length === 0) {
        const code = '__no_lp__';
        if (!groups[code]) groups[code] = { code, label: 'Bez přiřazeného LP kódu', orders: [], count: 0, amount: 0 };
        const amt = getOrderAmount(order);
        groups[code].orders.push(order);
        groups[code].count += 1;
        groups[code].amount += amt;
      } else {
        lpNazvy.forEach(lp => {
          const code = lp.cislo_lp || lp.kod || '__none__';
          const label = lp.nazev ? `${code} – ${lp.nazev}` : code;
          if (!groups[code]) groups[code] = {
            code, label, orders: [], count: 0, amount: 0,
            usek_zkr: lp.usek_zkr || null,
            prikazce_jmeno: lp.prikazce_jmeno || null,
            lp_limit: lp.vyse_financniho_kryti ? parseFloat(lp.vyse_financniho_kryti) : null
          };
          const amt = getOrderAmount(order);
          groups[code].orders.push(order);
          groups[code].count += 1;
          groups[code].amount += amt;
        });
      }
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [activeTab, filteredOrders, getOrderAmount]);

  // Filtrované verze spend groups podle search query
  const filteredSpendByFinancingGroups = useMemo(() => {
    const query = getSearchQuery('spendByFinancingUsek');
    if (!query) return spendByFinancingGroups;
    
    const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
    return spendByFinancingGroups.map(group => {
      // Filtrovat úseky v rámci této skupiny
      const filteredUseky = {};
      let groupHasMatches = removeDiacritics(group.label.toLowerCase()).includes(normalizedQuery);
      
      Object.entries(group.useky).forEach(([usekCode, usek]) => {
        const usekMatches = removeDiacritics(usek.label.toLowerCase()).includes(normalizedQuery);
        const filteredOrders = usek.orders.filter(order => searchInVisibleColumns(order, query, 'spendByFinancingUsek'));
        
        if (usekMatches || filteredOrders.length > 0) {
          filteredUseky[usekCode] = {
            ...usek,
            orders: filteredOrders,
            count: filteredOrders.length,
            amount: filteredOrders.reduce((sum, o) => sum + getOrderAmount(o), 0)
          };
          groupHasMatches = true;
        }
      });
      
      if (!groupHasMatches) return null;
      
      const totalCount = Object.values(filteredUseky).reduce((sum, u) => sum + u.count, 0);
      const totalAmount = Object.values(filteredUseky).reduce((sum, u) => sum + u.amount, 0);
      
      return {
        ...group,
        useky: filteredUseky,
        totalCount,
        totalAmount
      };
    }).filter(Boolean);
  }, [spendByFinancingGroups, getSearchQuery, searchInVisibleColumns, getOrderAmount, removeDiacritics]);

  const filteredSpendByUsekGroups = useMemo(() => {
    const query = getSearchQuery('spendByUsekFinancing');
    if (!query) return spendByUsekGroups;
    
    const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
    return spendByUsekGroups.map(group => {
      const filteredFinancing = {};
      let groupHasMatches = removeDiacritics(group.label.toLowerCase()).includes(normalizedQuery);
      
      Object.entries(group.financing).forEach(([finCode, fin]) => {
        const finMatches = removeDiacritics(fin.label.toLowerCase()).includes(normalizedQuery);
        const filteredOrders = fin.orders.filter(order => searchInVisibleColumns(order, query, 'spendByUsekFinancing'));
        
        if (finMatches || filteredOrders.length > 0) {
          filteredFinancing[finCode] = {
            ...fin,
            orders: filteredOrders,
            count: filteredOrders.length,
            amount: filteredOrders.reduce((sum, o) => sum + getOrderAmount(o), 0)
          };
          groupHasMatches = true;
        }
      });
      
      if (!groupHasMatches) return null;
      
      const totalCount = Object.values(filteredFinancing).reduce((sum, f) => sum + f.count, 0);
      const totalAmount = Object.values(filteredFinancing).reduce((sum, f) => sum + f.amount, 0);
      
      return {
        ...group,
        financing: filteredFinancing,
        totalCount,
        totalAmount
      };
    }).filter(Boolean);
  }, [spendByUsekGroups, getSearchQuery, searchInVisibleColumns, getOrderAmount, removeDiacritics]);

  const filteredSpendByDruhGroups = useMemo(() => {
    const query = getSearchQuery('spendByDruhFinancing');
    if (!query) return spendByDruhGroups;
    
    const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
    return spendByDruhGroups.map(group => {
      const filteredFinancing = {};
      let groupHasMatches = removeDiacritics(group.label.toLowerCase()).includes(normalizedQuery);
      
      Object.entries(group.financing).forEach(([finCode, fin]) => {
        const finMatches = removeDiacritics(fin.label.toLowerCase()).includes(normalizedQuery);
        const filteredOrders = fin.orders.filter(order => searchInVisibleColumns(order, query, 'spendByDruhFinancing'));
        
        if (finMatches || filteredOrders.length > 0) {
          filteredFinancing[finCode] = {
            ...fin,
            orders: filteredOrders,
            count: filteredOrders.length,
            amount: filteredOrders.reduce((sum, o) => sum + getOrderAmount(o), 0)
          };
          groupHasMatches = true;
        }
      });
      
      if (!groupHasMatches) return null;
      
      const totalCount = Object.values(filteredFinancing).reduce((sum, f) => sum + f.count, 0);
      const totalAmount = Object.values(filteredFinancing).reduce((sum, f) => sum + f.amount, 0);
      
      return {
        ...group,
        financing: filteredFinancing,
        totalCount,
        totalAmount
      };
    }).filter(Boolean);
  }, [spendByDruhGroups, getSearchQuery, searchInVisibleColumns, getOrderAmount, removeDiacritics]);

  const filteredSpendByLpKodGroups = useMemo(() => {
    const query = getSearchQuery('spendByLpKod');
    if (!query) return spendByLpKodGroups;
    
    const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
    return spendByLpKodGroups.map(group => {
      // Hledat ve všech zobrazených polích hlavního řádku skupiny
      const groupMatches = [
        group.label,
        group.code,
        group.usek_zkr,
        group.prikazce_jmeno,
      ].filter(Boolean).some(s => removeDiacritics(String(s).toLowerCase()).includes(normalizedQuery));
      const filteredOrders = group.orders.filter(order => searchInVisibleColumns(order, query, 'spendByLpKod'));
      
      if (!groupMatches && filteredOrders.length === 0) return null;
      
      return {
        ...group,
        orders: filteredOrders,
        count: filteredOrders.length,
        amount: filteredOrders.reduce((sum, o) => sum + getOrderAmount(o), 0)
      };
    }).filter(Boolean);
  }, [spendByLpKodGroups, getSearchQuery, searchInVisibleColumns, getOrderAmount, removeDiacritics]);

  const filteredSpendBySmlouvyGroups = useMemo(() => {
    const query = getSearchQuery('spendBySmlouvy');
    if (!query) return spendBySmlouvyGroups;
    const normalizedQuery = removeDiacritics(query.toLowerCase().trim());
    return spendBySmlouvyGroups.map(group => {
      const filteredOrders = group.orders.filter(order => searchInVisibleColumns(order, query, 'spendBySmlouvy'));
      // Hledat ve všech zobrazených polích hlavního řádku skupiny (číslo smlouvy, dodavatel, IČO)
      const groupMatches = [
        group.code,
        group.label,
        group.dodavatel,
        group.ico,
      ].filter(Boolean).some(s => removeDiacritics(String(s).toLowerCase()).includes(normalizedQuery));
      if (filteredOrders.length === 0 && !groupMatches) return null;
      return { ...group, orders: filteredOrders, count: filteredOrders.length, amount: filteredOrders.reduce((s, o) => s + getOrderAmount(o), 0) };
    }).filter(Boolean);
  }, [spendBySmlouvyGroups, getSearchQuery, searchInVisibleColumns, getOrderAmount, removeDiacritics]);

  const filteredSpendByFinancingUsekDruhGroups = useMemo(() => {
    const query = getSearchQuery('spendByFinancingUsekDruh');
    if (!query) return spendByFinancingUsekDruhGroups;
    return spendByFinancingUsekDruhGroups.map(group => {
      const filteredUseky = {};
      Object.entries(group.useky).forEach(([usekCode, usek]) => {
        const filteredDruhy = {};
        Object.entries(usek.druhy).forEach(([druhCode, druh]) => {
          const druhoOrders = druh.orders.filter(order => searchInVisibleColumns(order, query, 'spendByFinancingUsekDruh'));
          if (druhoOrders.length > 0) filteredDruhy[druhCode] = { ...druh, orders: druhoOrders, count: druhoOrders.length, amount: druhoOrders.reduce((s, o) => s + getOrderAmount(o), 0) };
        });
        if (Object.keys(filteredDruhy).length > 0) {
          const usekAmount = Object.values(filteredDruhy).reduce((s, d) => s + d.amount, 0);
          filteredUseky[usekCode] = { ...usek, druhy: filteredDruhy, count: Object.values(filteredDruhy).reduce((s, d) => s + d.count, 0), amount: usekAmount };
        }
      });
      if (Object.keys(filteredUseky).length === 0) return null;
      return { ...group, useky: filteredUseky, totalCount: Object.values(filteredUseky).reduce((s, u) => s + u.count, 0), totalAmount: Object.values(filteredUseky).reduce((s, u) => s + u.amount, 0) };
    }).filter(Boolean);
  }, [spendByFinancingUsekDruhGroups, getSearchQuery, searchInVisibleColumns, getOrderAmount, removeDiacritics]);

  // Auto-expand při vyhledávání ve spend sekcích
  useEffect(() => {
    const query = getSearchQuery('spendByFinancingUsek');
    if (!query) return;
    
    const newExpanded = new Set();
    filteredSpendByFinancingGroups.forEach(group => {
      if (Object.keys(group.useky).length > 0) {
        newExpanded.add(group.code);
        Object.keys(group.useky).forEach(usekCode => {
          newExpanded.add(`spendDetail_${group.code}_${usekCode}`);
        });
      }
    });
    setExpandedSpendFinancing(newExpanded);
    setExpandedSpendUseks(newExpanded);
  }, [filteredSpendByFinancingGroups, getSearchQuery]);

  useEffect(() => {
    const query = getSearchQuery('spendByUsekFinancing');
    if (!query) return;
    
    const newExpandedGroups = new Set();
    const newExpandedSubs = new Set();
    filteredSpendByUsekGroups.forEach(group => {
      if (Object.keys(group.financing).length > 0) {
        newExpandedGroups.add(group.code);
        Object.keys(group.financing).forEach(finCode => {
          newExpandedSubs.add(`spendDetail_${group.code}_${finCode}`);
        });
      }
    });
    setExpandedSpendUsekF(newExpandedGroups);
    setExpandedSpendUsekFSub(newExpandedSubs);
  }, [filteredSpendByUsekGroups, getSearchQuery]);

  useEffect(() => {
    const query = getSearchQuery('spendByDruhFinancing');
    if (!query) return;
    
    const newExpandedGroups = new Set();
    const newExpandedSubs = new Set();
    filteredSpendByDruhGroups.forEach(group => {
      if (Object.keys(group.financing).length > 0) {
        newExpandedGroups.add(group.code);
        Object.keys(group.financing).forEach(finCode => {
          newExpandedSubs.add(`spendDetail_${group.code}_${finCode}`);
        });
      }
    });
    setExpandedSpendDruh(newExpandedGroups);
    setExpandedSpendDruhSub(newExpandedSubs);
  }, [filteredSpendByDruhGroups, getSearchQuery]);

  useEffect(() => {
    const query = getSearchQuery('spendByLpKod');
    if (!query) return;
    
    const newExpanded = new Set();
    filteredSpendByLpKodGroups.forEach(group => {
      if (group.orders.length > 0) {
        newExpanded.add(group.code);
      }
    });
    setExpandedSpendLp(newExpanded);
  }, [filteredSpendByLpKodGroups, getSearchQuery]);

  useEffect(() => {
    const query = getSearchQuery('spendBySmlouvy');
    if (!query) return;
    setExpandedSpendSmlouvy(new Set(filteredSpendBySmlouvyGroups.filter(g => g.orders.length > 0).map(g => g.code)));
  }, [filteredSpendBySmlouvyGroups, getSearchQuery]);

  useEffect(() => {
    const query = getSearchQuery('spendByFinancingUsekDruh');
    if (!query) return;
    const newGroups = new Set();
    const newUseky = new Set();
    const newDruhy = new Set();
    filteredSpendByFinancingUsekDruhGroups.forEach(group => {
      newGroups.add(group.code);
      Object.entries(group.useky).forEach(([usekCode, usek]) => {
        newUseky.add(`spendFUD_${group.code}_${usekCode}`);
        Object.keys(usek.druhy).forEach(druhCode => {
          newDruhy.add(`spendFUDD_${group.code}_${usekCode}_${druhCode}`);
        });
      });
    });
    setExpandedSpendFinDruh(newGroups);
    setExpandedSpendFinDruhUsek(newUseky);
    setExpandedSpendFinDruhDetail(newDruhy);
  }, [filteredSpendByFinancingUsekDruhGroups, getSearchQuery]);

  const pagedOrdersWithoutInvoice = useMemo(() => {
    const fkFilter = o => {
      const stav = fkStavMapRef.current[`ordersWithoutInvoice_${o.id}_0`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    return getPagedItems(sortTableData(reportSections.ordersWithoutInvoice.filter(fkFilter), 'ordersWithoutInvoice', spendOrderAcc), 'ordersWithoutInvoice');
  }, [reportSections.ordersWithoutInvoice, showFkIgnorovano, showFkVyreseno, fkStavVersion, getPagedItems, tableSorts, spendOrderAcc]);
  const pagedOrdersWithInvoiceNotDone = useMemo(
    () => getPagedItems(sortTableData(reportSections.ordersWithInvoiceNotDone, 'ordersWithInvoiceNotDone', spendOrderAcc), 'ordersWithInvoiceNotDone'),
    [reportSections.ordersWithInvoiceNotDone, getPagedItems, tableSorts, spendOrderAcc]
  );
  const pagedOrdersWithMissingLpCerpani = useMemo(
    () => getPagedItems(sortTableData(reportSections.ordersWithMissingLpCerpani, 'ordersWithMissingLpCerpani', spendOrderAcc), 'ordersWithMissingLpCerpani'),
    [reportSections.ordersWithMissingLpCerpani, getPagedItems, tableSorts, spendOrderAcc]
  );

  const statisticsCharts = useMemo(() => {
    // Druhy - počet
    const ordersByType = {};
    // Financování - počet + částka
    const byFinancing = {};
    // Úseky - počet + částka
    const byUsek = {};
    // Druhy - počet + částka
    const byDruh = {};
    // LP kódy - počet + částka
    const byLpKod = {};
    // Top dodavatelé
    const suppliersByAmount = {};

    filteredOrders.forEach(order => {
      const amt = getOrderAmount(order);

      // Druhy
      const druhKey = getOrderTypeLabel(order) || 'Neurčeno';
      ordersByType[druhKey] = (ordersByType[druhKey] || 0) + 1;
      if (!byDruh[druhKey]) byDruh[druhKey] = { count: 0, amount: 0 };
      byDruh[druhKey].count += 1;
      byDruh[druhKey].amount += amt;

      // Financování
      const finKey = getOrderFinancingLabel(order) || 'Neurčeno';
      if (!byFinancing[finKey]) byFinancing[finKey] = { count: 0, amount: 0 };
      byFinancing[finKey].count += 1;
      byFinancing[finKey].amount += amt;

      // Úseky
      const usekKey = getOrdererUsekCode(order) || 'Neurčeno';
      if (!byUsek[usekKey]) byUsek[usekKey] = { count: 0, amount: 0 };
      byUsek[usekKey].count += 1;
      byUsek[usekKey].amount += amt;

      // Dodavatelé
      const suppKey = getSupplierName(order) || 'Neurčeno';
      if (!suppliersByAmount[suppKey]) suppliersByAmount[suppKey] = { count: 0, amount: 0 };
      suppliersByAmount[suppKey].count += 1;
      suppliersByAmount[suppKey].amount += amt;

      // LP kódy
      const fin = parseFinancing(order?.financovani);
      if (fin && String(fin?.typ || '').toUpperCase() === 'LP') {
        const lpNazvy = Array.isArray(fin?.lp_nazvy) ? fin.lp_nazvy : [];
        if (lpNazvy.length === 0) {
          const code = 'Bez LP kódu';
          if (!byLpKod[code]) byLpKod[code] = { count: 0, amount: 0 };
          byLpKod[code].count += 1;
          byLpKod[code].amount += amt;
        } else {
          lpNazvy.forEach(lp => {
            const code = lp.cislo_lp || lp.kod || 'Neurčeno';
            if (!byLpKod[code]) byLpKod[code] = { count: 0, amount: 0 };
            byLpKod[code].count += 1;
            byLpKod[code].amount += amt;
          });
        }
      }
    });

    const topSuppliers = Object.entries(suppliersByAmount)
      .filter(([name]) => name && name !== 'Neurčeno')
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 7);

    // Top objednatelé - bubliny (počet + částka)
    const buyersByData = {};
    filteredOrders.forEach(order => {
      const name = getOrdererName(order) || 'Neurčeno';
      if (!buyersByData[name]) buyersByData[name] = { count: 0, amount: 0 };
      buyersByData[name].count += 1;
      buyersByData[name].amount += getOrderAmount(order);
    });
    const topBuyers = Object.entries(buyersByData)
      .filter(([name]) => name && name !== 'Neurčeno')
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 15);

    // Stav objednávek - počty + částky pro koláčový graf
    // Merge duplicit lišících se pouze diakritikou ("Zkontrolovaná" vs "Zkontrolována")
    const byStavRaw = {}; // normKey → { label, count, amount }
    const stripDia = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    filteredOrders.forEach(order => {
      const statusLabel = (getOrderStatusLabel(order) || 'Neurčeno').trim();
      const normKey = stripDia(statusLabel);
      if (!byStavRaw[normKey]) byStavRaw[normKey] = { label: statusLabel, count: 0, amount: 0 };
      byStavRaw[normKey].count += 1;
      byStavRaw[normKey].amount += getOrderAmount(order);
    });
    // Výsledný objekt: label → {count, amount}
    const byStav = {};
    Object.values(byStavRaw).forEach(({ label, count, amount }) => {
      byStav[label] = { count, amount };
    });

    // Financování - počty pro koláčový graf (bez STORNO/SMAZ)
    const byFinancingCount = {};
    filteredOrders.forEach(order => {
      const finKey = getOrderFinancingLabel(order) || 'Neurčeno';
      byFinancingCount[finKey] = (byFinancingCount[finKey] || 0) + 1;
    });

    const sortByKey = obj => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, 'cs-CZ')));

    return {
      ordersByType,
      ordersByUsek: Object.fromEntries(Object.entries(byUsek).sort(([a], [b]) => a.localeCompare(b, 'cs-CZ'))),
      byFinancing: sortByKey(byFinancing),
      byFinancingCount: sortByKey(byFinancingCount),
      byUsek: sortByKey(byUsek),
      byDruh: sortByKey(byDruh),
      byLpKod: sortByKey(byLpKod),
      byStav,
      topSuppliers,
      topBuyers
    };
  }, [filteredOrders, getOrderTypeLabel, getOrderFinancingLabel, getOrdererUsekCode, getOrderAmount, parseFinancing, getOrdererName, getOrderStatusLabel]);

  const pivotData = useMemo(() => {
    const normalizeAttachmentTypes = (items = []) => {
      if (!Array.isArray(items) || items.length === 0) return 'Chybi hodnota';
      const types = Array.from(new Set(items.map(getAttachmentType).filter(Boolean)));
      return types.length ? types.join(', ') : 'Chybi hodnota';
    };

    const resolveContract = (order, invoice) => {
      const invoiceContractId = invoice?.smlouva_id != null ? String(invoice.smlouva_id) : '';
      const invoiceContractNumber = invoice?.cislo_smlouvy ? String(invoice.cislo_smlouvy) : '';
      const orderContractId = order?.smlouva_id != null ? String(order.smlouva_id) : '';
      const orderContractNumber = order?.cislo_smlouvy ? String(order.cislo_smlouvy) : '';

      return (
        (invoiceContractId && contractsById.get(invoiceContractId))
        || (invoiceContractNumber && contractsByNumber.get(invoiceContractNumber))
        || (orderContractId && contractsById.get(orderContractId))
        || (orderContractNumber && contractsByNumber.get(orderContractNumber))
        || null
      );
    };

    const resolveUsekForInvoice = (invoice, linkedOrder, linkedContract) => {
      if (linkedOrder) {
        // Vždy vrátíme zkratku (kód), ne plný název, aby nedocházelo ke duplikaci sloupců
        const fromOrder = getOrdererUsekCode(linkedOrder);
        if (fromOrder) return fromOrder;
        const fallback = getUsekLabel(linkedOrder);
        if (fallback && fallback !== 'Neurčeno') return fallback;
      }
      if (linkedContract) {
        const fromContract = getContractUsek(linkedContract);
        if (fromContract) return fromContract;
      }
      // Zkus vlastní pole faktury nebo parsuj z čísla objednávky na faktuře
      const fromInvoice = invoice?.objednavka_usek_zkr || invoice?.usek_zkr
        || parseUsekFromOrderNumber(invoice?.cislo_objednavky || '');
      return fromInvoice || 'Neurčeno';
    };

    const orderRows = filteredOrders.map(order => {
      const invoicesForOrder = invoicesByOrderId[String(order?.id)] || [];
      const invoicedAmount = getOrderInvoicedAmount(order, invoicesForOrder);
      const plannedAmount = getOrderPlannedAmount(order);
      const limitAmount = getOrderLimit(order);
      // Úsek: vždy jen zkratka (kód), aby nedocházelo ke duplikaci sloupců ("EN" vs "EN - ÚSEK EKONOMICKÝ")
      const usekCode = getOrdererUsekCode(order) || getUsekLabel(order) || 'Neurčeno';
      return {
        id: order.id,
        usek: usekCode,
        financing: getOrderFinancingLabel(order) || 'Neurčeno',
        type: getOrderTypeLabel(order) || 'Neurčeno',
        status: getOrderStatusLabel(order) || 'Neurčeno',
        supplier: getSupplierName(order) || 'Neurčeno',
        orderer: getOrdererName(order) || 'Neurčeno',
        garant: getGarantName(order) || 'Neurčeno',
        prikazce: getPrikazceName(order) || 'Neurčeno',
        schvalovatel: getSchvalovatelName(order) || 'Neurčeno',
        amount: invoicedAmount,
        amount_invoiced: invoicedAmount,
        amount_planned: plannedAmount,
        amount_limit: limitAmount,
        hasInvoice: (invoicesByOrderId[String(order.id)] || []).length > 0 ? 'Ano' : 'Ne',
        attachmentType: order.ma_prilohy ? 'Má přílohy' : 'Bez příloh',
        attachmentSource: 'OBJ',
        source: 'Objednávky'
      };
    });

    const invoiceRows = filteredInvoices.map(inv => {
      const linkedOrder = inv?.objednavka_id != null ? ordersById.get(String(inv.objednavka_id)) : null;
      const linkedContract = resolveContract(linkedOrder, inv);
      const invoiceAmount = getInvoiceAmount(inv);
      const invUsek = resolveUsekForInvoice(inv, linkedOrder, linkedContract);
      // Financování z navázané objednávky (faktura sama ho nenosí)
      const invFinancing = linkedOrder ? (getOrderFinancingLabel(linkedOrder) || 'Neurčeno') : 'Neurčeno';
      // Dodavatel z navázané objednávky
      const invSupplier = getSupplierName(linkedOrder) || 'Neurčeno';
      return {
        id: inv.id,
        usek: invUsek,
        financing: invFinancing,
        supplier: invSupplier,
        status: getInvoiceStatusLabel(inv) || 'Neurčeno',
        type: inv.fa_typ || 'Neurčeno',
        paid: inv.zaplacena ? 'Ano' : 'Ne',
        hasAttachment: inv.ma_prilohy ? 'Ano' : 'Ne',
        garant: getGarantName(linkedOrder) || 'Neurčeno',
        prikazce: getPrikazceName(linkedOrder) || 'Neurčeno',
        schvalovatel: getSchvalovatelName(linkedOrder) || 'Neurčeno',
        amount: invoiceAmount,
        amount_invoiced: invoiceAmount,
        amount_planned: 0,
        amount_limit: 0,
        attachmentType: normalizeAttachmentTypes(inv.prilohy),
        attachmentSource: 'FA',
        source: 'Faktury'
      };
    });

    const contractRows = contracts.map(contract => ({
      id: contract.id,
      usek: getContractUsek(contract) || 'Neurčeno',
      type: contract.druh_smlouvy || contract.typ || 'Neurčeno',
      status: contract.stav || 'Neurčeno',
      limit: getContractLimit(contract),
      spent: getContractSpent(contract),
      source: 'Smlouvy'
    }));

    const combinedRows = [];
    const usedInvoiceIds = new Set();
    const usedContractIds = new Set();

    filteredOrders.forEach((order) => {
      const invoicesForOrder = invoicesByOrderId[String(order?.id)] || [];
      // Vždy jen zkratka (kód), aby nedocházelo ke duplikaci sloupců
      const _usekCode = getOrdererUsekCode(order) || getUsekLabel(order) || 'Neurčeno';
      const base = {
        usek: _usekCode,
        financing: getOrderFinancingLabel(order) || 'Neurčeno',
        supplier: getSupplierName(order) || 'Neurčeno',
        orderer: getOrdererName(order) || 'Neurčeno',
        garant: getGarantName(order) || 'Neurčeno',
        prikazce: getPrikazceName(order) || 'Neurčeno',
        schvalovatel: getSchvalovatelName(order) || 'Neurčeno',
        orderNumber: order?.ev_cislo || order?.cislo_objednavky || 'Chybi hodnota',
        orderType: getOrderTypeLabel(order) || 'Neurčeno',
        orderStatus: getOrderStatusLabel(order) || 'Neurčeno',
        hasInvoice: invoicesForOrder.length ? 'Ano' : 'Ne',
        attachmentType: order.ma_prilohy ? 'Má přílohy' : 'Bez příloh',
        attachmentSource: 'OBJ'
      };

      if (invoicesForOrder.length === 0) {
        const contract = resolveContract(order, null);
        if (contract?.id != null) usedContractIds.add(String(contract.id));
        const contractNumber = contract ? getContractNumber(contract) : '';
        const invoicedAmount = getOrderInvoicedAmount(order, invoicesForOrder);
        const plannedAmount = getOrderPlannedAmount(order);
        const limitAmount = getOrderLimit(order);

        combinedRows.push({
          ...base,
          invoiceNumber: 'Chybi hodnota',
          invoiceStatus: 'Chybi hodnota',
          invoiceType: 'Chybi hodnota',
          paid: 'Chybi hodnota',
          hasAttachment: order.ma_prilohy ? 'Ano' : 'Ne',
          contractNumber: contractNumber || 'Chybi hodnota',
          contractType: contract?.druh_smlouvy || contract?.typ || 'Chybi hodnota',
          contractStatus: contract?.stav || 'Chybi hodnota',
          source: contract ? 'Obj+Sml' : 'Obj',
          amount: invoicedAmount,
          amount_invoiced: invoicedAmount,
          amount_planned: plannedAmount,
          amount_limit: limitAmount,
          limit: contract ? getContractLimit(contract) : 0,
          spent: contract ? getContractSpent(contract) : 0
        });
        return;
      }

      invoicesForOrder.forEach((inv) => {
        usedInvoiceIds.add(String(inv.id));
        const contract = resolveContract(order, inv);
        if (contract?.id != null) usedContractIds.add(String(contract.id));
        const contractNumber = contract ? getContractNumber(contract) : '';

        combinedRows.push({
          ...base,
          invoiceNumber: inv.cislo_faktury || 'Chybi hodnota',
          invoiceStatus: getInvoiceStatusLabel(inv) || 'Chybi hodnota',
          invoiceType: inv.fa_typ || inv.typ || 'Chybi hodnota',
          paid: inv.zaplacena ? 'Ano' : 'Ne',
          hasAttachment: inv.ma_prilohy ? 'Ano' : 'Ne',
          attachmentType: normalizeAttachmentTypes(inv.prilohy),
          attachmentSource: 'FA',
          contractNumber: contractNumber || 'Chybi hodnota',
          contractType: contract?.druh_smlouvy || contract?.typ || 'Chybi hodnota',
          contractStatus: contract?.stav || 'Chybi hodnota',
          source: contract ? 'Obj+Fa+Sml' : 'Obj+Fa',
              amount: getInvoiceAmount(inv) || getOrderAmount(order),
              amount_invoiced: getInvoiceAmount(inv) || getOrderInvoicedAmount(order, invoicesForOrder),
              amount_planned: getOrderPlannedAmount(order),
              amount_limit: getOrderLimit(order),
              limit: contract ? getContractLimit(contract) : 0,
              spent: contract ? getContractSpent(contract) : 0
        });
      });
    });

    filteredInvoices.forEach((inv) => {
      if (inv?.id != null && usedInvoiceIds.has(String(inv.id))) return;
      const contract = resolveContract(null, inv);
      if (contract?.id != null) usedContractIds.add(String(contract.id));
      const contractNumber = contract ? getContractNumber(contract) : '';
      combinedRows.push({
        usek: resolveUsekForInvoice(inv, null, contract),
        financing: 'Neurčeno',
        supplier: 'Neurčeno',
        orderer: 'Neurčeno',
        garant: 'Neurčeno',
        prikazce: 'Neurčeno',
        schvalovatel: 'Neurčeno',
        orderNumber: inv.cislo_objednavky || 'Chybi hodnota',
        orderType: 'Chybi hodnota',
        orderStatus: 'Chybi hodnota',
        hasInvoice: 'Ano',
        invoiceNumber: inv.cislo_faktury || 'Chybi hodnota',
        invoiceStatus: getInvoiceStatusLabel(inv) || 'Chybi hodnota',
        invoiceType: inv.fa_typ || inv.typ || 'Chybi hodnota',
        paid: inv.zaplacena ? 'Ano' : 'Ne',
        hasAttachment: inv.ma_prilohy ? 'Ano' : 'Ne',
        attachmentType: normalizeAttachmentTypes(inv.prilohy),
        attachmentSource: 'FA',
        contractNumber: contractNumber || 'Chybi hodnota',
        contractType: contract?.druh_smlouvy || contract?.typ || 'Chybi hodnota',
        contractStatus: contract?.stav || 'Chybi hodnota',
        source: contract ? 'Fa+Sml' : 'Fa',
        amount: getInvoiceAmount(inv),
        amount_invoiced: getInvoiceAmount(inv),
        amount_planned: 0,
        amount_limit: 0,
        limit: contract ? getContractLimit(contract) : 0,
        spent: contract ? getContractSpent(contract) : 0
      });
    });

    contracts.forEach((contract) => {
      if (contract?.id == null) return;
      if (usedContractIds.has(String(contract.id))) return;
      const contractNumber = getContractNumber(contract);
      combinedRows.push({
        usek: getContractUsek(contract) || 'Neurčeno',
        financing: 'Chybi hodnota',
        supplier: 'Chybi hodnota',
        orderer: 'Chybi hodnota',
        garant: 'Chybi hodnota',
        prikazce: 'Chybi hodnota',
        schvalovatel: 'Chybi hodnota',
        orderNumber: 'Chybi hodnota',
        orderType: 'Chybi hodnota',
        orderStatus: 'Chybi hodnota',
        hasInvoice: 'Chybi hodnota',
        invoiceNumber: 'Chybi hodnota',
        invoiceStatus: 'Chybi hodnota',
        invoiceType: 'Chybi hodnota',
        paid: 'Chybi hodnota',
        hasAttachment: 'Chybi hodnota',
        attachmentType: 'Chybi hodnota',
        contractNumber: contractNumber || 'Chybi hodnota',
        contractType: contract?.druh_smlouvy || contract?.typ || 'Chybi hodnota',
        contractStatus: contract?.stav || 'Chybi hodnota',
        source: 'Sml',
        amount: 0,
        amount_invoiced: 0,
        amount_planned: 0,
        amount_limit: 0,
        limit: getContractLimit(contract),
        spent: getContractSpent(contract)
      });
    });

    return { orderRows, invoiceRows, contractRows, combinedRows };
  }, [filteredOrders, filteredInvoices, contracts, invoicesByOrderId, ordersById, contractsById, contractsByNumber, getOrderFinancingLabel, getOrderTypeLabel, getOrderStatusLabel, getInvoiceStatusLabel, getOrdererUsekCode]);

  // Plochý seznam příloh faktur z paměti (prilohy jsou načteny spolu s fakturami)
  const allInvoiceAttachments = useMemo(() => {
    const result = [];
    (filteredInvoices || []).forEach(inv => {
      if (!Array.isArray(inv.prilohy) || inv.prilohy.length === 0) return;
      const linkedOrder = inv.objednavka_id != null ? ordersById.get(String(inv.objednavka_id)) : null;
      inv.prilohy.forEach(att => {
        result.push({
          ...att,
          original_name: att.original_filename || att.originalni_nazev_souboru || att.original_name || att.nazev_souboru || null,
          invoice_id: inv.id,
          cislo_faktury: inv.cislo_faktury,
          objednavka_id: inv.objednavka_id || null,
          cislo_objednavky: linkedOrder?.ev_cislo || linkedOrder?.cislo_objednavky || inv.cislo_objednavky || null,
          dodavatel: getSupplierName(linkedOrder) || '',
          druh_objednavky_label: linkedOrder ? getOrderTypeLabel(linkedOrder) : '',
          objednavka_predmet: linkedOrder?.predmet || null,
          fa_poznamka: inv.fa_poznamka || inv.poznamka || null,
          attachmentSource: 'FA'
        });
      });
    });
    return result;
  }, [filteredInvoices, ordersById, getOrderTypeLabel]);

  // Kombinovany seznam vsech priloh (FA + OBJ + RP)
  const allAttachmentsCombined = useMemo(() => {
    // 🆕 OBJ přílohy - z API /order-v2/attachments/list
    const orderAtts = (orderAttachments || []).map(att => {
      const linkedOrder = att.order_id ? ordersById.get(String(att.order_id)) : null;
      return {
        ...att,
        original_name: att.original_name || att.original_filename || att.originalni_nazev_souboru || att.nazev_souboru || null,
        objednavka_id: att.order_id,
        cislo_objednavky: att.order_number,
        objednavka_predmet: att.order_name || null, // Backend: o.predmet AS objednavka_nazev → order_name
        dodavatel: linkedOrder ? getSupplierName(linkedOrder) : '', // ✅ Dohledat dodavatele
        druh_objednavky_label: linkedOrder ? getOrderTypeLabel(linkedOrder) : '', // ✅ Dohledat druh objednávky
        attachmentSource: 'OBJ',
        // ✅ Backend API mapuje: typ_prilohy → 'type', velikost_souboru_b → 'file_size'
        typ_prilohy: att.type || att.typ_prilohy || null,
        velikost_souboru_b: att.file_size || att.velikost_souboru_b || 0,
        // FA pole prazdna
        invoice_id: null,
        cislo_faktury: null,
        fa_poznamka: null,
      };
    });

    const rpAtts = (annualFeeAttachments || []).map(att => ({
      ...att,
      original_name: att.original_filename || att.originalni_nazev_souboru || att.original_name || att.nazev_souboru || null,
      attachmentSource: 'RP',
      cislo_objednavky: null,
      invoice_id: null,
      cislo_faktury: null,
      dodavatel: att.dodavatel || '',
      druh_objednavky_label: '', // Prázdné - RP není objednávka, nemá druh
      objednavka_predmet: att.rocni_poplatek_nazev || att.nazev || null, // ✅ Název RP do sloupce objednávka
      fa_poznamka: null,
    }));

    return [...orderAtts, ...allInvoiceAttachments, ...rpAtts];
  }, [orderAttachments, allInvoiceAttachments, annualFeeAttachments]);

  const pagedInvoiceAttachmentsList = useMemo(
    () => getPagedItems(sortTableData(allInvoiceAttachments, 'invoiceAttachmentsList', invoiceAttachmentAcc), 'invoiceAttachmentsList'),
    [allInvoiceAttachments, getPagedItems, tablePaging, tableSorts, invoiceAttachmentAcc]
  );

  const pagedAllAttachments = useMemo(
    () => getPagedItems(sortTableData(allAttachmentsCombined, 'invoiceAttachmentsList', invoiceAttachmentAcc), 'invoiceAttachmentsList'),
    [allAttachmentsCombined, getPagedItems, tablePaging, tableSorts, invoiceAttachmentAcc]
  );

  const pivotStorageKey = `${LOCAL_STORAGE_PREFIX}_pivot_${userKey}`;

  const [pivotConfig, setPivotConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(pivotStorageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      dataset: 'all',
      rowFields: ['usek'],
      colFields: ['financing'],
      metric: 'count',
      aggFunc: 'sum',
      colMode: 'fields',
      colMetrics: null
    };
  });
  const [pivotExpanded, setPivotExpanded] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(pivotStorageKey, JSON.stringify(pivotConfig));
    } catch (e) {}
  }, [pivotConfig, pivotStorageKey]);

  const pivotTextOptions = useMemo(() => {
    if (pivotConfig.dataset === 'invoices') {
      return [
        { key: 'usek', label: 'Úsek', shortLabel: 'Úsek' },
        { key: 'status', label: 'Stav faktury', shortLabel: 'Stav FA' },
        { key: 'type', label: 'Typ faktury', shortLabel: 'Typ FA' },
        { key: 'paid', label: 'Zaplaceno', shortLabel: 'Zapl.' },
        { key: 'hasAttachment', label: 'Má přílohu', shortLabel: 'Má příl.' },
        { key: 'attachmentType', label: 'Klasifikace přílohy', shortLabel: 'Klas. příl.' },
        { key: 'attachmentSource', label: 'Zdroj přílohy (OBJ/FA)', shortLabel: 'OBJ/FA' },
        { key: 'garant', label: 'Garant', shortLabel: 'Garant' },
        { key: 'prikazce', label: 'Příkazce', shortLabel: 'Příkazce' },
        { key: 'schvalovatel', label: 'Schvalovatel', shortLabel: 'Schval.' },
        { key: 'source', label: 'Zdroj', shortLabel: 'Zdroj' }
      ];
    }
    if (pivotConfig.dataset === 'contracts') {
      return [
        { key: 'usek', label: 'Úsek', shortLabel: 'Úsek' },
        { key: 'status', label: 'Stav smlouvy', shortLabel: 'Stav SM' },
        { key: 'type', label: 'Druh smlouvy', shortLabel: 'Druh SM' },
        { key: 'source', label: 'Zdroj', shortLabel: 'Zdroj' }
      ];
    }
    if (pivotConfig.dataset === 'all') {
      return [
        { key: 'source', label: 'Zdroj', shortLabel: 'Zdroj' },
        { key: 'usek', label: 'Úsek', shortLabel: 'Úsek' },
        { key: 'financing', label: 'Financování', shortLabel: 'Financ.' },
        { key: 'orderNumber', label: 'Číslo objednávky', shortLabel: 'Č. obj.' },
        { key: 'invoiceNumber', label: 'Číslo faktury', shortLabel: 'Č. FA' },
        { key: 'contractNumber', label: 'Číslo smlouvy', shortLabel: 'Č. SM' },
        { key: 'orderType', label: 'Druh objednávky', shortLabel: 'Druh obj.' },
        { key: 'invoiceType', label: 'Typ faktury', shortLabel: 'Typ FA' },
        { key: 'contractType', label: 'Druh smlouvy', shortLabel: 'Druh SM' },
        { key: 'orderStatus', label: 'Stav objednávky', shortLabel: 'Stav obj.' },
        { key: 'invoiceStatus', label: 'Stav faktury', shortLabel: 'Stav FA' },
        { key: 'contractStatus', label: 'Stav smlouvy', shortLabel: 'Stav SM' },
        { key: 'supplier', label: 'Dodavatel', shortLabel: 'Dodav.' },
        { key: 'orderer', label: 'Objednatel', shortLabel: 'Objedn.' },
        { key: 'hasInvoice', label: 'Má fakturu', shortLabel: 'Má FA' },
        { key: 'paid', label: 'Zaplaceno', shortLabel: 'Zapl.' },
        { key: 'hasAttachment', label: 'Má přílohu', shortLabel: 'Má příl.' },
        { key: 'attachmentType', label: 'Klasifikace přílohy', shortLabel: 'Klas. příl.' },
        { key: 'attachmentSource', label: 'Zdroj přílohy (OBJ/FA)', shortLabel: 'OBJ/FA' },
        { key: 'garant', label: 'Garant', shortLabel: 'Garant' },
        { key: 'prikazce', label: 'Příkazce', shortLabel: 'Příkazce' },
        { key: 'schvalovatel', label: 'Schvalovatel', shortLabel: 'Schval.' }
      ];
    }
    return [
      { key: 'usek', label: 'Úsek', shortLabel: 'Úsek' },
      { key: 'financing', label: 'Financování', shortLabel: 'Financ.' },
      { key: 'type', label: 'Druh objednávky', shortLabel: 'Druh obj.' },
      { key: 'status', label: 'Stav objednávky', shortLabel: 'Stav obj.' },
      { key: 'supplier', label: 'Dodavatel', shortLabel: 'Dodav.' },
      { key: 'orderer', label: 'Objednatel', shortLabel: 'Objedn.' },
      { key: 'hasInvoice', label: 'Má fakturu', shortLabel: 'Má FA' },
      { key: 'hasAttachment', label: 'Má přílohu', shortLabel: 'Má příl.' },
      { key: 'attachmentType', label: 'Klasifikace přílohy', shortLabel: 'Klas. příl.' },
      { key: 'attachmentSource', label: 'Zdroj přílohy (OBJ/FA)', shortLabel: 'OBJ/FA' },
      { key: 'garant', label: 'Garant', shortLabel: 'Garant' },
      { key: 'prikazce', label: 'Příkazce', shortLabel: 'Příkazce' },
      { key: 'schvalovatel', label: 'Schvalovatel', shortLabel: 'Schval.' },
      { key: 'source', label: 'Zdroj', shortLabel: 'Zdroj' }
    ];
  }, [pivotConfig.dataset]);

  const pivotMetricOptions = useMemo(() => {
    if (pivotConfig.dataset === 'contracts') {
      return [
        { key: 'count', label: 'Počet' },
        { key: 'limit', label: 'Limit smlouvy' },
        { key: 'spent', label: 'Čerpáno smlouvy' }
      ];
    }
    if (pivotConfig.dataset === 'all') {
      return [
        { key: 'count', label: 'Počet' },
        { key: 'amount_invoiced', label: 'Částka fakturovaná' },
        { key: 'amount_planned', label: 'Částka plánovaná (položky)' },
        { key: 'amount_limit', label: 'Max schválená' }
      ];
    }
    if (pivotConfig.dataset === 'invoices') {
      return [
        { key: 'count', label: 'Počet' },
        { key: 'amount_invoiced', label: 'Částka fakturovaná' }
      ];
    }
    return [
      { key: 'count', label: 'Počet' },
      { key: 'amount_invoiced', label: 'Částka fakturovaná' },
      { key: 'amount_planned', label: 'Částka plánovaná (položky)' },
      { key: 'amount_limit', label: 'Max schválená' }
    ];
  }, [pivotConfig.dataset]);

  const pivotTextLabelMap = useMemo(() => new Map(pivotTextOptions.map(option => [option.key, option.label])), [pivotTextOptions]);
  const pivotTextShortLabelMap = useMemo(() => new Map(pivotTextOptions.map(option => [option.key, option.shortLabel || option.label])), [pivotTextOptions]);
  const pivotMetricLabelMap = useMemo(() => new Map(pivotMetricOptions.map(option => [option.key, option.label])), [pivotMetricOptions]);

  useEffect(() => {
    setPivotConfig(prev => {
      const textKeys = pivotTextOptions.map(option => option.key);
      const metricKeys = pivotMetricOptions.map(option => option.key);
      let nextRows = Array.isArray(prev.rowFields) ? prev.rowFields.filter(key => textKeys.includes(key)) : [];
      let nextCols = Array.isArray(prev.colFields) ? prev.colFields.filter(key => textKeys.includes(key)) : [];
      let nextMetric = prev.metric;
      let changed = false;

      if (nextRows.length === 0) {
        nextRows = textKeys[0] ? [textKeys[0]] : [];
        changed = true;
      }

      if (nextCols.length === 0) {
        const fallback = textKeys.find(key => !nextRows.includes(key));
        nextCols = fallback ? [fallback] : [];
        changed = true;
      }

      if (!metricKeys.includes(nextMetric)) {
        nextMetric = metricKeys[0] || '';
        changed = true;
      }

      if (!changed) return prev;
      return { ...prev, rowFields: nextRows, colFields: nextCols, metric: nextMetric };
    });
  }, [pivotTextOptions, pivotMetricOptions]);

  const selectedPivotTextKeys = useMemo(() => new Set([...(pivotConfig.rowFields || []), ...(pivotConfig.colFields || [])]), [pivotConfig.rowFields, pivotConfig.colFields]);

  const availablePivotTextOptions = useMemo(() => {
    return pivotTextOptions.filter(option => !selectedPivotTextKeys.has(option.key));
  }, [pivotTextOptions, selectedPivotTextKeys]);

  const pivotTextGroups = useMemo(() => {
    const groups = {
      order: [],
      invoice: [],
      contract: [],
      shared: []
    };
    availablePivotTextOptions.forEach((option) => {
      if (option.key.startsWith('order')) {
        groups.order.push(option);
      } else if (option.key.startsWith('invoice')) {
        groups.invoice.push(option);
      } else if (option.key.startsWith('contract')) {
        groups.contract.push(option);
      } else {
        groups.shared.push(option);
      }
    });
    return groups;
  }, [availablePivotTextOptions]);

  const availablePivotMetricOptions = useMemo(() => {
    return pivotMetricOptions.filter(option => option.key !== pivotConfig.metric);
  }, [pivotMetricOptions, pivotConfig.metric]);

  const pivotToneByKey = useCallback((key, type) => {
    if (type === 'metric') {
      return { bg: '#fef3c7', text: '#92400e' };
    }
    if (!key) return null;
    if (key.startsWith('order')) return { bg: '#dbeafe', text: '#1e40af' };
    if (key.startsWith('invoice')) return { bg: '#cffafe', text: '#155e75' };
    if (key.startsWith('contract')) return { bg: '#dcfce7', text: '#166534' };
    return { bg: '#e2e8f0', text: '#334155' };
  }, []);

  const handlePivotDragStart = useCallback((event, type, key, zone = '', index = null) => {
    event.dataTransfer.setData('text/plain', key);
    event.dataTransfer.setData('field-type', type);
    event.dataTransfer.setData('pivot-zone', zone);
    if (Number.isInteger(index)) {
      event.dataTransfer.setData('from-index', String(index));
    }
  }, []);

  const handlePivotReorder = useCallback((fromIndex, toIndex, zone) => {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) return;
    setPivotConfig(prev => {
      const listKey = zone === 'row' ? 'rowFields' : 'colFields';
      const list = Array.isArray(prev[listKey]) ? [...prev[listKey]] : [];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, [listKey]: list };
    });
  }, []);

  const handlePivotDrop = useCallback((event, target) => {
    event.preventDefault();
    const key = event.dataTransfer.getData('text/plain');
    const type = event.dataTransfer.getData('field-type');
    const sourceZone = event.dataTransfer.getData('pivot-zone');
    if (!key) return;

    if (target === 'metric') {
      if (type !== 'metric') return;
      setPivotConfig(prev => ({ ...prev, metric: key }));
      return;
    }

    if (type !== 'text') return;

    setPivotConfig(prev => {
      const nextRows = Array.isArray(prev.rowFields) ? [...prev.rowFields] : [];
      const nextCols = Array.isArray(prev.colFields) ? [...prev.colFields] : [];

      const removeFrom = (list) => list.filter(item => item !== key);
      const addTo = (list) => (list.includes(key) ? list : [...list, key]);

      const cleanedRows = removeFrom(nextRows);
      const cleanedCols = removeFrom(nextCols);

      if (target === 'row') {
        return {
          ...prev,
          rowFields: addTo(cleanedRows),
          colFields: cleanedCols
        };
      }

      return {
        ...prev,
        rowFields: cleanedRows,
        colFields: addTo(cleanedCols)
      };
    });
  }, []);

  const pivotTable = useMemo(() => {
    const rows = pivotConfig.dataset === 'invoices'
      ? pivotData.invoiceRows
      : pivotConfig.dataset === 'contracts'
        ? pivotData.contractRows
        : pivotConfig.dataset === 'all'
          ? pivotData.combinedRows
          : pivotData.orderRows;

    const mkEmpty = () => ({ sum: 0, count: 0, min: Infinity, max: -Infinity });
    const isMetricMode = pivotConfig.colMode === 'metrics';

    if (!pivotConfig.rowFields?.length || (!isMetricMode && !pivotConfig.colFields?.length)) {
      const e = mkEmpty();
      return { rowTree: [], colKeys: [], getValue: () => e, getRowTotal: () => e, totalForCol: () => e, grandTotal: e };
    }

    const metricValForKey = (record, metricKey) => {
      if (metricKey === 'count') return 0;
      if (metricKey === 'amount_invoiced') return Number(record.amount_invoiced || record.amount || 0);
      if (metricKey === 'amount_planned') return Number(record.amount_planned || 0);
      if (metricKey === 'amount_limit') return Number(record.amount_limit || 0);
      if (metricKey === 'limit') return Number(record.limit || 0);
      if (metricKey === 'spent') return Number(record.spent || 0);
      return 0;
    };

    const makeKey = (record, fields) => fields.map(field => record[field] || 'Chybi hodnota').join(' / ');
    const colKeys = isMetricMode
      ? (pivotConfig.colMetrics?.length ? pivotConfig.colMetrics : pivotMetricOptions.map(o => o.key))
      : Array.from(new Set(rows.map(r => makeKey(r, pivotConfig.colFields)))).sort();

    const metricForRecord = (record) => {
      if (pivotConfig.metric === 'count') return 0;
      if (pivotConfig.metric === 'amount_invoiced') return Number(record.amount_invoiced || record.amount || 0);
      if (pivotConfig.metric === 'amount_planned') return Number(record.amount_planned || 0);
      if (pivotConfig.metric === 'amount_limit') return Number(record.amount_limit || 0);
      if (pivotConfig.metric === 'limit') return Number(record.limit || 0);
      if (pivotConfig.metric === 'spent') return Number(record.spent || 0);
      return 0;
    };

    const addToAcc = (acc, numVal) => {
      acc.sum += numVal;
      acc.count += 1;
      if (numVal < acc.min) acc.min = numVal;
      if (numVal > acc.max) acc.max = numVal;
    };

    const root = {
      id: 'root', label: 'root', depth: -1,
      children: [], childMap: new Map(),
      colTotals: new Map(), total: mkEmpty()
    };

    const ensureChild = (parent, label, fieldKey, depth) => {
      if (parent.childMap.has(label)) return parent.childMap.get(label);
      const child = {
        id: `${parent.id}::${fieldKey}=${label}`,
        label, fieldKey, depth,
        children: [], childMap: new Map(),
        colTotals: new Map(), total: mkEmpty()
      };
      parent.childMap.set(label, child);
      parent.children.push(child);
      return child;
    };

    rows.forEach((record) => {
      const primaryVal = metricForRecord(record);

      if (isMetricMode) {
        // Mód: metriky jako sloupce — akumulujeme všechny metriky najednou
        colKeys.forEach(metricKey => {
          const numVal = metricValForKey(record, metricKey);
          const rootAcc = root.colTotals.get(metricKey) || mkEmpty();
          addToAcc(rootAcc, numVal);
          root.colTotals.set(metricKey, rootAcc);
        });
        addToAcc(root.total, primaryVal);

        let node = root;
        pivotConfig.rowFields.forEach((fieldKey, index) => {
          const label = record[fieldKey] || 'Chybi hodnota';
          node = ensureChild(node, label, fieldKey, index);
          colKeys.forEach(metricKey => {
            const numVal = metricValForKey(record, metricKey);
            const nodeAcc = node.colTotals.get(metricKey) || mkEmpty();
            addToAcc(nodeAcc, numVal);
            node.colTotals.set(metricKey, nodeAcc);
          });
          addToAcc(node.total, primaryVal);
        });
      } else {
        // Mód: textová pole jako sloupce
        const colKey = makeKey(record, pivotConfig.colFields);
        const numVal = primaryVal;

        const rootAcc = root.colTotals.get(colKey) || mkEmpty();
        addToAcc(rootAcc, numVal);
        root.colTotals.set(colKey, rootAcc);
        addToAcc(root.total, numVal);

        let node = root;
        pivotConfig.rowFields.forEach((fieldKey, index) => {
          const label = record[fieldKey] || 'Chybi hodnota';
          node = ensureChild(node, label, fieldKey, index);
          const nodeAcc = node.colTotals.get(colKey) || mkEmpty();
          addToAcc(nodeAcc, numVal);
          node.colTotals.set(colKey, nodeAcc);
          addToAcc(node.total, numVal);
        });
      }
    });

    const sortTree = (node) => {
      node.children.sort((a, b) =>
        pivotConfig.metric === 'count' ? b.total.count - a.total.count : b.total.sum - a.total.sum
      );
      node.children.forEach(sortTree);
    };
    sortTree(root);

    const safe = (acc) => acc || mkEmpty();
    return {
      rowTree: root.children,
      colKeys,
      getValue: (node, colKey) => safe(node.colTotals.get(colKey)),
      getRowTotal: (node) => safe(node.total),
      totalForCol: (colKey) => safe(root.colTotals.get(colKey)),
      grandTotal: safe(root.total)
    };
  }, [pivotData, pivotConfig, pivotMetricOptions]);

  // Formátování konkrétní metriky v módu metriky-jako-sloupce
  const formatMetricForKey = useCallback((acc, metricKey) => {
    if (!acc || acc.count === 0) return metricKey === 'count' ? 0 : fmtCurrency(0);
    if (metricKey === 'count') return acc.count;
    const fn = pivotConfig.aggFunc || 'sum';
    let val;
    if (fn === 'avg') val = acc.count > 0 ? acc.sum / acc.count : 0;
    else if (fn === 'min') val = acc.min === Infinity ? 0 : acc.min;
    else if (fn === 'max') val = acc.max === -Infinity ? 0 : acc.max;
    else val = acc.sum;
    return fmtCurrency(val);
  }, [pivotConfig.aggFunc]);

  const formatMetric = useCallback((acc) => {
    if (!acc || acc.count === 0) return pivotConfig.metric === 'count' ? 0 : fmtCurrency(0);
    if (pivotConfig.metric === 'count') return acc.count;
    const fn = pivotConfig.aggFunc || 'sum';
    let val;
    if (fn === 'avg') val = acc.count > 0 ? acc.sum / acc.count : 0;
    else if (fn === 'min') val = acc.min === Infinity ? 0 : acc.min;
    else if (fn === 'max') val = acc.max === -Infinity ? 0 : acc.max;
    else val = acc.sum;
    return fmtCurrency(val);
  }, [pivotConfig.metric, pivotConfig.aggFunc]);

  const pivotRowNodes = useMemo(() => {
    const rows = [];
    const walk = (node) => {
      rows.push(node);
      const isExpanded = pivotExpanded[node.id] ?? node.depth === 0;
      if (isExpanded && node.children.length > 0) {
        node.children.forEach(child => walk(child));
      }
    };
    pivotTable.rowTree.forEach(node => walk(node));
    return rows;
  }, [pivotTable.rowTree, pivotExpanded]);

  // Všechny uzly stromové struktury (bez ohledu na expand stav)
  const pivotAllNodes = useMemo(() => {
    const nodes = [];
    const walk = (node) => { nodes.push(node); node.children.forEach(walk); };
    pivotTable.rowTree.forEach(walk);
    return nodes;
  }, [pivotTable.rowTree]);

  const pivotNodesWithChildren = useMemo(
    () => pivotAllNodes.filter(n => n.children.length > 0),
    [pivotAllNodes]
  );

  const pivotAllExpanded = useMemo(() => {
    if (!pivotNodesWithChildren.length) return false;
    return pivotNodesWithChildren.every(n => pivotExpanded[n.id] ?? n.depth === 0);
  }, [pivotNodesWithChildren, pivotExpanded]);

  const handlePivotExpandAll = useCallback(() => {
    if (!pivotNodesWithChildren.length) return;
    if (pivotAllExpanded) {
      // Sbalit vše
      const next = {};
      pivotNodesWithChildren.forEach(n => { next[n.id] = false; });
      setPivotExpanded(next);
    } else {
      // Rozbalit vše
      const next = {};
      pivotNodesWithChildren.forEach(n => { next[n.id] = true; });
      setPivotExpanded(next);
    }
  }, [pivotNodesWithChildren, pivotAllExpanded]);

  const [pivotShowPct, setPivotShowPct] = useState(false);

  const pagedPivotRows = useMemo(
    () => getPagedItems(pivotRowNodes, 'pivotTable'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pivotRowNodes, tablePaging]
  );

  const handlePivotExportCsv = useCallback(() => {
    if (!pivotTable.colKeys.length && !pivotRowNodes.length) return;
    const isMetricMode = pivotConfig.colMode === 'metrics';
    const rowLabel = (pivotConfig.rowFields || []).map(key => pivotTextLabelMap.get(key) || key).join(' / ') || 'Řádky';
    const colHeaders = isMetricMode
      ? pivotTable.colKeys.map(k => pivotMetricLabelMap.get(k) || k)
      : pivotTable.colKeys;
    const headers = [rowLabel, ...colHeaders, 'Celkem'];
    const getCellVal = (acc, colKey) => isMetricMode
      ? String(formatMetricForKey(acc, colKey))
      : String(formatMetric(acc));
    const dataRows = pivotRowNodes.map(node => {
      const indent = '  '.repeat(node.depth);
      return [
        `${indent}${node.label}`,
        ...pivotTable.colKeys.map(colKey => getCellVal(pivotTable.getValue(node, colKey), colKey)),
        isMetricMode
          ? String(pivotTable.colKeys.map(k => formatMetricForKey(pivotTable.getValue(node, k), k)).join(' | '))
          : String(formatMetric(pivotTable.getRowTotal(node)))
      ];
    });
    const totalRow = ['Celkem',
      ...pivotTable.colKeys.map(colKey => getCellVal(pivotTable.totalForCol(colKey), colKey)),
      isMetricMode ? '' : String(formatMetric(pivotTable.grandTotal))
    ];
    const csv = [headers, ...dataRows, totalRow]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agregacni-tabulka-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pivotTable, pivotRowNodes, pivotConfig, pivotTextLabelMap, pivotMetricLabelMap, formatMetric, formatMetricForKey]);

  // ─── CSV Export: sdílené utility ────────────────────────────────────────────
  const downloadCsv = useCallback((headers, rows, filename) => {
    // Čísla bez uvozovek, s locale desetinným oddělovačem (CZ = ',') — toLocaleString bere locale prohlížeče automaticky
    const esc = (v) => {
      if (typeof v === 'number') {
        if (!isFinite(v)) return '';
        return v.toLocaleString(undefined, { useGrouping: false, maximumFractionDigits: 2 });
      }
      const s = String(v == null ? '' : v).replace(/"/g, '""');
      return '"' + s + '"';
    };
    const csv = [headers, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Helper: převod fa_typ kódu na český label pro CSV/zobrazení
  const getTypFakturyLabel = useCallback((fa_typ) => {
    const map = { BEZNA: 'Běžná', ZALOHOVA: 'Zálohová', OPRAVNA: 'Opravná', PROFORMA: 'Proforma', DOBROPIS: 'Dobropis', VYUCTOVACI: 'Vyúčtovací', JINA: 'Jiná' };
    return map[(fa_typ || '').toUpperCase()] || fa_typ || '';
  }, []);

  // Převede objednávku na standardní CSV řádek (sdílený sloupce)
  const orderToCsvRow = useCallback((order) => {
    const invs = invoicesByOrderId[String(order?.id)] || [];
    return {
      ev_cislo:     order?.ev_cislo || order?.cislo_objednavky || '',
      fa_vs:        invs.map(i => {
        const vs = i.cislo_faktury;
        const vema = i.fa_vema_kod;
        return vema ? `${vs} / ${vema}` : vs;
      }).join(' | '),
      fa_typ:       invs.map(i => getTypFakturyLabel(i.fa_typ)).join(' | '),
      dt_obj:       formatDateCz(getOrderDate(order)),
      predmet:      getOrderSubject(order),
      objednatel:   getOrdererName(order),
      schvalovatel: getSchvalovatelName(order),
      usek:         getOrdererUsekCode(order) || '',
      financovani:  getOrderFinancingLabel(order),
      detail_fin:   getOrderFinancingRef(order),
      druh:         getOrderTypeLabel(order),
      stav:         getOrderStatusLabel(order),
      castka:       getOrderAmount(order),
      fa_castka:    invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0),
      stav_fa:      invs.map(inv => getInvoiceStatusLabel(inv)).join(' | '),
    };
  }, [invoicesByOrderId, getOrderDate, getOrdererUsekCode, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrderStatusLabel, getOrderAmount, getInvoiceStatusLabel, getTypFakturyLabel]);

  // ─── Export: Faktury vyšší než schválená objednávka ─────────────────────────
  const handleExportCsv_ordersOverLimit = useCallback(() => {
    const fkFilter = o => {
      const stav = fkStavMapRef.current[`ordersOverLimit_${o.id}_0`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const query = getSearchQuery('ordersOverLimit');
    const filtered = controlSections.ordersOverLimit
      .filter(fkFilter)
      .filter(o => !query || searchInVisibleColumns(o, query, 'ordersOverLimit'));
    const headers = ['Ev.číslo obj.','Fa VS','Typ FA','Dt. obj.','Objednatel','Schvalovatel','Věcná správnost','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','Max cena DPH (Kč)','Částka FA DPH (Kč)'];
    const rows = filtered.map(order => {
      const invs = invoicesByOrderId[String(order.id)] || [];
      const r = orderToCsvRow(order);
      return [r.ev_cislo, r.fa_vs, r.fa_typ, r.dt_obj, r.objednatel, r.schvalovatel, order.potvrdil_vecnou_spravnost_zkracene || '', r.usek, r.financovani, r.detail_fin, r.druh, r.stav, r.stav_fa, getOrderLimit(order), invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0)];
    });
    downloadCsv(headers, rows, `faktury-vyssi-nez-objednavka-${new Date().toISOString().slice(0,10)}.csv`);
  }, [controlSections.ordersOverLimit, invoicesByOrderId, orderToCsvRow, getOrderLimit, getInvoiceAmount, downloadCsv, showFkIgnorovano, showFkVyreseno, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Objednávka vytvořená po doručení faktury ───────────────────────
  const handleExportCsv_ordersAfterInvoice = useCallback(() => {
    const fkFilter = item => {
      const stav = fkStavMapRef.current[`ordersAfterInvoice_${item.order?.id}_${item.invoice?.id}`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const query = getSearchQuery('ordersAfterInvoice');
    const filtered = controlSections.ordersAfterInvoice
      .filter(fkFilter)
      .filter(({ order }) => !query || searchInVisibleColumns(order, query, 'ordersAfterInvoice'));
    const headers = ['Ev.číslo obj.','Fa VS','Typ FA','Fa doručena','Obj vytvořena','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','FA částka (Kč)'];
    const rows = filtered.map(({ order, invoice }) => {
      const r = orderToCsvRow(order);
      const faVs = invoice.cislo_faktury || '';
      const faVema = invoice.fa_vema_kod || '';
      const faDisplay = faVema ? `${faVs} / ${faVema}` : faVs;
      return [r.ev_cislo, faDisplay, getTypFakturyLabel(invoice.fa_typ), formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni), r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, getInvoiceStatusLabel(invoice), getInvoiceAmount(invoice)];
    });
    downloadCsv(headers, rows, `objednavka-po-fakture-${new Date().toISOString().slice(0,10)}.csv`);
  }, [controlSections.ordersAfterInvoice, orderToCsvRow, getInvoiceStatusLabel, getInvoiceAmount, getTypFakturyLabel, downloadCsv, showFkIgnorovano, showFkVyreseno, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Objednávky s fakturami bez příloh ───────────────────────────────
  const handleExportCsv_ordersInvoicesWithoutAttachments = useCallback(() => {
    const fkFilter = o => {
      const stav = fkStavMapRef.current[`ordersInvoicesWithoutAttachments_${o.id}_0`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const query = getSearchQuery('ordersInvoicesWithoutAttachments');
    const filtered = controlSections.ordersInvoicesWithoutAttachments
      .filter(fkFilter)
      .filter(o => !query || searchInVisibleColumns(o, query, 'ordersInvoicesWithoutAttachments'));
    const headers = ['Objednávka','Fa VS','Typ FA','Dt. obj.','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Stav OBJ','Stav FA','Příl. OBJ','Příl. FA','FA částka (Kč)'];
    const rows = filtered.map(order => {
      const invs = invoicesByOrderId[String(order.id)] || [];
      const r = orderToCsvRow(order);
      return [r.ev_cislo, r.fa_vs, r.fa_typ, r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, r.stav_fa, order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0, invs.map(inv => inv.pocet_priloh ?? inv.prilohy?.length ?? 0).join(' | '), r.fa_castka];
    });
    downloadCsv(headers, rows, `objednavky-faktury-bez-prilohy-${new Date().toISOString().slice(0,10)}.csv`);
  }, [controlSections.ordersInvoicesWithoutAttachments, invoicesByOrderId, orderToCsvRow, downloadCsv, showFkIgnorovano, showFkVyreseno, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Faktury bez přílohy ────────────────────────────────────────────
  const handleExportCsv_invoicesWithoutAttachments = useCallback(() => {
    const fkFilter = inv => {
      const stav = fkStavMapRef.current[`invoicesWithoutAttachments_0_${inv.id}`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const query = getSearchQuery('invoicesWithoutAttachments');
    const filtered = controlSections.invoicesWithoutAttachments
      .filter(fkFilter)
      .filter(inv => !query || searchInVisibleColumns(inv, query, 'invoicesWithoutAttachments'));
    const headers = ['Fa VS','Typ FA','Doručena','Zaevidoval','Předána','Objednávka/Smlouva','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','Příl. OBJ','Příl. FA','Částka (Kč)'];
    const rows = filtered.map(invoice => {
      const order = ordersById.get(String(invoice.objednavka_id)) || null;
      const faVs = invoice.cislo_faktury || '';
      const faVema = invoice.fa_vema_kod || '';
      const faDisplay = faVema ? `${faVs} / ${faVema}` : faVs;
      return [
        faDisplay,
        getTypFakturyLabel(invoice.fa_typ),
        formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni),
        invoice.vytvoril_uzivatel_zkracene || '',
        invoice.fa_predana_zam_jmeno_cele || '',
        order ? (order.ev_cislo || order.cislo_objednavky || '') : (invoice.cislo_smlouvy || ''),
        order ? (getOrdererUsekCode(order) || '') : (invoice.usek_zkr || ''),
        order ? getOrderFinancingLabel(order) : '',
        order ? getOrderFinancingRef(order) : '',
        order ? getOrderTypeLabel(order) : '',
        order ? getOrderStatusLabel(order) : '',
        getInvoiceStatusLabel(invoice),
        order ? (order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0) : '',
        invoice.pocet_priloh ?? invoice.prilohy?.length ?? 0,
        getInvoiceAmount(invoice),
      ];
    });
    downloadCsv(headers, rows, `faktury-bez-prilohy-${new Date().toISOString().slice(0,10)}.csv`);
  }, [controlSections.invoicesWithoutAttachments, ordersById, getOrdererUsekCode, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrderStatusLabel, getInvoiceStatusLabel, getInvoiceAmount, getTypFakturyLabel, downloadCsv, showFkIgnorovano, showFkVyreseno, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Faktury po splatnosti ──────────────────────────────────────────
  const handleExportCsv_overdueInvoices = useCallback(() => {
    const fkFilter = inv => {
      const stav = fkStavMapRef.current[`overdueInvoices_0_${inv.id}`];
      if (!showFkIgnorovano && stav === 'IGNORED') return false;
      if (!showFkVyreseno  && stav === 'RESOLVED') return false;
      return true;
    };
    const query = getSearchQuery('overdueInvoices');
    const filtered = controlSections.overdueInvoices
      .filter(fkFilter)
      .filter(inv => !query || searchInVisibleColumns(inv, query, 'overdueInvoices'));
    const headers = ['Fa VS','Typ FA','Doručena','Splatnost','Zaevidoval','Předána','Objednávka/Smlouva','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','Příl. OBJ','Příl. FA','Částka (Kč)'];
    const rows = filtered.map(invoice => {
      const order = ordersById.get(String(invoice.objednavka_id)) || null;
      const faVs = invoice.cislo_faktury || '';
      const faVema = invoice.fa_vema_kod || '';
      const faDisplay = faVema ? `${faVs} / ${faVema}` : faVs;
      return [
        faDisplay,
        getTypFakturyLabel(invoice.fa_typ),
        formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni),
        formatDateCz(invoice.datum_splatnosti),
        invoice.vytvoril_uzivatel_zkracene || '',
        invoice.fa_predana_zam_jmeno_cele || '',
        order ? (order.ev_cislo || order.cislo_objednavky || '') : (invoice.cislo_smlouvy || ''),
        order ? (getOrdererUsekCode(order) || '') : (invoice.usek_zkr || ''),
        order ? getOrderFinancingLabel(order) : '',
        order ? getOrderFinancingRef(order) : '',
        order ? getOrderTypeLabel(order) : '',
        order ? getOrderStatusLabel(order) : '',
        getInvoiceStatusLabel(invoice),
        order ? (order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0) : '',
        invoice.pocet_priloh ?? invoice.prilohy?.length ?? 0,
        getInvoiceAmount(invoice),
      ];
    });
    downloadCsv(headers, rows, `faktury-po-splatnosti-${new Date().toISOString().slice(0,10)}.csv`);
  }, [controlSections.overdueInvoices, ordersById, getOrdererUsekCode, getOrderFinancingLabel, getOrderFinancingRef, getOrderTypeLabel, getOrderStatusLabel, getInvoiceStatusLabel, getInvoiceAmount, getTypFakturyLabel, downloadCsv, showFkIgnorovano, showFkVyreseno, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Zrušené a zamítnuté objednávky ─────────────────────────────────
  const handleExportCsv_cancelledOrders = useCallback(() => {
    const query = getSearchQuery('cancelledOrders');
    const filtered = query
      ? controlSections.cancelledOrders.filter(o => searchInVisibleColumns(o, query, 'cancelledOrders'))
      : controlSections.cancelledOrders;
    const headers = ['Objednávka','Dt. obj.','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Stav obj.','Počet FA'];
    const rows = filtered.map(order => {
      const r = orderToCsvRow(order);
      return [r.ev_cislo, r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, (invoicesByOrderId[String(order.id)] || []).length];
    });
    downloadCsv(headers, rows, `zrusene-objednavky-${new Date().toISOString().slice(0,10)}.csv`);
  }, [controlSections.cancelledOrders, invoicesByOrderId, orderToCsvRow, downloadCsv, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Všechny sekce finanční kontroly do Excel ───────────────────────
  const handleExportAllToExcel = useCallback(() => {
    try {
      // Pomocná funkce pro získání FK filtrace
      const getFkFilteredData = (data, sectionKey) => {
        return data.filter(item => {
          const itemId = item.order?.id || item.id || 0;
          const invId = item.invoice?.id || 0;
          const stav = fkStavMapRef.current[`${sectionKey}_${itemId}_${invId}`];
          if (!showFkIgnorovano && stav === 'IGNORED') return false;
          if (!showFkVyreseno && stav === 'RESOLVED') return false;
          return true;
        });
      };

      const sheets = [];

      // 1. Faktury vyšší než schválená objednávka
      const ordersOverLimitData = getFkFilteredData(controlSections.ordersOverLimit, 'ordersOverLimit');
      if (ordersOverLimitData.length > 0) {
        const headers = ['Ev.číslo obj.','Fa VS','Typ FA','Dt. obj.','Objednatel','Schvalovatel','Věcná správnost','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','Max cena DPH (Kč)','Částka FA DPH (Kč)'];
        const rows = ordersOverLimitData.map(order => {
          const r = orderToCsvRow(order);
          const vecnaSpravnost = order.potvrdil_vecnou_spravnost_zkracene || '';
          const maxCena = getOrderLimit(order) || '';
          const faPartka = r.fa_castka || '';
          return [r.ev_cislo, r.fa_vs, r.fa_typ, r.dt_obj, r.objednatel, r.schvalovatel, vecnaSpravnost, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, r.stav_fa, maxCena, faPartka];
        });
        sheets.push({ name: 'Faktury > obj', headers, rows });
      }

      // 2. Objednávka vytvořená po doručení faktury
      const ordersAfterInvoiceData = getFkFilteredData(controlSections.ordersAfterInvoice, 'ordersAfterInvoice');
      if (ordersAfterInvoiceData.length > 0) {
        const headers = ['Ev.číslo obj.','Fa VS','Typ FA','Fa doručena','Obj vytvořena','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','FA částka (Kč)'];
        const rows = ordersAfterInvoiceData.map(({ order, invoice }) => {
          const r = orderToCsvRow(order);
          const faVs = invoice.cislo_faktury || '';
          const faVema = invoice.fa_vema_kod || '';
          const faDisplay = faVema ? `${faVs} / ${faVema}` : faVs;
          const faDorucena = formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni) || '';
          const stav_fa = getInvoiceStatusLabel(invoice) || '';
          const faCastka = getInvoiceAmount(invoice) || '';
          return [r.ev_cislo, faDisplay, getTypFakturyLabel(invoice.fa_typ) || '', faDorucena, r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, stav_fa, faCastka];
        });
        sheets.push({ name: 'Obj po faktuře', headers, rows });
      }

      // 3. Objednávky s fakturami bez příloh
      const ordersInvoicesWithoutAttachmentsData = getFkFilteredData(controlSections.ordersInvoicesWithoutAttachments, 'ordersInvoicesWithoutAttachments');
      if (ordersInvoicesWithoutAttachmentsData.length > 0) {
        const headers = ['Objednávka','Fa VS','Typ FA','Dt. obj.','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Stav OBJ','Stav FA','Příl. OBJ','Příl. FA','FA částka (Kč)'];
        const rows = ordersInvoicesWithoutAttachmentsData.map(order => {
          const invs = invoicesByOrderId[String(order.id)] || [];
          const r = orderToCsvRow(order);
          const pocetPrilohObj = order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0;
          const pocetPrilohFA = invs.map(inv => inv.pocet_priloh ?? inv.prilohy?.length ?? 0).join(' | ');
          return [r.ev_cislo, r.fa_vs, r.fa_typ, r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, r.stav_fa, pocetPrilohObj, pocetPrilohFA, r.fa_castka];
        });
        sheets.push({ name: 'Obj FA bez příloh', headers, rows });
      }

      // 4. Faktury bez přílohy
      const invoicesWithoutAttachmentsData = getFkFilteredData(controlSections.invoicesWithoutAttachments, 'invoicesWithoutAttachments');
      if (invoicesWithoutAttachmentsData.length > 0) {
        const headers = ['Fa VS','Typ FA','Doručena','Zaevidoval','Předána','Objednávka/Smlouva','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','Příl. OBJ','Příl. FA','Částka (Kč)'];
        const rows = invoicesWithoutAttachmentsData.map(invoice => {
          const order = ordersById.get ? ordersById.get(String(invoice.objednavka_id)) : ordersById[String(invoice.objednavka_id)];
          const faVs = invoice.cislo_faktury || '';
          const faVema = invoice.fa_vema_kod || '';
          const faDisplay = faVema ? `${faVs} / ${faVema}` : faVs;
          const dorucena = formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni) || '';
          const zaevidoval = invoice.vytvoril_uzivatel_zkracene || '';
          const predana = invoice.fa_predana_zam_jmeno_cele || '';
          const objednavkaSmlouva = order ? (order.ev_cislo || order.cislo_objednavky || '') : (invoice.cislo_smlouvy || '');
          const usek = order ? (getOrdererUsekCode(order) || '') : (invoice.usek_zkr || '');
          const financovani = order ? (getOrderFinancingLabel(order) || '') : '';
          const detailFin = order ? (getOrderFinancingRef(order) || '') : '';
          const druh = order ? (getOrderTypeLabel(order) || '') : '';
          const stavObj = order ? (getOrderStatusLabel(order) || '') : '';
          const stavFa = getInvoiceStatusLabel(invoice) || '';
          const pocetPrilohObj = order ? (order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0) : '';
          const pocetPrilohFA = invoice.pocet_priloh ?? invoice.prilohy?.length ?? 0;
          const castka = getInvoiceAmount(invoice) || '';
          return [faDisplay, getTypFakturyLabel(invoice.fa_typ) || '', dorucena, zaevidoval, predana, objednavkaSmlouva, usek, financovani, detailFin, druh, stavObj, stavFa, pocetPrilohObj, pocetPrilohFA, castka];
        });
        sheets.push({ name: 'FA bez příloh', headers, rows });
      }

      // 5. Faktury po splatnosti 14+ dní
      const overdueInvoicesData = getFkFilteredData(controlSections.overdueInvoices, 'overdueInvoices');
      if (overdueInvoicesData.length > 0) {
        const headers = ['Fa VS','Typ FA','Doručena','Splatnost','Zaevidoval','Předána','Objednávka/Smlouva','Úsek','Financování','Detail fin.','Druh','Stav obj.','Stav FA','Příl. OBJ','Příl. FA','Částka (Kč)'];
        const rows = overdueInvoicesData.map(invoice => {
          const order = ordersById.get ? ordersById.get(String(invoice.objednavka_id)) : ordersById[String(invoice.objednavka_id)];
          const faVs = invoice.cislo_faktury || '';
          const faVema = invoice.fa_vema_kod || '';
          const faDisplay = faVema ? `${faVs} / ${faVema}` : faVs;
          const dorucena = formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni) || '';
          const splatnost = formatDateCz(invoice.datum_splatnosti) || '';
          const zaevidoval = invoice.vytvoril_uzivatel_zkracene || '';
          const predana = invoice.fa_predana_zam_jmeno_cele || '';
          const objednavkaSmlouva = order ? (order.ev_cislo || order.cislo_objednavky || '') : (invoice.cislo_smlouvy || '');
          const usek = order ? (getOrdererUsekCode(order) || '') : (invoice.usek_zkr || '');
          const financovani = order ? (getOrderFinancingLabel(order) || '') : '';
          const detailFin = order ? (getOrderFinancingRef(order) || '') : '';
          const druh = order ? (getOrderTypeLabel(order) || '') : '';
          const stavObj = order ? (getOrderStatusLabel(order) || '') : '';
          const stavFa = getInvoiceStatusLabel(invoice) || '';
          const pocetPrilohObj = order ? (order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0) : '';
          const pocetPrilohFA = invoice.pocet_priloh ?? invoice.prilohy?.length ?? 0;
          const castka = getInvoiceAmount(invoice) || '';
          return [faDisplay, getTypFakturyLabel(invoice.fa_typ) || '', dorucena, splatnost, zaevidoval, predana, objednavkaSmlouva, usek, financovani, detailFin, druh, stavObj, stavFa, pocetPrilohObj, pocetPrilohFA, castka];
        });
        sheets.push({ name: 'FA po splatnosti', headers, rows });
      }

      // 6. Zrušené a zamítnuté objednávky
      if (controlSections.cancelledOrders.length > 0) {
        const headers = ['Objednávka','Dt. obj.','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Stav obj.','Počet FA'];
        const rows = controlSections.cancelledOrders.map(order => {
          const r = orderToCsvRow(order);
          const pocetFaktur = (invoicesByOrderId[String(order.id)] || []).length;
          return [r.ev_cislo, r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, pocetFaktur];
        });
        sheets.push({ name: 'Zrušené obj', headers, rows });
      }

      // Export do Excel
      if (sheets.length === 0) {
        showToast && showToast('Žádná data k exportu', { type: 'warning' });
        return;
      }

      exportToExcel(sheets, 'ExportFinKontrola');
      showToast && showToast(`Export dokončen: ${sheets.length} sekcí exportováno do Excel`, { type: 'success' });
    } catch (error) {
      console.error('Chyba při exportu do Excel:', error);
      showToast && showToast(`Chyba při exportu: ${error.message}`, { type: 'error' });
    }
  }, [
    controlSections,
    invoicesByOrderId,
    ordersById,
    orderToCsvRow,
    getOrderLimit,
    getInvoiceAmount,
    getTypFakturyLabel,
    getInvoiceStatusLabel,
    getOrderStatusLabel,
    getOrdererUsekCode,
    getOrderFinancingLabel,
    getOrderFinancingRef,
    getOrderTypeLabel,
    formatDateCz,
    showFkIgnorovano,
    showFkVyreseno,
    showToast
  ]);

  // ─── Export: Vzdělávání lékařské ────────────────────────────────────────────
  const handleExportCsv_vzdelLekarsky = useCallback(() => {
    const query = getSearchQuery('vzdelLekarsky');
    const lekarskyFiltered = query
      ? vzdelSections.lekarsky.filter(o => searchInVisibleColumns(o, query, 'vzdelLekarsky'))
      : vzdelSections.lekarsky;
    const headers = ['Objednávka','Fa VS','Typ','Doručena','Splatnost','Částka FA','Stav FA','Úsek','LP','Částka celk.','Stav obj.'];
    const rows = lekarskyFiltered.flatMap(order => {
      const invs = invoicesByOrderId[String(order.id)] || [];
      const faSum = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
      const pol = getOrderPlannedAmount(order) || 0;
      const mx = getOrderLimit(order) || 0;
      const castkaCelk = faSum > 0 ? faSum : pol > 0 ? pol : mx;
      if (invs.length === 0) {
        return [[order.ev_cislo || '', '', '', '', '', '', '', getOrdererUsekCode(order) || '', getOrderFinancingRef(order), castkaCelk, getOrderStatusLabel(order)]];
      }
      return invs.map(inv => {
        const faVs = inv.cislo_faktury || '';
        const faVema = inv.fa_vema_kod || '';
        const faDisplay = faVema ? `${faVs} / ${faVema}` : faVs;
        return [
          order.ev_cislo || '',
          faDisplay,
          getTypFakturyLabel(inv.fa_typ),
          formatDateCz(inv.datum_doruceni || inv.datum_vystaveni),
          formatDateCz(inv.datum_splatnosti),
          inv.castka || '',
          getInvoiceStatusLabel(inv),
          getOrdererUsekCode(order) || '',
          getOrderFinancingRef(order),
          castkaCelk,
          getOrderStatusLabel(order),
        ];
      });
    });
    downloadCsv(headers, rows, `vzdelavani-lekarsky-${new Date().toISOString().slice(0,10)}.csv`);
  }, [vzdelSections.lekarsky, invoicesByOrderId, getOrdererUsekCode, getOrderStatusLabel, getInvoiceStatusLabel, getInvoiceAmount, getTypFakturyLabel, getOrderPlannedAmount, getOrderLimit, downloadCsv, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Školení nelékařské ─────────────────────────────────────────────
  const handleExportCsv_vzdelNelekarsky = useCallback(() => {
    const headers = ['Úsek','Financování','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Stav','Částka (Kč)'];
    const rows = [];
    vzdelNelByUsekFin.forEach(group => {
      Object.values(group.financing || {}).forEach(fin => {
        fin.orders.forEach(order => {
          const r = orderToCsvRow(order);
          rows.push([group.label, fin.label, r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.stav, r.castka]);
        });
      });
    });
    downloadCsv(headers, rows, `skoleni-nelekarsky-${new Date().toISOString().slice(0,10)}.csv`);
  }, [vzdelNelByUsekFin, orderToCsvRow, downloadCsv]);

  // ─── Export: Vzdělávání dle střediska ──────────────────────────────────────
  const handleExportCsv_vzdelByUsek = useCallback(() => {
    const headers = ['Typ','Středisko','Úsek','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Financování','Detail fin.','Stav','Částka (Kč)'];
    const rows = [];
    vzdelByTypStredisko.forEach(typ => {
      typ.strediska.forEach(stredisko => {
        Object.values(stredisko.byUsek || {}).forEach(usek => {
          usek.orders.forEach(order => {
            const r = orderToCsvRow(order);
            rows.push([
              typ.label, stredisko.label, usek.label,
              r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel,
              r.financovani, r.detail_fin, r.stav, r.castka,
            ]);
          });
        });
      });
    });
    downloadCsv(headers, rows, `vzdelavani-dle-strediska-${new Date().toISOString().slice(0,10)}.csv`);
  }, [vzdelByTypStredisko, orderToCsvRow, downloadCsv]);

  // ─── Export: Čerpání – Financování → Úsek ──────────────────────────────────
  const handleExportCsv_spendByFinancingUsek = useCallback(() => {
    const headers = ['Financování','Úsek','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Detail fin.','Druh','Stav','Částka (Kč)'];
    const rows = [];
    spendByFinancingGroups.forEach(group => {
      Object.values(group.useky || {}).forEach(usek => {
        usek.orders.forEach(order => {
          const r = orderToCsvRow(order);
          rows.push([group.label, usek.label, r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.detail_fin, r.druh, r.stav, r.castka]);
        });
      });
    });
    downloadCsv(headers, rows, `cerpani-financovani-usek-${new Date().toISOString().slice(0,10)}.csv`);
  }, [spendByFinancingGroups, orderToCsvRow, downloadCsv]);

  // ─── Export: Čerpání – Úsek → Financování ──────────────────────────────────
  const handleExportCsv_spendByUsekFinancing = useCallback(() => {
    const headers = ['Úsek','Financování','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Detail fin.','Druh','Stav','Částka (Kč)'];
    const rows = [];
    spendByUsekGroups.forEach(group => {
      Object.values(group.financing || {}).forEach(fin => {
        fin.orders.forEach(order => {
          const r = orderToCsvRow(order);
          rows.push([group.label, fin.label, r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.detail_fin, r.druh, r.stav, r.castka]);
        });
      });
    });
    downloadCsv(headers, rows, `cerpani-usek-financovani-${new Date().toISOString().slice(0,10)}.csv`);
  }, [spendByUsekGroups, orderToCsvRow, downloadCsv]);

  // ─── Export: Čerpání – Druh → Financování ──────────────────────────────────
  const handleExportCsv_spendByDruhFinancing = useCallback(() => {
    const headers = ['Druh','Financování','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Detail fin.','Úsek','Stav','Částka (Kč)'];
    const rows = [];
    spendByDruhGroups.forEach(group => {
      Object.values(group.financing || {}).forEach(fin => {
        fin.orders.forEach(order => {
          const r = orderToCsvRow(order);
          rows.push([group.label, fin.label, r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.detail_fin, r.usek, r.stav, r.castka]);
        });
      });
    });
    downloadCsv(headers, rows, `cerpani-druh-financovani-${new Date().toISOString().slice(0,10)}.csv`);
  }, [spendByDruhGroups, orderToCsvRow, downloadCsv]);

  // ─── Export: Čerpání – Financování → Úsek → Druh ────────────────────────────
  const handleExportCsv_spendByFinancingUsekDruh = useCallback(() => {
    const headers = ['Financování','Úsek','Druh','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Detail fin.','Stav','Částka (Kč)'];
    const rows = [];
    spendByFinancingUsekDruhGroups.forEach(group => {
      Object.values(group.useky || {}).forEach(usek => {
        Object.values(usek.druhy || {}).forEach(druh => {
          druh.orders.forEach(order => {
            const r = orderToCsvRow(order);
            rows.push([group.label, usek.label, druh.label, r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.detail_fin, r.stav, r.castka]);
          });
        });
      });
    });
    downloadCsv(headers, rows, `cerpani-financovani-usek-druh-${new Date().toISOString().slice(0,10)}.csv`);
  }, [spendByFinancingUsekDruhGroups, orderToCsvRow, downloadCsv]);

  // ─── Export: Čerpání LP – podle LP kódu ────────────────────────────────────
  const handleExportCsv_spendByLpKod = useCallback(() => {
    const headers = ['LP kód','LP limit (Kč)','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Stav','Částka (Kč)'];
    const rows = [];
    spendByLpKodGroups.forEach(group => {
      group.orders.forEach(order => {
        const r = orderToCsvRow(order);
        rows.push([group.label, group.lp_limit ?? '', r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.stav, r.castka]);
      });
    });
    downloadCsv(headers, rows, `cerpani-lp-kod-${new Date().toISOString().slice(0,10)}.csv`);
  }, [spendByLpKodGroups, orderToCsvRow, downloadCsv]);

  // ─── Export: Čerpání ze Smluv ────────────────────────────────────────────────
  const handleExportCsv_spendBySmlouvy = useCallback(() => {
    const headers = ['Číslo smlouvy','Dodavatel','IČO','Hodnota smlouvy (Kč)','Čerpáno celkem (Kč)','Počet obj.','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Úsek','Stav','Částka obj. (Kč)'];
    const rows = [];
    spendBySmlouvyGroups.forEach(group => {
      group.orders.forEach(order => {
        const r = orderToCsvRow(order);
        rows.push([group.label, group.dodavatel || '', group.ico || '', group.smlouva_hodnota ?? '', group.amount, group.count, r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.usek, r.stav, r.castka]);
      });
    });
    downloadCsv(headers, rows, `cerpani-smlouvy-${new Date().toISOString().slice(0,10)}.csv`);
  }, [spendBySmlouvyGroups, orderToCsvRow, downloadCsv]);

  // ─── Export: Dodavatelé → Financování → Objednávky ─────────────────────────
  const handleExportCsv_topSuppliers = useCallback(() => {
    const headers = ['Dodavatel','IČO','Financování','Číslo obj.','Dt. obj.','Předmět','Objednatel','Schvalovatel','Úsek','Detail fin.','Druh','Stav','Částka (Kč)'];
    const rows = [];
    reportSections.topSuppliers.forEach(group => {
      Object.values(group.financovani || {}).forEach(fin => {
        fin.orders.forEach(order => {
          const r = orderToCsvRow(order);
          rows.push([group.label, group.ico || '', fin.label, r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.usek, r.detail_fin, r.druh, r.stav, r.castka]);
        });
      });
    });
    downloadCsv(headers, rows, `dodavatele-${new Date().toISOString().slice(0,10)}.csv`);
  }, [reportSections.topSuppliers, orderToCsvRow, downloadCsv]);

  // ─── Export: Objednávky bez faktury 2+ měsíce ───────────────────────────────
  const handleExportCsv_ordersWithoutInvoice = useCallback(() => {
    const headers = ['Objednávka','Dt. obj.','Předmět','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','Druh','Částka (Kč)','Stav obj.'];
    const rows = reportSections.ordersWithoutInvoice.map(order => {
      const r = orderToCsvRow(order);
      return [r.ev_cislo, r.dt_obj, r.predmet, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.druh, r.castka, r.stav];
    });
    downloadCsv(headers, rows, `objednavky-bez-faktury-${new Date().toISOString().slice(0,10)}.csv`);
  }, [reportSections.ordersWithoutInvoice, orderToCsvRow, downloadCsv]);

  // ─── Export: Objednávky s fakturou, nedokončené ─────────────────────────────
  const handleExportCsv_ordersWithInvoiceNotDone = useCallback(() => {
    const query = getSearchQuery('ordersWithInvoiceNotDone');
    const filtered = query
      ? reportSections.ordersWithInvoiceNotDone.filter(o => searchInVisibleColumns(o, query, 'ordersWithInvoiceNotDone'))
      : reportSections.ordersWithInvoiceNotDone;
    const headers = ['Objednávka','Dt. obj.','Objednatel','Schvalovatel','Úsek','Financování','Detail fin.','VS faktur','Typ FA','Druh','Částka (Kč)','Stav obj.','Stav FA'];
    const rows = filtered.map(order => {
      const r = orderToCsvRow(order);
      return [r.ev_cislo, r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.financovani, r.detail_fin, r.fa_vs, r.fa_typ, r.druh, r.castka, r.stav, r.stav_fa];
    });
    downloadCsv(headers, rows, `objednavky-nedokoncene-${new Date().toISOString().slice(0,10)}.csv`);
  }, [reportSections.ordersWithInvoiceNotDone, orderToCsvRow, downloadCsv, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Objednávky LP bez rozkladu na LP ────────────────────────────────
  const handleExportCsv_ordersWithMissingLpCerpani = useCallback(() => {
    const query = getSearchQuery('ordersWithMissingLpCerpani');
    const filtered = query
      ? reportSections.ordersWithMissingLpCerpani.filter(o => searchInVisibleColumns(o, query, 'ordersWithMissingLpCerpani'))
      : reportSections.ordersWithMissingLpCerpani;
    const headers = ['Objednávka','Dt. obj.','Objednatel','Schvalovatel','Úsek','LP kódy','Faktury s věc. správností','Druh','FA částka (Kč)','Částka pol. (Kč)','Max DPH (Kč)','Stav obj.'];
    const rows = filtered.map(order => {
      const invs = invoicesByOrderId[String(order.id)] || [];
      const r = orderToCsvRow(order);
      const faWithVS = invs.filter(inv => inv.potvrdil_vecnou_spravnost_id || inv.potvrdil_vecnou_spravnost_zkracene).map(inv => {
        const vs = inv.cislo_faktury || String(inv.id);
        const vema = inv.fa_vema_kod;
        return vema ? `${vs} / ${vema}` : vs;
      }).join(' | ');
      return [r.ev_cislo, r.dt_obj, r.objednatel, r.schvalovatel, r.usek, r.detail_fin, faWithVS, r.druh, r.fa_castka, getOrderPlannedAmount(order), getOrderLimit(order), r.stav];
    });
    downloadCsv(headers, rows, `lp-bez-rozkladu-${new Date().toISOString().slice(0,10)}.csv`);
  }, [reportSections.ordersWithMissingLpCerpani, invoicesByOrderId, orderToCsvRow, getOrderPlannedAmount, getOrderLimit, downloadCsv, getSearchQuery, searchInVisibleColumns]);

  // ─── Export: Přehled příloh ──────────────────────────────────────────────────
  const handleExportCsv_invoiceAttachmentsList = useCallback(() => {
    const headers = ['Soubor','Velikost (B)','Typ přílohy','Zdroj (OBJ/FA/RP)','Objednávka / RP','Faktura','Dodavatel','Druh'];
    const rows = allAttachmentsCombined.map(att => [
      att.original_name || att.original_filename || att.originalni_nazev_souboru || att.nazev_souboru || '',
      att.velikost_souboru_b || att.velikost_b || att.velikost || 0,
      att.typ_prilohy || att.type || att.attachment_type || '',
      att.attachmentSource || '',
      att.cislo_objednavky || att.order_number || '',
      att.cislo_faktury || att.invoice_number || '',
      att.dodavatel || '',
      att.druh_objednavky_label || '',
    ]);
    downloadCsv(headers, rows, `prilohy-${new Date().toISOString().slice(0,10)}.csv`);
  }, [allAttachmentsCombined, downloadCsv]);

  // ─── Export: Přehled pokladen ────────────────────────────────────────────────
  const handleExportCsv_cashbookOverview = useCallback(() => {
    const headers = ['Pokladna','Č. pokladny','Rok','Měsíc','Počáteční stav (Kč)','Převod z předch. (Kč)','Příjmy (Kč)','Výdaje (Kč)','Konečný stav (Kč)','Počet operací'];
    const rows = [];
    (cashbookBooksToRender || []).forEach(book => {
      rows.push([
        book.pokladna_nazev || '',
        book.cislo_pokladny || '',
        book.rok || '',
        book.mesic || '(celý rok)',
        book.pocatecni_stav_rok ?? '',
        book.prevod_z_predchoziho ?? '',
        book.celkove_prijmy ?? '',
        book.celkove_vydaje ?? '',
        book.koncovy_stav ?? '',
        book.pocet_zaznamu ?? '',
      ]);
    });
    downloadCsv(headers, rows, `prehled-pokladen-${new Date().toISOString().slice(0,10)}.csv`);
  }, [cashbookBooksToRender, downloadCsv]);

  // ─── Export: Dohadné položky dle účtu ────────────────────────────────────────
  const handleExportCsv_dohadneLpUctu = useCallback(() => {
    const groups = dohadneData?.lp_uctu?.groups || [];
    const headers = [
      'Č. účtu', 'Název účtu', 'LP kódy (skupina)', 'Počet obj. (skupina)',
      'Před schválením (skupina)', 'Odeslané (skupina)', 'Celkem (skupina)',
      'Číslo objednávky', 'Dt. vytv.', 'Předmět', 'LP kód',
      'Objednatel', 'Schvalovatel', 'Úsek', 'Stav', 'Částka (Kč)',
    ];
    const rows = [];
    groups.forEach(g => {
      (g.objednavky || []).forEach(o => {
        rows.push([
          g.cislo_uctu || '',
          g.nazev_uctu || '',
          (g.lp_kody_v_uctu || []).join(', '),
          g.pocet_objednavek ?? '',
          g.castka_pre_schvaleni ?? '',
          g.castka_odeslane ?? '',
          g.castka_celkem ?? '',
          o.cislo_objednavky || '',
          o.dt_vytvoreni ? o.dt_vytvoreni.slice(0, 10) : '',
          o.predmet || '',
          o.cislo_lp || '',
          buildFullName(o.objednatel_jmeno, o.objednatel_prijmeni),
          buildFullName(o.schvalovatel_jmeno, o.schvalovatel_prijmeni) || buildFullName(o.prikazce_jmeno, o.prikazce_prijmeni),
          getUsekLabel(o),
          o.stav_objednavky || '',
          o.castka ?? '',
        ]);
      });
    });
    downloadCsv(headers, rows, `dohadne-dle-uctu-${new Date().toISOString().slice(0,10)}.csv`);
  }, [dohadneData, downloadCsv]);

  // ─── Export: Dohadné položky LP ──────────────────────────────────────────────
  const handleExportCsv_dohadneLp = useCallback(() => {
    const groups = dohadneData?.lp?.groups || [];
    const headers = [
      'LP kód', 'Název LP', 'LP Účet', 'Počet obj. (skupina)',
      'Před schválením (skupina)', 'Odeslané (skupina)', 'Celkem (skupina)',
      'Číslo objednávky', 'Dt. vytv.', 'Předmět',
      'Objednatel', 'Schvalovatel', 'Úsek', 'Druh', 'Stav', 'Částka (Kč)',
    ];
    const rows = [];
    groups.forEach(g => {
      (g.objednavky || []).forEach(o => {
        rows.push([
          g.cislo_lp || '',
          g.nazev_uctu || '',
          g.cislo_uctu || '',
          g.pocet_objednavek ?? '',
          g.castka_pre_schvaleni ?? '',
          g.castka_odeslane ?? '',
          g.castka_celkem ?? '',
          o.cislo_objednavky || '',
          o.dt_vytvoreni ? o.dt_vytvoreni.slice(0, 10) : '',
          o.predmet || '',
          buildFullName(o.objednatel_jmeno, o.objednatel_prijmeni),
          buildFullName(o.schvalovatel_jmeno, o.schvalovatel_prijmeni) || buildFullName(o.prikazce_jmeno, o.prikazce_prijmeni),
          getUsekLabel(o),
          o.druh_objednavky_kod || '',
          o.stav_objednavky || '',
          o.castka ?? '',
        ]);
      });
    });
    downloadCsv(headers, rows, `dohadne-lp-${new Date().toISOString().slice(0,10)}.csv`);
  }, [dohadneData, downloadCsv]);

  // ─── Export: Dohadné položky Smlouvy ─────────────────────────────────────────
  const handleExportCsv_dohadneSmlouvy = useCallback(() => {
    const groups = dohadneData?.smlouvy?.groups || [];
    const headers = [
      'Č. smlouvy', 'Název smlouvy', 'Dodavatel smlouvy', 'Počet obj. (skupina)',
      'Před schválením (skupina)', 'Odeslané (skupina)', 'Celkem (skupina)',
      'Číslo objednávky', 'Dt. vytv.', 'Předmět',
      'Objednatel', 'Schvalovatel', 'Úsek', 'Druh', 'Stav', 'Částka (Kč)',
    ];
    const rows = [];
    groups.forEach(g => {
      (g.objednavky || []).forEach(o => {
        rows.push([
          g.cislo_smlouvy || '',
          g.nazev_smlouvy || '',
          g.nazev_firmy || '',
          g.pocet_objednavek ?? '',
          g.castka_pre_schvaleni ?? '',
          g.castka_odeslane ?? '',
          g.castka_celkem ?? '',
          o.cislo_objednavky || '',
          o.dt_vytvoreni ? o.dt_vytvoreni.slice(0, 10) : '',
          o.predmet || '',
          buildFullName(o.objednatel_jmeno, o.objednatel_prijmeni),
          buildFullName(o.schvalovatel_jmeno, o.schvalovatel_prijmeni) || buildFullName(o.prikazce_jmeno, o.prikazce_prijmeni),
          getUsekLabel(o),
          o.druh_objednavky_kod || '',
          o.stav_objednavky || '',
          o.castka ?? '',
        ]);
      });
    });
    downloadCsv(headers, rows, `dohadne-smlouvy-${new Date().toISOString().slice(0,10)}.csv`);
  }, [dohadneData, downloadCsv]);

  const handleFilterChange = (key, value) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = useCallback(() => {
    const merged = { ...filters, ...pendingFilters };
    setFilters(merged);
    // Aplikovat rok pokladen
    if (pendingFilters.cashbookRok !== undefined) {
      setCashbookFilters(prev => ({ ...prev, rok: pendingFilters.cashbookRok }));
    }
    setApplyTrigger(t => t + 1);
    try {
      if (userKey && userKey !== 'guest') {
        localStorage.setItem(filterLsKey, JSON.stringify(merged));
      }
    } catch (e) {}
  }, [pendingFilters, filters, userKey, filterLsKey]);

  const handleResetFilters = useCallback(() => {
    // Pro non-manage uživatele zachovat zamknuté úseky (PTN → PTN + PTN-dílny)
    const lockedUsek = (!canChangeUsekFilter && userUsekId) ? userLockedUsekIds : [];
    const cur = { ...FILTER_DEFAULTS, usekIds: lockedUsek };
    setPendingFilters(cur);
    setFilters(cur);
    // Resetovat cashbook rok
    setCashbookFilters(prev => ({ ...prev, rok: FILTER_DEFAULTS.cashbookRok }));
    setApplyTrigger(t => t + 1);
    try {
      if (userKey && userKey !== 'guest') {
        localStorage.setItem(filterLsKey, JSON.stringify(cur));
      }
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey, filterLsKey, canChangeUsekFilter, userUsekId, userLockedUsekIds]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setBlockSelectOpen(false);
    try {
      if (userKey && userKey !== 'guest') {
        localStorage.setItem(activeTabLsKey, tabId);
      }
    } catch (e) {}
  }, [userKey, activeTabLsKey]);

  const hasUnappliedFilters = useMemo(() => {
    return JSON.stringify(pendingFilters) !== JSON.stringify(filters);
  }, [pendingFilters, filters]);

  const renderFaTypBadge = (fa_typ, fa_typ_nazev) => {
    if (!fa_typ) return null;
    const typ = (fa_typ || '').toUpperCase();
    const czMap  = { BEZNA: 'Běžná', ZALOHOVA: 'Zálohová', DOBROPIS: 'Dobropis', OPRAVNA: 'Opravná', PROFORMA: 'Proforma', VYUCTOVACI: 'Vyúčtovací', JINA: 'Jiná' };
    const label = fa_typ_nazev || czMap[typ] || fa_typ;
    const bgMap  = { BEZNA: '#f1f5f9', ZALOHOVA: '#dbeafe', DOBROPIS: '#dcfce7', OPRAVNA: '#fef3c7', PROFORMA: '#e0e7ff', VYUCTOVACI: '#fce7f3', JINA: '#f3f4f6' };
    const clrMap = { BEZNA: '#475569', ZALOHOVA: '#1e40af', DOBROPIS: '#166534', OPRAVNA: '#92400e', PROFORMA: '#4338ca', VYUCTOVACI: '#9d174d', JINA: '#374151' };
    return (
      <span style={{ display: 'inline-block', padding: '0.18rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em', backgroundColor: bgMap[typ] || '#f1f5f9', color: clrMap[typ] || '#475569', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    );
  };

  // ---------- Vzdělávání – helper: buňky na úrovni jedné faktury ----------
  const renderVzdelInvCells = (inv, sectionKey) => {
    if (!inv) return (
      <Td colSpan={6} style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>— bez faktury —</Td>
    );
    const pozn = inv.fa_poznamka;
    // ✅ Všechny Td buňky musí mít z-index: 1 aby byly POD sticky sloupcem
    const tdStyle = { position: 'relative', zIndex: 1 };
    return (
      <>
        <Td style={{ minWidth: '120px', maxWidth: '200px', overflow: 'hidden', ...tdStyle }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
            {renderInvoiceLink(inv, sectionKey)}
            {pozn && (
              <SmartTooltip text={pozn} preferredPosition="right" icon="none" multiline={true}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  fontStyle: 'italic',
                  width: '100%',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  lineHeight: '1.4',
                  cursor: 'help',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  textOverflow: 'ellipsis'
                }}>
                  {pozn}
                </div>
              </SmartTooltip>
            )}
          </div>
        </Td>
        <Td style={{ width: '85px', maxWidth: '85px', ...tdStyle }}>{renderFaTypBadge(inv.fa_typ, inv.fa_typ_nazev)}</Td>
        <Td style={tdStyle}>{highlightText(formatDateCz(inv.datum_doruceni || ''), sectionKey)}</Td>
        <Td style={tdStyle}>{highlightText(formatDateCz(inv.datum_splatnosti || ''), sectionKey)}</Td>
        <TdR style={tdStyle}>{highlightText(fmtCurrency(inv.castka), sectionKey)}</TdR>
        <Td style={{ ...tdStyle, width: '130px', maxWidth: '130px', minWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(getInvoiceStatusLabel(inv), sectionKey)}</Td>
      </>
    );
  };

  // ---------- Dokončení objednávky – handlers ----------

  /**
   * Tiché přenačtení objednávek + příloh na pozadí po dokončení.
   * Zobrazí toast okamžitě, data se aktualizují bez loading spinneru.
   * Dokončená objednávka zmizí z "čekajících" sekcí, protože její
   * stav_workflow_kod bude obsahovat 'DOKONCENA'.
   */
  const _reloadAfterCompletion = useCallback(async () => {
    try {
      const [ordersResult, attachmentsResult] = await Promise.all([
        loadOrders().catch(e => { console.warn('Reload orders failed:', e); return null; }),
        listAllOrderAttachments(username, token, 10000, 0).catch(e => { console.warn('Reload attachments failed:', e); return null; })
      ]);
      if (ordersResult) setOrders(ordersResult.data || []);
      if (attachmentsResult) setOrderAttachments(attachmentsResult.data || []);
    } catch (e) {
      console.warn('Background reload after completion failed:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrders, token, username]);

  const handleOrderCompletionClick = useCallback(async (order) => {
    if (completionInProgress) return;
    setCompletionInProgress(true);
    try {
      // Načíst kompletní data objednávky (s fakturami, položkami atd.)
      const fullOrder = await getOrderV2(order.id, token, username, true, 0);
      setCompletionTarget(fullOrder);
      setShowCompletionModeDialog(true);
    } catch (err) {
      showToast && showToast(`Chyba při načítání objednávky: ${err.message || err}`, { type: 'error' });
    } finally {
      setCompletionInProgress(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionInProgress, token, username]);

  const _buildGeneratedBy = useCallback(() => ({
    fullName: userDetail
      ? `${userDetail.titul_pred || ''} ${userDetail.jmeno || ''} ${userDetail.prijmeni || ''} ${userDetail.titul_za || ''}`.trim()
      : (fullName || username),
    position: userDetail?.pozice_nazev || 'Uživatel'
  }), [userDetail, fullName, username]);

  const _enrichFaktury = useCallback(async (faktury) => {
    if (!Array.isArray(faktury)) return [];
    const enriched = [];
    for (const faktura of faktury) {
      const ef = { ...faktura };
      if (faktura.potvrdil_vecnou_spravnost_id) {
        try { ef.potvrdil_vecnou_spravnost = await getUserDetail(faktura.potvrdil_vecnou_spravnost_id); } catch (e) { /* ignore */ }
      }
      if (faktura.id && !String(faktura.id).startsWith('temp-')) {
        try {
          const lpResp = await getFakturaLPCerpani(faktura.id, token, username);
          ef.lp_cerpani = lpResp?.data?.lp_cerpani || [];
        } catch (e) { ef.lp_cerpani = []; }
      }
      enriched.push(ef);
    }
    return enriched;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, username]);

  const handleQuickComplete = useCallback(async () => {
    setShowCompletionModeDialog(false);
    const order = completionTarget;
    if (!order) return;
    setCompletionInProgress(true);
    try {
      // 1. Paralelně: organizace + střediska
      const [orgData, strediskaData] = await Promise.all([
        getOrganizaceDetail({ token, username, id: 1 }).catch(() => null),
        getStrediska25({ token, username, aktivni: 1 }).catch(() => [])
      ]);
      const localStrediskaMap = Array.isArray(strediskaData)
        ? strediskaData.reduce((acc, s) => { if (s.value && s.label) acc[s.value] = s.label; return acc; }, {})
        : {};

      // 2. Obohacení faktur
      const enrichedFaktury = await _enrichFaktury(order.faktury);

      // 3. Generování PDF na pozadí
      const orderForPDF = {
        ...order,
        polozky: order.polozky_objednavky || order.polozky || [],
        faktury: enrichedFaktury
      };
      const blob = await pdf(
        <FinancialControlPDF
          order={orderForPDF}
          generatedBy={_buildGeneratedBy()}
          organizace={orgData}
          strediskaMap={localStrediskaMap}
        />
      ).toBlob();

      // 4. Vytvoření souboru
      const dateStr = new Date().toISOString().split('T')[0];
      const orderNumber = (order.cislo_objednavky || 'neznama').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Financni_kontrola_${dateStr}_${orderNumber}.pdf`;
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });

      // 5. Upload jako KOSILKA
      await uploadOrderAttachment(order.id, pdfFile, username, token, 'KOSILKA', 'fk-');

      // 6. Dokončení objednávky – workflow → DOKONCENA (backend)
      await completeOrder25({ token, username, orderId: order.id });

      // 7. Okamžitý toast + tiché přenačtení dat na pozadí
      showToast && showToast('✅ Objednávka dokončena a finanční kontrola uložena', { type: 'success' });
      _reloadAfterCompletion();
    } catch (err) {
      showToast && showToast(`Chyba: ${err.message || err}`, { type: 'error' });
    } finally {
      setCompletionInProgress(false);
      setCompletionTarget(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionTarget, token, username, _enrichFaktury, _buildGeneratedBy, _reloadAfterCompletion]);

  const handleConfirmWithPreview = useCallback(async (pdfFile) => {
    setShowFinancialPreviewModal(false);
    const order = completionTarget;
    if (!order) return;
    setCompletionInProgress(true);
    try {
      // Upload finanční kontroly jako KOSILKA
      await uploadOrderAttachment(order.id, pdfFile, username, token, 'KOSILKA', 'fk-');

      // Workflow → DOKONCENA (backend)
      await completeOrder25({ token, username, orderId: order.id });

      // Okamžitý toast + tiché přenačtení dat na pozadí
      showToast && showToast('✅ Objednávka dokončena a finanční kontrola uložena', { type: 'success' });
      _reloadAfterCompletion();
    } catch (err) {
      showToast && showToast(`Chyba: ${err.message || err}`, { type: 'error' });
    } finally {
      setCompletionInProgress(false);
      setCompletionTarget(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionTarget, token, username, _reloadAfterCompletion]);

  // ---------- Akce - dokončení objednávky ----------
  const renderActionButton = (order, isHighlighted) => {
    const wfCode = String(order.stav_workflow_kod || '').toUpperCase();
    const isDokoncena = wfCode.includes('DOKONCENA');
    const isZkontrolovana = wfCode.includes('ZKONTROLOVANA');

    // Oprávnění k dokončení: role ADMINISTRATOR/SUPERADMIN nebo právo ORDER_MANAGE/ORDER_COMPLETE/EDUCATION_COMPLETE
    const isAdminUser = hasAdminRole && hasAdminRole();
    const canCompleteVzdel = isAdminUser
      || (hasPermission && (
        hasPermission('ORDER_MANAGE') ||
        hasPermission('ORDER_COMPLETE') ||
        hasPermission('EDUCATION_COMPLETE')
      ));

    // Objednávka již dokončena → zobrazit badge (funguje i po bg reloadu)
    if (isDokoncena) {
      const dtDokonceni = order.dt_dokonceni;
      const dokoncilJmeno = [order.dokoncil_titul_pred, order.dokoncil_jmeno, order.dokoncil_prijmeni, order.dokoncil_titul_za].filter(Boolean).join(' ') || order.dokoncil_zkr || null;
      const datumStr = dtDokonceni ? formatDateCz(dtDokonceni) : null;
      const tooltipText = [
        'Objednávka je dokončena',
        datumStr ? `Datum: ${datumStr}` : null,
        dokoncilJmeno ? `Dokončil/a: ${dokoncilJmeno}` : null,
      ].filter(Boolean).join('\n');
      return (
        <SmartTooltip text={tooltipText} preferredPosition="left" icon="none" multiline={true}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', color: '#64748b', cursor: 'default' }}>
            <FontAwesomeIcon icon={faLock} />
          </div>
        </SmartTooltip>
      );
    }

    // Podmínka: musí mít ZKONTROLOVANA v workflow (= má fakturu + věcnou správnost potvrzenou)
    // + isHighlighted (ZALOHOVA + VYUCTOVACI pár) + zelené přílohy + dostatečné oprávnění
    const isEnabled = canCompleteVzdel && isZkontrolovana && isHighlighted && order.attachment_color === '#16a34a';
    const isThisInProgress = completionInProgress && completionTarget?.id === order.id;

    const handleClick = () => {
      if (!isEnabled || completionInProgress) return;
      handleOrderCompletionClick(order);
    };

    // Sestavení SmartTooltip textu dle stavu podmínek
    const condZkontrolovana = isZkontrolovana;
    const condFaktury       = isHighlighted;
    const condPrilohy       = order.attachment_color === '#16a34a';

    let tooltipLines;
    if (isThisInProgress) {
      tooltipLines = 'Načítám data objednávky…';
    } else if (isEnabled) {
      tooltipLines = [
        'Všechny podmínky jsou splněny:',
        `✓ Stav: Zkontrolována`,
        `✓ Zálohová faktura přiložena`,
        `✓ Vyúčtovací faktura přiložena`,
        `✓ Přílohy: cestovní příkaz + certifikát / podklady`,
        '',
        '→ Kliknutím dokončíte objednávku',
      ].join('\n');
    } else {
      tooltipLines = [
        'Nelze dokončit – nesplněné podmínky:',
        `${condZkontrolovana ? '✓' : '✗'} Stav: Zkontrolována`,
        `${condFaktury    ? '✓' : '✗'} Zálohová + vyúčtovací faktura`,
        `${condPrilohy    ? '✓' : '✗'} Přílohy: cestovní příkaz + certifikát / podklady`,
      ].join('\n');
    }

    return (
      <SmartTooltip text={tooltipLines} preferredPosition="left" icon="none" multiline={true}>
        <div
          onClick={handleClick}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: isEnabled && !completionInProgress ? 'pointer' : 'not-allowed',
            opacity: isEnabled ? 1 : 0.3,
            fontSize: '1.25rem',
            color: isThisInProgress ? '#f59e0b' : (isEnabled ? '#16a34a' : '#94a3b8'),
          }}
        >
          <FontAwesomeIcon icon={isThisInProgress ? faSpinner : faCheckCircle} spin={isThisInProgress} />
        </div>
      </SmartTooltip>
    );
  };

  // ---------- Vzdělávání – helper: řádky objednávky s rowspan ----------
  const renderVzdelOrderRows = (order, sectionKey, showUsek) => {
    const invoices = invoicesByOrderId[String(order.id)] || [];
    const rowSpan = invoices.length || 1;
    const firstInv = invoices[0] || null;
    // ✅ První sloupec (sticky) - omezená dynamika (minWidth + maxWidth)
    const orderTdStyle = { verticalAlign: 'middle', minWidth: '220px', maxWidth: '280px' };
    // ✅ Ostatní buňky s rowSpan - mají z-index: 1 (POD sticky sloupcem)
    const orderTdStyleOther = { verticalAlign: 'middle', position: 'relative', zIndex: 1 };
    const orderTdStyleLast = { verticalAlign: 'middle', position: 'relative', zIndex: 1, width: '130px', maxWidth: '130px', minWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
    
    // Detekce kombinace zálohová + vyúčtovací faktura
    const hasZalohova = invoices.some(inv => (inv.fa_typ || inv.typ) === 'ZALOHOVA');
    const hasVyuctovaci = invoices.some(inv => (inv.fa_typ || inv.typ) === 'VYUCTOVACI');
    const isHighlighted = hasZalohova && hasVyuctovaci;
    
    // ✅ Podmínky pro zelené zvýraznění (STEJNÉ jako pro enabled button)
    const isZkontrolovana = String(order.stav_workflow_kod || '').toUpperCase().includes('ZKONTROLOVANA');
    const isEnabled = isZkontrolovana && isHighlighted && order.attachment_color === '#16a34a';
    
    // 🟠 Podmínky pro oranžové zvýraznění - blízko dokončení (chybí jen certifikát)
    const isNearComplete = isZkontrolovana && isHighlighted && order.attachment_color !== '#16a34a';
    
    // ✅ Zelené zvýraznění když jsou splněny VŠECHNY podmínky
    // 🟠 Oranžové zvýraznění když chybí jen přílohy (certifikát)
    const GroupComponent = isEnabled ? TbodyGroupHighlighted : (isNearComplete ? TbodyGroupOrange : TbodyGroup);
    
    // Počet příloh kombinovaně (objednávka + všechny faktury)
    const orderAttachCount = order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0;
    const invoiceAttachCount = invoices.reduce((sum, inv) => sum + (inv.pocet_priloh ?? inv.prilohy_count ?? inv.prilohy?.length ?? 0), 0);
    const totalAttachCount = orderAttachCount + invoiceAttachCount;
    const invoiceIds = invoices.map(inv => inv.id).filter(Boolean);
    
    return (
      <GroupComponent key={order.id}>
        <tr>
          <Td rowSpan={rowSpan} style={orderTdStyle}>{renderOrderLinkWithSubject(order, sectionKey)}</Td>
          {renderVzdelInvCells(firstInv, sectionKey)}
          {showUsek && <Td rowSpan={rowSpan} style={{ ...orderTdStyleOther, width: '100px', maxWidth: '100px', minWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(getOrdererUsekCode(order) || '—', sectionKey)}</Td>}
          <TdNarrow rowSpan={rowSpan} style={{ ...orderTdStyleOther, width: '65px', maxWidth: '65px', minWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{renderFinancingRefCell(order, sectionKey)}</TdNarrow>
          <TdR rowSpan={rowSpan} style={{ verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>
            {(() => {
              const faSum = invoices.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
              const polozkySum = getOrderPlannedAmount(order) || 0;
              const maxDph = getOrderLimit(order) || 0;
              let val, src;
              if (faSum > 0) { val = faSum; src = 'FA'; }
              else if (polozkySum > 0) { val = polozkySum; src = 'POL'; }
              else { val = maxDph; src = 'MAX'; }
              return (
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <sup style={{ position: 'absolute', top: '-0.5em', left: '-1.6em', fontSize: '0.6em', fontWeight: 700, color: '#94a3b8', fontFamily: 'sans-serif', letterSpacing: '0.02em', lineHeight: 1 }}>{src}</sup>
                  {fmtCurrency(val)}
                </span>
              );
            })()}
          </TdR>
          <Td rowSpan={rowSpan} style={orderTdStyleLast}>{highlightText(getOrderStatusLabel(order), sectionKey)}</Td>
          <TdC rowSpan={rowSpan} style={orderTdStyleOther}>
            {renderAttachBadge(order.id, 'order-combined', totalAttachCount, invoiceIds, order.attachment_color)}
          </TdC>
          <TdC rowSpan={rowSpan} style={orderTdStyleOther}>
            {renderActionButton(order, isHighlighted)}
          </TdC>
        </tr>
        {invoices.slice(1).map((inv, idx) => (
          <tr key={`${order.id}_fa_${idx + 1}`}>
            {renderVzdelInvCells(inv, sectionKey)}
          </tr>
        ))}
      </GroupComponent>
    );
  };

  // ---------- OverLimit – single row per objednávka ----------
  const renderOverLimitOrderRows = (order, rowKey) => {
    const invoices = invoicesByOrderId[String(order.id)] || [];
    const invoiceSum = invoices.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
    // Poslední faktura dle datum_doruceni (nebo id jako fallback)
    const lastInv = invoices.length === 0 ? null : invoices.reduce((best, inv) => {
      const d1 = best.datum_doruceni || '';
      const d2 = inv.datum_doruceni || '';
      return d2 >= d1 ? inv : best;
    });
    return (
      <Tr key={order.id}>
        <Td>{renderOrderLinkWithSubject(order, 'ordersOverLimit')}</Td>
        {/* Fa VS – všechny faktury, čárka za číslem, zalamování */}
        <Td style={{ width: '240px', minWidth: '180px' }}>
          {invoices.length === 0 ? '—' : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1rem 0', alignItems: 'center' }}>
              {invoices.map((inv, idx) => (
                <span key={inv.id} style={{ whiteSpace: 'nowrap', marginRight: idx < invoices.length - 1 ? '0.35em' : 0 }}>
                  {renderInvoiceLink(inv, 'ordersOverLimit')}{idx < invoices.length - 1 && <span style={{ color: '#94a3b8' }}>,</span>}
                </span>
              ))}
            </div>
          )}
        </Td>
        <Td style={{ width: '90px', maxWidth: '90px' }}>
          {invoices.length === 0 ? '—' : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {[...new Set(invoices.map(inv => inv.fa_typ))].map((typ, idx) => (
                <span key={idx}>{renderFaTypBadge(typ, null)}</span>
              ))}
            </div>
          )}
        </Td>
        <Td style={{ width: '100px' }}>{highlightText(formatDateCz(getOrderDate(order)), 'ordersOverLimit')}</Td>
        <Td>{renderOrdererStack(order)}</Td>
        <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
        {/* Věcná správnost – pouze z poslední faktury */}
        <Td style={{ minWidth: '140px' }}>
          {(() => {
            if (!lastInv) return null;
            const zkr = lastInv.potvrdil_vecnou_spravnost_zkracene;
            const datum = lastInv.dt_potvrzeni_vecne_spravnosti;
            const pozn = lastInv.vecna_spravnost_poznamka;
            if (!zkr && !datum && !pozn) return null;
            const MAX = 80;
            const isLong = pozn && pozn.length > MAX;
            const truncated = isLong ? pozn.slice(0, MAX).trimEnd() + '\u2026' : pozn;
            return (
              <div>
                {(zkr || datum) && (
                  <div style={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>
                    {zkr ? highlightText(zkr, 'ordersOverLimit') : ''}
                    {zkr && datum ? <span style={{ color: '#94a3b8', fontWeight: 400 }}> / </span> : null}
                    {datum ? <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.78rem' }}>{formatDateCz(datum)}</span> : null}
                  </div>
                )}
                {pozn && (
                  <SmartTooltip text={pozn} preferredPosition="top" icon="none" multiline={true}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3', cursor: isLong ? 'help' : 'default', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '200px' }}>
                      {highlightText(truncated, 'ordersOverLimit')}
                    </div>
                  </SmartTooltip>
                )}
              </div>
            );
          })()}
        </Td>
        <Td style={{ paddingLeft: '1em' }}>{highlightText(getOrdererUsekCode(order) || '-', 'ordersOverLimit')}</Td>
        <TdNarrow>{renderFinancingLabelCell(order, 'ordersOverLimit')}</TdNarrow>
        <TdNarrow>{renderFinancingRefCell(order, 'ordersOverLimit')}</TdNarrow>
        <TdNarrow>{highlightText(getOrderTypeLabel(order), 'ordersOverLimit')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
        <Td>{highlightText(getOrderStatusLabel(order), 'ordersOverLimit')}</Td>
        {/* Stav FA – poslední doručená faktura */}
        <Td>{lastInv ? highlightText(getInvoiceStatusLabel(lastInv), 'ordersOverLimit') : '—'}</Td>
        <TdR>{highlightText(fmtCurrency(getOrderLimit(order)), 'ordersOverLimit')}</TdR>
        {/* Částka FA DPH – součet všech faktur */}
        <TdR>{highlightText(fmtCurrency(invoiceSum), 'ordersOverLimit')}</TdR>
        <Td style={{ minWidth: '110px', padding: '0.6rem 0.9rem' }}><FkInlineCell objednavkaId={order.id} fakturaId={0} entityType="OBJ" sectionKey="ordersOverLimit" token={token} username={username} onFkLoad={handleFkLoad} /></Td>
      </Tr>
    );
  };

  const renderNoteCell = (rowKey) => (
    <NoteInput
      value={notes[rowKey] || ''}
      placeholder="Poznámka"
      onChange={(event) => updateNotes(rowKey, event.target.value)}
    />
  );

  const renderCheckCell = (rowKey) => (
    <Toggle
      type="checkbox"
      checked={!!checks[rowKey]}
      onChange={(event) => updateChecks(rowKey, event.target.checked)}
    />
  );

  // 👁️ Otevření přílohy ve vieweru - stejný vzor jako OrderExpandedRowV3
  // Zavře attach popup na klik mimo
  useEffect(() => {
    if (!attachPopup) return;
    const handleOutside = (e) => {
      if (!e.target.closest('[data-attach-popup]') && !e.target.closest('[data-attach-badge]')) {
        setAttachPopup(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [attachPopup]);

  // Výpočet barvy ikony přílohy podle klasifikací
  const calculateBadgeColor = useCallback((items) => {
    if (!items || items.length === 0) return '#dc2626'; // Červená - žádné přílohy

    const orderAttachments = items.filter(a => a.attachmentSource === 'ORDER');
    const invoiceAttachments = items.filter(a => a.attachmentSource === 'INVOICE');

    // Počty podle klasifikace
    const objPodklady = orderAttachments.filter(a => a.typ_prilohy === 'PODKLADY' || a.attachment_type === 'PODKLADY').length;
    const objCestovniPrikaz = orderAttachments.filter(a => a.typ_prilohy === 'CESTOVNI_PRIKAZ' || a.attachment_type === 'CESTOVNI_PRIKAZ').length;
    const objCertifikat = orderAttachments.filter(a => a.typ_prilohy === 'CERTIFIKAT' || a.attachment_type === 'CERTIFIKAT').length;
    const faFaktura = invoiceAttachments.filter(a => a.typ_prilohy === 'FAKTURA' || a.attachment_type === 'FAKTURA').length;

    // Kontrola základních OBJ příloh
    const hasBasicObjAttach = objPodklady >= 1 || objCestovniPrikaz >= 1;

    // Červená - neobsahuje základní OBJ přílohy
    if (!hasBasicObjAttach) return '#dc2626';

    // Zelená - ideální stav: 2+ FAKTURA + (2+ PODKLADY NEBO CESTOVNI_PRIKAZ + CERTIFIKAT)
    const hasCompleteFaktura = faFaktura >= 2;
    const hasCompleteObj = objPodklady >= 2 || (objCestovniPrikaz >= 1 && objCertifikat >= 1);
    if (hasCompleteFaktura && hasCompleteObj) return '#16a34a';

    // Žlutá - má 2+ faktury
    if (faFaktura >= 2) return '#fbbf24';

    // Oranžová - má základní OBJ přílohy, ale chybí faktury nebo není kompletní
    return '#f97316';
  }, []);

  const handleAttachBadgeClick = useCallback(async (entityId, entityType, e, invoiceIds = null, knownCount = null) => {
    e.stopPropagation();
    const key = `${entityType}_${entityId}`;
    if (attachPopup?.key === key) { setAttachPopup(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    // Vypočítej pozici popup hned při kliknutí
    const POPUP_W = 360, MARGIN = 12;
    // Dynamický výpočet výšky podle počtu příloh:
    // Header: 50px, Item: 72px, Max list: 300px, Padding: 8px
    const itemCount = (knownCount != null && knownCount > 0) ? knownCount : 3; // default 3 položky
    const POPUP_H_EST = 50 + Math.min(itemCount * 72, 300) + 8;
    const vw = window.innerWidth, vh = window.innerHeight;
    
    // Horizontální pozice - nejprve zkus zarovnat k levému okraji ikony
    let left = rect.left;
    // Pokud by popup přetékal vpravo, posuň doleva
    if (left + POPUP_W + MARGIN > vw) {
      left = vw - POPUP_W - MARGIN;
    }
    // Pokud by popup přetékal vlevo, posuň doprava
    if (left < MARGIN) {
      left = MARGIN;
    }
    
    // Vertikální pozice - preferuj pod ikonou
    const spaceBelow = vh - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    let top;
    
    if (spaceBelow >= POPUP_H_EST) {
      // Dost místa dole - zobraz pod ikonou
      top = rect.bottom + 6;
    } else if (spaceAbove >= POPUP_H_EST) {
      // Nedostatek místa dole, ale dost nahoře - zobraz nad ikonou
      top = rect.top - POPUP_H_EST - 6;
    } else {
      // Nedostatek místa na obou stranách - zobraz kde je víc místa
      if (spaceBelow > spaceAbove) {
        top = rect.bottom + 6;
      } else {
        top = Math.max(MARGIN, rect.top - POPUP_H_EST - 6);
      }
    }
    
    const popupPos = { top, left };
    if (attachCacheRef.current[key]) {
      const cachedItems = attachCacheRef.current[key];
      const badgeColor = calculateBadgeColor(cachedItems);
      setBadgeColors(prev => ({ ...prev, [key]: badgeColor }));
      setAttachPopup({ key, entityId, entityType, items: cachedItems, loading: false, rect, popupPos, badgeColor });
      return;
    }
    setAttachPopup({ key, entityId, entityType, items: [], loading: true, rect, popupPos });
    try {
      let rawItems;
      if (entityType === 'order-combined') {
        // Kombinovaný seznam: přílohy objednávky + všechny faktury
        const orderAttachments = await getOrderAttachmentsV3({ token, username, orderId: entityId });
        const orderArr = Array.isArray(orderAttachments) ? orderAttachments : (orderAttachments?.attachments || orderAttachments?.data || []);
        const invoiceAttachments = [];
        if (invoiceIds && invoiceIds.length > 0) {
          for (const invId of invoiceIds) {
            const invAtt = await listInvoiceAttachmentsV2(invId, token, username);
            const invArr = Array.isArray(invAtt) ? invAtt : (invAtt?.attachments || invAtt?.data || []);
            invoiceAttachments.push(...invArr.map(a => ({ ...a, invoice_id: invId })));
          }
        }
        // Správně nastav order_id pro order přílohy a invoice_id pro fakturní přílohy + attachmentSource
        rawItems = [
          ...orderArr.map(a => ({ ...a, attachmentSource: 'ORDER', order_id: entityId })), 
          ...invoiceAttachments.map(a => ({ ...a, attachmentSource: 'INVOICE' }))
        ];
      } else if (entityType === 'order') {
        rawItems = await getOrderAttachmentsV3({ token, username, orderId: entityId });
      } else {
        rawItems = await listInvoiceAttachmentsV2(entityId, token, username);
      }
      // Normalizace — zajisti pole + consistency polí
      const rawArr = Array.isArray(rawItems)
        ? rawItems
        : (rawItems?.attachments || rawItems?.data || []);
      const items = rawArr.map(a => ({
        ...a,
        // attachmentSource, order_id a invoice_id už jsou správně nastavené výše pro order-combined
        // Pro jednoduché případy je nastavíme zde:
        attachmentSource: a.attachmentSource || (entityType === 'order' ? 'ORDER' : (entityType === 'invoice' ? 'INVOICE' : null)),
        order_id:    a.order_id || (entityType === 'order' ? entityId : (a.objednavka_id || null)),
        invoice_id:  a.invoice_id || (entityType === 'invoice' ? entityId : (a.faktura_id || null)),
        original_name: a.originalni_nazev_souboru || a.original_name || a.nazev_souboru || `Příloha ${a.id}`,
      }));
      attachCacheRef.current[key] = items;
      // Vypočítej barvu pro ikonu podle klasifikací a ulož ji
      const badgeColor = calculateBadgeColor(items);
      setBadgeColors(prev => ({ ...prev, [key]: badgeColor }));
      setAttachPopup(prev => prev?.key === key ? { ...prev, items, loading: false, badgeColor } : prev);
    } catch (err) {
      setAttachPopup(prev => prev?.key === key ? { ...prev, loading: false, error: true } : prev);
    }
  }, [attachPopup, token, username, calculateBadgeColor]);

  const handleOpenAttachment = useCallback(async (att, type) => {
    const now = Date.now();
    if (now - lastViewerCloseAtRef.current < 300) return;

    const fileName = att.original_name || att.originalni_nazev_souboru || att.nazev_souboru || `priloha_${att.id}`;
    if (!att.id || !token || !username) return;

    try {
      let blob;
      
      // Určení typu podle attachmentSource (priorita) nebo type (fallback)
      if (att.attachmentSource === 'INVOICE' || (type === 'invoice' && att.invoice_id)) {
        // Faktura příloha
        if (!att.invoice_id) {
          throw new Error('Chybí ID faktury');
        }
        blob = await downloadInvoiceAttachment(att.invoice_id, att.id, username, token);
      } else if (att.attachmentSource === 'RP' || type === 'annual-fee') {
        // Roční poplatek příloha
        blob = await downloadAnnualFeeAttachmentBlob(att.id, username, token);
      } else if (att.attachmentSource === 'ORDER' || att.order_id || type === 'order') {
        // Objednávka příloha
        const orderId = att.order_id || att.objednavka_id;
        if (!orderId) {
          throw new Error('Chybí ID objednávky');
        }
        blob = await downloadOrderAttachment(orderId, att.id, username, token);
      } else {
        throw new Error(`Nelze určit typ přílohy (source: ${att.attachmentSource}, type: ${type})`);
      }

      const ext = fileName.toLowerCase().split('.').pop();
      const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const isPdf = ext === 'pdf';
      const isPreviewable = previewableTypes.includes(ext);

      setViewerAttachment({
        ...att,
        blob,
        blobUrl: window.URL.createObjectURL(blob),
        filename: fileName,
        nazev_souboru: fileName,
        originalni_nazev_souboru: fileName,
        fileType: isPdf ? 'pdf' : (isPreviewable ? 'image' : 'other')
      });
    } catch (err) {
      console.error('Chyba p\u0159i otev\u00edr\u00e1n\u00ed p\u0159\u00edlohy:', err);
      const msg = err?.message || 'Nepoda\u0159ilo se otev\u0159\u00edt p\u0159\u00edlohu';
      showToast?.(
        msg.includes('st\u00e1hnout') || msg.includes('nenalezena') || msg.includes('Not Found') || msg.includes('FILE_NOT_FOUND') || msg.includes('Soubor nenalezen')
          ? `P\u0159\u00edloha "${att.original_name || fileName}" nen\u00ed dostupn\u00e1 na tomto serveru (soubor neexistuje na disku).`
          : `Chyba p\u0159i otev\u00edr\u00e1n\u00ed p\u0159\u00edlohy: ${msg}`,
        'error'
      );
    }
  }, [token, username, showToast]);

  const renderAttachBadge = useCallback((entityId, entityType, knownCount, invoiceIds = null, backendColor = null) => {
    const key = `${entityType}_${entityId}`;
    const isOpen = attachPopup?.key === key;
    const count = (knownCount != null && knownCount !== '') ? Number(knownCount) : null;
    
    // PRIORITA BAREV:
    // 1. backendColor - barva z BE API (attachment_color) - NEJVYŠŠÍ PRIORITA
    // 2. badgeColors[key] - barva vypočítaná při kliknutí (cached)
    // 3. Fallback - šedá/světle šedá podle počtu příloh
    const badgeColor = backendColor || badgeColors[key] || (count > 0 ? '#64748b' : '#cbd5e1');
    return (
      <>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            color: isOpen ? '#2563eb' : badgeColor,
            cursor: 'pointer', transition: 'color 0.2s', userSelect: 'none',
          }}
          onClick={(e) => handleAttachBadgeClick(entityId, entityType, e, invoiceIds, count)}
          data-attach-badge="1"
          title={`P\u0159\u00edlohy${count != null ? ` (${count})` : ''}`}
        >
          <FontAwesomeIcon icon={faPaperclip} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{count != null ? count : '?'}</span>
        </div>
        {isOpen && ReactDOM.createPortal(
          <AttachPopupContainer data-attach-popup="1" style={{ top: `${attachPopup.popupPos?.top ?? 0}px`, left: `${attachPopup.popupPos?.left ?? 0}px` }}>
            <AttachPopupHeader>
              {attachPopup.loading ? 'P\u0159\u00edlohy' : `P\u0159\u00edlohy (${attachPopup.items.length})`}
            </AttachPopupHeader>
            {attachPopup.loading ? (
              <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>Načítám...</div>
            ) : attachPopup.error ? (
              <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#ef4444' }}>Chyba p\u0159i na\u010d\u00edt\u00e1n\u00ed</div>
            ) : attachPopup.items.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>\u017d\u00e1dn\u00e9 p\u0159\u00edlohy</div>
            ) : (
              <AttachPopupList>
                {(() => {
                  const orderAttachments = attachPopup.items.filter(a => a.attachmentSource === 'ORDER');
                  const invoiceAttachments = attachPopup.items.filter(a => a.attachmentSource === 'INVOICE');
                  const renderAttachmentItem = (att) => {
                    const name = att.original_name || att.originalni_nazev_souboru || att.nazev_souboru || `P\u0159\u00edloha ${att.id}`;
                    const fi = getAttachFileInfo(name);
                    const ext = getAttachExt(name);
                    const size = fmtAttachSize(att.velikost_souboru_b || att.velikost_b || att.velikost);
                    const user = getAttachUser(att);
                    return (
                      <AttachPopupItem key={att.id}>
                        <AttachPopupFileIconBox $bg={fi.bg} $ic={fi.color}>
                          <FontAwesomeIcon icon={fi.icon} />
                        </AttachPopupFileIconBox>
                        <AttachPopupFileInfo>
                          <AttachPopupFileName title={name}>{name}</AttachPopupFileName>
                          {(att.typ_prilohy || att.attachment_type) && (
                            <AttachPopupClassificationTag>
                              {prettyAttachType(att.typ_prilohy || att.attachment_type)}
                            </AttachPopupClassificationTag>
                          )}
                          <AttachPopupFileMeta>
                            <AttachPopupExtBadge $bg={fi.bg} $cl={fi.color}>{ext}</AttachPopupExtBadge>
                            <span>{size}</span>
                            {user && <span>• {user}</span>}
                          </AttachPopupFileMeta>
                        </AttachPopupFileInfo>
                        <AttachPopupOpenBtn
                          onClick={(e) => { e.stopPropagation(); handleOpenAttachment(att, entityType); }}
                          title="Otev\u0159\u00edt n\u00e1hled"
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} />
                        </AttachPopupOpenBtn>
                      </AttachPopupItem>
                    );
                  };
                  return (
                    <>
                      {orderAttachments.length > 0 && (
                        <>
                          <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>Objednávka ({orderAttachments.length})</div>
                          {orderAttachments.map(renderAttachmentItem)}
                        </>
                      )}
                      {invoiceAttachments.length > 0 && (
                        <>
                          <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>Faktury ({invoiceAttachments.length})</div>
                          {invoiceAttachments.map(renderAttachmentItem)}
                        </>
                      )}
                    </>
                  );
                })()}
              </AttachPopupList>
            )}
          </AttachPopupContainer>,
          document.body
        )}
      </>
    );
  }, [attachPopup, handleAttachBadgeClick, handleOpenAttachment, badgeColors]);

  const isMimoradnaOrder = useCallback((order) => {
    const value = order?.mimoradna_udalost;
    return value === 1 || value === '1' || value === true || value === 'true';
  }, []);

  const renderOrderNumberWithStatus = useCallback((order, content) => {
    const resolvedOrder = order?.id ? (ordersById.get(String(order.id)) || order) : order;
    const isMimoradna = isMimoradnaOrder(resolvedOrder);

    return (
      <>
        {isMimoradna && (
          <span style={{ color: '#dc2626', marginRight: '4px' }}>
            <FontAwesomeIcon icon={faBoltLightning} />
          </span>
        )}
        {content}
      </>
    );
  }, [ordersById, isMimoradnaOrder]);

  const renderOrderLink = useCallback((order, searchKey = null) => {
    const orderNumber = order.ev_cislo || order.cislo_objednavky || order.id;
    const content = searchKey ? highlightText(String(orderNumber), searchKey) : orderNumber;
    return (
      <LinkButton onClick={() => navigate(`/order-form-25?edit=${order.id}`, { state: { returnTo: '/stats-reports' } })}>
        {renderOrderNumberWithStatus(order, content)}
      </LinkButton>
    );
  }, [navigate, highlightText, renderOrderNumberWithStatus]);

  // Varianta s předmětem objednávky jako druhý řádek (max 2 řádky, SmartTooltip pro plný text)
  const renderOrderLinkWithSubject = useCallback((order, searchKey = null) => {
    const orderNumber = order.ev_cislo || order.cislo_objednavky || order.id;
    const content = searchKey ? highlightText(String(orderNumber), searchKey) : orderNumber;
    const subj = getOrderSubject(order);
    const MAX = 60;
    const isLong = subj.length > MAX;
    const truncated = isLong ? subj.slice(0, MAX).trimEnd() + '\u2026' : subj;
    return (
      <div style={{ minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.1rem' }}>
        <LinkButton onClick={() => navigate(`/order-form-25?edit=${order.id}`, { state: { returnTo: '/stats-reports' } })}>
          {renderOrderNumberWithStatus(order, content)}
        </LinkButton>
        {subj && (
          <SmartTooltip text={subj} preferredPosition="top" icon="none" multiline={true}>
            <div style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#334155',
              marginTop: '0.15rem',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              lineHeight: '1.3',
              cursor: isLong ? 'help' : 'default',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '200px',
            }}>
              {searchKey ? highlightText(truncated, searchKey) : truncated}
            </div>
          </SmartTooltip>
        )}
      </div>
    );
  }, [navigate, highlightText, renderOrderNumberWithStatus]);

  // Lookup mapy pro pivot linky — indexujeme dle čísla (ev_cislo / cislo_faktury)
  const ordersByEvCislo = useMemo(() => {
    const m = new Map();
    (filteredOrders || []).forEach(o => {
      if (o.ev_cislo) m.set(String(o.ev_cislo), o);
      if (o.cislo_objednavky && o.cislo_objednavky !== o.ev_cislo) m.set(String(o.cislo_objednavky), o);
    });
    return m;
  }, [filteredOrders]);

  const invoicesByCislo = useMemo(() => {
    const m = new Map();
    (filteredInvoices || []).forEach(inv => {
      if (inv.cislo_faktury) m.set(String(inv.cislo_faktury), inv);
    });
    return m;
  }, [filteredInvoices]);

  const renderInvoiceLink = useCallback((invoice, searchKey = null) => {
    const invoiceNumber = invoice.cislo_faktury || invoice.id;
    const vemaKod = invoice.fa_vema_kod || '';
    const displayText = vemaKod ? `${invoiceNumber} / ${vemaKod}` : invoiceNumber;
    const content = searchKey ? highlightText(String(displayText), searchKey) : displayText;
    return (
      <LinkButton
        onClick={() => {
          navigate('/invoice-evidence', {
            state: {
              editInvoiceId: invoice.id,
              orderIdForLoad: invoice.objednavka_id || null,
              returnTo: '/stats-reports'
            }
          });
        }}
      >
        {content}
      </LinkButton>
    );
  }, [navigate, highlightText]);

  // Renderuje štítek buňky v pivot tabulce — pro čísla obj./faktur přidá klikací link
  const renderPivotCellLabel = (node) => {
    const { label, fieldKey } = node;
    if (label === 'Chybi hodnota' || label === 'Neurčeno') return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{label}</span>;
    if (fieldKey === 'orderNumber') {
      const order = ordersByEvCislo.get(label);
      if (order) return renderOrderLink(order);
      return (
        <LinkButton onClick={() => navigate('/orders25-list-v3', { state: { searchQuery: label } })}>
          {label}
        </LinkButton>
      );
    }
    if (fieldKey === 'invoiceNumber') {
      const invoice = invoicesByCislo.get(label);
      if (invoice) return renderInvoiceLink(invoice);
      return <span>{label}</span>;
    }
    if (fieldKey === 'contractNumber') {
      return (
        <LinkButton onClick={() => navigate('/orders25-list-v3', { state: { searchQuery: label } })}>
          {label}
        </LinkButton>
      );
    }
    return <span>{label}</span>;
  };

  const buildChartColors = useCallback((count, palette) => {
    if (!count) return [];
    return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
  }, []);

  // Sdílená konfigurace legendy pro dual-axis bar grafy (Počet + Částka)
  const dualAxisLegendPlugin = {
    position: 'bottom',
    labels: {
      usePointStyle: true,
      pointStyle: 'rect',
      padding: 20,
      font: { size: 12 },
      generateLabels: (chart) => [
        {
          text: 'Objem (tis. Kč)  →  pravá osa',
          fillStyle: 'rgba(37,99,235,0.92)',
          strokeStyle: 'rgba(37,99,235,0.92)',
          lineWidth: 0,
          pointStyle: 'rect',
          datasetIndex: 1,
          hidden: !chart.isDatasetVisible(1)
        },
        {
          text: 'Počet objednávek  ←  levá osa',
          fillStyle: 'rgba(37,99,235,0.38)',
          strokeStyle: 'rgba(37,99,235,0.38)',
          lineWidth: 0,
          pointStyle: 'rectRounded',
          datasetIndex: 0,
          hidden: !chart.isDatasetVisible(0)
        }
      ]
    }
  };

  // Vertikální čeřchovaná linka na aktivním bodě timeline grafu
  const crosshairPlugin = {
    id: 'crosshair',
    afterDraw(chart) {
      if (!chart.tooltip || !chart.tooltip._active || !chart.tooltip._active.length) return;
      const ctx = chart.ctx;
      const x = chart.tooltip._active[0].element.x;
      const topY = chart.scales.y.top;
      const bottomY = chart.scales.y.bottom;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(80, 80, 80, 0.55)';
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();
    }
  };

  const renderBlockSelect = () => {
    if (!activeBlocks.length) return null;
    return (
      <BlockSelect ref={blockSelectRef}>
        <BlockSelectButton
          type="button"
          $tone={activeTone}
          onClick={() => setBlockSelectOpen(prev => !prev)}
        >
          Zobrazení: {activeAllSelected ? 'Vše' : `${activeVisibleCount}/${activeBlocks.length}`}
        </BlockSelectButton>
        {blockSelectOpen && (
          <BlockMenu>
            <BlockItem>
              <BlockCheckbox
                type="checkbox"
                checked={activeAllSelected}
                onChange={() => setAllBlocksVisibility(activeTab, !activeAllSelected)}
              />
              Vše
            </BlockItem>
            {activeBlocks.map(block => (
              <BlockItem key={block.key}>
                <BlockCheckbox
                  type="checkbox"
                  checked={isBlockVisible(activeTab, block.key)}
                  onChange={() => toggleBlockVisibility(activeTab, block.key)}
                />
                {block.label}
              </BlockItem>
            ))}
          </BlockMenu>
        )}
      </BlockSelect>
    );
  };

  // ── LP EDIT MODAL HANDLERS ──────────────────────────────────────
  const handleOpenLpEditModal = useCallback(async (invoice, order) => {
    setLpEditModal({ invoice, order, faktura: null, orderData: null, lpCerpani: [], availableLPCodes: [], loading: true, saving: false });
    try {
      const [lpResp, allLP] = await Promise.all([
        getFakturaLPCerpani(invoice.id, token, username),
        fetchLimitovanePrisliby({ token, username })
      ]);

      // PHP vrací { status, data: { faktura_id, lp_cerpani: [...] } }
      const rawLp = lpResp?.data?.lp_cerpani ?? lpResp?.lp_cerpani ?? lpResp?.data ?? [];
      const currentLp = (Array.isArray(rawLp) ? rawLp : []).map(r => ({
        lp_id: r.lp_id ?? r.id,
        lp_cislo: r.lp_cislo ?? r.cislo_lp,
        castka: r.castka,
        poznamka: r.poznamka || ''
      }));

      // Připraviť faktura objekt pro LPCerpaniEditor — potřebuje fa_castka
      const fa_castka = invoice.fa_castka ?? invoice.castka ?? 0;
      const faktura = { ...invoice, fa_castka };

      // Připravit orderData pro LPCerpaniEditor — potřebuje financovani s lp_kody
      // order.financovani je JSON string; lp_nazvy je [{id, cislo_lp, ...}]
      // LPCerpaniEditor hledá parsedFinancovani.lp_kody = [id, id, ...]
      const lpCodesArr = Array.isArray(allLP) ? allLP : (allLP?.data || []);
      let orderFinancovani = order?.financovani || null;
      if (orderFinancovani) {
        try {
          const parsedFin = typeof orderFinancovani === 'string' ? JSON.parse(orderFinancovani) : orderFinancovani;
          // Pokud má lp_nazvy ale ne lp_kody, odvoď lp_kody z lp_nazvy
          if (Array.isArray(parsedFin?.lp_nazvy) && !Array.isArray(parsedFin?.lp_kody)) {
            parsedFin.lp_kody = parsedFin.lp_nazvy.map(lp => lp.id ?? lp.lp_id).filter(Boolean);
          }
          orderFinancovani = parsedFin;
        } catch (e) { /* zachovat původní */ }
      }
      const orderData = { ...order, financovani: orderFinancovani };

      setLpEditModal(prev => prev ? {
        ...prev,
        faktura,
        orderData,
        lpCerpani: currentLp,
        availableLPCodes: lpCodesArr,
        loading: false
      } : null);
    } catch (e) {
      showToast && showToast(`Chyba při načítání LP: ${e.message || e}`, { type: 'error' });
      setLpEditModal(null);
    }
  }, [token, username, showToast]);

  const handleSaveLpCerpaniEdit = useCallback(async () => {
    if (!lpEditModal) return;
    const { invoice, lpCerpani } = lpEditModal;
    setLpEditModal(prev => prev ? { ...prev, saving: true } : null);
    try {
      const toSave = (lpCerpani || []).filter(r =>
        r.lp_id && parseInt(r.lp_id, 10) > 0 &&
        r.castka !== null && r.castka !== '' && !isNaN(parseFloat(r.castka))
      ).map(r => ({
        lp_id: parseInt(r.lp_id, 10),
        lp_cislo: parseInt(r.lp_id, 10),
        castka: parseFloat(r.castka),
        poznamka: r.poznamka || ''
      }));
      await saveFakturaLPCerpani(invoice.id, toSave, token, username);
      showToast && showToast('LP rozklad ulozen', { type: 'success' });
      // Aktualizuj lp_cerpani_count v lokálním stavu
      setInvoices(prev => prev.map(inv =>
        inv.id === invoice.id ? { ...inv, lp_cerpani_count: toSave.length } : inv
      ));
      setLpEditModal(null);
    } catch (e) {
      showToast && showToast(`Chyba pri ukladani LP: ${e.message || e}`, { type: 'error' });
      setLpEditModal(prev => prev ? { ...prev, saving: false } : null);
    }
  }, [lpEditModal, token, username, showToast]);

  const isGateTab = activeTab === 'control' || activeTab === 'stats' || activeTab === 'spend' || activeTab === 'reports' || activeTab === 'vzdel' || activeTab === 'pivot';
  const isAttachmentsTab = activeTab === 'attachments';
  const isCashbookTab = activeTab === 'cashbook';
  const isDohadneTab = activeTab === 'dohadne';

  const attachmentsStatsReady = orderAttachmentsStats != null || invoiceAttachmentsStats != null;
  const ordersWithoutAttachmentsReady = ordersWithoutAttachments != null;
  const invoicesWithoutAttachmentsReady = invoicesWithoutAttachments != null;
  const isAttachmentsPending = isAttachmentsTab && (attachmentsLoading || !attachmentsStatsReady || !ordersWithoutAttachmentsReady || !invoicesWithoutAttachmentsReady);
  const isCashbookPending = isCashbookTab && cashbookLoading;
  const isDohadnePending = isDohadneTab && dohadneLoading;

  const isActiveTabFailed = isGateTab && failedTabs.has(activeTab);
  const isActiveTabPending = (isGateTab && !isActiveTabFailed && !loadedTabs.has(activeTab))
    || isAttachmentsPending
    || isCashbookPending
    || isDohadnePending;
  const isGateVisible = !filtersReady || !isInitialized || loading || isActiveTabPending;

  return (
    <>
      <LoadingGate $visible={isGateVisible}>
        <LoadingGateSpinner $visible={isGateVisible} />
        <LoadingGateMessage $visible={isGateVisible}>
          {isInitialized ? 'Obnovuji data z databáze…' : 'Načítám přehled statistik…'}
        </LoadingGateMessage>
        <LoadingGateSubtext $visible={isGateVisible}>
          {isInitialized ? 'Prosím čekejte, zpracovávám objednávky a faktury.' : 'Inicializace analytického panelu…'}
        </LoadingGateSubtext>
      </LoadingGate>
      <PageWrapper $isInitialized={isInitialized}>
      <PageContainer>
        <Header>
          <HeaderTitle>
            <Title>
              <BetaTag>BETA</BetaTag>
              Statistika a reporty
              <FontAwesomeIcon icon={faChartPie} style={{ marginLeft: '0.5rem', opacity: 0.85 }} />
            </Title>
            <Subtitle>Komplexní analytický panel pro objednávky, faktury a smlouvy.</Subtitle>
          </HeaderTitle>
          <HeaderActions>
            <SmartTooltip text="Načíst data z databáze (objednávky, faktury, smlouvy)" icon="info" preferredPosition="bottom">
              <ActionButton onClick={handleLoadData} disabled={loading} $loading={loading} title="">
                <FontAwesomeIcon icon={faRefresh} />
              </ActionButton>
            </SmartTooltip>
          </HeaderActions>
        </Header>

        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel><FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '0.4rem', opacity: 0.7 }} />Objednávky</SummaryLabel>
            <SummaryValue>{summary.totalOrders}</SummaryValue>
            <SummaryMeta>{fmtCurrency(summary.totalOrderAmount)}</SummaryMeta>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel><FontAwesomeIcon icon={faReceipt} style={{ marginRight: '0.4rem', opacity: 0.7 }} />Faktury</SummaryLabel>
            <SummaryValue>{summary.totalInvoices}</SummaryValue>
            <SummaryMeta>{fmtCurrency(summary.totalInvoiceAmount)}</SummaryMeta>
          </SummaryCard>
          <SummaryCard title="Počet smluv, které mají alespoň jednu fakturu nebo objednávku">
            <SummaryLabel><FontAwesomeIcon icon={faFileContract} style={{ marginRight: '0.4rem', opacity: 0.7 }} />Aktivní smlouvy</SummaryLabel>
            <SummaryValue>{summary.totalContracts}</SummaryValue>
            <SummaryMeta>Čerpáno: {fmtCurrency(summary.totalContractSpent)}</SummaryMeta>
            {summary.totalContractLimit > 0 && (
              <SummaryMeta>Limit: {fmtCurrency(summary.totalContractLimit)}</SummaryMeta>
            )}
          </SummaryCard>
        </SummaryGrid>

        {financingSummary.length > 0 && (
          <>
            <SectionTitle style={{ marginBottom: '0.75rem' }}>Financování (aktivní objednávky)</SectionTitle>
            <SummaryGrid>
              {financingSummary.map(item => (
                <SummaryCard key={item.label}>
                  <SummaryLabel><FontAwesomeIcon icon={getFinancingIcon(item.label)} style={{ marginRight: '0.4rem', opacity: 0.7 }} />{item.label}</SummaryLabel>
                  <SummaryValue>{item.count}</SummaryValue>
                  <SummaryMeta>{fmtCurrency(item.amount)}</SummaryMeta>
                </SummaryCard>
              ))}
            </SummaryGrid>
          </>
        )}

        <TabsBar>
          <Tabs>
            {visibleTabs.map(tab => (
              <TabButton
                key={tab.id}
                $active={activeTab === tab.id}
                $tone={TAB_TONES[tab.id]}
                onClick={() => handleTabChange(tab.id)}
              >
                <FontAwesomeIcon icon={tab.icon} /> {tab.label}
              </TabButton>
            ))}
          </Tabs>
          <TabsBarActions>
            {activeTab === 'control' && (
              <ExcelExportButton onClick={handleExportAllToExcel} title="Exportovat všechny sekce do Excel souboru">
                <FontAwesomeIcon icon={faFileExcel} /> Export vše do XLS
              </ExcelExportButton>
            )}
            {renderBlockSelect()}
          </TabsBarActions>
        </TabsBar>

        <ContentGrid>
          <Panel>
            <PanelTitle>
              <FontAwesomeIcon icon={faFilter} /> Filtry
            </PanelTitle>
            <FilterStack>
              <FilterRow>
                <FieldLabel>Datum od</FieldLabel>
                <DatePicker
                  fieldName="dateFrom"
                  value={pendingFilters.dateFrom}
                  onChange={v => handleFilterChange('dateFrom', v || '')}
                  placeholder="Datum od"
                  highlight={!!pendingFilters.dateFrom}
                />
              </FilterRow>
              <FilterRow>
                <FieldLabel>Datum do</FieldLabel>
                <DatePicker
                  fieldName="dateTo"
                  value={pendingFilters.dateTo}
                  onChange={v => handleFilterChange('dateTo', v || '')}
                  placeholder="Datum do"
                  highlight={!!pendingFilters.dateTo}
                />
              </FilterRow>
              <FilterRow>
                <FieldLabel>Rok objednávek</FieldLabel>
                <Input
                  type="number"
                  value={pendingFilters.orderYear}
                  placeholder="např. 2025"
                  onChange={e => handleFilterChange('orderYear', e.target.value)}
                  style={pendingFilters.orderYear ? { borderColor: '#f59e0b' } : {}}
                />
              </FilterRow>
              <FilterRow>
                <FieldLabel>Rok faktur</FieldLabel>
                <Input type="number" value={pendingFilters.year} onChange={(event) => handleFilterChange('year', event.target.value)} />
              </FilterRow>
              <FilterRow>
                <FieldLabel>Rok pokladen</FieldLabel>
                <Input 
                  type="number" 
                  value={pendingFilters.cashbookRok} 
                  onChange={(e) => handleFilterChange('cashbookRok', Number(e.target.value))} 
                  placeholder="např. 2026"
                />
              </FilterRow>
              <FilterRow>
                <FieldLabel>Úsek{!canChangeUsekFilter && ' (váš úsek)'}</FieldLabel>
                <FilterMultiSelect
                  options={usekOptions}
                  values={pendingFilters.usekIds}
                  onChange={v => handleFilterChange('usekIds', v)}
                  placeholder="Všechny úseky"
                  disabled={!canChangeUsekFilter}
                />
              </FilterRow>
              <FilterRow>
                <FieldLabel>Financování</FieldLabel>
                <FilterMultiSelect
                  options={financingOptions}
                  values={pendingFilters.financingValues}
                  onChange={v => handleFilterChange('financingValues', v)}
                  placeholder="Všechny typy"
                />
              </FilterRow>
              <FilterRow>
                <FieldLabel>Druh objednávky</FieldLabel>
                <FilterMultiSelect
                  options={orderTypeOptions}
                  values={pendingFilters.orderTypes}
                  onChange={v => handleFilterChange('orderTypes', v)}
                  placeholder="Všechny druhy"
                />
              </FilterRow>
            </FilterStack>
            {hasUnappliedFilters && (
              <FilterDirtyBadge>⚠ Filtry nejsou aplikovány</FilterDirtyBadge>
            )}
            <FilterActions>
              <FilterApplyBtn
                $dirty={hasUnappliedFilters}
                onClick={handleApplyFilters}
                disabled={loading}
                title="Aplikovat vybrané filtry a znovu načíst data"
              >
                <FontAwesomeIcon icon={faCheck} /> Aplikovat
              </FilterApplyBtn>
              <FilterResetBtn
                onClick={handleResetFilters}
                disabled={loading}
                title="Resetovat všechny filtry na výchozí hodnoty a znovu načíst data"
              >
                <FontAwesomeIcon icon={faRefresh} /> Reset
              </FilterResetBtn>
            </FilterActions>
            {loadError && (
              <EmptyState style={{ color: '#b91c1c' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} /> {loadError}
              </EmptyState>
            )}
            {dataMeta.truncated && (
              <EmptyState>
                Data jsou zkrácena, doporučujeme zpřísnit filtry.
              </EmptyState>
            )}
          </Panel>

          <Section>
            {/* Empty state — žádná sekce není zapnutá */}
            {activeBlocks.length > 0 && activeVisibleCount === 0 && (
              <TabEmptyStateWrap>
                <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="96" height="96" rx="48" fill="#f1f5f9"/>
                  <rect x="20" y="56" width="12" height="20" rx="3" fill="#cbd5e1"/>
                  <rect x="38" y="42" width="12" height="34" rx="3" fill="#cbd5e1"/>
                  <rect x="56" y="48" width="12" height="28" rx="3" fill="#cbd5e1"/>
                  <line x1="18" y1="30" x2="78" y2="72" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="78" y1="30" x2="18" y2="72" stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round"/>
                  <line x1="78" y1="30" x2="18" y2="72" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <TabEmptyStateText>
                  <h3>Žádná sekce není zobrazena</h3>
                  <p>Klikněte na tlačítko <strong>Zobrazení</strong> vpravo nahoře<br/>a vyberte, co chcete vidět.</p>
                </TabEmptyStateText>
              </TabEmptyStateWrap>
            )}
            {activeTab === 'control' && (
              <>
                {/* Klasifikace příloh - zobrazí se po kliknutí na tlačítko */}
                {attachmentsStats && (
                  <SectionCard>
                    <SectionHeader>
                      <SectionTitle>📎 Klasifikace příloh</SectionTitle>
                      <SectionBadge $tone="info">{(attachmentsStats.totalOrders || 0) + (attachmentsStats.totalInvoices || 0)}</SectionBadge>
                    </SectionHeader>
                    <div style={{ padding: '0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                      Celkem: <strong>{attachmentsStats.totalOrders || 0}</strong> příloh objednávek, <strong>{attachmentsStats.totalInvoices || 0}</strong> příloh faktur
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem', borderBottom: '2px solid #3b82f6', paddingBottom: '0.3rem' }}>
                          Objednávky ({Object.keys(attachmentsStats.orders || {}).length} typů)
                        </div>
                        {Object.entries(attachmentsStats.orders || {})
                          .sort(([,a], [,b]) => b - a)
                          .map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ color: '#475569' }}>{key}</span>
                              <strong style={{ color: '#1e40af' }}>{value}</strong>
                            </div>
                          ))
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem', borderBottom: '2px solid #3b82f6', paddingBottom: '0.3rem' }}>
                          Faktury ({Object.keys(attachmentsStats.invoices || {}).length} typů)
                        </div>
                        {Object.entries(attachmentsStats.invoices || {})
                          .sort(([,a], [,b]) => b - a)
                          .map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ color: '#475569' }}>{key}</span>
                              <strong style={{ color: '#1e40af' }}>{value}</strong>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </SectionCard>
                )}

                {isBlockVisible('control', 'ordersOverLimit') && (
                  <SectionCard id="section-ordersOverLimit">
                  <SectionHeader>
                    <SectionTitle>Faktury vyšší než schválená objednávka</SectionTitle>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="danger">{pagedOrdersOverLimit.total}</SectionBadge>
                      <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(fkTotals.ordersOverLimitFA)}</SectionBadge>
                      <button onClick={handleExportCsv_ordersOverLimit} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <SearchInputWrapper style={{ flex: 1 }}>
                      <SearchInputIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchInputIcon>
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('ordersOverLimit')}
                        onChange={(e) => setSearchQuery('ordersOverLimit', e.target.value)}
                      />
                      {getSearchQuery('ordersOverLimit') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('ordersOverLimit', '')}
                          title="Vymazat vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>Zobrazit:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkIgnorovano} onChange={e => setShowFkIgnorovano(e.target.checked)} style={{ accentColor: '#94a3b8', cursor: 'pointer' }} />
                      Ignorováno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#16a34a', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkVyreseno} onChange={e => setShowFkVyreseno(e.target.checked)} style={{ accentColor: '#16a34a', cursor: 'pointer' }} />
                      Vyřešeno
                    </label>
                  </SearchBox>
                  {pagedOrdersOverLimit.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedOrdersOverLimit.total} z {pagedOrdersOverLimit.originalTotal} záznamů
                    </div>
                  )}
                  {pagedOrdersOverLimit.isFiltered && pagedOrdersOverLimit.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort('ordersOverLimit', 'ev_cislo')}>Ev.číslo obj.{sortIcon('ordersOverLimit', 'ev_cislo')}</ThSort>
                              <ThSort style={{ width: '240px', maxWidth: '240px' }} onClick={() => handleTableSort('ordersOverLimit', 'fa_vs')}>Fa VS{sortIcon('ordersOverLimit', 'fa_vs')}</ThSort>
                              <ThSort style={{ width: '90px', maxWidth: '90px' }} onClick={() => handleTableSort('ordersOverLimit', 'fa_typ')}>Typ FA{sortIcon('ordersOverLimit', 'fa_typ')}</ThSort>
                              <ThSort style={{ width: '100px', minWidth: '100px' }} onClick={() => handleTableSort('ordersOverLimit', 'dt_obj')}>Dt. obj.{sortIcon('ordersOverLimit', 'dt_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersOverLimit', 'objednatel')}>Objednatel{sortIcon('ordersOverLimit', 'objednatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersOverLimit', 'schvalovatel')}>Schvalovatel{sortIcon('ordersOverLimit', 'schvalovatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersOverLimit', 'vecna_spravnost')}>Věcná správnost{sortIcon('ordersOverLimit', 'vecna_spravnost')}</ThSort>
                              <ThSort style={{ paddingLeft: '1em' }} onClick={() => handleTableSort('ordersOverLimit', 'usek')}>Úsek{sortIcon('ordersOverLimit', 'usek')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersOverLimit', 'financovani')}>Financování{sortIcon('ordersOverLimit', 'financovani')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersOverLimit', 'detail_fin')}>Detail fin.{sortIcon('ordersOverLimit', 'detail_fin')}</ThNarrowSort>
                              <ThSort onClick={() => handleTableSort('ordersOverLimit', 'druh')}>Druh{sortIcon('ordersOverLimit', 'druh')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersOverLimit', 'stav')}>Stav obj.{sortIcon('ordersOverLimit', 'stav')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersOverLimit', 'stav_fa')}>Stav FA{sortIcon('ordersOverLimit', 'stav_fa')}</ThSort>
                              <ThRSort onClick={() => handleTableSort('ordersOverLimit', 'limit')}>Max cena DPH{sortIcon('ordersOverLimit', 'limit')}</ThRSort>
                              <ThRSort onClick={() => handleTableSort('ordersOverLimit', 'fa_castka')}>Částka FA DPH{sortIcon('ordersOverLimit', 'fa_castka')}</ThRSort>
                              <ThSort style={{ minWidth: '110px' }} onClick={() => handleTableSort('ordersOverLimit', 'fk_stav')}>Kontrola{sortIcon('ordersOverLimit', 'fk_stav')}</ThSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrdersOverLimit.items.map(order => {
                              const rowKey = `order_over_limit_${order.id}`;
                              return renderOverLimitOrderRows(order, rowKey);
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('ordersOverLimit', pagedOrdersOverLimit)}
                    </>
                  )}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'ordersAfterInvoice') && (
                  <SectionCard id="section-ordersAfterInvoice">
                  <SectionHeader>
                    <SectionTitle>Objednávka vytvořená po doručení faktury</SectionTitle>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="warn">{pagedOrdersAfterInvoice.total}</SectionBadge>
                      <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(fkTotals.ordersAfterInvoiceFA)}</SectionBadge>
                      <button onClick={handleExportCsv_ordersAfterInvoice} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <SearchInputWrapper style={{ flex: 1 }}>
                      <SearchInputIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchInputIcon>
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('ordersAfterInvoice')}
                        onChange={(e) => setSearchQuery('ordersAfterInvoice', e.target.value)}
                      />
                      {getSearchQuery('ordersAfterInvoice') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('ordersAfterInvoice', '')}
                          title="Vymazat vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>Zobrazit:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkIgnorovano} onChange={e => setShowFkIgnorovano(e.target.checked)} style={{ accentColor: '#94a3b8', cursor: 'pointer' }} />
                      Ignorováno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#16a34a', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkVyreseno} onChange={e => setShowFkVyreseno(e.target.checked)} style={{ accentColor: '#16a34a', cursor: 'pointer' }} />
                      Vyřešeno
                    </label>
                  </SearchBox>
                  {pagedOrdersAfterInvoice.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedOrdersAfterInvoice.total} z {pagedOrdersAfterInvoice.originalTotal} záznamů
                    </div>
                  )}
                  {pagedOrdersAfterInvoice.isFiltered && pagedOrdersAfterInvoice.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort('ordersAfterInvoice', 'ev_cislo')}>Ev.číslo obj.{sortIcon('ordersAfterInvoice', 'ev_cislo')}</ThSort>
                              <ThSort style={{ width: '240px', maxWidth: '240px' }} onClick={() => handleTableSort('ordersAfterInvoice', 'fa_vs')}>Fa VS{sortIcon('ordersAfterInvoice', 'fa_vs')}</ThSort>
                              <ThSort style={{ width: '90px', maxWidth: '90px' }} onClick={() => handleTableSort('ordersAfterInvoice', 'fa_typ')}>Typ FA{sortIcon('ordersAfterInvoice', 'fa_typ')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'dt_fa')}>Fa doručena{sortIcon('ordersAfterInvoice', 'dt_fa')}</ThSort>
                              
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'dt_obj_created')}>Obj vytvořena{sortIcon('ordersAfterInvoice', 'dt_obj_created')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'objednatel')}>Objednatel{sortIcon('ordersAfterInvoice', 'objednatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'schvalovatel')}>Schvalovatel{sortIcon('ordersAfterInvoice', 'schvalovatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'usek')}>Úsek{sortIcon('ordersAfterInvoice', 'usek')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'financovani')}>Financování{sortIcon('ordersAfterInvoice', 'financovani')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersAfterInvoice', 'detail_fin')}>Detail fin.{sortIcon('ordersAfterInvoice', 'detail_fin')}</ThNarrowSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'druh')}>Druh{sortIcon('ordersAfterInvoice', 'druh')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'stav')}>Stav obj.{sortIcon('ordersAfterInvoice', 'stav')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersAfterInvoice', 'stav_fa')}>Stav FA{sortIcon('ordersAfterInvoice', 'stav_fa')}</ThSort>
                              <ThRSort onClick={() => handleTableSort('ordersAfterInvoice', 'fa_castka')}>FA částka{sortIcon('ordersAfterInvoice', 'fa_castka')}</ThRSort>
                              <ThSort style={{ minWidth: '110px' }} onClick={() => handleTableSort('ordersAfterInvoice', 'fk_stav')}>Kontrola{sortIcon('ordersAfterInvoice', 'fk_stav')}</ThSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrdersAfterInvoice.items.map(({ order, invoice }) => {
                              const rowKey = `order_after_invoice_${order.id}_${invoice.id}`;
                              return (
                                <Tr key={rowKey}>
                                  <Td>{renderOrderLinkWithSubject(order, 'ordersAfterInvoice')}</Td>
                                  <Td style={{ width: '240px', maxWidth: '240px', overflow: 'hidden' }}>
                                    {renderInvoiceLink(invoice)}
                                    {(() => { const pozn = invoice.fa_poznamka; if (!pozn) return null; const isLong = pozn.length > 75; const truncated = isLong ? pozn.slice(0, 75).trimEnd() + '\u2026' : pozn; return (<div style={{ display: 'block', marginTop: '0.2em' }}><SmartTooltip text={pozn} preferredPosition="right" icon="none" multiline={true}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35', cursor: 'help' }}>{highlightText(truncated, 'ordersAfterInvoice')}</div></SmartTooltip></div>); })()}
                                  </Td>
                                  <Td style={{ width: '90px', maxWidth: '90px' }}>{renderFaTypBadge(invoice.fa_typ, invoice.fa_typ_nazev)}</Td>
                                  <Td>{highlightText(formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni), 'ordersAfterInvoice')}</Td>
                                  <Td>{highlightText(formatDateCz(getOrderDate(order)), 'ordersAfterInvoice')}</Td>
                                  <Td>{renderOrdererStack(order)}</Td>
                                  <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                  <Td>{highlightText(getOrdererUsekCode(order) || '-', 'ordersAfterInvoice')}</Td>
                                  <TdNarrow>{renderFinancingLabelCell(order, 'ordersAfterInvoice')}</TdNarrow>
                                  <TdNarrow>{renderFinancingRefCell(order, 'ordersAfterInvoice')}</TdNarrow>
                                  <TdNarrow>{highlightText(getOrderTypeLabel(order), 'ordersAfterInvoice')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                  <Td>{highlightText(getOrderStatusLabel(order), 'ordersAfterInvoice')}</Td>
                                  <Td>{highlightText(getInvoiceStatusLabel(invoice), 'ordersAfterInvoice')}</Td>
                                  <TdR>{fmtCurrency(getInvoiceAmount(invoice))}</TdR>
                                  <Td style={{ minWidth: '110px', padding: '0.6rem 0.9rem' }}><FkInlineCell objednavkaId={order.id} fakturaId={invoice.id} entityType="OBJ_FA" sectionKey="ordersAfterInvoice" token={token} username={username} onFkLoad={handleFkLoad} /></Td>
                                </Tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('ordersAfterInvoice', pagedOrdersAfterInvoice)}
                    </>
                  )}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'ordersInvoicesWithoutAttachments') && (
                  <SectionCard id="section-ordersInvoicesWithoutAttachments">
                  <SectionHeader>
                    <SectionTitle>Objednávky s fakturami bez příloh</SectionTitle>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="warn">{pagedOrdersInvoicesWithoutAttachments.total}</SectionBadge>
                      <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(fkTotals.ordersInvoicesWithoutAttachmentsFA)}</SectionBadge>
                      <button onClick={handleExportCsv_ordersInvoicesWithoutAttachments} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <SearchInputWrapper style={{ flex: 1 }}>
                      <SearchInputIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchInputIcon>
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('ordersInvoicesWithoutAttachments')}
                        onChange={(e) => setSearchQuery('ordersInvoicesWithoutAttachments', e.target.value)}
                      />
                      {getSearchQuery('ordersInvoicesWithoutAttachments') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('ordersInvoicesWithoutAttachments', '')}
                          title="Vymazat vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>Zobrazit:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkIgnorovano} onChange={e => setShowFkIgnorovano(e.target.checked)} style={{ accentColor: '#94a3b8', cursor: 'pointer' }} />
                      Ignorováno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#16a34a', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkVyreseno} onChange={e => setShowFkVyreseno(e.target.checked)} style={{ accentColor: '#16a34a', cursor: 'pointer' }} />
                      Vyřešeno
                    </label>
                  </SearchBox>
                  {pagedOrdersInvoicesWithoutAttachments.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedOrdersInvoicesWithoutAttachments.total} z {pagedOrdersInvoicesWithoutAttachments.originalTotal} záznamů
                    </div>
                  )}
                  {pagedOrdersInvoicesWithoutAttachments.isFiltered && pagedOrdersInvoicesWithoutAttachments.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'ev_cislo')}>Objednávka{sortIcon('ordersInvoicesWithoutAttachments', 'ev_cislo')}</ThSort>
                              <ThSort style={{ width: '240px', maxWidth: '240px' }} onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'fa_vs')}>Fa VS{sortIcon('ordersInvoicesWithoutAttachments', 'fa_vs')}</ThSort>
                              <ThSort style={{ width: '90px', maxWidth: '90px' }} onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'fa_typ')}>Typ FA{sortIcon('ordersInvoicesWithoutAttachments', 'fa_typ')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'dt_obj')}>Dt. obj.{sortIcon('ordersInvoicesWithoutAttachments', 'dt_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'objednatel')}>Objednatel{sortIcon('ordersInvoicesWithoutAttachments', 'objednatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'schvalovatel')}>Schvalovatel{sortIcon('ordersInvoicesWithoutAttachments', 'schvalovatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'usek')}>Úsek{sortIcon('ordersInvoicesWithoutAttachments', 'usek')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'financovani')}>Financování{sortIcon('ordersInvoicesWithoutAttachments', 'financovani')}</ThNarrowSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'detail_fin')}>Detail fin.{sortIcon('ordersInvoicesWithoutAttachments', 'detail_fin')}</ThNarrowSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'druh')}>Druh{sortIcon('ordersInvoicesWithoutAttachments', 'druh')}</ThNarrowSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'stav_obj')}>Stav OBJ{sortIcon('ordersInvoicesWithoutAttachments', 'stav_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'stav_fa')}>Stav FA{sortIcon('ordersInvoicesWithoutAttachments', 'stav_fa')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'prilohy_obj')}>Příl. OBJ{sortIcon('ordersInvoicesWithoutAttachments', 'prilohy_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'prilohy_fa')}>Příl. FA{sortIcon('ordersInvoicesWithoutAttachments', 'prilohy_fa')}</ThSort>
                              <ThRSort onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'fa_castka')}>FA částka{sortIcon('ordersInvoicesWithoutAttachments', 'fa_castka')}</ThRSort>
                              <ThSort style={{ minWidth: '110px' }} onClick={() => handleTableSort('ordersInvoicesWithoutAttachments', 'fk_stav')}>Kontrola{sortIcon('ordersInvoicesWithoutAttachments', 'fk_stav')}</ThSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrdersInvoicesWithoutAttachments.items.map(order => {
                              const rowKey = `order_missing_invoice_attachment_${order.id}`;
                              return (
                                <Tr key={order.id}>
                                  <Td>{renderOrderLinkWithSubject(order, 'ordersInvoicesWithoutAttachments')}</Td>
                                  <Td style={{ width: '240px', maxWidth: '240px', overflow: 'hidden' }}>{(invoicesByOrderId[String(order.id)] || []).map(inv => (
                                    <div key={inv.id}>
                                      {renderInvoiceLink(inv, 'ordersInvoicesWithoutAttachments')}
                                      {(() => { const pozn = inv.fa_poznamka; if (!pozn) return null; const isLong = pozn.length > 75; const truncated = isLong ? pozn.slice(0, 75).trimEnd() + '\u2026' : pozn; return (<div style={{ display: 'block', marginTop: '0.2em' }}><SmartTooltip text={pozn} preferredPosition="right" icon="none" multiline={true}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35', cursor: 'help' }}>{highlightText(truncated, 'ordersInvoicesWithoutAttachments')}</div></SmartTooltip></div>); })()}
                                    </div>
                                  ))}</Td>
                                  <Td style={{ width: '90px', maxWidth: '90px' }}>
                                    {(invoicesByOrderId[String(order.id)] || []).map(inv => (
                                      <div key={inv.id}>{renderFaTypBadge(inv.fa_typ, inv.fa_typ_nazev)}</div>
                                    ))}
                                  </Td>
                                  <Td>{highlightText(formatDateCz(getOrderDate(order)), 'ordersInvoicesWithoutAttachments')}</Td>
                                  <Td>{renderOrdererStack(order)}</Td>
                                  <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                  <Td>{highlightText(getOrdererUsekCode(order) || '-', 'ordersInvoicesWithoutAttachments')}</Td>
                                  <TdNarrow>{renderFinancingLabelCell(order, 'ordersInvoicesWithoutAttachments')}</TdNarrow>
                                  <TdNarrow>{renderFinancingRefCell(order, 'ordersInvoicesWithoutAttachments')}</TdNarrow>
                                  <TdNarrow>{highlightText(getOrderTypeLabel(order), 'ordersInvoicesWithoutAttachments')}</TdNarrow>
                                  <Td>{highlightText(getOrderStatusLabel(order), 'ordersInvoicesWithoutAttachments')}</Td>
                                  <Td>{(invoicesByOrderId[String(order.id)] || []).map(inv => <div key={inv.id}>{highlightText(getInvoiceStatusLabel(inv), 'ordersInvoicesWithoutAttachments')}</div>)}</Td>
                                  <TdC>{renderAttachBadge(order.id, 'order', order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length)}</TdC>
                                  <TdC>
                                    {(invoicesByOrderId[String(order.id)] || []).map(inv => (
                                      <div key={inv.id}>{renderAttachBadge(inv.id, 'invoice', inv.pocet_priloh ?? inv.prilohy?.length)}</div>
                                    ))}
                                  </TdC>
                                  <TdR>{fmtCurrency((invoicesByOrderId[String(order.id)] || []).reduce((s, inv) => s + getInvoiceAmount(inv), 0))}</TdR>
                                  <Td style={{ minWidth: '110px', padding: '0.6rem 0.9rem' }}><FkInlineCell objednavkaId={order.id} fakturaId={0} entityType="OBJ" sectionKey="ordersInvoicesWithoutAttachments" token={token} username={username} onFkLoad={handleFkLoad} /></Td>
                                </Tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('ordersInvoicesWithoutAttachments', pagedOrdersInvoicesWithoutAttachments)}
                    </>
                  )}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'invoicesWithoutAttachments') && (
                  <SectionCard id="section-invoicesWithoutAttachments">
                  <SectionHeader>
                    <SectionTitle>Faktury bez přílohy</SectionTitle>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="warn">{pagedInvoicesWithoutAttachments.total}</SectionBadge>
                      <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(fkTotals.invoicesWithoutAttachmentsFA)}</SectionBadge>
                      <button onClick={handleExportCsv_invoicesWithoutAttachments} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <SearchInputWrapper style={{ flex: 1 }}>
                      <SearchInputIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchInputIcon>
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('invoicesWithoutAttachments')}
                        onChange={(e) => setSearchQuery('invoicesWithoutAttachments', e.target.value)}
                      />
                      {getSearchQuery('invoicesWithoutAttachments') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('invoicesWithoutAttachments', '')}
                          title="Vymazat vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>Zobrazit:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkIgnorovano} onChange={e => setShowFkIgnorovano(e.target.checked)} style={{ accentColor: '#94a3b8', cursor: 'pointer' }} />
                      Ignorováno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#16a34a', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkVyreseno} onChange={e => setShowFkVyreseno(e.target.checked)} style={{ accentColor: '#16a34a', cursor: 'pointer' }} />
                      Vyřešeno
                    </label>
                  </SearchBox>
                  {pagedInvoicesWithoutAttachments.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedInvoicesWithoutAttachments.total} z {pagedInvoicesWithoutAttachments.originalTotal} záznamů
                    </div>
                  )}
                  {pagedInvoicesWithoutAttachments.isFiltered && pagedInvoicesWithoutAttachments.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ width: '240px', maxWidth: '240px' }} onClick={() => handleTableSort('invoicesWithoutAttachments', 'fa_vs')}>Fa VS{sortIcon('invoicesWithoutAttachments', 'fa_vs')}</ThSort>
                              <ThSort style={{ width: '90px', maxWidth: '90px' }} onClick={() => handleTableSort('invoicesWithoutAttachments', 'fa_typ')}>Typ FA{sortIcon('invoicesWithoutAttachments', 'fa_typ')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'dt_dorucena')}>Doručena{sortIcon('invoicesWithoutAttachments', 'dt_dorucena')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'evidoval')}>Zaevidoval{sortIcon('invoicesWithoutAttachments', 'evidoval')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'predana')}>Předána{sortIcon('invoicesWithoutAttachments', 'predana')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'ev_cislo')}>Objednávka/Smlouva{sortIcon('invoicesWithoutAttachments', 'ev_cislo')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'usek')}>Úsek{sortIcon('invoicesWithoutAttachments', 'usek')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'financovani')}>Financování{sortIcon('invoicesWithoutAttachments', 'financovani')}</ThNarrowSort>
                              <ThNarrowSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'detail_fin')}>Detail fin.{sortIcon('invoicesWithoutAttachments', 'detail_fin')}</ThNarrowSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'druh')}>Druh{sortIcon('invoicesWithoutAttachments', 'druh')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'stav_obj')}>Stav obj.{sortIcon('invoicesWithoutAttachments', 'stav_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'stav_fa')}>Stav FA{sortIcon('invoicesWithoutAttachments', 'stav_fa')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'prilohy_obj')}>Příl. OBJ{sortIcon('invoicesWithoutAttachments', 'prilohy_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'prilohy_fa')}>Příl. FA{sortIcon('invoicesWithoutAttachments', 'prilohy_fa')}</ThSort>
                              <ThRSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'castka')}>Částka{sortIcon('invoicesWithoutAttachments', 'castka')}</ThRSort>
                              <ThSort style={{ minWidth: '110px' }} onClick={() => handleTableSort('invoicesWithoutAttachments', 'fk_stav')}>Kontrola{sortIcon('invoicesWithoutAttachments', 'fk_stav')}</ThSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedInvoicesWithoutAttachments.items.map(invoice => {
                              const order = ordersById.get(String(invoice.objednavka_id)) || null;
                              const rowKey = `invoice_no_attachment_${invoice.id}`;
                              return (
                                <Tr key={invoice.id}>
                                  <Td style={{ width: '240px', maxWidth: '240px', overflow: 'hidden' }}>
                                    {renderInvoiceLink(invoice, 'invoicesWithoutAttachments')}
                                    {(() => {
                                      const pozn = invoice.fa_poznamka;
                                      if (!pozn) return null;
                                      const MAX = 75;
                                      const isLong = pozn.length > MAX;
                                      const truncated = isLong ? pozn.slice(0, MAX).trimEnd() + '\u2026' : pozn;
                                      return (
                                        <div style={{ display: 'block', marginTop: '0.2em' }}>
                                          <SmartTooltip text={pozn} preferredPosition="right" icon="none" multiline={true}>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35', cursor: 'help' }}>
                                              {highlightText(truncated, 'invoicesWithoutAttachments')}
                                            </div>
                                          </SmartTooltip>
                                        </div>
                                      );
                                    })()}
                                  </Td>
                                  <Td style={{ width: '90px', maxWidth: '90px' }}>{renderFaTypBadge(invoice.fa_typ, invoice.fa_typ_nazev)}</Td>
                                  <Td>{highlightText(formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni), 'invoicesWithoutAttachments')}</Td>
                                  <Td>
                                    {invoice.vytvoril_uzivatel_zkracene ? highlightText(invoice.vytvoril_uzivatel_zkracene, 'invoicesWithoutAttachments') : '-'}
                                    {invoice.dt_vytvoreni && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateCz(invoice.dt_vytvoreni)}</div>}
                                  </Td>
                                  <Td>
                                    {invoice.fa_predana_zam_jmeno_cele ? highlightText(invoice.fa_predana_zam_jmeno_cele, 'invoicesWithoutAttachments') : '-'}
                                    {invoice.fa_datum_predani_zam && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateCz(invoice.fa_datum_predani_zam)}</div>}
                                  </Td>
                                  <Td>{order ? renderOrderLink(order, 'invoicesWithoutAttachments') : highlightText(invoice.cislo_smlouvy || invoice.smlouva_id || '-', 'invoicesWithoutAttachments')}</Td>
                                  <Td>{order ? highlightText(getOrdererUsekCode(order) || '-', 'invoicesWithoutAttachments') : '-'}</Td>
                                  <Td>{order ? renderFinancingLabelCell(order, 'invoicesWithoutAttachments') : '-'}</Td>
                                  <TdNarrow>{order ? renderFinancingRefCell(order, 'invoicesWithoutAttachments') : '-'}</TdNarrow>
                                  <Td>{order ? highlightText(getOrderTypeLabel(order), 'invoicesWithoutAttachments') : '-'}</Td>
                                  <Td>{order ? highlightText(getOrderStatusLabel(order), 'invoicesWithoutAttachments') : '-'}</Td>
                                  <Td>{highlightText(getInvoiceStatusLabel(invoice), 'invoicesWithoutAttachments')}</Td>
                                  <TdC>{order ? renderAttachBadge(order.id, 'order', order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length) : '-'}</TdC>
                                  <TdC>{renderAttachBadge(invoice.id, 'invoice', invoice.pocet_priloh ?? invoice.prilohy?.length)}</TdC>
                                  <TdR>{highlightText(fmtCurrency(getInvoiceAmount(invoice)), 'invoicesWithoutAttachments')}</TdR>
                                  <Td style={{ minWidth: '110px', padding: '0.6rem 0.9rem' }}><FkInlineCell objednavkaId={0} fakturaId={invoice.id} entityType="FA" sectionKey="invoicesWithoutAttachments" token={token} username={username} onFkLoad={handleFkLoad} /></Td>
                                </Tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('invoicesWithoutAttachments', pagedInvoicesWithoutAttachments)}
                    </>
                  )}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'overdueInvoices') && (
                  <SectionCard id="section-overdueInvoices">
                  <SectionHeader>
                    <SectionTitle>Faktury po splatnosti 14+ dní</SectionTitle>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="danger">{pagedOverdueInvoices.total}</SectionBadge>
                      <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(fkTotals.overdueInvoicesFA)}</SectionBadge>
                      <button onClick={handleExportCsv_overdueInvoices} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <SearchInputWrapper style={{ flex: 1 }}>
                      <SearchInputIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchInputIcon>
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('overdueInvoices')}
                        onChange={(e) => setSearchQuery('overdueInvoices', e.target.value)}
                      />
                      {getSearchQuery('overdueInvoices') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('overdueInvoices', '')}
                          title="Vymazat vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>Zobrazit:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkIgnorovano} onChange={e => setShowFkIgnorovano(e.target.checked)} style={{ accentColor: '#94a3b8', cursor: 'pointer' }} />
                      Ignorováno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#16a34a', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkVyreseno} onChange={e => setShowFkVyreseno(e.target.checked)} style={{ accentColor: '#16a34a', cursor: 'pointer' }} />
                      Vyřešeno
                    </label>
                  </SearchBox>
                  {pagedOverdueInvoices.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedOverdueInvoices.total} z {pagedOverdueInvoices.originalTotal} záznamů
                    </div>
                  )}
                  {pagedOverdueInvoices.isFiltered && pagedOverdueInvoices.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ width: '240px', maxWidth: '240px' }} onClick={() => handleTableSort('overdueInvoices', 'fa_vs')}>Fa VS{sortIcon('overdueInvoices', 'fa_vs')}</ThSort>
                              <ThSort style={{ width: '90px', maxWidth: '90px' }} onClick={() => handleTableSort('overdueInvoices', 'fa_typ')}>Typ FA{sortIcon('overdueInvoices', 'fa_typ')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'dt_dorucena')}>Doručena{sortIcon('overdueInvoices', 'dt_dorucena')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'splatnost')}>Splatnost{sortIcon('overdueInvoices', 'splatnost')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'evidoval')}>Zaevidoval{sortIcon('overdueInvoices', 'evidoval')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'predana')}>Předána{sortIcon('overdueInvoices', 'predana')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'ev_cislo')}>Objednávka/Smlouva{sortIcon('overdueInvoices', 'ev_cislo')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'usek')}>Úsek{sortIcon('overdueInvoices', 'usek')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('overdueInvoices', 'financovani')}>Financování{sortIcon('overdueInvoices', 'financovani')}</ThNarrowSort>
                              <ThNarrowSort onClick={() => handleTableSort('overdueInvoices', 'detail_fin')}>Detail fin.{sortIcon('overdueInvoices', 'detail_fin')}</ThNarrowSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'druh')}>Druh{sortIcon('overdueInvoices', 'druh')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'stav_obj')}>Stav obj.{sortIcon('overdueInvoices', 'stav_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'stav_fa')}>Stav FA{sortIcon('overdueInvoices', 'stav_fa')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'prilohy_obj')}>Příl. OBJ{sortIcon('overdueInvoices', 'prilohy_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('overdueInvoices', 'prilohy_fa')}>Příl. FA{sortIcon('overdueInvoices', 'prilohy_fa')}</ThSort>
                              <ThRSort onClick={() => handleTableSort('overdueInvoices', 'castka')}>Částka{sortIcon('overdueInvoices', 'castka')}</ThRSort>
                              <ThSort style={{ minWidth: '110px' }} onClick={() => handleTableSort('overdueInvoices', 'fk_stav')}>Kontrola{sortIcon('overdueInvoices', 'fk_stav')}</ThSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOverdueInvoices.items.map(invoice => {
                              const order = ordersById.get(String(invoice.objednavka_id)) || null;
                              const rowKey = `invoice_overdue_${invoice.id}`; // kept for renderNoteCell fallback (localStorage)
                              return (
                                <Tr key={invoice.id}>
                                  <Td style={{ width: '240px', maxWidth: '240px', overflow: 'hidden' }}>
                                    {renderInvoiceLink(invoice, 'overdueInvoices')}
                                    {(() => {
                                      const pozn = invoice.fa_poznamka;
                                      if (!pozn) return null;
                                      const MAX = 75;
                                      const isLong = pozn.length > MAX;
                                      const truncated = isLong ? pozn.slice(0, MAX).trimEnd() + '\u2026' : pozn;
                                      return (
                                        <div style={{ display: 'block', marginTop: '0.2em' }}>
                                          <SmartTooltip text={pozn} preferredPosition="right" icon="none" multiline={true}>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35', cursor: 'help' }}>
                                              {highlightText(truncated, 'overdueInvoices')}
                                            </div>
                                          </SmartTooltip>
                                        </div>
                                      );
                                    })()}
                                  </Td>
                                  <Td style={{ width: '90px', maxWidth: '90px' }}>{renderFaTypBadge(invoice.fa_typ, invoice.fa_typ_nazev)}</Td>
                                  <Td>{highlightText(formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni), 'overdueInvoices')}</Td>
                                  <Td>{highlightText(formatDateCz(invoice.datum_splatnosti), 'overdueInvoices')}</Td>
                                  <Td>
                                    {invoice.vytvoril_uzivatel_zkracene ? highlightText(invoice.vytvoril_uzivatel_zkracene, 'overdueInvoices') : '-'}
                                    {invoice.dt_vytvoreni && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateCz(invoice.dt_vytvoreni)}</div>}
                                  </Td>
                                  <Td>
                                    {invoice.fa_predana_zam_jmeno_cele ? highlightText(invoice.fa_predana_zam_jmeno_cele, 'overdueInvoices') : '-'}
                                    {invoice.fa_datum_predani_zam && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateCz(invoice.fa_datum_predani_zam)}</div>}
                                  </Td>
                                  <Td>{order ? renderOrderLink(order, 'overdueInvoices') : highlightText(invoice.cislo_smlouvy || invoice.smlouva_id || '-', 'overdueInvoices')}</Td>
                                  <Td>{order ? highlightText(getOrdererUsekCode(order) || '-', 'overdueInvoices') : '-'}</Td>
                                  <Td>{order ? renderFinancingLabelCell(order, 'overdueInvoices') : '-'}</Td>
                                  <TdNarrow>{order ? renderFinancingRefCell(order, 'overdueInvoices') : '-'}</TdNarrow>
                                  <Td>{order ? highlightText(getOrderTypeLabel(order), 'overdueInvoices') : '-'}</Td>
                                  <Td>{order ? highlightText(getOrderStatusLabel(order), 'overdueInvoices') : '-'}</Td>
                                  <Td>{highlightText(getInvoiceStatusLabel(invoice), 'overdueInvoices')}</Td>
                                  <TdC>{order ? renderAttachBadge(order.id, 'order', order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length) : '-'}</TdC>
                                  <TdC>{renderAttachBadge(invoice.id, 'invoice', invoice.pocet_priloh ?? invoice.prilohy?.length)}</TdC>
                                  <TdR>{highlightText(fmtCurrency(getInvoiceAmount(invoice)), 'overdueInvoices')}</TdR>
                                  <Td style={{ minWidth: '110px', padding: '0.6rem 0.9rem' }}><FkInlineCell objednavkaId={0} fakturaId={invoice.id} entityType="FA" sectionKey="overdueInvoices" token={token} username={username} onFkLoad={handleFkLoad} /></Td>
                                </Tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('overdueInvoices', pagedOverdueInvoices)}
                    </>
                  )}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'cancelledOrders') && (
                  <SectionCard id="section-cancelledOrders">
                  <SectionHeader>
                    <SectionTitle>Zrušené a zamítnuté objednávky</SectionTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="danger">{pagedCancelledOrders.total}</SectionBadge>
                      <button onClick={handleExportCsv_cancelledOrders} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox>
                    <SearchInputWrapper>
                      <SearchInputIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchInputIcon>
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('cancelledOrders')}
                        onChange={(e) => setSearchQuery('cancelledOrders', e.target.value)}
                      />
                      {getSearchQuery('cancelledOrders') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('cancelledOrders', '')}
                          title="Vymazat vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                  </SearchBox>
                  {pagedCancelledOrders.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedCancelledOrders.total} z {pagedCancelledOrders.originalTotal} záznamů
                    </div>
                  )}
                  {pagedCancelledOrders.isFiltered && pagedCancelledOrders.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'ev_cislo')}>Objednávka{sortIcon('cancelledOrders', 'ev_cislo')}</ThSort>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'dt_obj')}>Dt. obj.{sortIcon('cancelledOrders', 'dt_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'objednatel')}>Objednatel{sortIcon('cancelledOrders', 'objednatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'schvalovatel')}>Schvalovatel{sortIcon('cancelledOrders', 'schvalovatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'usek')}>Úsek{sortIcon('cancelledOrders', 'usek')}</ThSort>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'financovani')}>Financování{sortIcon('cancelledOrders', 'financovani')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('cancelledOrders', 'detail_fin')}>Detail fin.{sortIcon('cancelledOrders', 'detail_fin')}</ThNarrowSort>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'druh')}>Druh{sortIcon('cancelledOrders', 'druh')}</ThSort>
                              <ThSort style={{ maxWidth: '240px', width: '240px' }} onClick={() => handleTableSort('cancelledOrders', 'stav')}>Stav obj.{sortIcon('cancelledOrders', 'stav')}</ThSort>
                              <ThSort onClick={() => handleTableSort('cancelledOrders', 'pocet_fa')}>Počet FA{sortIcon('cancelledOrders', 'pocet_fa')}</ThSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedCancelledOrders.items.map(order => (
                              <Tr key={order.id}>
                                <Td>{renderOrderLinkWithSubject(order, 'cancelledOrders')}</Td>
                                <Td>{highlightText(formatDateCz(getOrderDate(order)), 'cancelledOrders')}</Td>
                                <Td>{renderOrdererStack(order)}</Td>
                                <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                <Td>{highlightText(getOrdererUsekCode(order) || '-', 'cancelledOrders')}</Td>
                                <TdNarrow>{renderFinancingLabelCell(order, 'cancelledOrders')}</TdNarrow>
                                <TdNarrow>{renderFinancingRefCell(order, 'cancelledOrders')}</TdNarrow>
                                <TdNarrow>{highlightText(getOrderTypeLabel(order), 'cancelledOrders')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                <Td style={{ maxWidth: '240px', width: '240px', overflow: 'hidden' }}>
                                  {highlightText(getOrderStatusLabel(order), 'cancelledOrders')}
                                  {(() => {
                                    const statusRaw = `${getOrderStatusCode(order)} ${getOrderStatusLabel(order)}`.toUpperCase();
                                    const isStorno = statusRaw.includes('STORNO') || statusRaw.includes('SMAZ') || statusRaw.includes('ZRUS');
                                    const komentarText = isStorno
                                      ? (order.odeslani_storno_duvod || order.stav_komentar || null)
                                      : (order.schvaleni_komentar || order.stav_komentar || null);
                                    if (!komentarText) return null;
                                    const MAX_CHARS = 100;
                                    const isLong = komentarText.length > MAX_CHARS;
                                    const truncated = isLong ? komentarText.slice(0, MAX_CHARS).trimEnd() + '\u2026' : komentarText;
                                    return (
                                      <div style={{ display: 'grid', marginTop: '0.25em', paddingRight: '1em' }}>
                                        <SmartTooltip text={komentarText} preferredPosition="right" icon="none" multiline={true}>
                                          <div style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            fontStyle: 'italic',
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                            lineHeight: '1.35',
                                            cursor: 'help',
                                          }}>
                                            {highlightText(truncated, 'cancelledOrders')}
                                          </div>
                                        </SmartTooltip>
                                      </div>
                                    );
                                  })()}
                                </Td>
                                <Td>
                                  {(() => {
                                    const invs = invoicesByOrderId[String(order.id)] || [];
                                    if (invs.length === 0) return <span style={{ color: '#cbd5e1' }}>0</span>;
                                    return (
                                      <>
                                        <span style={{ fontWeight: 600 }}>{invs.length}</span>
                                        {invs.map(inv => (
                                          <div key={inv.id} style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {highlightText(inv.cislo_faktury || String(inv.id), 'cancelledOrders')}
                                          </div>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </Td>
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('cancelledOrders', pagedCancelledOrders)}
                    </>
                  )}
                  </SectionCard>
                )}
              </>
            )}

            {activeTab === 'vzdel' && (
              <>
                {/* ── HELPER: tabulka objednávek stylem overdueInvoices ── */}
                {/* Blok 1 – Vzdělávání lékařské */}
                {isBlockVisible('vzdel', 'vzdelLekarsky') && (
                  <SectionCard id="section-vzdelLekarsky">
                    <SectionHeader>
                      <SectionTitle>Vzdělávání – kurzy zdravotnické a lékařské (financováno z limitovaných příslibů)</SectionTitle>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <SectionBadge $tone="warn">{vzdelSections.lekarsky.length}</SectionBadge>
                        <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(vzdelLekarskyTotal)}</SectionBadge>
                        <button onClick={handleExportCsv_vzdelLekarsky} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <SearchInputWrapper style={{ flex: 1 }}>
                        <SearchInputIcon><FontAwesomeIcon icon={faSearch} /></SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání..."
                          value={getSearchQuery('vzdelLekarsky')}
                          onChange={e => setSearchQuery('vzdelLekarsky', e.target.value)}
                        />
                        {getSearchQuery('vzdelLekarsky') && (
                          <SearchClearButton onClick={() => setSearchQuery('vzdelLekarsky', '')} title="Vymazat">
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={showVzdelDokoncene}
                          onChange={e => setShowVzdelDokoncene(e.target.checked)}
                          style={{ accentColor: '#16a34a', cursor: 'pointer' }}
                        />
                        Zobrazit dokončené
                      </label>
                    </SearchBox>
                    {pagedVzdelLekarsky.isFiltered && (
                      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                        Nalezeno {pagedVzdelLekarsky.total} z {pagedVzdelLekarsky.originalTotal} záznamů
                      </div>
                    )}
                    {pagedVzdelLekarsky.isFiltered && pagedVzdelLekarsky.total === 0 ? (
                      <SearchEmptyState><FontAwesomeIcon icon={faSearch} /><p>Žádné záznamy</p></SearchEmptyState>
                    ) : vzdelSections.lekarsky.length === 0 ? (
                      <EmptyState>Žádné objednávky druhu „Vzdělávání – kurzy zdravotnické a lékařské“</EmptyState>
                    ) : (
                      <>
                        <TableWrapper style={{ margin: 0 }}>
                          <Table>
                            <thead>
                              <tr>
                                <ThSort style={{ minWidth: '220px', maxWidth: '280px' }} onClick={() => handleTableSort('vzdelLekarsky', 'ev_cislo')}>Objednávka{sortIcon('vzdelLekarsky', 'ev_cislo')}</ThSort>
                                <ThSort style={{ minWidth: '120px', maxWidth: '200px' }} onClick={() => handleTableSort('vzdelLekarsky', 'fa_vs')}>Fa VS{sortIcon('vzdelLekarsky', 'fa_vs')}</ThSort>
                                <ThSort style={{ width: '85px', maxWidth: '85px' }} onClick={() => handleTableSort('vzdelLekarsky', 'fa_typ')}>Typ FA{sortIcon('vzdelLekarsky', 'fa_typ')}</ThSort>
                                <ThSort style={{ width: '95px', maxWidth: '95px' }} onClick={() => handleTableSort('vzdelLekarsky', 'dt_dorucena')}>Doručena{sortIcon('vzdelLekarsky', 'dt_dorucena')}</ThSort>
                                <ThSort style={{ width: '95px', maxWidth: '95px' }} onClick={() => handleTableSort('vzdelLekarsky', 'splatnost')}>Splatnost{sortIcon('vzdelLekarsky', 'splatnost')}</ThSort>
                                <ThRSort style={{ width: '100px', maxWidth: '100px' }} onClick={() => handleTableSort('vzdelLekarsky', 'castka')}>Částka{sortIcon('vzdelLekarsky', 'castka')}</ThRSort>
                                <ThSort style={{ width: '130px', maxWidth: '130px', minWidth: '130px' }} onClick={() => handleTableSort('vzdelLekarsky', 'stav_fa')}>Stav FA{sortIcon('vzdelLekarsky', 'stav_fa')}</ThSort>
                                <ThSort style={{ width: '100px', maxWidth: '100px', minWidth: '100px' }} onClick={() => handleTableSort('vzdelLekarsky', 'usek')}>Úsek{sortIcon('vzdelLekarsky', 'usek')}</ThSort>
                                <ThNarrowSort style={{ width: '65px', maxWidth: '65px', minWidth: '65px' }} onClick={() => handleTableSort('vzdelLekarsky', 'detail_fin')}>LP{sortIcon('vzdelLekarsky', 'detail_fin')}</ThNarrowSort>
                                <ThRSort style={{ width: '110px' }} onClick={() => handleTableSort('vzdelLekarsky', 'castka_celk')}>Částka celk.{sortIcon('vzdelLekarsky', 'castka_celk')}</ThRSort>
                                <ThSort style={{ width: '130px', maxWidth: '130px', minWidth: '130px' }} onClick={() => handleTableSort('vzdelLekarsky', 'stav_obj')}>Stav obj.{sortIcon('vzdelLekarsky', 'stav_obj')}</ThSort>
                                <ThC style={{ width: '65px' }}>Přílohy</ThC>
                                <ThC style={{ width: '65px' }}>
                                  <FontAwesomeIcon icon={faBolt} style={{ color: '#fbbf24' }} />
                                </ThC>
                              </tr>
                            </thead>
                            {pagedVzdelLekarsky.items.map(order => renderVzdelOrderRows(order, 'vzdelLekarsky', true))}
                          </Table>
                        </TableWrapper>
                        {renderPagination('vzdelLekarsky', pagedVzdelLekarsky)}
                      </>
                    )}
                  </SectionCard>
                )}

                {/* Blok 2 – Školení nezdravotnické (styl Úsek → Financování → Objednávky) */}
                {isBlockVisible('vzdel', 'vzdelNelekarsky') && (
                  <SectionCard id="section-vzdelNelekarsky">
                    <SectionHeader>
                      <SectionTitle>Školení nezdravotnické</SectionTitle>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allFinKeys = [];
                            vzdelNelByUsekFin.forEach(g => Object.keys(g.financing || {}).forEach(fk => allFinKeys.push(`vzdelNel_${g.code}_${fk}`)));
                            const allNelExp = vzdelNelByUsekFin.length > 0 && vzdelNelByUsekFin.every(g => expandedVzdelNelUsek.has(g.code)) && allFinKeys.every(k => expandedVzdelNelFin.has(k));
                            if (allNelExp) { setExpandedVzdelNelUsek(new Set()); setExpandedVzdelNelFin(new Set()); }
                            else { setExpandedVzdelNelUsek(new Set(vzdelNelByUsekFin.map(g => g.code))); setExpandedVzdelNelFin(new Set(allFinKeys)); }
                          }}
                          title="Rozbalit / sbalit všechny skupiny"
                        >
                          <FontAwesomeIcon icon={vzdelNelByUsekFin.length > 0 && vzdelNelByUsekFin.every(g => expandedVzdelNelUsek.has(g.code)) && vzdelNelByUsekFin.every(g => Object.keys(g.financing || {}).every(fk => expandedVzdelNelFin.has(`vzdelNel_${g.code}_${fk}`))) ? faMinus : faPlus} />
                          {vzdelNelByUsekFin.length > 0 && vzdelNelByUsekFin.every(g => expandedVzdelNelUsek.has(g.code)) && vzdelNelByUsekFin.every(g => Object.keys(g.financing || {}).every(fk => expandedVzdelNelFin.has(`vzdelNel_${g.code}_${fk}`))) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <span style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 0.15rem' }} />
                        <SectionBadge $tone="warn">{vzdelSections.nelekarsky.length} obj.</SectionBadge>
                        <SectionBadge $tone="info">{vzdelNelByUsekFin.length} úseků</SectionBadge>
                        <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(vzdelNelekarskyTotal)}</SectionBadge>
                        <button onClick={handleExportCsv_vzdelNelekarsky} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <SearchInputWrapper style={{ flex: 1 }}>
                        <SearchInputIcon><FontAwesomeIcon icon={faSearch} /></SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (úsek, financování, objednávky)..."
                          value={getSearchQuery('vzdelNelekarsky')}
                          onChange={e => setSearchQuery('vzdelNelekarsky', e.target.value)}
                        />
                        {getSearchQuery('vzdelNelekarsky') && (
                          <SearchClearButton onClick={() => setSearchQuery('vzdelNelekarsky', '')} title="Vymazat">
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {vzdelNelByUsekFin.length === 0 ? (
                        <EmptyState>Žádné objednávky typu Školení nezdravotnické</EmptyState>
                      ) : (() => {
                        const query = getSearchQuery('vzdelNelekarsky');
                        const filtered = query ? vzdelNelByUsekFin.filter(group => {
                          if (removeDiacritics(group.label).indexOf(removeDiacritics(query)) >= 0) return true;
                          const finArr = Object.values(group.financing || {});
                          for (let fi = 0; fi < finArr.length; fi++) {
                            if (removeDiacritics(finArr[fi].label).indexOf(removeDiacritics(query)) >= 0) return true;
                            for (let oi = 0; oi < finArr[fi].orders.length; oi++) {
                              if (searchInVisibleColumns(finArr[fi].orders[oi], query, 'vzdelNelekarsky')) return true;
                            }
                          }
                          return false;
                        }) : vzdelNelByUsekFin;
                        return (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <div
                                title="Rozbalit / sbalit vše"
                                onClick={() => {
                                  const allExp = filtered.length > 0 && filtered.every(g => expandedVzdelNelUsek.has(g.code));
                                  if (allExp) { setExpandedVzdelNelUsek(new Set()); setExpandedVzdelNelFin(new Set()); }
                                  else { setExpandedVzdelNelUsek(new Set(filtered.map(g => g.code))); }
                                }}
                                style={{ cursor: 'pointer', color: '#059669', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                              >
                                {filtered.length > 0 && filtered.every(g => expandedVzdelNelUsek.has(g.code)) ? '\u2212' : '+'}
                              </div>
                              <div>Úsek</div>
                              <div style={{ textAlign: 'right' }}>Počet</div>
                              <div style={{ textAlign: 'right' }}>Celkem</div>
                            </div>
                            {filtered.map(group => {
                              const grpOpen = expandedVzdelNelUsek.has(group.code);
                              const finArr = Object.values(group.financing).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                              return (
                                <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                  <div
                                    onClick={() => setExpandedVzdelNelUsek(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                    style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#d1fae5' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                  >
                                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#059669', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                    <span style={{ fontWeight: '700', color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(group.label || group.code, 'vzdelNelekarsky')}</span>
                                    <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                                    <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                                  </div>
                                  {grpOpen && (
                                    <TableWrapper style={{ margin: 0 }}>
                                      <Table>
                                        <thead>
                                          <tr>
                                            <Th
                                              style={{ width: '24px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontSize: '0.95rem', fontWeight: '900' }}
                                              title="Rozbalit / sbalit"
                                              onClick={e => {
                                                e.stopPropagation();
                                                const allOpen = finArr.length > 0 && finArr.every(fin => expandedVzdelNelFin.has(`vzdelNel_${group.code}_${fin.code}`));
                                                setExpandedVzdelNelFin(prev => {
                                                  const next = new Set(prev);
                                                  finArr.forEach(fin => {
                                                    const k = `vzdelNel_${group.code}_${fin.code}`;
                                                    if (allOpen) next.delete(k); else next.add(k);
                                                  });
                                                  return next;
                                                });
                                              }}
                                            >
                                              {finArr.length > 0 && finArr.every(fin => expandedVzdelNelFin.has(`vzdelNel_${group.code}_${fin.code}`)) ? '\u2212' : '+'}
                                            </Th>
                                            <Th>Financování</Th>
                                            <ThC>Počet</ThC>
                                            <ThR>Celkem</ThR>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {finArr.map(fin => {
                                            const detailKey = `vzdelNel_${group.code}_${fin.code}`;
                                            const finOpen = expandedVzdelNelFin.has(detailKey);
                                            const pagedDetail = getPagedItems(sortTableData(fin.orders, detailKey, spendOrderAcc), detailKey);
                                            return (
                                              <React.Fragment key={detailKey}>
                                                <Tr
                                                  onClick={() => setExpandedVzdelNelFin(prev => { const next = new Set(prev); if (next.has(detailKey)) next.delete(detailKey); else next.add(detailKey); return next; })}
                                                  style={{ cursor: 'pointer', background: finOpen ? '#f0f9ff' : undefined }}
                                                >
                                                  <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{finOpen ? '\u2212' : '+'}</Td>
                                                  <Td>{highlightText(fin.label, 'vzdelNelekarsky')}</Td>
                                                  <TdC>{fin.count}</TdC>
                                                  <TdR>{fmtCurrency(fin.amount)}</TdR>
                                                </Tr>
                                                {finOpen && (
                                                  <tr>
                                                    <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                      <TableWrapper style={{ margin: 0 }}>
                                                        <Table>
                                                          <thead>
                                                            <tr>
                                                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort(detailKey, 'ev_cislo')}>Číslo{sortIcon(detailKey, 'ev_cislo')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(detailKey, 'dt_obj')}>Dt. obj.{sortIcon(detailKey, 'dt_obj')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(detailKey, 'predmet')}>Předmět{sortIcon(detailKey, 'predmet')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(detailKey, 'objednatel')}>Objednatel{sortIcon(detailKey, 'objednatel')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(detailKey, 'schvalovatel')}>Schvalovatel{sortIcon(detailKey, 'schvalovatel')}</ThSort>
                                                              <ThNarrowSort onClick={() => handleTableSort(detailKey, 'usek')}>Úsek{sortIcon(detailKey, 'usek')}</ThNarrowSort>
                                                              <ThSort onClick={() => handleTableSort(detailKey, 'financovani')}>Financování{sortIcon(detailKey, 'financovani')}</ThSort>
                                                              <ThNarrowSort onClick={() => handleTableSort(detailKey, 'detail_fin')}>Detail fin.{sortIcon(detailKey, 'detail_fin')}</ThNarrowSort>
                                                              <ThNarrowSort onClick={() => handleTableSort(detailKey, 'stav')}>Stav{sortIcon(detailKey, 'stav')}</ThNarrowSort>
                                                              <ThC style={{ width: '70px' }}>Přílohy</ThC>
                                                              <ThRSort onClick={() => handleTableSort(detailKey, 'castka')}>Částka{sortIcon(detailKey, 'castka')}</ThRSort>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {pagedDetail.items.map(order => {
                                                              const invs = invoicesByOrderId[String(order.id)] || [];
                                                              const orderAttCnt = order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0;
                                                              const invAttCnt = invs.reduce((s, inv) => s + (inv.pocet_priloh ?? inv.prilohy_count ?? inv.prilohy?.length ?? 0), 0);
                                                              const invIds = invs.map(inv => inv.id).filter(Boolean);
                                                              return (
                                                              <Tr key={order.id}>
                                                                <Td>{renderOrderLink(order, 'vzdelNelekarsky')}</Td>
                                                                <Td>{highlightText(formatDateCz(getOrderDate(order)), 'vzdelNelekarsky')}</Td>
                                                                <SubjectTd>{highlightText(getOrderSubject(order), 'vzdelNelekarsky')}</SubjectTd>
                                                                <Td>{renderOrdererStack(order)}</Td>
                                                                <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                                <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'vzdelNelekarsky')}</TdNarrow>
                                                                <Td>{renderFinancingLabelCell(order, 'vzdelNelekarsky')}</Td>
                                                                <TdNarrow>{renderFinancingRefCell(order, 'vzdelNelekarsky')}</TdNarrow>
                                                                <TdNarrow>{highlightText(getOrderStatusLabel(order), 'vzdelNelekarsky')}</TdNarrow>
                                                                <TdC>{renderAttachBadge(order.id, 'order-combined', orderAttCnt + invAttCnt, invIds, order.attachment_color)}</TdC>
                                                                <TdR>
                                                                  {(() => {
                                                                    const faSum = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
                                                                    const polozkySum = getOrderPlannedAmount(order) || 0;
                                                                    const maxDph = getOrderLimit(order) || 0;
                                                                    let val, src;
                                                                    if (faSum > 0) { val = faSum; src = 'FA'; }
                                                                    else if (polozkySum > 0) { val = polozkySum; src = 'POL'; }
                                                                    else { val = maxDph; src = 'MAX'; }
                                                                    return (
                                                                      <span style={{ position: 'relative', display: 'inline-block' }}>
                                                                        <sup style={{ position: 'absolute', top: '-0.5em', left: '-1.6em', fontSize: '0.6em', fontWeight: 700, color: '#94a3b8', fontFamily: 'sans-serif', letterSpacing: '0.02em', lineHeight: 1 }}>{src}</sup>
                                                                        {highlightText(fmtCurrency(val), 'vzdelNelekarsky')}
                                                                      </span>
                                                                    );
                                                                  })()}
                                                                </TdR>
                                                              </Tr>
                                                              );
                                                            })}
                                                          </tbody>
                                                        </Table>
                                                      </TableWrapper>
                                                      {renderPagination(detailKey, pagedDetail)}
                                                    </td>
                                                  </tr>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                        </tbody>
                                      </Table>
                                    </TableWrapper>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </SectionCard>
                )}

                {/* Blok 3 – Strom Typ → Středisko → Úsek */}
                {isBlockVisible('vzdel', 'vzdelByUsek') && (
                  <SectionCard id="section-vzdelByUsek">
                    <SectionHeader>
                      <SectionTitle>Přehled vzdělávání dle střediska / úseku</SectionTitle>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allSKeysB3 = []; const allUKeysB3 = [];
                            vzdelByTypStredisko.forEach(t => { t.strediska.forEach(s => { allSKeysB3.push(`${t.key}::${s.code}`); Object.values(s.byUsek).forEach(u => allUKeysB3.push(`${t.key}::${s.code}::${u.code}`)); }); });
                            const allB3Exp = vzdelByTypStredisko.length > 0 && vzdelByTypStredisko.every(t => expandedVzdelByTyp.has(t.key)) && allSKeysB3.every(k => expandedVzdelByUsek.has(k)) && allUKeysB3.every(k => expandedVzdelUsek.has(k));
                            if (allB3Exp) {
                              setExpandedVzdelByTyp(new Set());
                              setExpandedVzdelByUsek(new Set());
                              setExpandedVzdelUsek(new Set());
                            } else {
                              setExpandedVzdelByTyp(new Set(vzdelByTypStredisko.map(t => t.key)));
                              setExpandedVzdelByUsek(new Set(allSKeysB3));
                              setExpandedVzdelUsek(new Set(allUKeysB3));
                            }
                          }}
                        >
                          <FontAwesomeIcon icon={vzdelByTypStredisko.length > 0 && vzdelByTypStredisko.every(t => expandedVzdelByTyp.has(t.key)) && vzdelByTypStredisko.every(t => t.strediska.every(s => expandedVzdelByUsek.has(`${t.key}::${s.code}`) && Object.values(s.byUsek).every(u => expandedVzdelUsek.has(`${t.key}::${s.code}::${u.code}`)))) ? faMinus : faPlus} />
                          {vzdelByTypStredisko.length > 0 && vzdelByTypStredisko.every(t => expandedVzdelByTyp.has(t.key)) && vzdelByTypStredisko.every(t => t.strediska.every(s => expandedVzdelByUsek.has(`${t.key}::${s.code}`) && Object.values(s.byUsek).every(u => expandedVzdelUsek.has(`${t.key}::${s.code}::${u.code}`)))) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <span style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 0.1rem' }} />
                        <SectionBadge $tone="warn">{vzdelByTypStredisko.reduce((s, t) => s + t.totalCount, 0)} obj.</SectionBadge>
                        <SectionBadge $tone="info">{vzdelByTypStredisko.reduce((s, t) => s + t.strediska.length, 0)} středisek</SectionBadge>
                        <SectionBadge $tone="neutral" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{fmtCurrency(vzdelLekarskyTotal + vzdelNelekarskyTotal)}</SectionBadge>
                        <button onClick={handleExportCsv_vzdelByUsek} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon><FontAwesomeIcon icon={faSearch} /></SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání..."
                          value={getSearchQuery('vzdelByUsek')}
                          onChange={e => setSearchQuery('vzdelByUsek', e.target.value)}
                        />
                        {getSearchQuery('vzdelByUsek') && (
                          <SearchClearButton onClick={() => setSearchQuery('vzdelByUsek', '')} title="Vymazat">
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {vzdelByTypStredisko.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          {/* Záhlaví sloupců */}
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 180px 190px', gap: '0.75rem', padding: '0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div /><div>Typ / Středisko / Úsek</div>
                            <div style={{ textAlign: 'right' }}>Počet</div>
                            <div style={{ textAlign: 'right' }}>Celkem</div>
                          </div>
                          {vzdelByTypStredisko.map(typGroup => {
                            const typOpen = expandedVzdelByTyp.has(typGroup.key);
                            const typColor = typGroup.key === 'lekarsky' ? { bg: '#eff6ff', bgOpen: '#dbeafe', border: '#bfdbfe', text: '#1e3a8a', icon: '#1d4ed8' } : { bg: '#f0fdf4', bgOpen: '#dcfce7', border: '#bbf7d0', text: '#14532d', icon: '#059669' };
                            return (
                              <div key={typGroup.key} style={{ border: `1px solid ${typColor.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                                {/* Level 1: Typ školení */}
                                <div
                                  onClick={() => setExpandedVzdelByTyp(prev => { const n = new Set(prev); if (n.has(typGroup.key)) n.delete(typGroup.key); else n.add(typGroup.key); return n; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 180px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 1rem', background: typOpen ? typColor.bgOpen : typColor.bg, cursor: 'pointer', userSelect: 'none', borderBottom: typOpen ? `1px solid ${typColor.border}` : 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '800', color: typColor.icon, textAlign: 'center', lineHeight: 1 }}>{typOpen ? '\u2212' : '+'}</span>
                                  <span style={{ fontWeight: '800', color: typColor.text, fontSize: '0.9rem' }}>{typGroup.label}</span>
                                  <SectionBadge $tone={typGroup.tone} style={{ textAlign: 'right', justifySelf: 'end', whiteSpace: 'nowrap' }}>
                                    {typGroup.totalCount} obj. / {typGroup.totalCompleted || 0} dokončena
                                  </SectionBadge>
                                  <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#1e293b', textAlign: 'right', fontWeight: '700' }}>{fmtCurrency(typGroup.totalAmount)}</span>
                                </div>
                                {typOpen && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem 0.5rem 0.5rem 1.25rem', background: '#f8fafc' }}>
                                    {typGroup.strediska.map(sGroup => {
                                      const sKey = `${typGroup.key}::${sGroup.code}`;
                                      const sOpen = expandedVzdelByUsek.has(sKey);
                                      return (
                                        <div key={sKey} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                          {/* Level 2: Středisko */}
                                          <div
                                            onClick={() => setExpandedVzdelByUsek(prev => { const n = new Set(prev); if (n.has(sKey)) n.delete(sKey); else n.add(sKey); return n; })}
                                            style={{ display: 'grid', gridTemplateColumns: '16px 1fr 180px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.65rem 0.75rem', background: sOpen ? '#eff6ff' : '#f8fafc', cursor: 'pointer', userSelect: 'none', borderBottom: sOpen ? '1px solid #bfdbfe' : 'none' }}
                                          >
                                            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1d4ed8', textAlign: 'center', lineHeight: 1 }}>{sOpen ? '\u2212' : '+'}</span>
                                            <span style={{ fontWeight: '700', color: '#1e3a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.86rem' }}>🏢 {sGroup.label || sGroup.code}</span>
                                            <SectionBadge $tone="info" style={{ textAlign: 'right', justifySelf: 'end', whiteSpace: 'nowrap' }}>
                                              {sGroup.totalCount} obj. / {sGroup.completedCount || 0} dokončena
                                            </SectionBadge>
                                            <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(sGroup.totalAmount)}</span>
                                          </div>
                                          {sOpen && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.4rem 0.4rem 0.4rem 1.25rem', background: '#f8fafc' }}>
                                              {Object.values(sGroup.byUsek)
                                                .sort((a, b) => (a.label || a.code).localeCompare(b.label || b.code, 'cs-CZ'))
                                                .map(uGroup => {
                                                  const uKey = `${typGroup.key}::${sGroup.code}::${uGroup.code}`;
                                                  const detailKey = `vzdelUsek_${typGroup.key}_${sGroup.code}_${uGroup.code}`;
                                                  const uOpen = expandedVzdelUsek.has(uKey);
                                                  const pagedDetail = getPagedItems(
                                                    sortTableData(uGroup.orders, detailKey, {
                                                      ev_cislo:    o => o.ev_cislo || o.cislo_objednavky || '',
                                                      dt_dorucena: o => (invoicesByOrderId[String(o.id)] || [])[0]?.datum_doruceni || '',
                                                      splatnost:   o => (invoicesByOrderId[String(o.id)] || [])[0]?.datum_splatnosti || '',
                                                      castka:      o => { const invs = invoicesByOrderId[String(o.id)] || []; const fa = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0); const pol = getOrderPlannedAmount(o) || 0; const mx = getOrderLimit(o) || 0; return fa > 0 ? fa : pol > 0 ? pol : mx; },
                                                      financovani: o => getOrderFinancingLabel(o),
                                                      detail_fin:  o => getOrderFinancingRef(o),
                                                      druh:        o => getOrderTypeLabel(o),
                                                      stav_obj:    o => getOrderStatusLabel(o),
                                                      stav_fa:     o => getInvoiceStatusLabel((invoicesByOrderId[String(o.id)] || [])[0]) || '',
                                                    }),
                                                    detailKey
                                                  );
                                                  return (
                                                    <div key={uKey} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                                      {/* Level 3: Úsek */}
                                                      <div
                                                        onClick={() => setExpandedVzdelUsek(prev => { const n = new Set(prev); if (n.has(uKey)) n.delete(uKey); else n.add(uKey); return n; })}
                                                        style={{ display: 'grid', gridTemplateColumns: '16px 1fr 180px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.5rem 0.65rem', background: uOpen ? '#f0fdf4' : '#fff', cursor: 'pointer', userSelect: 'none' }}
                                                      >
                                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669', textAlign: 'center', lineHeight: 1 }}>{uOpen ? '\u2212' : '+'}</span>
                                                        <span style={{ fontWeight: '600', color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.83rem' }}>{uGroup.label || uGroup.code}</span>
                                                        <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end', whiteSpace: 'nowrap' }}>
                                                          {uGroup.count} obj. / {uGroup.completedCount || 0} dokončena
                                                        </SectionBadge>
                                                        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(uGroup.amount)}</span>
                                                      </div>
                                                      {uOpen && (
                                                        <div style={{ padding: '0.5rem 0.5rem 0.75rem 0.75rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                          <TableWrapper style={{ margin: 0 }}>
                                                            <Table>
                                                              <thead>
                                                                <tr>
                                                                  <ThSort onClick={() => handleTableSort(detailKey, 'ev_cislo')}>Číslo{sortIcon(detailKey, 'ev_cislo')}</ThSort>
                                                                  <ThNarrowSort onClick={() => handleTableSort(detailKey, 'dt_obj')}>Dt. obj.{sortIcon(detailKey, 'dt_obj')}</ThNarrowSort>
                                                                  <ThSort onClick={() => handleTableSort(detailKey, 'predmet')}>Předmět{sortIcon(detailKey, 'predmet')}</ThSort>
                                                                  <ThSort onClick={() => handleTableSort(detailKey, 'objednatel')}>Objednatel{sortIcon(detailKey, 'objednatel')}</ThSort>
                                                                  <ThSort onClick={() => handleTableSort(detailKey, 'schvalovatel')}>Schvalovatel{sortIcon(detailKey, 'schvalovatel')}</ThSort>
                                                                  <ThNarrowSort onClick={() => handleTableSort(detailKey, 'usek')}>Úsek{sortIcon(detailKey, 'usek')}</ThNarrowSort>
                                                                  <ThSort onClick={() => handleTableSort(detailKey, 'financovani')}>Financování{sortIcon(detailKey, 'financovani')}</ThSort>
                                                                  <ThNarrowSort onClick={() => handleTableSort(detailKey, 'detail_fin')}>Detail fin.{sortIcon(detailKey, 'detail_fin')}</ThNarrowSort>
                                                                  <ThNarrowSort onClick={() => handleTableSort(detailKey, 'druh')}>Druh{sortIcon(detailKey, 'druh')}</ThNarrowSort>
                                                                  <ThNarrowSort onClick={() => handleTableSort(detailKey, 'stav')}>Stav{sortIcon(detailKey, 'stav')}</ThNarrowSort>
                                                                  <ThC style={{ width: '70px' }}>Přílohy</ThC>
                                                                  <ThRSort onClick={() => handleTableSort(detailKey, 'castka')}>Částka{sortIcon(detailKey, 'castka')}</ThRSort>
                                                                </tr>
                                                              </thead>
                                                              <tbody>
                                                                {pagedDetail.items.map(order => {
                                                                  const invs = invoicesByOrderId[String(order.id)] || [];
                                                                  const orderAttCnt = order.pocet_priloh ?? order.prilohy_count ?? order.prilohy?.length ?? 0;
                                                                  const invAttCnt = invs.reduce((s, inv) => s + (inv.pocet_priloh ?? inv.prilohy_count ?? inv.prilohy?.length ?? 0), 0);
                                                                  const invIds = invs.map(inv => inv.id).filter(Boolean);
                                                                  return (
                                                                  <Tr key={order.id}>
                                                                    <Td>{renderOrderLink(order, detailKey)}</Td>
                                                                    <Td>{highlightText(formatDateCz(getOrderDate(order)), detailKey)}</Td>
                                                                    <SubjectTd>{highlightText(getOrderSubject(order), detailKey)}</SubjectTd>
                                                                    <Td>{renderOrdererStack(order)}</Td>
                                                                    <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                                    <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', detailKey)}</TdNarrow>
                                                                    <Td>{renderFinancingLabelCell(order, detailKey)}</Td>
                                                                    <TdNarrow>{renderFinancingRefCell(order, detailKey)}</TdNarrow>
                                                                    <TdNarrow>{highlightText(getOrderStatusLabel(order), detailKey)}</TdNarrow>
                                                                    <TdC>{renderAttachBadge(order.id, 'order-combined', orderAttCnt + invAttCnt, invIds, order.attachment_color)}</TdC>
                                                                    <TdR>
                                                                      {(() => {
                                                                        const faSum = invs.reduce((s, inv) => s + getInvoiceAmount(inv), 0);
                                                                        const polozkySum = getOrderPlannedAmount(order) || 0;
                                                                        const maxDph = getOrderLimit(order) || 0;
                                                                        let val, src;
                                                                        if (faSum > 0) { val = faSum; src = 'FA'; }
                                                                        else if (polozkySum > 0) { val = polozkySum; src = 'POL'; }
                                                                        else { val = maxDph; src = 'MAX'; }
                                                                        return (
                                                                          <span style={{ position: 'relative', display: 'inline-block' }}>
                                                                            <sup style={{ position: 'absolute', top: '-0.5em', left: '-1.6em', fontSize: '0.6em', fontWeight: 700, color: '#94a3b8', fontFamily: 'sans-serif', letterSpacing: '0.02em', lineHeight: 1 }}>{src}</sup>
                                                                            {highlightText(fmtCurrency(val), detailKey)}
                                                                          </span>
                                                                        );
                                                                      })()}
                                                                    </TdR>
                                                                  </Tr>
                                                                  );
                                                                })}
                                                              </tbody>
                                                            </Table>
                                                          </TableWrapper>
                                                          {renderPagination(detailKey, pagedDetail)}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {activeTab === 'spend' && (
              <>
                {isBlockVisible('spend', 'spendByFinancingUsek') && (
                  <SectionCard id="section-spendByFinancingUsek">
                    <SectionHeader>
                      <SectionTitle>Přehled čerpání po financování a úsecích</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allExp = filteredSpendByFinancingGroups.length > 0 && filteredSpendByFinancingGroups.every(g => expandedSpendFinancing.has(g.code));
                            if (allExp) { setExpandedSpendFinancing(new Set()); setExpandedSpendUseks(new Set()); }
                            else { setExpandedSpendFinancing(new Set(filteredSpendByFinancingGroups.map(g => g.code))); }
                          }}
                          title="Rozbalit / sbalit všechny skupiny"
                        >
                          <FontAwesomeIcon icon={filteredSpendByFinancingGroups.length > 0 && filteredSpendByFinancingGroups.every(g => expandedSpendFinancing.has(g.code)) ? faMinus : faPlus} />
                          {filteredSpendByFinancingGroups.length > 0 && filteredSpendByFinancingGroups.every(g => expandedSpendFinancing.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <SectionBadge $tone="warn">{filteredSpendByFinancingGroups.length} typů</SectionBadge>
                        <button onClick={handleExportCsv_spendByFinancingUsek} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon>
                          <FontAwesomeIcon icon={faSearch} />
                        </SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (v názvech financování, úseků, detailech objednávek)..."
                          value={getSearchQuery('spendByFinancingUsek')}
                          onChange={(e) => setSearchQuery('spendByFinancingUsek', e.target.value)}
                        />
                        {getSearchQuery('spendByFinancingUsek') && (
                          <SearchClearButton
                            onClick={() => setSearchQuery('spendByFinancingUsek', '')}
                            title="Vymazat vyhledávání"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {filteredSpendByFinancingGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          {/* Záhlaví soupce */}
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div
                              title={filteredSpendByFinancingGroups.length > 0 && filteredSpendByFinancingGroups.every(g => expandedSpendFinancing.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                              onClick={() => {
                                const allExp = filteredSpendByFinancingGroups.length > 0 && filteredSpendByFinancingGroups.every(g => expandedSpendFinancing.has(g.code));
                                if (allExp) { setExpandedSpendFinancing(new Set()); setExpandedSpendUseks(new Set()); }
                                else { setExpandedSpendFinancing(new Set(filteredSpendByFinancingGroups.map(g => g.code))); }
                              }}
                              style={{ cursor: 'pointer', color: '#3b82f6', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                            >
                              {filteredSpendByFinancingGroups.length > 0 && filteredSpendByFinancingGroups.every(g => expandedSpendFinancing.has(g.code)) ? '\u2212' : '+'}
                            </div>
                            <div onClick={() => handleTableSort('spendGrp_fin', 'label')} style={{ cursor: 'pointer' }}>Financování{sortIcon('spendGrp_fin', 'label')}</div>
                            <div onClick={() => handleTableSort('spendGrp_fin', 'count')} style={{ cursor: 'pointer', textAlign: 'right' }}>Počet{sortIcon('spendGrp_fin', 'count')}</div>
                            <div onClick={() => handleTableSort('spendGrp_fin', 'amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Celkem{sortIcon('spendGrp_fin', 'amount')}</div>
                          </div>
                          {sortTableData(filteredSpendByFinancingGroups, 'spendGrp_fin', { label: g => g.label || g.code || '', count: g => String(g.totalCount || 0), amount: g => String(g.totalAmount || 0) }).map(group => {
                          const finOpen = expandedSpendFinancing.has(group.code);
                          const usekyArr = Object.values(group.useky).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                          return (
                          <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            <div
                              onClick={() => setExpandedSpendFinancing(prev => {
                                const next = new Set(prev);
                                if (next.has(group.code)) next.delete(group.code); else next.add(group.code);
                                return next;
                              })}
                              style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: finOpen ? '#eff6ff' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                            >
                              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#3b82f6', lineHeight: 1, textAlign: 'center' }}>{finOpen ? '\u2212' : '+'}</span>
                              <span style={{ fontWeight: '700', color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(group.label, 'spendByFinancingUsek')}</span>
                              <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                              <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                            </div>
                            {finOpen && (
                              <TableWrapper style={{ margin: 0 }}>
                                <Table>
                                  <thead>
                                    <tr>
                                      <Th
                                        style={{ width: '24px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontSize: '0.95rem', fontWeight: '900' }}
                                        title={usekyArr.length > 0 && usekyArr.every(usek => expandedSpendUseks.has(`spendDetail_${group.code}_${usek.code}`)) ? 'Sbalit vše' : 'Rozbalit vše'}
                                        onClick={e => {
                                          e.stopPropagation();
                                          const allOpen = usekyArr.length > 0 && usekyArr.every(usek => expandedSpendUseks.has(`spendDetail_${group.code}_${usek.code}`));
                                          setExpandedSpendUseks(prev => {
                                            const next = new Set(prev);
                                            usekyArr.forEach(usek => {
                                              const k = `spendDetail_${group.code}_${usek.code}`;
                                              if (allOpen) next.delete(k); else next.add(k);
                                            });
                                            return next;
                                          });
                                        }}
                                      >
                                        {usekyArr.length > 0 && usekyArr.every(usek => expandedSpendUseks.has(`spendDetail_${group.code}_${usek.code}`)) ? '\u2212' : '+'}
                                      </Th>
                                      <Th>Úsek</Th>
                                      <ThC>Počet</ThC>
                                      <ThR>Celkem</ThR>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {usekyArr.map(usek => {
                                      const detailKey = `spendDetail_${group.code}_${usek.code}`;
                                      const usekOpen = expandedSpendUseks.has(detailKey);
                                      const pagedDetail = getPagedItems(sortTableData(usek.orders, detailKey, spendOrderAcc), detailKey);
                                      return (
                                        <React.Fragment key={`${group.code}_${usek.code}`}>
                                          <Tr
                                            onClick={() => setExpandedSpendUseks(prev => {
                                              const next = new Set(prev);
                                              if (next.has(detailKey)) next.delete(detailKey); else next.add(detailKey);
                                              return next;
                                            })}
                                            style={{ cursor: 'pointer', background: usekOpen ? '#f0f9ff' : undefined }}
                                          >
                                            <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>
                                              {usekOpen ? '\u2212' : '+'}
                                            </Td>
                                            <Td>{highlightText(usek.label, 'spendByFinancingUsek')}</Td>
                                            <TdC>{usek.count}</TdC>
                                            <TdR>{fmtCurrency(usek.amount)}</TdR>
                                          </Tr>
                                          {usekOpen && (
                                            <tr>
                                              <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                <TableWrapper style={{ margin: 0 }}>
                                                  <Table>
                                                    <thead>
                                                      <tr>
                                                        <ThSort onClick={() => handleTableSort(detailKey, 'ev_cislo')}>Číslo{sortIcon(detailKey, 'ev_cislo')}</ThSort>
                                                        <ThSort onClick={() => handleTableSort(detailKey, 'dt_obj')}>Dt. obj.{sortIcon(detailKey, 'dt_obj')}</ThSort>
                                                        <ThSort onClick={() => handleTableSort(detailKey, 'predmet')}>Předmět{sortIcon(detailKey, 'predmet')}</ThSort>
                                                        <ThSort onClick={() => handleTableSort(detailKey, 'objednatel')}>Objednatel{sortIcon(detailKey, 'objednatel')}</ThSort>
                                                        <ThSort onClick={() => handleTableSort(detailKey, 'schvalovatel')}>Schvalovatel{sortIcon(detailKey, 'schvalovatel')}</ThSort>
                                                        <ThNarrowSort onClick={() => handleTableSort(detailKey, 'usek')}>Úsek{sortIcon(detailKey, 'usek')}</ThNarrowSort>
                                                        <ThSort onClick={() => handleTableSort(detailKey, 'financovani')}>Financování{sortIcon(detailKey, 'financovani')}</ThSort>
                                                        <ThNarrowSort onClick={() => handleTableSort(detailKey, 'detail_fin')}>{group.code === 'LP' ? 'LP kód' : group.code === 'SMLOUVA' ? 'Č. smlouvy' : group.code === 'INDIVIDUALNI_SCHVALENI' ? 'Č. schválení' : group.code === 'POJISTNA_UDALOST' ? 'Č. poj. ud.' : 'Ref.'}{sortIcon(detailKey, 'detail_fin')}</ThNarrowSort>
                                                        <ThNarrowSort onClick={() => handleTableSort(detailKey, 'druh')}>Druh{sortIcon(detailKey, 'druh')}</ThNarrowSort>
                                                        <ThNarrowSort onClick={() => handleTableSort(detailKey, 'stav')}>Stav{sortIcon(detailKey, 'stav')}</ThNarrowSort>
                                                        <ThRSort onClick={() => handleTableSort(detailKey, 'castka')}>Částka{sortIcon(detailKey, 'castka')}</ThRSort>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {pagedDetail.items.map(order => (
                                                        <Tr key={order.id}>
                                                          <Td>{renderOrderLink(order, 'spendByFinancingUsek')}</Td>
                                                          <Td>{highlightText(formatDateCz(getOrderDate(order)), 'spendByFinancingUsek')}</Td>
                                                          <SubjectTd>{highlightText(getOrderSubject(order), 'spendByFinancingUsek')}</SubjectTd>
                                                          <Td>{renderOrdererStack(order)}</Td>
                                                          <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                          <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'spendByFinancingUsek')}</TdNarrow>
                                                          <Td>{renderFinancingLabelCell(order, 'spendByFinancingUsek')}</Td>
                                                          <TdNarrow>{renderFinancingRefCell(order, 'spendByFinancingUsek')}</TdNarrow>
                                                          <TdNarrow>{highlightText(getOrderTypeLabel(order), 'spendByFinancingUsek')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                                          <TdNarrow>{highlightText(getOrderStatusLabel(order), 'spendByFinancingUsek')}</TdNarrow>
                                                          <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'spendByFinancingUsek')}</TdR>
                                                        </Tr>
                                                      ))}
                                                    </tbody>
                                                  </Table>
                                                </TableWrapper>
                                                {renderPagination(detailKey, pagedDetail)}
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </Table>
                              </TableWrapper>
                            )}
                          </div>
                        );
                      })}
                          {/* POKLADNA – inline řádek, stejný styl jako ostatní typy financování */}
                          {cashbookBooksToRender.length > 0 && (() => {
                            const pokladnaOpen = expandedSpendFinancing.has('__pokladna__');
                            const totalVydaje = cashbookData?.summary?.celkem_vydaje || 0;
                            const totalPocet = cashbookData?.summary?.celkem_zaznamu || 0;
                            return (
                              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendFinancing(prev => {
                                    const next = new Set(prev);
                                    if (next.has('__pokladna__')) next.delete('__pokladna__'); else next.add('__pokladna__');
                                    return next;
                                  })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: pokladnaOpen ? '#eff6ff' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#3b82f6', lineHeight: 1, textAlign: 'center' }}>{pokladnaOpen ? '\u2212' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    Pokladna
                                  </span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{totalPocet} op.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(totalVydaje)}</span>
                                </div>
                                {pokladnaOpen && (
                                  <TableWrapper style={{ margin: 0 }}>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <Th style={{ width: '24px', textAlign: 'center' }} />
                                          <Th>Pokladna</Th>
                                          <ThC>Operací</ThC>
                                          <ThR style={{ color: '#b91c1c' }}>Výdaje</ThR>
                                          <ThR style={{ color: '#15803d' }}>Příjmy</ThR>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cashbookBooksToRender.map(book => {
                                          const bookKey = `spendPok_${book.mesic ? `m_${book.kniha_id}` : `y_${book.pokladna_id}`}`;
                                          const bookOpen = expandedSpendUseks.has(bookKey);
                                          const bookEntries = book.mesic
                                            ? cashbookEntries[book.kniha_id]
                                            : (book.mesice || []).flatMap(m => cashbookEntries[m.kniha_id] || []);
                                          const nazev = book.pokladna_nazev || `Pokladna ${book.cislo_pokladny}`;
                                          return (
                                            <React.Fragment key={bookKey}>
                                              <Tr
                                                onClick={() => {
                                                  setExpandedSpendUseks(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(bookKey)) next.delete(bookKey);
                                                    else {
                                                      next.add(bookKey);
                                                      if (book.mesic && book.kniha_id && !cashbookEntries[book.kniha_id]) loadCashbookEntries(book.kniha_id);
                                                      else if (!book.mesic && book.mesice) book.mesice.forEach(m => { if (m.kniha_id && !cashbookEntries[m.kniha_id]) loadCashbookEntries(m.kniha_id); });
                                                    }
                                                    return next;
                                                  });
                                                }}
                                                style={{ cursor: 'pointer', background: bookOpen ? '#f0f9ff' : undefined }}
                                              >
                                                <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{bookOpen ? '\u2212' : '+'}</Td>
                                                <Td>
                                                  {nazev}
                                                  {book.hlavni_uzivatel && <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.4rem' }}>({book.hlavni_uzivatel})</span>}
                                                </Td>
                                                <TdC>{book.pocet_zaznamu || 0}</TdC>
                                                <TdR style={{ color: '#b91c1c' }}>{fmtCurrency(book.celkove_vydaje || 0)}</TdR>
                                                <TdR style={{ color: '#15803d' }}>{fmtCurrency(book.celkove_prijmy || 0)}</TdR>
                                              </Tr>
                                              {bookOpen && (
                                                <tr>
                                                  <td colSpan={5} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    {bookEntries === undefined ? (
                                                      <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#a8a29e', fontStyle: 'italic' }}>Načítám položky...</div>
                                                    ) : !Array.isArray(bookEntries) || bookEntries.length === 0 ? (
                                                      <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Žádné záznamy</div>
                                                    ) : (
                                                      <TableWrapper style={{ margin: 0 }}>
                                                        <Table>
                                                          <thead>
                                                            <tr>
                                                              <Th style={{ width: '90px' }}>Datum</Th>
                                                              <Th style={{ width: '100px' }}>Č. dokladu</Th>
                                                              <Th>Obsah zápisu</Th>
                                                              <Th style={{ width: '130px' }}>Komu / Od koho</Th>
                                                              <ThR style={{ color: '#b91c1c', width: '100px' }}>Výdaj</ThR>
                                                              <ThR style={{ color: '#15803d', width: '100px' }}>Příjem</ThR>
                                                              <Th style={{ width: '100px' }}>LP kód</Th>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {bookEntries.map((entry, idx) => (
                                                              <Tr key={entry.id || idx} style={{ fontSize: '0.8rem' }}>
                                                                <Td>{entry.datum_zapisu ? new Date(entry.datum_zapisu).toLocaleDateString('cs-CZ') : '-'}</Td>
                                                                <Td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{entry.cislo_dokladu || '-'}</Td>
                                                                <Td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.obsah_zapisu || '-'}</Td>
                                                                <Td style={{ fontSize: '0.75rem' }}>{entry.komu_od_koho || '-'}</Td>
                                                                <TdR style={{ color: entry.castka_vydaj > 0 ? '#b91c1c' : '#94a3b8', fontWeight: entry.castka_vydaj > 0 ? '600' : 'normal' }}>
                                                                  {entry.castka_vydaj > 0 ? fmtCurrency(entry.castka_vydaj) : '-'}
                                                                </TdR>
                                                                <TdR style={{ color: entry.castka_prijem > 0 ? '#15803d' : '#94a3b8', fontWeight: entry.castka_prijem > 0 ? '600' : 'normal' }}>
                                                                  {entry.castka_prijem > 0 ? fmtCurrency(entry.castka_prijem) : '-'}
                                                                </TdR>
                                                                <Td style={{ fontSize: '0.75rem' }}>
                                                                  {entry.detail_items?.length > 0
                                                                    ? entry.detail_items.map((item, ii) => <div key={ii}>{item.lp_kod} ({fmtCurrency(item.castka)})</div>)
                                                                    : entry.lp_kod || '-'}
                                                                </Td>
                                                              </Tr>
                                                            ))}
                                                          </tbody>
                                                        </Table>
                                                      </TableWrapper>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </Table>
                                  </TableWrapper>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* === ÚSEK → FINANCOVÁNÍ === */}
                {isBlockVisible('spend', 'spendByUsekFinancing') && (
                  <SectionCard id="section-spendByUsekFinancing">
                    <SectionHeader>
                      <SectionTitle>Přehled čerpání po úsecích a financování</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allExp = filteredSpendByUsekGroups.length > 0 && filteredSpendByUsekGroups.every(g => expandedSpendUsekF.has(g.code));
                            if (allExp) { setExpandedSpendUsekF(new Set()); setExpandedSpendUsekFSub(new Set()); }
                            else { setExpandedSpendUsekF(new Set(filteredSpendByUsekGroups.map(g => g.code))); }
                          }}
                          title="Rozbalit / sbalit všechny skupiny"
                        >
                          <FontAwesomeIcon icon={filteredSpendByUsekGroups.length > 0 && filteredSpendByUsekGroups.every(g => expandedSpendUsekF.has(g.code)) ? faMinus : faPlus} />
                          {filteredSpendByUsekGroups.length > 0 && filteredSpendByUsekGroups.every(g => expandedSpendUsekF.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <SectionBadge $tone="warn">{filteredSpendByUsekGroups.length} úseků</SectionBadge>
                        <button onClick={handleExportCsv_spendByUsekFinancing} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon>
                          <FontAwesomeIcon icon={faSearch} />
                        </SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (v názvech úseků, financování, detailech objednávek)..."
                          value={getSearchQuery('spendByUsekFinancing')}
                          onChange={(e) => setSearchQuery('spendByUsekFinancing', e.target.value)}
                        />
                        {getSearchQuery('spendByUsekFinancing') && (
                          <SearchClearButton
                            onClick={() => setSearchQuery('spendByUsekFinancing', '')}
                            title="Vymazat vyhledávání"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {filteredSpendByUsekGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div
                              title={filteredSpendByUsekGroups.length > 0 && filteredSpendByUsekGroups.every(g => expandedSpendUsekF.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                              onClick={() => {
                                const allExp = filteredSpendByUsekGroups.length > 0 && filteredSpendByUsekGroups.every(g => expandedSpendUsekF.has(g.code));
                                if (allExp) { setExpandedSpendUsekF(new Set()); setExpandedSpendUsekFSub(new Set()); }
                                else { setExpandedSpendUsekF(new Set(filteredSpendByUsekGroups.map(g => g.code))); }
                              }}
                              style={{ cursor: 'pointer', color: '#16a34a', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                            >
                              {filteredSpendByUsekGroups.length > 0 && filteredSpendByUsekGroups.every(g => expandedSpendUsekF.has(g.code)) ? '\u2212' : '+'}
                            </div>
                            <div onClick={() => handleTableSort('spendGrp_usek', 'label')} style={{ cursor: 'pointer' }}>Úsek{sortIcon('spendGrp_usek', 'label')}</div>
                            <div onClick={() => handleTableSort('spendGrp_usek', 'count')} style={{ cursor: 'pointer', textAlign: 'right' }}>Počet{sortIcon('spendGrp_usek', 'count')}</div>
                            <div onClick={() => handleTableSort('spendGrp_usek', 'amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Celkem{sortIcon('spendGrp_usek', 'amount')}</div>
                          </div>
                          {sortTableData(filteredSpendByUsekGroups, 'spendGrp_usek', { label: g => g.label || g.code || '', count: g => String(g.totalCount || 0), amount: g => String(g.totalAmount || 0) }).map(group => {
                            const grpOpen = expandedSpendUsekF.has(group.code);
                            const finArr = Object.values(group.financing).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                            return (
                              <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendUsekF(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#16a34a', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(group.label, 'spendByUsekFinancing')}</span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                                </div>
                                {grpOpen && (
                                  <TableWrapper style={{ margin: 0 }}>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <Th
                                            style={{ width: '24px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontSize: '0.95rem', fontWeight: '900' }}
                                            title={finArr.length > 0 && finArr.every(fin => expandedSpendUsekFSub.has(`spendUFDetail_${group.code}_${fin.code}`)) ? 'Sbalit vše' : 'Rozbalit vše'}
                                            onClick={e => {
                                              e.stopPropagation();
                                              const allOpen = finArr.length > 0 && finArr.every(fin => expandedSpendUsekFSub.has(`spendUFDetail_${group.code}_${fin.code}`));
                                              setExpandedSpendUsekFSub(prev => {
                                                const next = new Set(prev);
                                                finArr.forEach(fin => {
                                                  const k = `spendUFDetail_${group.code}_${fin.code}`;
                                                  if (allOpen) next.delete(k); else next.add(k);
                                                });
                                                return next;
                                              });
                                            }}
                                          >
                                            {finArr.length > 0 && finArr.every(fin => expandedSpendUsekFSub.has(`spendUFDetail_${group.code}_${fin.code}`)) ? '\u2212' : '+'}
                                          </Th>
                                          <Th>Financování</Th>
                                          <ThC>Počet</ThC>
                                          <ThR>Celkem</ThR>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {finArr.map(fin => {
                                          const detailKey = `spendUFDetail_${group.code}_${fin.code}`;
                                          const finOpen = expandedSpendUsekFSub.has(detailKey);
                                          const pagedDetail = getPagedItems(sortTableData(fin.orders, detailKey, spendOrderAcc), detailKey);
                                          return (
                                            <React.Fragment key={`${group.code}_${fin.code}`}>
                                              <Tr
                                                onClick={() => setExpandedSpendUsekFSub(prev => { const next = new Set(prev); if (next.has(detailKey)) next.delete(detailKey); else next.add(detailKey); return next; })}
                                                style={{ cursor: 'pointer', background: finOpen ? '#f0f9ff' : undefined }}
                                              >
                                                <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{finOpen ? '\u2212' : '+'}</Td>
                                                <Td>{highlightText(fin.label, 'spendByUsekFinancing')}</Td>
                                                <TdC>{fin.count}</TdC>
                                                <TdR>{fmtCurrency(fin.amount)}</TdR>
                                              </Tr>
                                              {finOpen && (
                                                <tr>
                                                  <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <TableWrapper style={{ margin: 0 }}>
                                                      <Table>
                                                        <thead>
                                                          <tr>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'ev_cislo')}>Číslo{sortIcon(detailKey, 'ev_cislo')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'dt_obj')}>Dt. obj.{sortIcon(detailKey, 'dt_obj')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'predmet')}>Předmět{sortIcon(detailKey, 'predmet')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'objednatel')}>Objednatel{sortIcon(detailKey, 'objednatel')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'schvalovatel')}>Schvalovatel{sortIcon(detailKey, 'schvalovatel')}</ThSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'usek')}>Úsek{sortIcon(detailKey, 'usek')}</ThNarrowSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'financovani')}>Financování{sortIcon(detailKey, 'financovani')}</ThSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'detail_fin')}>Detail fin.{sortIcon(detailKey, 'detail_fin')}</ThNarrowSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'druh')}>Druh{sortIcon(detailKey, 'druh')}</ThNarrowSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'stav')}>Stav{sortIcon(detailKey, 'stav')}</ThNarrowSort>
                                                            <ThRSort onClick={() => handleTableSort(detailKey, 'castka')}>Částka{sortIcon(detailKey, 'castka')}</ThRSort>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {pagedDetail.items.map(order => (
                                                            <Tr key={order.id}>
                                                              <Td>{renderOrderLink(order, 'spendByUsekFinancing')}</Td>
                                                              <Td>{highlightText(formatDateCz(getOrderDate(order)), 'spendByUsekFinancing')}</Td>
                                                              <SubjectTd>{highlightText(getOrderSubject(order), 'spendByUsekFinancing')}</SubjectTd>
                                                              <Td>{renderOrdererStack(order)}</Td>
                                                              <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                              <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'spendByUsekFinancing')}</TdNarrow>
                                                              <Td>{renderFinancingLabelCell(order, 'spendByUsekFinancing')}</Td>
                                                              <TdNarrow>{renderFinancingRefCell(order, 'spendByUsekFinancing')}</TdNarrow>
                                                              <TdNarrow>{highlightText(getOrderTypeLabel(order), 'spendByUsekFinancing')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                                              <TdNarrow>{highlightText(getOrderStatusLabel(order), 'spendByUsekFinancing')}</TdNarrow>
                                                              <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'spendByUsekFinancing')}</TdR>
                                                            </Tr>
                                                          ))}
                                                        </tbody>
                                                      </Table>
                                                    </TableWrapper>
                                                    {renderPagination(detailKey, pagedDetail)}
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </Table>
                                  </TableWrapper>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* === DRUH OBJEDNÁVKY → FINANCOVÁNÍ === */}
                {isBlockVisible('spend', 'spendByDruhFinancing') && (
                  <SectionCard id="section-spendByDruhFinancing">
                    <SectionHeader>
                      <SectionTitle>Přehled čerpání po druhu a financování</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allExp = filteredSpendByDruhGroups.length > 0 && filteredSpendByDruhGroups.every(g => expandedSpendDruh.has(g.code));
                            if (allExp) { setExpandedSpendDruh(new Set()); setExpandedSpendDruhSub(new Set()); }
                            else { setExpandedSpendDruh(new Set(filteredSpendByDruhGroups.map(g => g.code))); }
                          }}
                          title="Rozbalit / sbalit všechny skupiny"
                        >
                          <FontAwesomeIcon icon={filteredSpendByDruhGroups.length > 0 && filteredSpendByDruhGroups.every(g => expandedSpendDruh.has(g.code)) ? faMinus : faPlus} />
                          {filteredSpendByDruhGroups.length > 0 && filteredSpendByDruhGroups.every(g => expandedSpendDruh.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <SectionBadge $tone="warn">{filteredSpendByDruhGroups.length} druhů</SectionBadge>
                        <button onClick={handleExportCsv_spendByDruhFinancing} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon>
                          <FontAwesomeIcon icon={faSearch} />
                        </SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (v názvech druhů, financování, detailech objednávek)..."
                          value={getSearchQuery('spendByDruhFinancing')}
                          onChange={(e) => setSearchQuery('spendByDruhFinancing', e.target.value)}
                        />
                        {getSearchQuery('spendByDruhFinancing') && (
                          <SearchClearButton
                            onClick={() => setSearchQuery('spendByDruhFinancing', '')}
                            title="Vymazat vyhledávání"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {filteredSpendByDruhGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div
                              title={filteredSpendByDruhGroups.length > 0 && filteredSpendByDruhGroups.every(g => expandedSpendDruh.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                              onClick={() => {
                                const allExp = filteredSpendByDruhGroups.length > 0 && filteredSpendByDruhGroups.every(g => expandedSpendDruh.has(g.code));
                                if (allExp) { setExpandedSpendDruh(new Set()); setExpandedSpendDruhSub(new Set()); }
                                else { setExpandedSpendDruh(new Set(filteredSpendByDruhGroups.map(g => g.code))); }
                              }}
                              style={{ cursor: 'pointer', color: '#7c3aed', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                            >
                              {filteredSpendByDruhGroups.length > 0 && filteredSpendByDruhGroups.every(g => expandedSpendDruh.has(g.code)) ? '\u2212' : '+'}
                            </div>
                            <div onClick={() => handleTableSort('spendGrp_druh', 'label')} style={{ cursor: 'pointer' }}>Druh objednávky{sortIcon('spendGrp_druh', 'label')}</div>
                            <div onClick={() => handleTableSort('spendGrp_druh', 'count')} style={{ cursor: 'pointer', textAlign: 'right' }}>Počet{sortIcon('spendGrp_druh', 'count')}</div>
                            <div onClick={() => handleTableSort('spendGrp_druh', 'amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Celkem{sortIcon('spendGrp_druh', 'amount')}</div>
                          </div>
                          {sortTableData(filteredSpendByDruhGroups, 'spendGrp_druh', { label: g => g.label || g.code || '', count: g => String(g.totalCount || 0), amount: g => String(g.totalAmount || 0) }).map(group => {
                            const grpOpen = expandedSpendDruh.has(group.code);
                            const finArr = Object.values(group.financing).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                            return (
                              <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendDruh(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#fdf4ff' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#7c3aed', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#4c1d95', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(group.label, 'spendByDruhFinancing')}</span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                                </div>
                                {grpOpen && (
                                  <TableWrapper style={{ margin: 0 }}>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <Th
                                            style={{ width: '24px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontSize: '0.95rem', fontWeight: '900' }}
                                            title={finArr.length > 0 && finArr.every(fin => expandedSpendDruhSub.has(`spendDFDetail_${group.code}_${fin.code}`)) ? 'Sbalit vše' : 'Rozbalit vše'}
                                            onClick={e => {
                                              e.stopPropagation();
                                              const allOpen = finArr.length > 0 && finArr.every(fin => expandedSpendDruhSub.has(`spendDFDetail_${group.code}_${fin.code}`));
                                              setExpandedSpendDruhSub(prev => {
                                                const next = new Set(prev);
                                                finArr.forEach(fin => {
                                                  const k = `spendDFDetail_${group.code}_${fin.code}`;
                                                  if (allOpen) next.delete(k); else next.add(k);
                                                });
                                                return next;
                                              });
                                            }}
                                          >
                                            {finArr.length > 0 && finArr.every(fin => expandedSpendDruhSub.has(`spendDFDetail_${group.code}_${fin.code}`)) ? '\u2212' : '+'}
                                          </Th>
                                          <Th>Financování</Th>
                                          <ThC>Počet</ThC>
                                          <ThR>Celkem</ThR>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {finArr.map(fin => {
                                          const detailKey = `spendDFDetail_${group.code}_${fin.code}`;
                                          const finOpen = expandedSpendDruhSub.has(detailKey);
                                          const pagedDetail = getPagedItems(sortTableData(fin.orders, detailKey, spendOrderAcc), detailKey);
                                          return (
                                            <React.Fragment key={`${group.code}_${fin.code}`}>
                                              <Tr
                                                onClick={() => setExpandedSpendDruhSub(prev => { const next = new Set(prev); if (next.has(detailKey)) next.delete(detailKey); else next.add(detailKey); return next; })}
                                                style={{ cursor: 'pointer', background: finOpen ? '#f0f9ff' : undefined }}
                                              >
                                                <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{finOpen ? '\u2212' : '+'}</Td>
                                                <Td>{highlightText(fin.label, 'spendByDruhFinancing')}</Td>
                                                <TdC>{fin.count}</TdC>
                                                <TdR>{fmtCurrency(fin.amount)}</TdR>
                                              </Tr>
                                              {finOpen && (
                                                <tr>
                                                  <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <TableWrapper style={{ margin: 0 }}>
                                                      <Table>
                                                        <thead>
                                                          <tr>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'ev_cislo')}>Číslo{sortIcon(detailKey, 'ev_cislo')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'dt_obj')}>Dt. obj.{sortIcon(detailKey, 'dt_obj')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'predmet')}>Předmět{sortIcon(detailKey, 'predmet')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'objednatel')}>Objednatel{sortIcon(detailKey, 'objednatel')}</ThSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'schvalovatel')}>Schvalovatel{sortIcon(detailKey, 'schvalovatel')}</ThSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'usek')}>Úsek{sortIcon(detailKey, 'usek')}</ThNarrowSort>
                                                            <ThSort onClick={() => handleTableSort(detailKey, 'financovani')}>Financování{sortIcon(detailKey, 'financovani')}</ThSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'detail_fin')}>Detail fin.{sortIcon(detailKey, 'detail_fin')}</ThNarrowSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'druh')}>Druh{sortIcon(detailKey, 'druh')}</ThNarrowSort>
                                                            <ThNarrowSort onClick={() => handleTableSort(detailKey, 'stav')}>Stav{sortIcon(detailKey, 'stav')}</ThNarrowSort>
                                                            <ThRSort onClick={() => handleTableSort(detailKey, 'castka')}>Částka{sortIcon(detailKey, 'castka')}</ThRSort>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {pagedDetail.items.map(order => (
                                                            <Tr key={order.id}>
                                                              <Td>{renderOrderLink(order, 'spendByDruhFinancing')}</Td>
                                                              <Td>{highlightText(formatDateCz(getOrderDate(order)), 'spendByDruhFinancing')}</Td>
                                                              <SubjectTd>{highlightText(getOrderSubject(order), 'spendByDruhFinancing')}</SubjectTd>
                                                              <Td>{renderOrdererStack(order)}</Td>
                                                              <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                              <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'spendByDruhFinancing')}</TdNarrow>
                                                              <Td>{renderFinancingLabelCell(order, 'spendByDruhFinancing')}</Td>
                                                              <TdNarrow>{renderFinancingRefCell(order, 'spendByDruhFinancing')}</TdNarrow>
                                                              <TdNarrow>{highlightText(getOrderTypeLabel(order), 'spendByDruhFinancing')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                                              <TdNarrow>{highlightText(getOrderStatusLabel(order), 'spendByDruhFinancing')}</TdNarrow>
                                                              <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'spendByDruhFinancing')}</TdR>
                                                            </Tr>
                                                          ))}
                                                        </tbody>
                                                      </Table>
                                                    </TableWrapper>
                                                    {renderPagination(detailKey, pagedDetail)}
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </Table>
                                  </TableWrapper>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* === FINANCOVÁNÍ → ÚSEK → DRUH === */}
                {isBlockVisible('spend', 'spendByFinancingUsekDruh') && (
                  <SectionCard id="section-spendByFinancingUsekDruh">
                    <SectionHeader>
                      <SectionTitle>Čerpání: Financování → Úsek → Druh</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allExp = filteredSpendByFinancingUsekDruhGroups.length > 0 && filteredSpendByFinancingUsekDruhGroups.every(g => expandedSpendFinDruh.has(g.code));
                            if (allExp) { setExpandedSpendFinDruh(new Set()); setExpandedSpendFinDruhUsek(new Set()); setExpandedSpendFinDruhDetail(new Set()); }
                            else { setExpandedSpendFinDruh(new Set(filteredSpendByFinancingUsekDruhGroups.map(g => g.code))); }
                          }}
                          title="Rozbalit / sbalit všechny skupiny"
                        >
                          <FontAwesomeIcon icon={filteredSpendByFinancingUsekDruhGroups.length > 0 && filteredSpendByFinancingUsekDruhGroups.every(g => expandedSpendFinDruh.has(g.code)) ? faMinus : faPlus} />
                          {filteredSpendByFinancingUsekDruhGroups.length > 0 && filteredSpendByFinancingUsekDruhGroups.every(g => expandedSpendFinDruh.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <SectionBadge $tone="warn">{filteredSpendByFinancingUsekDruhGroups.length} typů financování</SectionBadge>
                        <button onClick={handleExportCsv_spendByFinancingUsekDruh} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon><FontAwesomeIcon icon={faSearch} /></SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (v názvech financování, úseků, druhů, detailech objednávek)..."
                          value={getSearchQuery('spendByFinancingUsekDruh')}
                          onChange={(e) => setSearchQuery('spendByFinancingUsekDruh', e.target.value)}
                        />
                        {getSearchQuery('spendByFinancingUsekDruh') && (
                          <SearchClearButton onClick={() => setSearchQuery('spendByFinancingUsekDruh', '')} title="Vymazat vyhledávání">
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {filteredSpendByFinancingUsekDruhGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div
                              title={filteredSpendByFinancingUsekDruhGroups.length > 0 && filteredSpendByFinancingUsekDruhGroups.every(g => expandedSpendFinDruh.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                              onClick={() => {
                                const allExp = filteredSpendByFinancingUsekDruhGroups.length > 0 && filteredSpendByFinancingUsekDruhGroups.every(g => expandedSpendFinDruh.has(g.code));
                                if (allExp) { setExpandedSpendFinDruh(new Set()); setExpandedSpendFinDruhUsek(new Set()); setExpandedSpendFinDruhDetail(new Set()); }
                                else { setExpandedSpendFinDruh(new Set(filteredSpendByFinancingUsekDruhGroups.map(g => g.code))); }
                              }}
                              style={{ cursor: 'pointer', color: '#0891b2', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                            >
                              {filteredSpendByFinancingUsekDruhGroups.length > 0 && filteredSpendByFinancingUsekDruhGroups.every(g => expandedSpendFinDruh.has(g.code)) ? '\u2212' : '+'}
                            </div>
                            <div onClick={() => handleTableSort('spendGrp_findrud', 'label')} style={{ cursor: 'pointer' }}>Financování{sortIcon('spendGrp_findrud', 'label')}</div>
                            <div onClick={() => handleTableSort('spendGrp_findrud', 'count')} style={{ cursor: 'pointer', textAlign: 'right' }}>Počet{sortIcon('spendGrp_findrud', 'count')}</div>
                            <div onClick={() => handleTableSort('spendGrp_findrud', 'amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Celkem{sortIcon('spendGrp_findrud', 'amount')}</div>
                          </div>
                          {sortTableData(filteredSpendByFinancingUsekDruhGroups, 'spendGrp_findrud', { label: g => g.label || g.code || '', count: g => String(g.totalCount || 0), amount: g => String(g.totalAmount || 0) }).map(group => {
                            const grpOpen = expandedSpendFinDruh.has(group.code);
                            const usekyArr = Object.values(group.useky).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                            return (
                              <div key={group.code} style={{ border: '1px solid #a5f3fc', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendFinDruh(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#ecfeff' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0891b2', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#0e4f6e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(group.label, 'spendByFinancingUsekDruh')}</span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                                </div>
                                {grpOpen && (
                                  <TableWrapper style={{ margin: 0 }}>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <Th
                                            style={{ width: '24px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontSize: '0.95rem', fontWeight: '900' }}
                                            title={usekyArr.length > 0 && usekyArr.every(u => expandedSpendFinDruhUsek.has(`spendFUD_${group.code}_${u.code}`)) ? 'Sbalit vše' : 'Rozbalit vše'}
                                            onClick={e => {
                                              e.stopPropagation();
                                              const allOpen = usekyArr.length > 0 && usekyArr.every(u => expandedSpendFinDruhUsek.has(`spendFUD_${group.code}_${u.code}`));
                                              setExpandedSpendFinDruhUsek(prev => {
                                                const next = new Set(prev);
                                                usekyArr.forEach(u => {
                                                  const k = `spendFUD_${group.code}_${u.code}`;
                                                  if (allOpen) next.delete(k); else next.add(k);
                                                });
                                                return next;
                                              });
                                            }}
                                          >
                                            {usekyArr.length > 0 && usekyArr.every(u => expandedSpendFinDruhUsek.has(`spendFUD_${group.code}_${u.code}`)) ? '\u2212' : '+'}
                                          </Th>
                                          <Th>Úsek</Th>
                                          <ThC>Počet</ThC>
                                          <ThR>Celkem</ThR>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {usekyArr.map(usek => {
                                          const usekKey = `spendFUD_${group.code}_${usek.code}`;
                                          const usekOpen = expandedSpendFinDruhUsek.has(usekKey);
                                          const druhyArr = Object.values(usek.druhy).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                                          return (
                                            <React.Fragment key={`${group.code}_${usek.code}`}>
                                              <Tr
                                                onClick={() => setExpandedSpendFinDruhUsek(prev => { const next = new Set(prev); if (next.has(usekKey)) next.delete(usekKey); else next.add(usekKey); return next; })}
                                                style={{ cursor: 'pointer', background: usekOpen ? '#f0f9ff' : undefined }}
                                              >
                                                <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{usekOpen ? '\u2212' : '+'}</Td>
                                                <Td>{highlightText(usek.label, 'spendByFinancingUsekDruh')}</Td>
                                                <TdC>{usek.count}</TdC>
                                                <TdR>{fmtCurrency(usek.amount)}</TdR>
                                              </Tr>
                                              {usekOpen && (
                                                <tr>
                                                  <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <TableWrapper style={{ margin: 0 }}>
                                                      <Table>
                                                        <thead>
                                                          <tr>
                                                            <Th
                                                              style={{ width: '24px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontSize: '0.95rem', fontWeight: '900' }}
                                                              title={druhyArr.length > 0 && druhyArr.every(d => expandedSpendFinDruhDetail.has(`spendFUDD_${group.code}_${usek.code}_${d.code}`)) ? 'Sbalit vše' : 'Rozbalit vše'}
                                                              onClick={e => {
                                                                e.stopPropagation();
                                                                const allOpen = druhyArr.length > 0 && druhyArr.every(d => expandedSpendFinDruhDetail.has(`spendFUDD_${group.code}_${usek.code}_${d.code}`));
                                                                setExpandedSpendFinDruhDetail(prev => {
                                                                  const next = new Set(prev);
                                                                  druhyArr.forEach(d => {
                                                                    const k = `spendFUDD_${group.code}_${usek.code}_${d.code}`;
                                                                    if (allOpen) next.delete(k); else next.add(k);
                                                                  });
                                                                  return next;
                                                                });
                                                              }}
                                                            >
                                                              {druhyArr.length > 0 && druhyArr.every(d => expandedSpendFinDruhDetail.has(`spendFUDD_${group.code}_${usek.code}_${d.code}`)) ? '\u2212' : '+'}
                                                            </Th>
                                                            <Th>Druh objednávky</Th>
                                                            <ThC>Počet</ThC>
                                                            <ThR>Celkem</ThR>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {druhyArr.map(druh => {
                                                            const druhKey = `spendFUDD_${group.code}_${usek.code}_${druh.code}`;
                                                            const druhOpen = expandedSpendFinDruhDetail.has(druhKey);
                                                            const pagedDetail = getPagedItems(sortTableData(druh.orders, druhKey, spendOrderAcc), druhKey);
                                                            return (
                                                              <React.Fragment key={`${group.code}_${usek.code}_${druh.code}`}>
                                                                <Tr
                                                                  onClick={() => setExpandedSpendFinDruhDetail(prev => { const next = new Set(prev); if (next.has(druhKey)) next.delete(druhKey); else next.add(druhKey); return next; })}
                                                                  style={{ cursor: 'pointer', background: druhOpen ? '#f0f9ff' : undefined }}
                                                                >
                                                                  <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{druhOpen ? '\u2212' : '+'}</Td>
                                                                  <Td>{highlightText(druh.label, 'spendByFinancingUsekDruh')}</Td>
                                                                  <TdC>{druh.count}</TdC>
                                                                  <TdR>{fmtCurrency(druh.amount)}</TdR>
                                                                </Tr>
                                                                {druhOpen && (
                                                                  <tr>
                                                                    <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2.5rem', background: '#f0faff', borderBottom: '1px solid #e2e8f0' }}>
                                                                      <TableWrapper style={{ margin: 0 }}>
                                                                        <Table>
                                                                          <thead>
                                                                            <tr>
                                                                              <ThSort onClick={() => handleTableSort(druhKey, 'ev_cislo')}>Číslo{sortIcon(druhKey, 'ev_cislo')}</ThSort>
                                                                              <ThSort onClick={() => handleTableSort(druhKey, 'dt_obj')}>Dt. obj.{sortIcon(druhKey, 'dt_obj')}</ThSort>
                                                                              <ThSort onClick={() => handleTableSort(druhKey, 'predmet')}>Předmět{sortIcon(druhKey, 'predmet')}</ThSort>
                                                                              <ThSort onClick={() => handleTableSort(druhKey, 'objednatel')}>Objednatel{sortIcon(druhKey, 'objednatel')}</ThSort>
                                                                              <ThSort onClick={() => handleTableSort(druhKey, 'schvalovatel')}>Schvalovatel{sortIcon(druhKey, 'schvalovatel')}</ThSort>
                                                                              <ThNarrowSort onClick={() => handleTableSort(druhKey, 'usek')}>Úsek{sortIcon(druhKey, 'usek')}</ThNarrowSort>
                                                                              <ThSort onClick={() => handleTableSort(druhKey, 'financovani')}>Financování{sortIcon(druhKey, 'financovani')}</ThSort>
                                                                              <ThNarrowSort onClick={() => handleTableSort(druhKey, 'detail_fin')}>Detail fin.{sortIcon(druhKey, 'detail_fin')}</ThNarrowSort>
                                                                              <ThNarrowSort onClick={() => handleTableSort(druhKey, 'druh')}>Druh{sortIcon(druhKey, 'druh')}</ThNarrowSort>
                                                                              <ThNarrowSort onClick={() => handleTableSort(druhKey, 'stav')}>Stav{sortIcon(druhKey, 'stav')}</ThNarrowSort>
                                                                              <ThRSort onClick={() => handleTableSort(druhKey, 'castka')}>Částka{sortIcon(druhKey, 'castka')}</ThRSort>
                                                                            </tr>
                                                                          </thead>
                                                                          <tbody>
                                                                            {pagedDetail.items.map(order => (
                                                                              <Tr key={order.id}>
                                                                                <Td>{renderOrderLink(order, 'spendByFinancingUsekDruh')}</Td>
                                                                                <Td>{highlightText(formatDateCz(getOrderDate(order)), 'spendByFinancingUsekDruh')}</Td>
                                                                                <SubjectTd>{highlightText(getOrderSubject(order), 'spendByFinancingUsekDruh')}</SubjectTd>
                                                                                <Td>{renderOrdererStack(order)}</Td>
                                                                                <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                                                <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'spendByFinancingUsekDruh')}</TdNarrow>
                                                                                <Td>{renderFinancingLabelCell(order, 'spendByFinancingUsekDruh')}</Td>
                                                                                <TdNarrow>{renderFinancingRefCell(order, 'spendByFinancingUsekDruh')}</TdNarrow>
                                                                                <TdNarrow>{highlightText(getOrderTypeLabel(order), 'spendByFinancingUsekDruh')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                                                                <TdNarrow>{highlightText(getOrderStatusLabel(order), 'spendByFinancingUsekDruh')}</TdNarrow>
                                                                                <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'spendByFinancingUsekDruh')}</TdR>
                                                                              </Tr>
                                                                            ))}
                                                                          </tbody>
                                                                        </Table>
                                                                      </TableWrapper>
                                                                      {renderPagination(druhKey, pagedDetail)}
                                                                    </td>
                                                                  </tr>
                                                                )}
                                                              </React.Fragment>
                                                            );
                                                          })}
                                                        </tbody>
                                                      </Table>
                                                    </TableWrapper>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </Table>
                                  </TableWrapper>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* === LP → LP KÓD (LPIT1, LPIT2...) → OBJEDNÁVKY === */}
                {isBlockVisible('spend', 'spendByLpKod') && (
                  <SectionCard id="section-spendByLpKod">
                    <SectionHeader>
                      <SectionTitle>Čerpání LP podle LP kódu</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allExp = filteredSpendByLpKodGroups.length > 0 && filteredSpendByLpKodGroups.every(g => expandedSpendLp.has(g.code));
                            if (allExp) { setExpandedSpendLp(new Set()); }
                            else { setExpandedSpendLp(new Set(filteredSpendByLpKodGroups.map(g => g.code))); }
                          }}
                          title="Rozbalit / sbalit všechny skupiny"
                        >
                          <FontAwesomeIcon icon={filteredSpendByLpKodGroups.length > 0 && filteredSpendByLpKodGroups.every(g => expandedSpendLp.has(g.code)) ? faMinus : faPlus} />
                          {filteredSpendByLpKodGroups.length > 0 && filteredSpendByLpKodGroups.every(g => expandedSpendLp.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <SectionBadge $tone="warn">{filteredSpendByLpKodGroups.length} LP kódů</SectionBadge>
                        <button onClick={handleExportCsv_spendByLpKod} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon>
                          <FontAwesomeIcon icon={faSearch} />
                        </SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (v názvech LP kódů, detailech objednávek)..."
                          value={getSearchQuery('spendByLpKod')}
                          onChange={(e) => setSearchQuery('spendByLpKod', e.target.value)}
                        />
                        {getSearchQuery('spendByLpKod') && (
                          <SearchClearButton
                            onClick={() => setSearchQuery('spendByLpKod', '')}
                            title="Vymazat vyhledávání"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {filteredSpendByLpKodGroups.length === 0 ? (
                        <EmptyState>Bez objednávek LP pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 75px 170px 120px 65px 140px 75px 150px', gap: '0.5rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div
                              title={filteredSpendByLpKodGroups.length > 0 && filteredSpendByLpKodGroups.every(g => expandedSpendLp.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                              onClick={() => {
                                const allExp = filteredSpendByLpKodGroups.length > 0 && filteredSpendByLpKodGroups.every(g => expandedSpendLp.has(g.code));
                                if (allExp) { setExpandedSpendLp(new Set()); }
                                else { setExpandedSpendLp(new Set(filteredSpendByLpKodGroups.map(g => g.code))); }
                              }}
                              style={{ cursor: 'pointer', color: '#d97706', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                            >
                              {filteredSpendByLpKodGroups.length > 0 && filteredSpendByLpKodGroups.every(g => expandedSpendLp.has(g.code)) ? '\u2212' : '+'}
                            </div>
                            <div onClick={() => handleTableSort('spendGrp_lp', 'code')} style={{ cursor: 'pointer' }}>LP kód{sortIcon('spendGrp_lp', 'code')}</div>
                            <div onClick={() => handleTableSort('spendGrp_lp', 'usek')} style={{ cursor: 'pointer' }}>Úsek{sortIcon('spendGrp_lp', 'usek')}</div>
                            <div onClick={() => handleTableSort('spendGrp_lp', 'prikazce')} style={{ cursor: 'pointer' }}>Příkazce{sortIcon('spendGrp_lp', 'prikazce')}</div>
                            <div onClick={() => handleTableSort('spendGrp_lp', 'krytí')} style={{ cursor: 'pointer', textAlign: 'right' }}>Fin.krytí{sortIcon('spendGrp_lp', 'krytí')}</div>
                            <div onClick={() => handleTableSort('spendGrp_lp', 'cerpani')} style={{ cursor: 'pointer', textAlign: 'right' }}>Čerpání{sortIcon('spendGrp_lp', 'cerpani')}</div>
                            <div style={{ textAlign: 'center' }}>Tempo čerpání</div>
                            <div onClick={() => handleTableSort('spendGrp_lp', 'count')} style={{ cursor: 'pointer', textAlign: 'right' }}>Počet{sortIcon('spendGrp_lp', 'count')}</div>
                            <div onClick={() => handleTableSort('spendGrp_lp', 'amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Celkem{sortIcon('spendGrp_lp', 'amount')}</div>
                          </div>
                          {sortTableData(filteredSpendByLpKodGroups, 'spendGrp_lp', { code: g => g.code || '', usek: g => g.usek_zkr || '', prikazce: g => g.prikazce_jmeno || '', 'krytí': g => String(g.lp_limit || 0), cerpani: g => String(g.amount || 0), count: g => String(g.count || 0), amount: g => String(g.amount || 0) }).map(group => {
                            const lpOpen = expandedSpendLp.has(group.code);
                            const pagedDetail = getPagedItems(sortTableData(group.orders, `spendLpKod_${group.code}`, spendOrderAcc), `spendLpKod_${group.code}`);
                            const lpUseky = group.usek_zkr || '-';
                            const lpPrikazci = group.prikazce_jmeno || '-';
                            const lpPct = group.lp_limit > 0 ? (group.amount / group.lp_limit * 100) : null;
                            const lpPctText = lpPct !== null ? lpPct.toFixed(1) + ' %' : '-';
                            const lpPctColor = lpPct !== null ? (lpPct > 90 ? '#dc2626' : lpPct > 70 ? '#d97706' : '#059669') : '#9ca3af';
                            const lpCurrentMonth = new Date().getMonth() + 1;
                            const lpMonthNames = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
                            const lpMonthSquares = Array.from({ length: 12 }, (_, i) => {
                              const m = i + 1;
                              if (m > lpCurrentMonth || !group.lp_limit || group.lp_limit <= 0) {
                                return { color: '#e5e7eb', label: lpMonthNames[i] + ': budoucí' };
                              }
                              const threshold = group.lp_limit * m / 12;
                              const ratio = group.amount / threshold;
                              const pctLabel = (ratio * 100).toFixed(0) + '% z ' + fmtCurrency(threshold);
                              if (ratio > 1) return { color: '#dc2626', label: lpMonthNames[i] + ': ' + pctLabel + ' — překročeno' };
                              if (ratio > 0.8) return { color: '#d97706', label: lpMonthNames[i] + ': ' + pctLabel + ' — blíží se limitu' };
                              return { color: '#059669', label: lpMonthNames[i] + ': ' + pctLabel + ' — v limitu' };
                            });
                            const lpLabelColor = (group.lp_limit > 0 && lpMonthSquares[lpCurrentMonth - 1]) ? lpMonthSquares[lpCurrentMonth - 1].color : '#78350f';
                            return (
                              <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendLp(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 75px 170px 120px 65px 140px 75px 150px', gap: '0.5rem', alignItems: 'center', padding: '0.7rem 1rem', background: lpOpen ? '#fffbeb' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#d97706', lineHeight: 1, textAlign: 'center' }}>{lpOpen ? '\u2212' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: lpLabelColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightText(group.label, 'spendByLpKod')}</span>
                                  <span style={{ fontSize: '0.78rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lpUseky}</span>
                                  <span style={{ fontSize: '0.78rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lpPrikazci}</span>
                                  <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#6b7280', textAlign: 'right', whiteSpace: 'nowrap' }}>{group.lp_limit > 0 ? fmtCurrency(group.lp_limit) : '-'}</span>
                                  <span style={{ fontSize: '0.78rem', fontWeight: '600', textAlign: 'right', color: lpPctColor }}>{lpPctText}</span>
                                  <span style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                                    {lpMonthSquares.map((sq, i) => (
                                      <span key={i} title={sq.label} style={{ width: '9px', height: '9px', borderRadius: '2px', background: sq.color, display: 'inline-block', border: (i + 1) === lpCurrentMonth ? '1.5px solid #1e293b' : '0.5px solid rgba(0,0,0,0.1)', opacity: (i + 1) > lpCurrentMonth ? 0.35 : 1 }} />
                                    ))}
                                  </span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.count} obj.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.amount)}</span>
                                </div>
                                {lpOpen && (
                                  <div style={{ padding: '0.5rem 0.5rem 0.75rem 1rem', background: '#f8fafc' }}>
                                    <TableWrapper style={{ margin: 0 }}>
                                      <Table>
                                        <thead>
                                          <tr>
                                            <ThSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'ev_cislo')}>Číslo{sortIcon(`spendLpKod_${group.code}`, 'ev_cislo')}</ThSort>
                                            <ThSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'dt_obj')}>Dt. obj.{sortIcon(`spendLpKod_${group.code}`, 'dt_obj')}</ThSort>
                                            <ThSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'predmet')}>Předmět{sortIcon(`spendLpKod_${group.code}`, 'predmet')}</ThSort>
                                            <ThSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'objednatel')}>Objednatel{sortIcon(`spendLpKod_${group.code}`, 'objednatel')}</ThSort>
                                            <ThSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'schvalovatel')}>Schvalovatel{sortIcon(`spendLpKod_${group.code}`, 'schvalovatel')}</ThSort>
                                            <ThNarrowSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'usek')}>Úsek{sortIcon(`spendLpKod_${group.code}`, 'usek')}</ThNarrowSort>
                                            <ThNarrowSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'detail_fin')}>Detail fin.{sortIcon(`spendLpKod_${group.code}`, 'detail_fin')}</ThNarrowSort>
                                            <ThNarrowSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'druh')}>Druh{sortIcon(`spendLpKod_${group.code}`, 'druh')}</ThNarrowSort>
                                            <ThNarrowSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'stav')}>Stav{sortIcon(`spendLpKod_${group.code}`, 'stav')}</ThNarrowSort>
                                            <ThRSort onClick={() => handleTableSort(`spendLpKod_${group.code}`, 'castka')}>Částka{sortIcon(`spendLpKod_${group.code}`, 'castka')}</ThRSort>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {pagedDetail.items.map(order => (
                                            <Tr key={order.id}>
                                              <Td>{renderOrderLink(order, 'spendByLpKod')}</Td>
                                              <Td>{highlightText(formatDateCz(getOrderDate(order)), 'spendByLpKod')}</Td>
                                              <SubjectTd>{highlightText(getOrderSubject(order), 'spendByLpKod')}</SubjectTd>
                                              <Td>{renderOrdererStack(order)}</Td>
                                              <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                              <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'spendByLpKod')}</TdNarrow>
                                              <TdNarrow style={{ fontWeight: 600, color: '#92400e' }}>{highlightText(group.code !== '__no_lp__' ? group.code : '-', 'spendByLpKod')}</TdNarrow>
                                              <TdNarrow>{highlightText(getOrderTypeLabel(order), 'spendByLpKod')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                              <TdNarrow>{highlightText(getOrderStatusLabel(order), 'spendByLpKod')}</TdNarrow>
                                              <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'spendByLpKod')}</TdR>
                                            </Tr>
                                          ))}
                                        </tbody>
                                      </Table>
                                    </TableWrapper>
                                    {renderPagination(`spendLpKod_${group.code}`, pagedDetail)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* === SMLOUVY → OBJEDNÁVKY ČERPAJÍCÍ ZE SMLOUVY === */}
                {isBlockVisible('spend', 'spendBySmlouvy') && (
                  <SectionCard id="section-spendBySmlouvy">
                    <SectionHeader>
                      <SectionTitle>Čerpání ze Smluv</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            const allExp = filteredSpendBySmlouvyGroups.length > 0 && filteredSpendBySmlouvyGroups.every(g => expandedSpendSmlouvy.has(g.code));
                            if (allExp) { setExpandedSpendSmlouvy(new Set()); }
                            else { setExpandedSpendSmlouvy(new Set(filteredSpendBySmlouvyGroups.map(g => g.code))); }
                          }}
                          title="Rozbalit / sbalit všechny skupiny"
                        >
                          <FontAwesomeIcon icon={filteredSpendBySmlouvyGroups.length > 0 && filteredSpendBySmlouvyGroups.every(g => expandedSpendSmlouvy.has(g.code)) ? faMinus : faPlus} />
                          {filteredSpendBySmlouvyGroups.length > 0 && filteredSpendBySmlouvyGroups.every(g => expandedSpendSmlouvy.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <SectionBadge $tone="warn">{filteredSpendBySmlouvyGroups.length} smluv</SectionBadge>
                        <button onClick={handleExportCsv_spendBySmlouvy} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon><FontAwesomeIcon icon={faSearch} /></SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (v číslech smluv, detailech objednávek)..."
                          value={getSearchQuery('spendBySmlouvy')}
                          onChange={(e) => setSearchQuery('spendBySmlouvy', e.target.value)}
                        />
                        {getSearchQuery('spendBySmlouvy') && (
                          <SearchClearButton onClick={() => setSearchQuery('spendBySmlouvy', '')} title="Vymazat vyhledávání">
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredSpendBySmlouvyGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry (žádné objednávky typu Smlouva)</EmptyState>
                      ) : (
                        (() => {
                          const DONE_FLAGS = ['DOKON', 'UZAVR', 'K_ZAPLACENI', 'UHRAD'];
                          const currentMonthIdx = new Date().getMonth();
                          const targetPct = Math.round(((currentMonthIdx + 1) / 12) * 100);
                          const GRID_COLS = '22px 155px 1fr 52px 115px 145px 130px 190px 84px';
                          const HDR = { color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' };

                          // Předpočítat stav každé skupiny
                          const statsByCode = new Map();
                          filteredSpendBySmlouvyGroups.forEach(group => {
                            let skutecne = 0, vProcesu = 0;
                            (group.orders || []).forEach(o => {
                              const s = getOrderStatusCode(o).toUpperCase();
                              const amt = getOrderAmount(o);
                              if (DONE_FLAGS.some(f => s.includes(f))) skutecne += amt; else vProcesu += amt;
                            });
                            const limit = group.smlouva_hodnota || 0;
                            const spentPct = limit > 0 ? (skutecne / limit) * 100 : 0;
                            const inProcessPct = limit > 0 ? (vProcesu / limit) * 100 : 0;
                            const totalPct = spentPct + inProcessPct;
                            const isCritical = totalPct >= 100;
                            const isWarning = !isCritical && totalPct > targetPct * 1.3;
                            const level = isCritical ? 'critical' : isWarning ? 'warning' : 'ok';
                            const barColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
                            const barColorLight = isCritical ? '#fca5a5' : isWarning ? '#fdba74' : '#86efac';
                            statsByCode.set(group.code, { skutecne, vProcesu, limit, spentPct, inProcessPct, totalPct, level, barColor, barColorLight });
                          });

                          // Celkové součty
                          let totalLimit = 0, totalSkutecne = 0, totalVProcesu = 0;
                          statsByCode.forEach(s => { totalLimit += s.limit; totalSkutecne += s.skutecne; totalVProcesu += s.vProcesu; });
                          const totalSpentPct = totalLimit > 0 ? (totalSkutecne / totalLimit) * 100 : 0;
                          const totalInProcessPct = totalLimit > 0 ? (totalVProcesu / totalLimit) * 100 : 0;
                          const totalCerpaniPct = totalSpentPct + totalInProcessPct;
                          const totalIsCritical = totalCerpaniPct >= 100;
                          const totalIsWarning = !totalIsCritical && totalCerpaniPct > targetPct * 1.3;
                          const totalBarColor = totalIsCritical ? '#ef4444' : totalIsWarning ? '#f59e0b' : '#10b981';
                          const totalBarColorLight = totalIsCritical ? '#fca5a5' : totalIsWarning ? '#fdba74' : '#86efac';

                          const renderJezBar = (spentPct, inProcessPct, totalPct, barColor, barColorLight, showLegend = true) => (
                            <SmlouvyJezWrap onClick={e => e.stopPropagation()}>
                              <SmlouvyJezHeader>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 800, color: barColor, letterSpacing: '-0.02em' }}>{totalPct.toFixed(1)}%</span>
                                  <span style={{ fontSize: '0.52rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Čerpání</span>
                                </div>
                                <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                                  <span style={{ display: 'block', fontSize: '0.52rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Cíl k datu</span>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>{targetPct}%</span>
                                </div>
                              </SmlouvyJezHeader>
                              <SmlouvyJezBarOuter>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 20, pointerEvents: 'none' }}>
                                  {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} style={{ flex: 1, borderRight: '1px solid rgba(203,213,225,0.3)', background: i === currentMonthIdx ? 'rgba(100,116,139,0.05)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span className="sm-month-num" style={{ fontSize: '0.38rem', fontWeight: 700, color: 'transparent', transition: 'color 0.2s ease' }}>{i + 1}</span>
                                    </div>
                                  ))}
                                </div>
                                <SmlouvyJezTargetLine $percent={targetPct} />
                                <SmlouvyJezBarFill $percent={spentPct} $color={barColor} />
                                {inProcessPct > 0 && (
                                  <SmlouvyJezBarPlanned $left={Math.min(spentPct, 100)} $percent={inProcessPct} $color={barColorLight} />
                                )}
                              </SmlouvyJezBarOuter>
                              {showLegend && (
                                <SmlouvyJezLegend>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: barColor, display: 'inline-block', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#94a3b8' }}>Utraceno</span>
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: barColorLight, opacity: 0.7, display: 'inline-block', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#94a3b8' }}>Rezervace</span>
                                  </span>
                                </SmlouvyJezLegend>
                              )}
                            </SmlouvyJezWrap>
                          );

                          return (
                            <>
                              {/* Záhlaví sloupců */}
                              <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: '0.75rem', padding: '0.25rem 1rem', width: '100%', boxSizing: 'border-box', ...HDR }}>
                                <div
                                  title={filteredSpendBySmlouvyGroups.every(g => expandedSpendSmlouvy.has(g.code)) ? 'Sbalit vše' : 'Rozbalit vše'}
                                  onClick={() => {
                                    const allExp = filteredSpendBySmlouvyGroups.every(g => expandedSpendSmlouvy.has(g.code));
                                    if (allExp) setExpandedSpendSmlouvy(new Set());
                                    else setExpandedSpendSmlouvy(new Set(filteredSpendBySmlouvyGroups.map(g => g.code)));
                                  }}
                                  style={{ cursor: 'pointer', textAlign: 'center', userSelect: 'none' }}
                                >
                                  {filteredSpendBySmlouvyGroups.every(g => expandedSpendSmlouvy.has(g.code)) ? '\u2212' : '+'}
                                </div>
                                <div onClick={() => handleTableSort('spendGrp_smlouvy', 'code')} style={{ cursor: 'pointer' }}>Smlouva{sortIcon('spendGrp_smlouvy', 'code')}</div>
                                <div onClick={() => handleTableSort('spendGrp_smlouvy', 'dodavatel')} style={{ cursor: 'pointer' }}>Dodavatel{sortIcon('spendGrp_smlouvy', 'dodavatel')}</div>
                                <div style={{ textAlign: 'center' }}>Úsek</div>
                                <div onClick={() => handleTableSort('spendGrp_smlouvy', 'smlouva_hodnota')} style={{ cursor: 'pointer', textAlign: 'right' }}>Limit{sortIcon('spendGrp_smlouvy', 'smlouva_hodnota')}</div>
                                <div onClick={() => handleTableSort('spendGrp_smlouvy', 'amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Vyčerpáno{sortIcon('spendGrp_smlouvy', 'amount')}</div>
                                <div style={{ textAlign: 'right' }}>Zbývá</div>
                                <div onClick={() => handleTableSort('spendGrp_smlouvy', 'cerpani_pct')} style={{ cursor: 'pointer' }}>Čerpání{sortIcon('spendGrp_smlouvy', 'cerpani_pct')}</div>
                                <div onClick={() => handleTableSort('spendGrp_smlouvy', 'count')} style={{ cursor: 'pointer' }}>Stav{sortIcon('spendGrp_smlouvy', 'count')}</div>
                              </div>

                              {/* Řádky smluv */}
                              {sortTableData(filteredSpendBySmlouvyGroups, 'spendGrp_smlouvy', { code: g => g.code || '', dodavatel: g => g.dodavatel || '', smlouva_hodnota: g => String(g.smlouva_hodnota || 0), cerpani_pct: g => String(g.smlouva_hodnota > 0 ? g.amount / g.smlouva_hodnota : 0), count: g => String(g.orders ? g.orders.length : g.count || 0), amount: g => String(g.amount || 0) }).map(group => {
                                const gs = statsByCode.get(group.code) || { skutecne: 0, vProcesu: 0, limit: 0, spentPct: 0, inProcessPct: 0, totalPct: 0, level: 'ok', barColor: '#10b981', barColorLight: '#86efac' };
                                const { skutecne, vProcesu, limit, spentPct, inProcessPct, totalPct: grpTotalPct, level, barColor, barColorLight } = gs;
                                const zbyva = limit - skutecne;
                                const volne = limit - skutecne - vProcesu;
                                const grpOpen = expandedSpendSmlouvy.has(group.code);
                                const smUseky = [...new Set(group.orders.map(o => getOrdererUsekCode(o)).filter(Boolean))].slice(0, 2).join(', ') || '';
                                const smDodavatel = group.dodavatel || '-';
                                const smIco = group.ico || '';
                                const pagedDetail = getPagedItems(sortTableData(group.orders, 'spendSmlouvy_' + group.code, spendOrderAcc), 'spendSmlouvy_' + group.code);
                                return (
                                  <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                    {/* Souhrnný řádek smlouvy */}
                                    <div
                                      onClick={() => setExpandedSpendSmlouvy(prev => { const n = new Set(prev); if (n.has(group.code)) n.delete(group.code); else n.add(group.code); return n; })}
                                      style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: '0.75rem', alignItems: 'center', padding: '0.65rem 1rem', width: '100%', boxSizing: 'border-box', background: grpOpen ? '#f0f9ff' : '#fafbfc', cursor: 'pointer', userSelect: 'none' }}
                                    >
                                      {/* Toggle s počtem objednávek */}
                                      <button
                                        onClick={e => { e.stopPropagation(); setExpandedSpendSmlouvy(prev => { const n = new Set(prev); if (n.has(group.code)) n.delete(group.code); else n.add(group.code); return n; }); }}
                                        style={{ background: grpOpen ? '#fee2e2' : '#eff6ff', border: `1px solid ${grpOpen ? '#fca5a5' : '#93c5fd'}`, borderRadius: '4px', width: '22px', cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: grpOpen ? '#dc2626' : '#3b82f6', flexShrink: 0, padding: '1px 0', gap: 0, lineHeight: 1 }}
                                      >
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1, color: grpOpen ? '#dc2626' : '#1e40af', opacity: 0.85 }}>{group.count}</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>{grpOpen ? '\u2212' : '+'}</span>
                                      </button>

                                      {/* Číslo smlouvy */}
                                      <span style={{ fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', fontFamily: "'Roboto Condensed', Roboto, sans-serif" }} title={group.label}>{highlightText(group.label, 'spendBySmlouvy')}</span>

                                      {/* Dodavatel / IČO */}
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Roboto Condensed', Roboto, sans-serif", fontWeight: 500 }} title={smDodavatel}>{highlightText(smDodavatel, 'spendBySmlouvy')}</div>
                                        {smIco && (
                                          <div style={{ marginTop: '1px' }}>
                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>{smIco}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Úsek */}
                                      <div style={{ textAlign: 'center' }}>
                                        {smUseky ? (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', background: '#e2e8f0', borderRadius: '4px', padding: '1px 5px', whiteSpace: 'nowrap', display: 'inline-block', fontFamily: "'Roboto Condensed', Roboto, sans-serif" }}>{smUseky}</span>
                                        ) : <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>—</span>}
                                      </div>

                                      {/* Limit */}
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: "'Roboto Condensed', Roboto, sans-serif", color: '#475569', whiteSpace: 'nowrap' }}>
                                          {limit > 0 ? fmtCurrency(limit) : <span style={{ color: '#94a3b8' }}>—</span>}
                                        </div>
                                      </div>

                                      {/* Vyčerpáno */}
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', fontFamily: "'Roboto Condensed', Roboto, sans-serif", whiteSpace: 'nowrap' }}>{fmtCurrency(skutecne)}</div>
                                        {vProcesu > 0 && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', fontFamily: "'Roboto Condensed', Roboto, sans-serif" }}>+ {fmtCurrency(vProcesu)} v procesu</div>}
                                      </div>

                                      {/* Zbývá */}
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: zbyva < 0 ? '#ef4444' : '#10b981', fontFamily: "'Roboto Condensed', Roboto, sans-serif", whiteSpace: 'nowrap' }}>
                                          {limit > 0 ? fmtCurrency(zbyva) : <span style={{ color: '#94a3b8' }}>—</span>}
                                        </div>
                                        {vProcesu > 0 && limit > 0 && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', fontFamily: "'Roboto Condensed', Roboto, sans-serif" }}>→ Volné: {fmtCurrency(volne)}</div>}
                                      </div>

                                      {/* Čerpání – jezevčík bar */}
                                      {limit > 0
                                        ? renderJezBar(spentPct, inProcessPct, grpTotalPct, barColor, barColorLight)
                                        : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                                      }

                                      {/* Stav */}
                                      {limit > 0 ? (
                                        <SmlouvyJezStatusBadge $level={level}>
                                          {level === 'critical'
                                            ? <><FontAwesomeIcon icon={faTriangleExclamation} /> Kritické</>
                                            : level === 'warning'
                                              ? <><FontAwesomeIcon icon={faTriangleExclamation} /> Pozor</>
                                              : <><FontAwesomeIcon icon={faCheckCircle} /> V normě</>
                                          }
                                        </SmlouvyJezStatusBadge>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                                      )}
                                    </div>

                                    {/* Rozbalený detail – tabulka objednávek */}
                                    {grpOpen && (
                                      <div style={{ padding: '0.5rem 0.5rem 0.75rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                        <TableWrapper style={{ margin: 0 }}>
                                          <Table>
                                            <thead>
                                              <tr>
                                                <ThSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'ev_cislo')}>Číslo{sortIcon('spendSmlouvy_' + group.code, 'ev_cislo')}</ThSort>
                                                <ThSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'dt_obj')}>Dt. obj.{sortIcon('spendSmlouvy_' + group.code, 'dt_obj')}</ThSort>
                                                <ThSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'predmet')}>Předmět{sortIcon('spendSmlouvy_' + group.code, 'predmet')}</ThSort>
                                                <ThSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'objednatel')}>Objednatel{sortIcon('spendSmlouvy_' + group.code, 'objednatel')}</ThSort>
                                                <ThSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'schvalovatel')}>Schvalovatel{sortIcon('spendSmlouvy_' + group.code, 'schvalovatel')}</ThSort>
                                                <ThNarrowSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'usek')}>Úsek{sortIcon('spendSmlouvy_' + group.code, 'usek')}</ThNarrowSort>
                                                <ThNarrowSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'detail_fin')}>Detail fin.{sortIcon('spendSmlouvy_' + group.code, 'detail_fin')}</ThNarrowSort>
                                                <ThNarrowSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'druh')}>Druh{sortIcon('spendSmlouvy_' + group.code, 'druh')}</ThNarrowSort>
                                                <ThNarrowSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'stav')}>Stav{sortIcon('spendSmlouvy_' + group.code, 'stav')}</ThNarrowSort>
                                                <ThRSort onClick={() => handleTableSort('spendSmlouvy_' + group.code, 'castka')}>Částka{sortIcon('spendSmlouvy_' + group.code, 'castka')}</ThRSort>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {pagedDetail.items.map(order => (
                                                <Tr key={order.id}>
                                                  <Td>{renderOrderLink(order, 'spendBySmlouvy')}</Td>
                                                  <Td>{highlightText(formatDateCz(getOrderDate(order)), 'spendBySmlouvy')}</Td>
                                                  <SubjectTd>{highlightText(getOrderSubject(order), 'spendBySmlouvy')}</SubjectTd>
                                                  <Td>{renderOrdererStack(order)}</Td>
                                                  <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                  <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'spendBySmlouvy')}</TdNarrow>
                                                  <TdNarrow style={{ fontWeight: 600, color: '#1e293b' }}>{renderFinancingRefCell(order, 'spendBySmlouvy')}</TdNarrow>
                                                  <TdNarrow>{highlightText(getOrderTypeLabel(order), 'spendBySmlouvy')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                                  <TdNarrow>{highlightText(getOrderStatusLabel(order), 'spendBySmlouvy')}</TdNarrow>
                                                  <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'spendBySmlouvy')}</TdR>
                                                </Tr>
                                              ))}
                                            </tbody>
                                          </Table>
                                        </TableWrapper>
                                        {renderPagination('spendSmlouvy_' + group.code, pagedDetail)}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Souhrnný řádek celkem */}
                              {filteredSpendBySmlouvyGroups.length > 1 && (
                                <SmlouvySummaryRow style={{ gridTemplateColumns: GRID_COLS }}>
                                  <span />
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Celkem ({filteredSpendBySmlouvyGroups.length} smluv)
                                  </div>
                                  <span />
                                  <span />
                                  {/* Limit celkem */}
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: "'Roboto Condensed', Roboto, sans-serif", color: '#1e293b', whiteSpace: 'nowrap' }}>{fmtCurrency(totalLimit)}</div>
                                  </div>
                                  {/* Vyčerpáno celkem */}
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981', fontFamily: "'Roboto Condensed', Roboto, sans-serif", whiteSpace: 'nowrap' }}>{fmtCurrency(totalSkutecne)}</div>
                                    {totalVProcesu > 0 && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', fontFamily: "'Roboto Condensed', Roboto, sans-serif" }}>+ {fmtCurrency(totalVProcesu)} v procesu</div>}
                                  </div>
                                  {/* Zbývá celkem */}
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: (totalLimit - totalSkutecne) < 0 ? '#ef4444' : '#10b981', fontFamily: "'Roboto Condensed', Roboto, sans-serif", whiteSpace: 'nowrap' }}>
                                      {totalLimit > 0 ? fmtCurrency(totalLimit - totalSkutecne) : '—'}
                                    </div>
                                    {totalVProcesu > 0 && totalLimit > 0 && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', fontFamily: "'Roboto Condensed', Roboto, sans-serif" }}>→ Volné: {fmtCurrency(totalLimit - totalSkutecne - totalVProcesu)}</div>}
                                  </div>
                                  {/* Celkový bar */}
                                  {totalLimit > 0
                                    ? (() => {
                                        const totalVolne = totalLimit - totalSkutecne - totalVProcesu;
                                        return (
                                          <SmlouvyJezWrap>
                                            <SmlouvyJezHeader>
                                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 800, color: totalBarColor, letterSpacing: '-0.02em' }}>{totalCerpaniPct.toFixed(1)}%</span>
                                                <span style={{ fontSize: '0.52rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>celkové čerpání</span>
                                              </div>
                                              <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                                                <span style={{ display: 'block', fontSize: '0.52rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>VOLNÉ PROSTŘEDKY</span>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a', fontFamily: "'Roboto Condensed', Roboto, sans-serif", whiteSpace: 'nowrap' }}>{fmtCurrency(totalVolne)}</span>
                                              </div>
                                            </SmlouvyJezHeader>
                                            <SmlouvyJezBarOuter>
                                              <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 20, pointerEvents: 'none' }}>
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                  <div key={i} style={{ flex: 1, borderRight: '1px solid rgba(203,213,225,0.3)', background: i === currentMonthIdx ? 'rgba(100,116,139,0.05)' : 'transparent' }} />
                                                ))}
                                              </div>
                                              <SmlouvyJezTargetLine $percent={targetPct} />
                                              <SmlouvyJezBarFill $percent={totalSpentPct} $color={totalBarColor} />
                                              {totalInProcessPct > 0 && (
                                                <SmlouvyJezBarPlanned $left={Math.min(totalSpentPct, 100)} $percent={totalInProcessPct} $color={totalBarColorLight} />
                                              )}
                                            </SmlouvyJezBarOuter>
                                          </SmlouvyJezWrap>
                                        );
                                      })()
                                    : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                                  }
                                  <span />
                                </SmlouvySummaryRow>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                  </SectionCard>
                )}

                {false && (
                  <SectionCard id="section-spendByCashbook">
                    <SectionHeader>
                      <SectionTitle>
                        <FontAwesomeIcon icon={faCoins} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                        Přehled čerpání – Pokladna
                      </SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {cashbookLoading && <SectionBadge $tone="info">Načítám...</SectionBadge>}
                        {!cashbookLoading && cashbookBooksToRender.length > 0 && (
                          <>
                            <ExpandAllBtn
                              onClick={() => {
                                const allKeys = cashbookBooksToRender.map(b =>
                                  `spend_${b.mesic ? `month_${b.kniha_id}` : `year_${b.pokladna_id}_${b.rok}`}`
                                );
                                const allExp = allKeys.every(k => expandedCashbookRows.has(k));
                                setExpandedCashbookRows(prev => {
                                  const next = new Set(prev);
                                  if (allExp) { allKeys.forEach(k => next.delete(k)); }
                                  else {
                                    allKeys.forEach(k => next.add(k));
                                    cashbookBooksToRender.forEach(b => {
                                      if (b.mesic && b.kniha_id && !cashbookEntries[b.kniha_id]) loadCashbookEntries(b.kniha_id);
                                      else if (!b.mesic && b.mesice) b.mesice.forEach(m => { if (m.kniha_id && !cashbookEntries[m.kniha_id]) loadCashbookEntries(m.kniha_id); });
                                    });
                                  }
                                  return next;
                                });
                              }}
                              title="Rozbalit / sbalit všechny pokladny"
                            >
                              <FontAwesomeIcon icon={cashbookBooksToRender.every(b => expandedCashbookRows.has(`spend_${b.mesic ? `month_${b.kniha_id}` : `year_${b.pokladna_id}_${b.rok}`}`)) ? faMinus : faPlus} />
                              {cashbookBooksToRender.every(b => expandedCashbookRows.has(`spend_${b.mesic ? `month_${b.kniha_id}` : `year_${b.pokladna_id}_${b.rok}`}`)) ? 'Sbalit vše' : 'Rozbalit vše'}
                            </ExpandAllBtn>
                            <SectionBadge $tone="warn">{cashbookBooksToRender.length} pokladen</SectionBadge>
                          </>
                        )}
                      </div>
                    </SectionHeader>

                    {/* Summary: celkové výdaje */}
                    {cashbookData?.summary && !cashbookLoading && (
                      <div style={{ padding: '0.75rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Celkové výdaje</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#b91c1c', fontFamily: 'monospace', marginTop: '0.15rem' }}>{fmtCurrency(cashbookData.summary.celkem_vydaje || 0)}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Celkové příjmy</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#15803d', fontFamily: 'monospace', marginTop: '0.15rem' }}>{fmtCurrency(cashbookData.summary.celkem_prijmy || 0)}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Operací celkem</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#475569', fontFamily: 'monospace', marginTop: '0.15rem' }}>{(cashbookData.summary.celkem_zaznamu || 0).toLocaleString('cs-CZ')}</div>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 'auto' }}>
                          {cashbookFilters.mesic ? `${cashbookFilters.mesic}/${cashbookFilters.rok}` : `celý rok ${cashbookFilters.rok}`}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: cashbookBooksToRender.length > 0 ? '0.75rem' : 0 }}>
                      {cashbookLoading ? null : cashbookBooksToRender.length === 0 ? (
                        <EmptyState>Žádná data pokladny pro zvolené období</EmptyState>
                      ) : (
                        <>
                          {/* Záhlaví sloupců */}
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px 190px', gap: '0.75rem', padding: '0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div />
                            <div>Pokladna</div>
                            <div style={{ textAlign: 'right' }}>Operací</div>
                            <div style={{ textAlign: 'right', color: '#b91c1c' }}>Výdaje</div>
                            <div style={{ textAlign: 'right', color: '#15803d' }}>Příjmy</div>
                          </div>

                          {cashbookBooksToRender.map(book => {
                            const expandKey = `spend_${book.mesic ? `month_${book.kniha_id}` : `year_${book.pokladna_id}_${book.rok}`}`;
                            const isOpen = expandedCashbookRows.has(expandKey);
                            const bookEntries = book.mesic
                              ? cashbookEntries[book.kniha_id]
                              : (book.mesice || []).flatMap(m => cashbookEntries[m.kniha_id] || []);
                            const vydaje = book.celkove_vydaje || 0;
                            const prijmy = book.celkove_prijmy || 0;
                            const pocet = book.pocet_zaznamu || 0;
                            const nazev = book.pokladna_nazev || `Pokladna ${book.cislo_pokladny}`;

                            return (
                              <div key={expandKey} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => {
                                    setExpandedCashbookRows(prev => {
                                      const next = new Set(prev);
                                      if (next.has(expandKey)) { next.delete(expandKey); }
                                      else {
                                        next.add(expandKey);
                                        if (book.mesic && book.kniha_id && !cashbookEntries[book.kniha_id]) loadCashbookEntries(book.kniha_id);
                                        else if (!book.mesic && book.mesice) book.mesice.forEach(m => { if (m.kniha_id && !cashbookEntries[m.kniha_id]) loadCashbookEntries(m.kniha_id); });
                                      }
                                      return next;
                                    });
                                  }}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: isOpen ? '#eff6ff' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#3b82f6', lineHeight: 1, textAlign: 'center' }}>{isOpen ? '\u2212' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {nazev}
                                    {book.hlavni_uzivatel && <span style={{ fontWeight: '400', color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>({book.hlavni_uzivatel})</span>}
                                    {!book.mesic && book.mesice && <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.4rem' }}>• {book.mesice.length} měs.</span>}
                                  </span>
                                  <SectionBadge $tone="info" style={{ textAlign: 'right', justifySelf: 'end' }}>{pocet}</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#b91c1c', textAlign: 'right', fontWeight: '600' }}>−{fmtCurrency(vydaje)}</span>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#15803d', textAlign: 'right', fontWeight: '600' }}>+{fmtCurrency(prijmy)}</span>
                                </div>

                                {isOpen && (
                                  <div style={{ padding: '0.75rem 1rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                    {bookEntries === undefined ? (
                                      <div style={{ padding: '1rem', textAlign: 'center', color: '#a8a29e', fontSize: '0.875rem', fontStyle: 'italic' }}>Načítám položky...</div>
                                    ) : !Array.isArray(bookEntries) || bookEntries.length === 0 ? (
                                      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>Žádné záznamy</div>
                                    ) : (
                                      <TableWrapper style={{ margin: 0 }}>
                                        <Table>
                                          <thead>
                                            <tr>
                                              <Th style={{ width: '95px' }}>Datum</Th>
                                              <Th style={{ width: '110px' }}>Č. dokladu</Th>
                                              <Th>Obsah zápisu</Th>
                                              <Th style={{ width: '140px' }}>Komu / Od koho</Th>
                                              <ThR style={{ color: '#b91c1c', width: '110px' }}>Výdaj</ThR>
                                              <ThR style={{ color: '#15803d', width: '110px' }}>Příjem</ThR>
                                              <Th style={{ width: '110px' }}>LP kód</Th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {bookEntries.map((entry, idx) => (
                                              <Tr key={entry.id || idx} style={{ fontSize: '0.8rem' }}>
                                                <Td>{entry.datum_zapisu ? new Date(entry.datum_zapisu).toLocaleDateString('cs-CZ') : '-'}</Td>
                                                <Td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{entry.cislo_dokladu || '-'}</Td>
                                                <Td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.obsah_zapisu || '-'}</Td>
                                                <Td style={{ fontSize: '0.75rem' }}>{entry.komu_od_koho || '-'}</Td>
                                                <TdR style={{ color: entry.castka_vydaj > 0 ? '#b91c1c' : '#94a3b8', fontWeight: entry.castka_vydaj > 0 ? '600' : 'normal' }}>
                                                  {entry.castka_vydaj > 0 ? fmtCurrency(entry.castka_vydaj) : '-'}
                                                </TdR>
                                                <TdR style={{ color: entry.castka_prijem > 0 ? '#15803d' : '#94a3b8', fontWeight: entry.castka_prijem > 0 ? '600' : 'normal' }}>
                                                  {entry.castka_prijem > 0 ? fmtCurrency(entry.castka_prijem) : '-'}
                                                </TdR>
                                                <Td style={{ fontSize: '0.75rem' }}>
                                                  {entry.detail_items?.length > 0
                                                    ? entry.detail_items.map((item, ii) => <div key={ii}>{item.lp_kod} ({fmtCurrency(item.castka)})</div>)
                                                    : entry.lp_kod || '-'}
                                                </Td>
                                              </Tr>
                                            ))}
                                          </tbody>
                                        </Table>
                                      </TableWrapper>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </SectionCard>
                )}

              </>
            )}

            {activeTab === 'stats' && (
              <ChartGrid>

                {/* 📈 TIMELINE - Denní vývoj částek objednávek (celá šířka) */}
                {isBlockVisible('stats', 'chartTimeline') && timelineData && timelineData.length > 0 && (() => {
                  const labels = timelineData.map(d => {
                    const date = new Date(d.datum);
                    return `${date.getDate()}.${date.getMonth() + 1}.`;
                  });
                  const maxDphData = timelineCumulative
                    ? timelineData.map(d => Math.round(d.max_dph_cumulative / 1000))
                    : timelineData.map(d => Math.round(d.max_dph / 1000));
                  const polozkyData = timelineCumulative
                    ? timelineData.map(d => Math.round(d.polozky_sum_cumulative / 1000))
                    : timelineData.map(d => Math.round(d.polozky_sum / 1000));
                  const fakturyData = timelineCumulative
                    ? timelineData.map(d => Math.round(d.faktury_sum_cumulative / 1000))
                    : timelineData.map(d => Math.round(d.faktury_sum / 1000));
                  
                  const timelineChartData = {
                    labels,
                    datasets: [
                      {
                        label: 'MAX DPH (tis. Kč)',
                        data: maxDphData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointStyle: 'rect',
                        pointBackgroundColor: '#3b82f6',
                        pointHoverRadius: 5
                      },
                      {
                        label: 'Součet cen položek (tis. Kč)',
                        data: polozkyData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointStyle: 'rect',
                        pointBackgroundColor: '#10b981',
                        pointHoverRadius: 5
                      },
                      {
                        label: 'Součet FA - částka faktur (tis. Kč)',
                        data: fakturyData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointStyle: 'rect',
                        pointBackgroundColor: '#f59e0b',
                        pointHoverRadius: 5
                      }
                    ]
                  };
                  
                  const timelineOpts = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      datalabels: { display: false },
                      legend: {
                        position: 'bottom',
                        labels: {
                          boxWidth: 12,
                          padding: 15,
                          font: { size: 11 }
                        }
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                          label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value.toLocaleString('cs-CZ')}k Kč`;
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          maxTicksLimit: 20,
                          autoSkip: true,
                          font: { size: 10 }
                        }
                      },
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Částka (tis. Kč)'
                        },
                        ticks: {
                          callback: v => `${v}k`
                        }
                      }
                    },
                    interaction: {
                      mode: 'nearest',
                      axis: 'x',
                      intersect: false
                    }
                  };
                  
                  const timelineChartEl = <ChartWrapper style={{ height: '567px' }}><Line data={timelineChartData} options={timelineOpts} plugins={[crosshairPlugin]} /></ChartWrapper>;
                  
                  return (
                    <ChartCardWide id="section-chartTimeline">
                      <SectionTitle>
                        📈 Vývoj částek objednávek v roce {new Date().getFullYear()} ({timelineCumulative ? 'kumulativně' : 'den po dni'})
                      </SectionTitle>
                      <ChartToggleBtn
                        title={timelineCumulative ? 'Přepnout na denní pohled' : 'Přepnout na kumulativní pohled'}
                        onClick={() => setTimelineCumulative(v => {
                          const next = !v;
                          try { localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_timeline_cumulative`, String(next)); } catch (_) {}
                          return next;
                        })}
                      >
                        <FontAwesomeIcon icon={timelineCumulative ? faLayerGroup : faChartLine} />
                      </ChartToggleBtn>
                      <ChartExpandBtn 
                        title="Celá obrazovka (ESC = zavřít)" 
                        onClick={() => setFullscreenChart({ 
                          title: `Vývoj částek objednávek v roce ${new Date().getFullYear()}`, 
                          el: <Line data={timelineChartData} options={withFsFont(timelineOpts)} plugins={[crosshairPlugin]} />
                        })}
                      >
                        <FontAwesomeIcon icon={faExpand} />
                      </ChartExpandBtn>
                      {timelineChartEl}
                    </ChartCardWide>
                  );
                })()}

                {/* Financování - počet + částka */}
                {isBlockVisible('stats', 'chartFinancing') && (() => {
                  const entries = Object.entries(statisticsCharts.byFinancing);
                  const labels = entries.map(([k]) => k);
                  const counts = entries.map(([, v]) => v.count);
                  const amounts = entries.map(([, v]) => Math.round(v.amount / 1000));
                  const colors = buildChartColors(labels.length, CHART_COLORS);
                  const finData = { labels, datasets: [
                    { label: 'Počet', data: counts, backgroundColor: colors.map(c => c + 'cc'), yAxisID: 'yCount', order: 2 },
                    { label: 'Částka (tis. Kč)', data: amounts, backgroundColor: colors, yAxisID: 'yAmount', order: 1 }
                  ]};
                  const finOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: dualAxisLegendPlugin }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const finChartEl = labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <ChartWrapper><Bar data={finData} options={finOpts} /></ChartWrapper>;
                  return (
                    <ChartCard id="section-chartFinancing">
                      <SectionTitle>Financování – počet a částka</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Financování – počet a částka', el: labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <Bar data={finData} options={withFsFont(finOpts)} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      {finChartEl}
                    </ChartCard>
                  );
                })()}

                {/* Úseky - počet + částka */}
                {isBlockVisible('stats', 'chartUsek') && (() => {
                  const entries = Object.entries(statisticsCharts.byUsek);
                  const labels = entries.map(([k]) => k);
                  const counts = entries.map(([, v]) => v.count);
                  const amounts = entries.map(([, v]) => Math.round(v.amount / 1000));
                  const colors = buildChartColors(labels.length, CHART_COLORS);
                  const usekData = { labels, datasets: [
                    { label: 'Počet', data: counts, backgroundColor: colors.map(c => c + 'cc'), yAxisID: 'yCount', order: 2 },
                    { label: 'Částka (tis. Kč)', data: amounts, backgroundColor: colors, yAxisID: 'yAmount', order: 1 }
                  ]};
                  const usekOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: dualAxisLegendPlugin }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const usekChartEl = labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <ChartWrapper><Bar data={usekData} options={usekOpts} /></ChartWrapper>;
                  return (
                    <ChartCard id="section-chartUsek">
                      <SectionTitle>Úseky – počet a částka</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Úseky – počet a částka', el: labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <Bar data={usekData} options={withFsFont(usekOpts)} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      {usekChartEl}
                    </ChartCard>
                  );
                })()}

                {/* Druhy objednávek - počet + částka */}
                {isBlockVisible('stats', 'chartDruh') && (() => {
                  const entries = Object.entries(statisticsCharts.byDruh);
                  const labels = entries.map(([k]) => k);
                  const counts = entries.map(([, v]) => v.count);
                  const amounts = entries.map(([, v]) => Math.round(v.amount / 1000));
                  const colors = buildChartColors(labels.length, CHART_COLORS);
                  const druhData = { labels, datasets: [
                    { label: 'Počet', data: counts, backgroundColor: colors.map(c => c + 'cc'), yAxisID: 'yCount', order: 2 },
                    { label: 'Částka (tis. Kč)', data: amounts, backgroundColor: colors, yAxisID: 'yAmount', order: 1 }
                  ]};
                  const druhOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: dualAxisLegendPlugin }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const druhChartEl = labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <ChartWrapper><Bar data={druhData} options={druhOpts} /></ChartWrapper>;
                  return (
                    <ChartCard id="section-chartDruh">
                      <SectionTitle>Druhy objednávek – počet a částka</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Druhy objednávek – počet a částka', el: labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <Bar data={druhData} options={withFsFont(druhOpts)} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      {druhChartEl}
                    </ChartCard>
                  );
                })()}

                {/* LP kódy - počet + částka */}
                {isBlockVisible('stats', 'chartLpKod') && (() => {
                  const entries = Object.entries(statisticsCharts.byLpKod);
                  const labels = entries.map(([k]) => k);
                  const counts = entries.map(([, v]) => v.count);
                  const amounts = entries.map(([, v]) => Math.round(v.amount / 1000));
                  const colors = buildChartColors(labels.length, CHART_COLORS);
                  if (labels.length === 0) return null;
                  const lpData = { labels, datasets: [
                    { label: 'Počet', data: counts, backgroundColor: colors.map(c => c + 'cc'), yAxisID: 'yCount', order: 2 },
                    { label: 'Částka (tis. Kč)', data: amounts, backgroundColor: colors, yAxisID: 'yAmount', order: 1 }
                  ]};
                  const lpOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: dualAxisLegendPlugin }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const lpChartEl = <ChartWrapper><Bar data={lpData} options={lpOpts} /></ChartWrapper>;
                  return (
                    <ChartCard id="section-chartLpKod">
                      <SectionTitle>LP kódy – počet a částka</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'LP kódy – počet a částka', el: <Bar data={lpData} options={withFsFont(lpOpts)} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      {lpChartEl}
                    </ChartCard>
                  );
                })()}

                {/* Top dodavatelé */}
                {isBlockVisible('stats', 'chartTopSuppliers') && (() => {
                  const suppliers = statisticsCharts.topSuppliers;
                  const labels = suppliers.map(([name]) => name);
                  const amounts = suppliers.map(([, v]) => Math.round(v.amount / 1000));
                  const counts = suppliers.map(([, v]) => v.count);
                  const colors = buildChartColors(labels.length, CHART_COLORS);
                  const suppData = { labels, datasets: [{ label: 'Částka (tis. Kč)', data: amounts, backgroundColor: colors, borderColor: colors, borderWidth: 1 }] };
                  const suppOpts = {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => {
                            const i = ctx.dataIndex;
                            return [
                              `Počet: ${counts[i]} ks`,
                              `Částka: ${amounts[i].toLocaleString('cs-CZ')} tis. Kč`
                            ];
                          }
                        }
                      }
                    },
                    scales: { x: { ticks: { callback: v => `${v}k` } } }
                  };
                  const suppEl = suppliers.length === 0 ? <EmptyState>Bez dat</EmptyState> : <ChartWrapper><Bar data={suppData} options={suppOpts} /></ChartWrapper>;
                  return (
                    <ChartCard id="section-chartTopSuppliers">
                      <SectionTitle>Top dodavatelé (částka)</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Top dodavatelé (částka)', el: suppliers.length === 0 ? <EmptyState>Bez dat</EmptyState> : <Bar data={suppData} options={withFsFont(suppOpts)} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      {suppEl}
                    </ChartCard>
                  );
                })()}

                {/* Top objednatelé - horizontální bar, X = částka, tooltip = počet + částka */}
                {isBlockVisible('stats', 'chartTopBuyers') && (() => {
                  const buyers = statisticsCharts.topBuyers;
                  if (buyers.length === 0) return null;
                  const labels = buyers.map(([name]) => name);
                  const amounts = buyers.map(([, v]) => Math.round(v.amount / 1000));
                  const colors = buildChartColors(labels.length, CHART_COLORS);
                  const buyerData = { labels, datasets: [
                    { label: 'Částka (tis. Kč)', data: amounts, backgroundColor: colors, borderColor: colors, borderWidth: 1 }
                  ]};
                  const buyerOpts = {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => {
                            const v = buyers[ctx.dataIndex]?.[1];
                            if (!v) return ctx.formattedValue;
                            return [
                              `Počet: ${v.count} ks`,
                              `Částka: ${Math.round(v.amount / 1000).toLocaleString('cs-CZ')} tis. Kč`
                            ];
                          }
                        }
                      }
                    },
                    scales: {
                      x: { title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                    }
                  };
                  const buyerEl = <ChartWrapper><Bar data={buyerData} options={buyerOpts} /></ChartWrapper>;
                  return (
                    <ChartCard id="section-chartTopBuyers">
                      <SectionTitle>Top objednatelé (částka)</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Top objednatelé (částka)', el: <Bar data={buyerData} options={withFsFont(buyerOpts)} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      {buyerEl}
                    </ChartCard>
                  );
                })()}

                {/* Koláčový: členění dle financování */}
                {isBlockVisible('stats', 'chartDonutFinancing') && (() => {
                  const entries = Object.entries(statisticsCharts.byFinancing || {});
                  if (entries.length === 0) return null;
                  const fmtAmtShort = (v) => {
                    if (v >= 1e6) return (v / 1e6).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' mil. Kč';
                    if (v >= 1000) return Math.round(v / 1000).toLocaleString('cs-CZ') + ' tis. Kč';
                    return Math.round(v).toLocaleString('cs-CZ') + ' Kč';
                  };
                  const sorted = [...entries].sort((a, b) => b[1].amount - a[1].amount);
                  const labels = sorted.map(([k]) => k);
                  const counts = sorted.map(([, v]) => v.count);
                  const amounts = sorted.map(([, v]) => v.amount);
                  const totalCount = counts.reduce((a, b) => a + b, 0);
                  const colors = buildChartColors(labels.length, CHART_COLORS);
                  const donutFinData = {
                    labels,
                    datasets: [{
                      data: counts,
                      backgroundColor: colors,
                      borderColor: '#fff',
                      borderWidth: 2
                    }]
                  };
                  const donutFinOpts = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      datalabels: {
                        display: ctx => totalCount > 0 && (ctx.dataset.data[ctx.dataIndex] * 100 / totalCount) >= 5,
                        formatter: (value) => (totalCount > 0 ? Math.round(value * 100 / totalCount) : 0) + ' %',
                        color: '#fff',
                        font: { size: 11, weight: 'bold' },
                        textShadowColor: 'rgba(0,0,0,0.4)',
                        textShadowBlur: 3,
                      },
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => {
                            const pct = totalCount > 0 ? Math.round(ctx.parsed * 100 / totalCount) : 0;
                            return ` ${ctx.label}: ${ctx.parsed} ks (${pct} %), ${fmtAmtShort(amounts[ctx.dataIndex])}`;
                          }
                        }
                      }
                    }
                  };
                  const finLegendItems = labels.map((lbl, i) => ({ label: lbl, color: colors[i], amountStr: fmtAmtShort(amounts[i]) }));
                  return (
                    <ChartCard id="section-chartDonutFinancing">
                      <SectionTitle>Financování – členění (počty)</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Financování – členění (počty)', el: <Doughnut data={donutFinData} options={withFsFont(donutFinOpts)} plugins={[ChartDataLabels]} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      <div style={{ display: 'flex', gap: '1rem', height: '380px', alignItems: 'center' }}>
                        <div style={{ flex: '0 0 52%', position: 'relative', height: '100%' }}>
                          <Doughnut data={donutFinData} options={donutFinOpts} plugins={[ChartDataLabels]} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingRight: '0.25rem' }}>
                          {finLegendItems.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <div style={{ width: 13, height: 13, background: item.color, borderRadius: 3, flexShrink: 0, marginTop: 3 }} />
                              <div style={{ lineHeight: 1.35 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.amountStr}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ChartCard>
                  );
                })()}

                {/* Koláčový: členění dle stavu objednávek */}
                {isBlockVisible('stats', 'chartDonutStav') && (() => {
                  const rawEntries = Object.entries(statisticsCharts.byStav || {});
                  if (rawEntries.length === 0) return null;
                  const fmtAmtShort = (v) => {
                    if (v >= 1e6) return (v / 1e6).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' mil. Kč';
                    if (v >= 1000) return Math.round(v / 1000).toLocaleString('cs-CZ') + ' tis. Kč';
                    return Math.round(v).toLocaleString('cs-CZ') + ' Kč';
                  };
                  // Sémantické barvy dle workflow kódu (z OrderForm25)
                  const STAV_COLORS = {
                    'NOVA':                  '#94a3b8',
                    'ODESLANA_KE_SCHVALENI': '#f59e0b',
                    'CEKA_SE':               '#fbbf24',
                    'SCHVALENA':             '#10b981',
                    'ZAMITNUTA':             '#ef4444',
                    'NESCHVALENA':           '#dc2626',
                    'ROZPRACOVANA':          '#3b82f6',
                    'ODESLANA':              '#0ea5e9',
                    'POTVRZENA':             '#059669',
                    'UVEREJNIT':             '#a855f7',
                    'NEUVEREJNIT':           '#9ca3af',
                    'UVEREJNENA':            '#7c3aed',
                    'FAKTURACE':             '#6366f1',
                    'VECNA_SPRAVNOST':       '#8b5cf6',
                    'ZKONTROLOVANA':         '#14b8a6',
                    'DOKONCENA':             '#22c55e',
                    'ZRUSENA':               '#ef4444',
                  };
                  // Reverzní mapa label → kód (z orderStatesMap)
                  const labelToCode = Object.fromEntries(Object.entries(orderStatesMap).map(([code, label]) => [label, code]));
                  // Pořadí dle workflow manageru (OrderForm25)
                  const WORKFLOW_ORDER = [
                    'NOVA', 'ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA', 'NESCHVALENA', 'SCHVALENA',
                    'ROZPRACOVANA', 'ODESLANA', 'POTVRZENA', 'UVEREJNIT', 'NEUVEREJNIT', 'UVEREJNENA',
                    'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA', 'ZRUSENA'
                  ];
                  // Chart data seřazena dle počtu (vizuální koláč)
                  const sorted = [...rawEntries].sort((a, b) => b[1].count - a[1].count);
                  const labels = sorted.map(([k]) => k);
                  const counts = sorted.map(([, v]) => v.count);
                  const amounts = sorted.map(([, v]) => v.amount);
                  const total = counts.reduce((a, b) => a + b, 0);
                  const stavColors = labels.map((lbl, i) => {
                    const code = labelToCode[lbl];
                    return STAV_COLORS[code] || CHART_COLORS[i % CHART_COLORS.length];
                  });
                  const donutStavData = {
                    labels,
                    datasets: [{
                      data: counts,
                      backgroundColor: stavColors,
                      borderColor: '#fff',
                      borderWidth: 2
                    }]
                  };
                  const donutStavOpts = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      datalabels: {
                        display: ctx => total > 0 && (ctx.dataset.data[ctx.dataIndex] * 100 / total) >= 5,
                        formatter: (value) => (total > 0 ? Math.round(value * 100 / total) : 0) + ' %',
                        color: '#fff',
                        font: { size: 11, weight: 'bold' },
                        textShadowColor: 'rgba(0,0,0,0.4)',
                        textShadowBlur: 3,
                      },
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => {
                            const pct = total > 0 ? Math.round(ctx.parsed * 100 / total) : 0;
                            return ` ${ctx.label}: ${ctx.parsed} ks (${pct} %), ${fmtAmtShort(amounts[ctx.dataIndex])}`;
                          }
                        }
                      }
                    }
                  };
                  const stavLegendItems = labels
                    .map((lbl, i) => ({ label: lbl, color: stavColors[i], amountStr: fmtAmtShort(amounts[i]), code: labelToCode[lbl] || '' }))
                    .sort((a, b) => {
                      const ia = WORKFLOW_ORDER.indexOf(a.code);
                      const ib = WORKFLOW_ORDER.indexOf(b.code);
                      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                    });
                  return (
                    <ChartCard id="section-chartDonutStav">
                      <SectionTitle>Stavy objednávek vč. stornovaných</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Stavy objednávek vč. stornovaných', el: <Doughnut data={donutStavData} options={withFsFont(donutStavOpts)} plugins={[ChartDataLabels]} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      <div style={{ display: 'flex', gap: '1rem', height: '380px', alignItems: 'center' }}>
                        <div style={{ flex: '0 0 52%', position: 'relative', height: '100%' }}>
                          <Doughnut data={donutStavData} options={donutStavOpts} plugins={[ChartDataLabels]} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem 0.75rem', paddingRight: '0.25rem', alignContent: 'start' }}>
                          {stavLegendItems.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                              <div style={{ width: 12, height: 12, background: item.color, borderRadius: 3, flexShrink: 0, marginTop: 3 }} />
                              <div style={{ lineHeight: 1.3 }}>
                                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                                <div style={{ fontSize: '0.67rem', color: '#64748b' }}>{item.amountStr}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ChartCard>
                  );
                })()}

              </ChartGrid>
            )}

            {activeTab === 'reports' && (
              <>
                {isBlockVisible('reports', 'topSuppliers') && (
                  <SectionCard id="section-topSuppliers">
                    <SectionHeader>
                      <SectionTitle>Dodavatelé → Financování → Objednávky</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ExpandAllBtn
                          onClick={() => {
                            var allExp = reportSections.topSuppliers.length > 0 && reportSections.topSuppliers.every(function(g) { return expandedTopSuppDod.has(g.code); });
                            if (allExp) { setExpandedTopSuppDod(new Set()); setExpandedTopSuppFin(new Set()); setExpandedTopSuppDetail(new Set()); }
                            else { setExpandedTopSuppDod(new Set(reportSections.topSuppliers.map(function(g) { return g.code; }))); }
                          }}
                          title="Rozbalit / sbalit"
                        >
                          <FontAwesomeIcon icon={reportSections.topSuppliers.length > 0 && reportSections.topSuppliers.every(function(g) { return expandedTopSuppDod.has(g.code); }) ? faMinus : faPlus} />
                          {reportSections.topSuppliers.length > 0 && reportSections.topSuppliers.every(function(g) { return expandedTopSuppDod.has(g.code); }) ? 'Sbalit vše' : 'Rozbalit vše'}
                        </ExpandAllBtn>
                        <SectionBadge $tone="warn">{reportSections.topSuppliers.length} dodavatelů</SectionBadge>
                        <button onClick={handleExportCsv_topSuppliers} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                      </div>
                    </SectionHeader>
                    <SearchBox>
                      <SearchInputWrapper>
                        <SearchInputIcon><FontAwesomeIcon icon={faSearch} /></SearchInputIcon>
                        <SearchInput
                          type="text"
                          placeholder="Fulltext vyhledávání (dodavatel, financování, objednávky)..."
                          value={getSearchQuery('topSuppliers')}
                          onChange={(e) => setSearchQuery('topSuppliers', e.target.value)}
                        />
                        {getSearchQuery('topSuppliers') && (
                          <SearchClearButton onClick={() => setSearchQuery('topSuppliers', '')} title="Vymazat">
                            <FontAwesomeIcon icon={faXmark} />
                          </SearchClearButton>
                        )}
                      </SearchInputWrapper>
                    </SearchBox>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {reportSections.topSuppliers.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (() => {
                        var query = getSearchQuery('topSuppliers');
                        var filtered = query ? reportSections.topSuppliers.filter(function(group) {
                          if (removeDiacritics(group.label).indexOf(removeDiacritics(query)) >= 0) return true;
                          if (group.ico && group.ico.indexOf(query) >= 0) return true;
                          var finArr = Object.values(group.financovani || {});
                          for (var fi = 0; fi < finArr.length; fi++) {
                            if (removeDiacritics(finArr[fi].label).indexOf(removeDiacritics(query)) >= 0) return true;
                            for (var oi = 0; oi < finArr[fi].orders.length; oi++) {
                              if (searchInVisibleColumns(finArr[fi].orders[oi], query, 'topSuppliers')) return true;
                            }
                          }
                          return false;
                        }) : reportSections.topSuppliers;
                        // Paging pro seznam dodavatelů
                        var tsMainPaging = getTablePaging('topSuppliers_main');
                        var tsMainTotal = filtered.length;
                        var tsMainTotalPages = tsMainTotal > 0 ? Math.ceil(tsMainTotal / tsMainPaging.pageSize) : 0;
                        var tsMainSafePage = tsMainTotalPages > 0 ? Math.min(tsMainPaging.page, tsMainTotalPages) : 1;
                        var tsMainStart = (tsMainSafePage - 1) * tsMainPaging.pageSize;
                        var tsMainEnd = tsMainStart + tsMainPaging.pageSize;
                        var pagedFiltered = filtered.slice(tsMainStart, tsMainEnd);
                        var tsMainPagedInfo = { page: tsMainSafePage, pageSize: tsMainPaging.pageSize, total: tsMainTotal, totalPages: tsMainTotalPages };
                        return (
                          <>
                            {tsMainTotal > tsMainPagedInfo.pageSize && (
                              <div style={{ padding: '0.25rem 1rem 0.5rem', fontSize: '0.78rem', color: '#6b7280' }}>
                                Zobrazeno {tsMainStart + 1}–{Math.min(tsMainEnd, tsMainTotal)} z {tsMainTotal} dodavatelů
                                {query ? ' (filtrováno)' : ''}
                              </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <div
                                title="Rozbalit / sbalit vše"
                                onClick={() => {
                                  var allExp = pagedFiltered.length > 0 && pagedFiltered.every(function(g) { return expandedTopSuppDod.has(g.code); });
                                  if (allExp) { setExpandedTopSuppDod(new Set()); setExpandedTopSuppFin(new Set()); setExpandedTopSuppDetail(new Set()); }
                                  else { setExpandedTopSuppDod(new Set(pagedFiltered.map(function(g) { return g.code; }))); }
                                }}
                                style={{ cursor: 'pointer', color: '#b45309', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                              >
                                {pagedFiltered.length > 0 && pagedFiltered.every(function(g) { return expandedTopSuppDod.has(g.code); }) ? '\u2212' : '+'}
                              </div>
                              <div>Dodavatel</div>
                              <div>I&#268;O</div>
                              <div style={{ textAlign: 'right' }}>Počet</div>
                              <div style={{ textAlign: 'right' }}>Celkem</div>
                            </div>
                            {pagedFiltered.map(function(group) {
                              var grpOpen = expandedTopSuppDod.has(group.code);
                              var finArr = Object.values(group.financovani || {}).sort(function(a, b) { return b.amount - a.amount; });
                              var hasContracts = group.smlouvyTotal > 0;
                              var isMixed = group.hasMixedFinancing;
                              var noUsage = group.hasContractNoUsage;
                              // Barvy: červená = platná smlouva ale nečerpá, oranžová = mix (LP/INDIVID. jen, ne POJISTNÁ), zelená = čistě smlouvy, amber = bez smluv
                              var accentColor = noUsage ? '#b91c1c' : hasContracts ? (isMixed ? '#c2410c' : '#16a34a') : '#b45309';
                              var textColor = noUsage ? '#7f1d1d' : hasContracts ? (isMixed ? '#7c2d12' : '#15803d') : '#78350f';
                              var bgOpen = noUsage ? '#fee2e2' : hasContracts ? (isMixed ? '#ffedd5' : '#f0fdf4') : '#fffbeb';
                              var bgClosed = noUsage ? '#fecaca' : hasContracts ? (isMixed ? '#fed7aa' : '#f0fdf4') : '#f8fafc';
                              var borderColor = noUsage ? '#b91c1c' : hasContracts ? (isMixed ? '#c2410c' : '#16a34a') : '#fde68a';
                              var badgeTone = noUsage ? 'danger' : hasContracts ? (isMixed ? 'warn' : 'ok') : 'warn';
                              return (
                                <div key={group.code} style={{ border: '2px solid ' + borderColor, borderRadius: '10px', overflow: 'hidden' }}>
                                  <div
                                    onClick={() => setExpandedTopSuppDod(function(prev) { var next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                    style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? bgOpen : bgClosed, cursor: 'pointer', userSelect: 'none', borderLeft: (hasContracts || noUsage) ? '4px solid ' + accentColor : 'none' }}
                                  >
                                    <span style={{ fontSize: '1rem', fontWeight: '700', color: accentColor, lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                      <span style={{ fontWeight: '700', color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{highlightText(group.label, 'topSuppliers')}{(hasContracts || noUsage) ? ' (' + group.smlouvyActive + '/' + group.smlouvyTotal + ')' : ''}</span>
                                      {group.smlouvyItems.length > 0 && (
                                        <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {group.smlouvyItems.map(function(si, idx) {
                                            return (
                                              <React.Fragment key={idx}>
                                                {idx > 0 && ', '}
                                                <span style={si.isValid ? { color: '#16a34a', fontWeight: 600 } : { color: '#9ca3af', textDecoration: 'line-through' }}>{si.cislo}</span>
                                              </React.Fragment>
                                            );
                                          })}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.ico || '—'}</span>
                                    <SectionBadge $tone={badgeTone} style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                                    <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                                  </div>
                                  {grpOpen && (
                                    <TableWrapper style={{ margin: 0 }}>
                                      <Table>
                                        <thead>
                                          <tr>
                                            <Th style={{ width: '24px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: '#6b7280', fontSize: '0.95rem', fontWeight: '900' }}
                                              title="Rozbalit / sbalit"
                                              onClick={function(e) {
                                                e.stopPropagation();
                                                var allOpen = finArr.length > 0 && finArr.every(function(f) { return expandedTopSuppFin.has('ts_' + group.code + '_' + f.code); });
                                                setExpandedTopSuppFin(function(prev) {
                                                  var next = new Set(prev);
                                                  finArr.forEach(function(f) { var k = 'ts_' + group.code + '_' + f.code; if (allOpen) next.delete(k); else next.add(k); });
                                                  return next;
                                                });
                                              }}
                                            >
                                              {finArr.length > 0 && finArr.every(function(f) { return expandedTopSuppFin.has('ts_' + group.code + '_' + f.code); }) ? '\u2212' : '+'}
                                            </Th>
                                            <Th>Financování</Th>
                                            <ThC>Počet</ThC>
                                            <ThR>Celkem</ThR>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {finArr.map(function(fin) {
                                            var finKey = 'ts_' + group.code + '_' + fin.code;
                                            var finOpen = expandedTopSuppFin.has(finKey);
                                            var pagedDetail = getPagedItems(sortTableData(fin.orders, finKey, spendOrderAcc), finKey);
                                            return (
                                              <React.Fragment key={finKey}>
                                                <Tr
                                                  onClick={() => setExpandedTopSuppFin(function(prev) { var next = new Set(prev); if (next.has(finKey)) next.delete(finKey); else next.add(finKey); return next; })}
                                                  style={{ cursor: 'pointer', background: finOpen ? '#f1f5f9' : undefined }}
                                                >
                                                  <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{finOpen ? '\u2212' : '+'}</Td>
                                                  <Td>{highlightText(fin.label, 'topSuppliers')}</Td>
                                                  <TdC>{fin.count}</TdC>
                                                  <TdR>{fmtCurrency(fin.amount)}</TdR>
                                                </Tr>
                                                {finOpen && (
                                                  <tr>
                                                    <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                      <TableWrapper style={{ margin: 0 }}>
                                                        <Table>
                                                          <thead>
                                                            <tr>
                                                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort(finKey, 'ev_cislo')}>Číslo{sortIcon(finKey, 'ev_cislo')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(finKey, 'dt_obj')}>Dt. obj.{sortIcon(finKey, 'dt_obj')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(finKey, 'predmet')}>Předmět{sortIcon(finKey, 'predmet')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(finKey, 'objednatel')}>Objednatel{sortIcon(finKey, 'objednatel')}</ThSort>
                                                              <ThSort onClick={() => handleTableSort(finKey, 'schvalovatel')}>Schvalovatel{sortIcon(finKey, 'schvalovatel')}</ThSort>
                                                              <Th>Příkazce</Th>
                                                              <ThNarrowSort onClick={() => handleTableSort(finKey, 'usek')}>Úsek{sortIcon(finKey, 'usek')}</ThNarrowSort>
                                                              <ThSort onClick={() => handleTableSort(finKey, 'financovani')}>Financování{sortIcon(finKey, 'financovani')}</ThSort>
                                                              <ThNarrowSort onClick={() => handleTableSort(finKey, 'detail_fin')}>Detail fin.{sortIcon(finKey, 'detail_fin')}</ThNarrowSort>
                                                              <ThNarrowSort onClick={() => handleTableSort(finKey, 'druh')}>Druh{sortIcon(finKey, 'druh')}</ThNarrowSort>
                                                              <ThNarrowSort onClick={() => handleTableSort(finKey, 'stav')}>Stav{sortIcon(finKey, 'stav')}</ThNarrowSort>
                                                              <ThRSort onClick={() => handleTableSort(finKey, 'castka')}>Částka{sortIcon(finKey, 'castka')}</ThRSort>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {pagedDetail.items.map(function(order) {
                                                              return (
                                                                <Tr key={order.id}>
                                                                  <Td>{renderOrderLink(order, 'topSuppliers')}</Td>
                                                                  <Td>{highlightText(formatDateCz(getOrderDate(order)), 'topSuppliers')}</Td>
                                                                  <SubjectTd>{highlightText(getOrderSubject(order), 'topSuppliers')}</SubjectTd>
                                                                  <Td>{renderOrdererStack(order)}</Td>
                                                                  <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                                                  <Td>{renderPrikazceStack(order)}</Td>
                                                                  <TdNarrow>{highlightText(getOrdererUsekCode(order) || '-', 'topSuppliers')}</TdNarrow>
                                                                  <Td>{renderFinancingLabelCell(order, 'topSuppliers')}</Td>
                                                                  <TdNarrow>{renderFinancingRefCell(order, 'topSuppliers')}</TdNarrow>
                                                                  <TdNarrow>{highlightText(getOrderTypeLabel(order), 'topSuppliers')}{isOrderMajetek(order) && <sup style={{ fontSize: '0.6em', fontWeight: 700, color: '#16a34a', marginLeft: '0.25rem' }}>MAJ</sup>}</TdNarrow>
                                                                  <TdNarrow>{highlightText(getOrderStatusLabel(order), 'topSuppliers')}</TdNarrow>
                                                                  <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'topSuppliers')}</TdR>
                                                                </Tr>
                                                              );
                                                            })}
                                                          </tbody>
                                                        </Table>
                                                      </TableWrapper>
                                                      {renderPagination(finKey, pagedDetail)}
                                                    </td>
                                                  </tr>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                        </tbody>
                                      </Table>
                                    </TableWrapper>
                                  )}
                                </div>
                              );
                            })}
                            {renderPagination('topSuppliers_main', tsMainPagedInfo)}
                          </>
                        );
                      })()}
                    </div>
                  </SectionCard>
                )}

                {isBlockVisible('reports', 'ordersWithoutInvoice') && (
                  <SectionCard id="section-ordersWithoutInvoice">
                  <SectionHeader>
                    <SectionTitle>Objednávky bez faktury 2+ měsíce (schváleno+)</SectionTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="warn">{reportSections.ordersWithoutInvoice.length}</SectionBadge>
                      <button onClick={handleExportCsv_ordersWithoutInvoice} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <SearchInputWrapper style={{ flex: 1 }}>
                      <SearchInputIcon icon={faSearch} />
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('ordersWithoutInvoice')}
                        onChange={(e) => setSearchQuery('ordersWithoutInvoice', e.target.value)}
                      />
                      {getSearchQuery('ordersWithoutInvoice') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('ordersWithoutInvoice', '')}
                          title="Vyčistit vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>Zobrazit:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkIgnorovano} onChange={e => setShowFkIgnorovano(e.target.checked)} style={{ accentColor: '#94a3b8', cursor: 'pointer' }} />
                      Ignorováno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#16a34a', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={showFkVyreseno} onChange={e => setShowFkVyreseno(e.target.checked)} style={{ accentColor: '#16a34a', cursor: 'pointer' }} />
                      Vyřešeno
                    </label>
                  </SearchBox>
                  {pagedOrdersWithoutInvoice.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedOrdersWithoutInvoice.total} z {pagedOrdersWithoutInvoice.originalTotal} záznamů
                    </div>
                  )}
                  {pagedOrdersWithoutInvoice.isFiltered && pagedOrdersWithoutInvoice.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort('ordersWithoutInvoice', 'ev_cislo')}>Objednávka{sortIcon('ordersWithoutInvoice', 'ev_cislo')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutInvoice', 'dt_obj')}>Dt. obj.{sortIcon('ordersWithoutInvoice', 'dt_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutInvoice', 'predmet')}>Předmět{sortIcon('ordersWithoutInvoice', 'predmet')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutInvoice', 'objednatel')}>Objednatel{sortIcon('ordersWithoutInvoice', 'objednatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutInvoice', 'schvalovatel')}>Schvalovatel{sortIcon('ordersWithoutInvoice', 'schvalovatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutInvoice', 'usek')}>Úsek{sortIcon('ordersWithoutInvoice', 'usek')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutInvoice', 'financovani')}>Financování{sortIcon('ordersWithoutInvoice', 'financovani')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithoutInvoice', 'detail_fin')}>Detail fin.{sortIcon('ordersWithoutInvoice', 'detail_fin')}</ThNarrowSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithoutInvoice', 'druh')}>Druh{sortIcon('ordersWithoutInvoice', 'druh')}</ThNarrowSort>
                              <ThRSort onClick={() => handleTableSort('ordersWithoutInvoice', 'castka')}>Částka{sortIcon('ordersWithoutInvoice', 'castka')}</ThRSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithoutInvoice', 'stav')}>Stav obj.{sortIcon('ordersWithoutInvoice', 'stav')}</ThNarrowSort>
                              <ThSort style={{ minWidth: '110px' }} onClick={() => handleTableSort('ordersWithoutInvoice', 'fk_stav')}>Kontrola{sortIcon('ordersWithoutInvoice', 'fk_stav')}</ThSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrdersWithoutInvoice.items.map(order => (
                              <Tr key={order.id}>
                                <Td>{renderOrderLink(order, 'ordersWithoutInvoice')}</Td>
                                <Td>{highlightText(formatDateCz(getOrderDate(order)), 'ordersWithoutInvoice')}</Td>
                                <SubjectTd>{highlightText(getOrderSubject(order), 'ordersWithoutInvoice')}</SubjectTd>
                                <Td>{renderOrdererStack(order)}</Td>
                                <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                <Td>{highlightText(getOrdererUsekCode(order) || '-', 'ordersWithoutInvoice')}</Td>
                                <Td>{renderFinancingLabelCell(order, 'ordersWithoutInvoice')}</Td>
                                <TdNarrow>{renderFinancingRefCell(order, 'ordersWithoutInvoice')}</TdNarrow>
                                <TdNarrow>{highlightText(getOrderTypeLabel(order), 'ordersWithoutInvoice')}</TdNarrow>
                                <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'ordersWithoutInvoice')}</TdR>
                                <TdNarrow>{highlightText(getOrderStatusLabel(order), 'ordersWithoutInvoice')}</TdNarrow>
                                <Td style={{ minWidth: '110px', padding: '0.6rem 0.9rem' }}><FkInlineCell objednavkaId={order.id} fakturaId={0} entityType="OBJ" sectionKey="ordersWithoutInvoice" token={token} username={username} onFkLoad={handleFkLoad} /></Td>
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('ordersWithoutInvoice', pagedOrdersWithoutInvoice)}
                    </>
                  )}
                  </SectionCard>
                )}

                {isBlockVisible('reports', 'ordersWithInvoiceNotDone') && (
                  <SectionCard id="section-ordersWithInvoiceNotDone">
                  <SectionHeader>
                    <SectionTitle>Objednávky s fakturou, nedokončené (mimo vzdělávání)</SectionTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="warn">{reportSections.ordersWithInvoiceNotDone.length}</SectionBadge>
                      <button onClick={handleExportCsv_ordersWithInvoiceNotDone} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox>
                    <SearchInputWrapper>
                      <SearchInputIcon icon={faSearch} />
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('ordersWithInvoiceNotDone')}
                        onChange={(e) => setSearchQuery('ordersWithInvoiceNotDone', e.target.value)}
                      />
                      {getSearchQuery('ordersWithInvoiceNotDone') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('ordersWithInvoiceNotDone', '')}
                          title="Vyčistit vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                  </SearchBox>
                  {pagedOrdersWithInvoiceNotDone.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedOrdersWithInvoiceNotDone.total} z {pagedOrdersWithInvoiceNotDone.originalTotal} záznamů
                    </div>
                  )}
                  {pagedOrdersWithInvoiceNotDone.isFiltered && pagedOrdersWithInvoiceNotDone.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'ev_cislo')}>Objednávka{sortIcon('ordersWithInvoiceNotDone', 'ev_cislo')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'dt_obj')}>Dt. obj.{sortIcon('ordersWithInvoiceNotDone', 'dt_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'objednatel')}>Objednatel{sortIcon('ordersWithInvoiceNotDone', 'objednatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'schvalovatel')}>Schvalovatel{sortIcon('ordersWithInvoiceNotDone', 'schvalovatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'usek')}>Úsek{sortIcon('ordersWithInvoiceNotDone', 'usek')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'financovani')}>Financování{sortIcon('ordersWithInvoiceNotDone', 'financovani')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'detail_fin')}>Detail fin.{sortIcon('ordersWithInvoiceNotDone', 'detail_fin')}</ThNarrowSort>
                              <ThSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'fa_vs')}>VS faktur{sortIcon('ordersWithInvoiceNotDone', 'fa_vs')}</ThSort>
                              <ThSort style={{ width: '90px', maxWidth: '90px' }} onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'fa_typ')}>Typ FA{sortIcon('ordersWithInvoiceNotDone', 'fa_typ')}</ThSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'druh')}>Druh{sortIcon('ordersWithInvoiceNotDone', 'druh')}</ThNarrowSort>
                              <ThRSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'castka')}>Částka{sortIcon('ordersWithInvoiceNotDone', 'castka')}</ThRSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'stav')}>Stav obj.{sortIcon('ordersWithInvoiceNotDone', 'stav')}</ThNarrowSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithInvoiceNotDone', 'fa_stav')}>Stav FA{sortIcon('ordersWithInvoiceNotDone', 'fa_stav')}</ThNarrowSort>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrdersWithInvoiceNotDone.items.map(order => (
                              <Tr key={order.id}>
                                <Td>{renderOrderLink(order, 'ordersWithInvoiceNotDone')}</Td>
                                <Td>{highlightText(formatDateCz(getOrderDate(order)), 'ordersWithInvoiceNotDone')}</Td>
                                <Td>{renderOrdererStack(order)}</Td>
                                <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                <Td>{highlightText(getOrdererUsekCode(order) || '-', 'ordersWithInvoiceNotDone')}</Td>
                                <Td>{renderFinancingLabelCell(order, 'ordersWithInvoiceNotDone')}</Td>
                                <TdNarrow>{renderFinancingRefCell(order, 'ordersWithInvoiceNotDone')}</TdNarrow>
                                <Td>{(invoicesByOrderId[String(order.id)] || []).map(inv => <div key={inv.id}>{renderInvoiceLink(inv)}</div>)}</Td>
                                <Td style={{ width: '90px', maxWidth: '90px' }}>{(invoicesByOrderId[String(order.id)] || []).map(inv => <div key={inv.id}>{renderFaTypBadge(inv.fa_typ, inv.fa_typ_nazev)}</div>)}</Td>
                                <TdNarrow>{highlightText(getOrderTypeLabel(order), 'ordersWithInvoiceNotDone')}</TdNarrow>
                                <TdR>{highlightText(fmtCurrency(getOrderAmount(order)), 'ordersWithInvoiceNotDone')}</TdR>
                                <TdNarrow>{highlightText(getOrderStatusLabel(order), 'ordersWithInvoiceNotDone')}</TdNarrow>
                                <TdNarrow>{(invoicesByOrderId[String(order.id)] || []).map(inv => <div key={inv.id} style={{whiteSpace:'nowrap'}}>{getInvoiceStatusLabel(inv)}</div>)}</TdNarrow>
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('ordersWithInvoiceNotDone', pagedOrdersWithInvoiceNotDone)}
                    </>
                  )}
                  </SectionCard>
                )}

                {isBlockVisible('reports', 'ordersWithMissingLpCerpani') && (
                  <SectionCard id="section-ordersWithMissingLpCerpani">
                  <SectionHeader>
                    <SectionTitle>Objednávky financované z LP s fakturou bez rozkladu na LP</SectionTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SectionBadge $tone="danger">{reportSections.ordersWithMissingLpCerpani.length}</SectionBadge>
                      <button onClick={handleExportCsv_ordersWithMissingLpCerpani} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                    </div>
                  </SectionHeader>
                  <SearchBox>
                    <SearchInputWrapper>
                      <SearchInputIcon icon={faSearch} />
                      <SearchInput
                        type="text"
                        placeholder="Fulltext vyhledávání ve všech zobrazených datech..."
                        value={getSearchQuery('ordersWithMissingLpCerpani')}
                        onChange={(e) => setSearchQuery('ordersWithMissingLpCerpani', e.target.value)}
                      />
                      {getSearchQuery('ordersWithMissingLpCerpani') && (
                        <SearchClearButton
                          onClick={() => setSearchQuery('ordersWithMissingLpCerpani', '')}
                          title="Vyčistit vyhledávání"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </SearchClearButton>
                      )}
                    </SearchInputWrapper>
                  </SearchBox>
                  {pagedOrdersWithMissingLpCerpani.isFiltered && (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                      Nalezeno {pagedOrdersWithMissingLpCerpani.total} z {pagedOrdersWithMissingLpCerpani.originalTotal} záznamů
                    </div>
                  )}
                  {pagedOrdersWithMissingLpCerpani.isFiltered && pagedOrdersWithMissingLpCerpani.total === 0 ? (
                    <SearchEmptyState>
                      <FontAwesomeIcon icon={faSearch} />
                      <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                    </SearchEmptyState>
                  ) : (
                    <>
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort style={{ minWidth: '250px', width: '250px' }} onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'ev_cislo')}>Objednávka{sortIcon('ordersWithMissingLpCerpani', 'ev_cislo')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'dt_obj')}>Dt. obj.{sortIcon('ordersWithMissingLpCerpani', 'dt_obj')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'objednatel')}>Objednatel{sortIcon('ordersWithMissingLpCerpani', 'objednatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'schvalovatel')}>Schvalovatel{sortIcon('ordersWithMissingLpCerpani', 'schvalovatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'usek')}>Úsek{sortIcon('ordersWithMissingLpCerpani', 'usek')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'detail_fin')}>LP kódy{sortIcon('ordersWithMissingLpCerpani', 'detail_fin')}</ThSort>
                              <Th>Faktury s věc. správností</Th>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'druh')}>Druh{sortIcon('ordersWithMissingLpCerpani', 'druh')}</ThNarrowSort>
                              <ThRSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'fa_castka')}>FA částka{sortIcon('ordersWithMissingLpCerpani', 'fa_castka')}</ThRSort>
                              <ThRSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'castka_polozek')}>Částka pol.{sortIcon('ordersWithMissingLpCerpani', 'castka_polozek')}</ThRSort>
                              <ThRSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'max_dph')}>Max DPH{sortIcon('ordersWithMissingLpCerpani', 'max_dph')}</ThRSort>
                              <ThNarrowSort onClick={() => handleTableSort('ordersWithMissingLpCerpani', 'stav')}>Stav obj.{sortIcon('ordersWithMissingLpCerpani', 'stav')}</ThNarrowSort>
                              <ThC style={{ width: '60px' }}>
                                <FontAwesomeIcon icon={faBolt} style={{ color: '#fbbf24' }} />
                              </ThC>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrdersWithMissingLpCerpani.items.map(order => {
                              const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
                              const invoicesWithMissingLp = invoicesForOrder.filter(inv => {
                                const hasConfirmed = inv.potvrdil_vecnou_spravnost_id || inv.potvrdil_vecnou_spravnost_zkracene;
                                return hasConfirmed && inv.lp_cerpani_count === 0;
                              });
                              return (
                                <Tr key={order.id}>
                                  <Td>{renderOrderLink(order, 'ordersWithMissingLpCerpani')}</Td>
                                  <Td>{highlightText(formatDateCz(getOrderDate(order)), 'ordersWithMissingLpCerpani')}</Td>
                                  <Td>{renderOrdererStack(order)}</Td>
                                  <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                                  <Td>{highlightText(getOrdererUsekCode(order) || '-', 'ordersWithMissingLpCerpani')}</Td>
                                  <TdNarrow>{renderFinancingRefCell(order, 'ordersWithMissingLpCerpani')}</TdNarrow>
                                  <Td style={{ fontSize: '0.8rem' }}>
                                    {invoicesWithMissingLp.map(inv => (
                                      <div key={inv.id} style={{ marginBottom: '0.25rem', whiteSpace: 'nowrap' }}>
                                        {renderInvoiceLink(inv)}
                                        <span style={{ marginLeft: '0.4rem', color: '#dc2626', fontWeight: '600' }}>
                                          ⚠ Chybí rozklad na LP
                                        </span>
                                      </div>
                                    ))}
                                  </Td>
                                  <TdNarrow>{highlightText(getOrderTypeLabel(order), 'ordersWithMissingLpCerpani')}</TdNarrow>
                                  <TdR>{highlightText(fmtCurrency(invoicesForOrder.reduce((s, inv) => s + getInvoiceAmount(inv), 0)), 'ordersWithMissingLpCerpani')}</TdR>
                                  <TdR>{highlightText(fmtCurrency(getOrderPlannedAmount(order)), 'ordersWithMissingLpCerpani')}</TdR>
                                  <TdR>{highlightText(fmtCurrency(getOrderLimit(order)), 'ordersWithMissingLpCerpani')}</TdR>
                                  <TdNarrow>{highlightText(getOrderStatusLabel(order), 'ordersWithMissingLpCerpani')}</TdNarrow>
                                  <TdC>
                                    {invoicesWithMissingLp.map(inv => (
                                      <SmartTooltip key={inv.id} text={`Doplnit LP rozklad${inv.fa_cislo_vema ? ' — FA ' + inv.fa_cislo_vema : ''}`} preferredPosition="left">
                                        <LpEditIconBtn
                                          onClick={() => handleOpenLpEditModal(inv, order)}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.5rem', fontSize: '0.82rem', color: '#0369a1', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                          <FontAwesomeIcon icon={faCoins} style={{ color: '#0284c7' }} />
                                        </LpEditIconBtn>
                                      </SmartTooltip>
                                    ))}
                                  </TdC>
                                </Tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                      {renderPagination('ordersWithMissingLpCerpani', pagedOrdersWithMissingLpCerpani)}
                    </>
                  )}
                  </SectionCard>
                )}

              </>
            )}

            {/* ===== ATTACHMENTS TAB ===== */}
            {activeTab === 'attachments' && (
              <>
                {/* ── BLOK 1: Přílohy objednávek podle typu – accordion ── */}
                {isBlockVisible('attachments', 'orderAttachmentsByType') && (
                  <SectionCard id="section-orderAttachmentsByType">
                    <SectionHeader>
                      <SmartTooltip text="Obnovit statistiky příloh objednávek" preferredPosition="right">
                        <PageButton
                          onClick={() => handleLoadAttachmentsTabStats()}
                          disabled={attachmentsLoading}
                          style={{ padding: '0.25rem 0.5rem', lineHeight: 1, marginRight: '0.5rem' }}
                        >
                          <FontAwesomeIcon icon={faRefresh} spin={attachmentsLoading} />
                        </PageButton>
                      </SmartTooltip>
                      <SectionTitle style={{ flex: 1 }}>
                        <FontAwesomeIcon icon={faPaperclip} style={{ marginRight: '0.5rem', color: '#1d4ed8' }} />
                        Přílohy objednávek podle typu
                      </SectionTitle>
                      <SectionBadge $tone="info">{(orderAttachmentsStats && orderAttachmentsStats.total) || 0} příloh</SectionBadge>
                    </SectionHeader>
                    {attachmentsLoading && !orderAttachmentsStats ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Načítám statistiky…</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {groupAttachmentTypesByCategory(orderAttachmentsStats, ATTACHMENT_ORDER_CATEGORIES).map(cat => (
                          <div key={cat.key} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            {/* záhlaví kategorie */}
                            <div style={{ padding: '0.45rem 1rem', background: cat.bg, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ fontWeight: 700, color: cat.color, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>{cat.label}</span>
                              <SectionBadge $tone="info" style={{ fontSize: '0.7rem' }}>{cat.items.length} {cat.items.length === 1 ? 'typ' : cat.items.length < 5 ? 'typy' : 'typů'} · {cat.total} příloh</SectionBadge>
                            </div>
                            {/* řádky typů */}
                            {cat.items.map(item => {
                              const isOpen = expandedAttachmentType.orders === item.type;
                              return (
                                <React.Fragment key={item.type}>
                                  <div
                                    onClick={() => {
                                      if (isOpen) {
                                        setExpandedAttachmentType(prev => ({ ...prev, orders: null }));
                                        setAttachmentsByType(prev => ({ ...prev, orders: null }));
                                      } else {
                                        handleLoadOrderAttachmentsByType(item.type, 1);
                                      }
                                    }}
                                    style={{ display: 'grid', gridTemplateColumns: '20px 1fr 110px', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 1rem', background: isOpen ? '#f1f5f9' : '#f8fafc', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                  >
                                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569', textAlign: 'center', lineHeight: 1 }}>{isOpen ? '\u2212' : '+'}</span>
                                    <span style={{ fontWeight: isOpen ? 700 : 500, color: '#1e293b', fontSize: '0.9rem' }}>{prettyAttachType(item.type)}</span>
                                    <SectionBadge $tone="info" style={{ justifySelf: 'end' }}>{item.count}</SectionBadge>
                                  </div>
                                  {isOpen && (
                                    <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                      {!attachmentsByType.orders ? (
                                        <div style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>Načítám přílohy…</div>
                                      ) : (
                                        <>
                                          <TableWrapper style={{ padding: '0 0.5rem' }}>
                                            <Table>
                                              <thead>
                                                <tr>
                                                  <ThSort onClick={() => handleTableSort('orderAttachmentsByTypeList', 'original_name')}>Soubor / Příloha{sortIcon('orderAttachmentsByTypeList', 'original_name')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('orderAttachmentsByTypeList', 'order_number')}>Objednávka{sortIcon('orderAttachmentsByTypeList', 'order_number')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('orderAttachmentsByTypeList', 'order_stav')}>Stav obj.{sortIcon('orderAttachmentsByTypeList', 'order_stav')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('orderAttachmentsByTypeList', 'supplier')}>Dodavatel{sortIcon('orderAttachmentsByTypeList', 'supplier')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('orderAttachmentsByTypeList', 'uploaded_by')}>Nahrál{sortIcon('orderAttachmentsByTypeList', 'uploaded_by')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('orderAttachmentsByTypeList', 'created_at')}>Datum{sortIcon('orderAttachmentsByTypeList', 'created_at')}</ThSort>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {sortTableData(((attachmentsByType.orders && attachmentsByType.orders.data) || []), 'orderAttachmentsByTypeList', orderAttachmentsByTypeAcc).map(att => (
                                                  <Tr key={att.id}>
                                                    <Td>
                                                      <span style={{ color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => handleOpenAttachment(att, 'order')} title="Otevřít přílohu">
                                                        <FontAwesomeIcon icon={faEye} style={{ fontSize: '0.8rem', opacity: 0.7 }} />
                                                        {att.original_name || att.nazev_souboru || `#${att.id}`}
                                                      </span>
                                                    </Td>
                                                    <Td>{renderOrderLink({ id: att.order_id, cislo_objednavky: att.order_number })}</Td>
                                                    <Td><Pill $tone="default">{att.order_stav || '-'}</Pill></Td>
                                                    <Td>{att.supplier || '-'}</Td>
                                                    <Td>{att.uploaded_by || '-'}</Td>
                                                    <Td>{att.created_at ? new Date(att.created_at).toLocaleDateString('cs-CZ') : '-'}</Td>
                                                  </Tr>
                                                ))}
                                              </tbody>
                                            </Table>
                                          </TableWrapper>
                                          {attachmentsByType.orders && attachmentsByType.orders.pagination && attachmentsByType.orders.pagination.total_pages > 1 && (
                                            <PaginationContainer>
                                              <PaginationInfo>
                                                Zobrazeno {((attachmentsByTypePage.orders - 1) * (attachmentsByType.orders.pagination.per_page || 25)) + 1}–{Math.min(attachmentsByTypePage.orders * (attachmentsByType.orders.pagination.per_page || 25), attachmentsByType.orders.pagination.total)} z {attachmentsByType.orders.pagination.total}
                                              </PaginationInfo>
                                              <PaginationControls>
                                                <PageButton onClick={() => handleLoadOrderAttachmentsByType(expandedAttachmentType.orders, 1)} disabled={attachmentsByTypePage.orders <= 1}>««</PageButton>
                                                <PageButton onClick={() => handleLoadOrderAttachmentsByType(expandedAttachmentType.orders, attachmentsByTypePage.orders - 1)} disabled={attachmentsByTypePage.orders <= 1}>‹</PageButton>
                                                <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>Stránka {attachmentsByTypePage.orders} z {attachmentsByType.orders.pagination.total_pages || 1}</span>
                                                <PageButton onClick={() => handleLoadOrderAttachmentsByType(expandedAttachmentType.orders, attachmentsByTypePage.orders + 1)} disabled={attachmentsByTypePage.orders >= (attachmentsByType.orders.pagination.total_pages || 1)}>›</PageButton>
                                                <PageButton onClick={() => handleLoadOrderAttachmentsByType(expandedAttachmentType.orders, attachmentsByType.orders.pagination.total_pages || 1)} disabled={attachmentsByTypePage.orders >= (attachmentsByType.orders.pagination.total_pages || 1)}>»»</PageButton>
                                              </PaginationControls>
                                            </PaginationContainer>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* ── BLOK 2: Přílohy faktur podle typu – accordion ── */}
                {isBlockVisible('attachments', 'invoiceAttachmentsByType') && (
                  <SectionCard id="section-invoiceAttachmentsByType">
                    <SectionHeader>
                      <SmartTooltip text="Obnovit statistiky příloh faktur" preferredPosition="right">
                        <PageButton
                          onClick={() => handleLoadAttachmentsTabStats()}
                          disabled={attachmentsLoading}
                          style={{ padding: '0.25rem 0.5rem', lineHeight: 1, marginRight: '0.5rem' }}
                        >
                          <FontAwesomeIcon icon={faRefresh} spin={attachmentsLoading} />
                        </PageButton>
                      </SmartTooltip>
                      <SectionTitle style={{ flex: 1 }}>
                        <FontAwesomeIcon icon={faPaperclip} style={{ marginRight: '0.5rem', color: '#64748b' }} />
                        Přílohy faktur podle typu
                      </SectionTitle>
                      <SectionBadge $tone="info">{(invoiceAttachmentsStats && invoiceAttachmentsStats.total) || 0} příloh</SectionBadge>
                    </SectionHeader>
                    {attachmentsLoading && !invoiceAttachmentsStats ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Načítám statistiky…</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {groupAttachmentTypesByCategory(invoiceAttachmentsStats, ATTACHMENT_INVOICE_CATEGORIES).map(cat => (
                          <div key={cat.key} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            {/* záhlaví kategorie */}
                            <div style={{ padding: '0.45rem 1rem', background: cat.bg, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ fontWeight: 700, color: cat.color, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>{cat.label}</span>
                              <SectionBadge $tone="info" style={{ fontSize: '0.7rem' }}>{cat.items.length} {cat.items.length === 1 ? 'typ' : cat.items.length < 5 ? 'typy' : 'typů'} · {cat.total} příloh</SectionBadge>
                            </div>
                            {/* řádky typů */}
                            {cat.items.map(item => {
                              const isOpen = expandedAttachmentType.invoices === item.type;
                              return (
                                <React.Fragment key={item.type}>
                                  <div
                                    onClick={() => {
                                      if (isOpen) {
                                        setExpandedAttachmentType(prev => ({ ...prev, invoices: null }));
                                        setAttachmentsByType(prev => ({ ...prev, invoices: null }));
                                      } else {
                                        handleLoadInvoiceAttachmentsByType(item.type, 1);
                                      }
                                    }}
                                    style={{ display: 'grid', gridTemplateColumns: '20px 1fr 110px', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 1rem', background: isOpen ? '#f1f5f9' : '#f8fafc', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                  >
                                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569', textAlign: 'center', lineHeight: 1 }}>{isOpen ? '\u2212' : '+'}</span>
                                    <span style={{ fontWeight: isOpen ? 700 : 500, color: '#1e293b', fontSize: '0.9rem' }}>{prettyAttachType(item.type)}</span>
                                    <SectionBadge $tone="info" style={{ justifySelf: 'end' }}>{item.count}</SectionBadge>
                                  </div>
                                  {isOpen && (
                                    <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                      {!attachmentsByType.invoices ? (
                                        <div style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>Načítám přílohy…</div>
                                      ) : (
                                        <>
                                          <TableWrapper style={{ padding: '0 0.5rem' }}>
                                            <Table>
                                              <thead>
                                                <tr>
                                                  <ThSort onClick={() => handleTableSort('invoiceAttachmentsByTypeList', 'original_name')}>Soubor / Příloha{sortIcon('invoiceAttachmentsByTypeList', 'original_name')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('invoiceAttachmentsByTypeList', 'invoice_number')}>Faktura{sortIcon('invoiceAttachmentsByTypeList', 'invoice_number')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('invoiceAttachmentsByTypeList', 'invoice_stav')}>Stav FA{sortIcon('invoiceAttachmentsByTypeList', 'invoice_stav')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('invoiceAttachmentsByTypeList', 'order_number')}>Objednávka{sortIcon('invoiceAttachmentsByTypeList', 'order_number')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('invoiceAttachmentsByTypeList', 'uploaded_by')}>Nahrál{sortIcon('invoiceAttachmentsByTypeList', 'uploaded_by')}</ThSort>
                                                  <ThSort onClick={() => handleTableSort('invoiceAttachmentsByTypeList', 'created_at')}>Datum{sortIcon('invoiceAttachmentsByTypeList', 'created_at')}</ThSort>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {sortTableData(((attachmentsByType.invoices && attachmentsByType.invoices.data) || []), 'invoiceAttachmentsByTypeList', invoiceAttachmentsByTypeAcc).map(att => (
                                                  <Tr key={att.id}>
                                                    <Td>
                                                      <span style={{ color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => handleOpenAttachment(att, 'invoice')} title="Otevřít přílohu">
                                                        <FontAwesomeIcon icon={faEye} style={{ fontSize: '0.8rem', opacity: 0.7 }} />
                                                        {att.original_name || att.nazev_souboru || `#${att.id}`}
                                                      </span>
                                                    </Td>
                                                    <Td>{renderInvoiceLink({ id: att.invoice_id, objednavka_id: att.order_id, cislo_faktury: att.invoice_number || `#${att.invoice_id}` })}</Td>
                                                    <Td><Pill $tone="default">{att.invoice_stav || '-'}</Pill></Td>
                                                    <Td>{att.order_id ? renderOrderLink({ id: att.order_id, cislo_objednavky: att.order_number }) : '-'}</Td>
                                                    <Td>{att.uploaded_by || '-'}</Td>
                                                    <Td>{att.created_at ? new Date(att.created_at).toLocaleDateString('cs-CZ') : '-'}</Td>
                                                  </Tr>
                                                ))}
                                              </tbody>
                                            </Table>
                                          </TableWrapper>
                                          {attachmentsByType.invoices && attachmentsByType.invoices.pagination && attachmentsByType.invoices.pagination.total_pages > 1 && (
                                            <PaginationContainer>
                                              <PaginationInfo>
                                                Zobrazeno {((attachmentsByTypePage.invoices - 1) * (attachmentsByType.invoices.pagination.per_page || 25)) + 1}–{Math.min(attachmentsByTypePage.invoices * (attachmentsByType.invoices.pagination.per_page || 25), attachmentsByType.invoices.pagination.total)} z {attachmentsByType.invoices.pagination.total}
                                              </PaginationInfo>
                                              <PaginationControls>
                                                <PageButton onClick={() => handleLoadInvoiceAttachmentsByType(expandedAttachmentType.invoices, 1)} disabled={attachmentsByTypePage.invoices <= 1}>««</PageButton>
                                                <PageButton onClick={() => handleLoadInvoiceAttachmentsByType(expandedAttachmentType.invoices, attachmentsByTypePage.invoices - 1)} disabled={attachmentsByTypePage.invoices <= 1}>‹</PageButton>
                                                <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>Stránka {attachmentsByTypePage.invoices} z {attachmentsByType.invoices.pagination.total_pages || 1}</span>
                                                <PageButton onClick={() => handleLoadInvoiceAttachmentsByType(expandedAttachmentType.invoices, attachmentsByTypePage.invoices + 1)} disabled={attachmentsByTypePage.invoices >= (attachmentsByType.invoices.pagination.total_pages || 1)}>›</PageButton>
                                                <PageButton onClick={() => handleLoadInvoiceAttachmentsByType(expandedAttachmentType.invoices, attachmentsByType.invoices.pagination.total_pages || 1)} disabled={attachmentsByTypePage.invoices >= (attachmentsByType.invoices.pagination.total_pages || 1)}>»»</PageButton>
                                              </PaginationControls>
                                            </PaginationContainer>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* BLOK 3: Prehled vsech priloh (OBJ + FA) */}
                {isBlockVisible('attachments', 'invoiceAttachmentsList') && (
                  <SectionCard id="section-invoiceAttachmentsList">
                    <SectionHeader>
                      <SectionTitle style={{ flex: 1 }}>
                        <FontAwesomeIcon icon={faPaperclip} style={{ marginRight: '0.5rem', color: '#64748b' }} />
                        Přehled všech příloh
                      </SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SectionBadge $tone="info" style={{ fontSize: '0.72rem' }}>OBJ: {allAttachmentsCombined.filter(a => a.attachmentSource === 'OBJ').length}</SectionBadge>
                        <SectionBadge $tone="warn" style={{ fontSize: '0.72rem' }}>FA: {allInvoiceAttachments.length}</SectionBadge>
                        <SectionBadge $tone="success" style={{ fontSize: '0.72rem' }}>RP: {annualFeeAttachments.length}</SectionBadge>
                        <SectionBadge $tone="info">{allAttachmentsCombined.length} celkem</SectionBadge>
                        <button onClick={handleExportCsv_invoiceAttachmentsList} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                        <SectionBadge $tone="success" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                          💾 {(() => {
                            const totalBytes = allAttachmentsCombined.reduce((sum, att) => sum + (att.velikost_souboru_b || att.velikost_b || att.velikost || 0), 0);
                            return (totalBytes / 1048576).toFixed(2);
                          })()} MB
                        </SectionBadge>
                      </div>
                    </SectionHeader>
                    {allAttachmentsCombined.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                        Žádné přílohy nenalezeny
                      </div>
                    ) : (
                      <>
                        <SearchBox>
                          <SearchInputWrapper>
                            <SearchInputIcon icon={faSearch} />
                            <SearchInput
                              type="text"
                              placeholder="Fulltext vyhledávání (název souboru, typ, dodavatel, druh…)"
                              value={getSearchQuery('invoiceAttachmentsList')}
                              onChange={(e) => setSearchQuery('invoiceAttachmentsList', e.target.value)}
                            />
                            {getSearchQuery('invoiceAttachmentsList') && (
                              <SearchClearButton
                                onClick={() => setSearchQuery('invoiceAttachmentsList', '')}
                                title="Vyčistit vyhledávání"
                              >
                                <FontAwesomeIcon icon={faXmark} />
                              </SearchClearButton>
                            )}
                          </SearchInputWrapper>
                        </SearchBox>
                        {pagedAllAttachments.isFiltered && (
                          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                            Nalezeno {pagedAllAttachments.total} z {pagedAllAttachments.originalTotal} záznamů
                          </div>
                        )}
                        {pagedAllAttachments.isFiltered && pagedAllAttachments.total === 0 ? (
                          <SearchEmptyState>
                            <FontAwesomeIcon icon={faSearch} />
                            <p>Nenalezeny žádné záznamy pro hledaný výraz</p>
                          </SearchEmptyState>
                        ) : (
                          <>
                            <TableWrapper style={{ margin: 0 }}>
                              <Table>
                                <thead>
                                  <tr>
                                    <ThSort style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'nazev_souboru')}>Soubor{sortIcon('invoiceAttachmentsList', 'nazev_souboru')}</ThSort>
                                    <ThSort style={{ width: '95px', minWidth: '95px', maxWidth: '95px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'velikost')}>Velikost{sortIcon('invoiceAttachmentsList', 'velikost')}</ThSort>
                                    <ThSort style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'typ_prilohy')}>Typ přílohy{sortIcon('invoiceAttachmentsList', 'typ_prilohy')}</ThSort>
                                    <ThSort style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'zdroj')}>Zdroj{sortIcon('invoiceAttachmentsList', 'zdroj')}</ThSort>
                                    <ThSort style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'objednavka')}>Objednávka / RP{sortIcon('invoiceAttachmentsList', 'objednavka')}</ThSort>
                                    <ThSort style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'faktura')}>Faktura{sortIcon('invoiceAttachmentsList', 'faktura')}</ThSort>
                                    <ThSort style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'dodavatel')}>Dodavatel{sortIcon('invoiceAttachmentsList', 'dodavatel')}</ThSort>
                                    <ThSort style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }} onClick={() => handleTableSort('invoiceAttachmentsList', 'druh')}>Druh obj.{sortIcon('invoiceAttachmentsList', 'druh')}</ThSort>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagedAllAttachments.items.map((att, idx) => (
                                    <Tr key={(att.attachmentSource || '') + (att.id || idx)}>
                                      <Td style={{ width: '280px', minWidth: '280px', maxWidth: '280px', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                        <div
                                          style={{ color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}
                                          onClick={() => handleOpenAttachment(att, att.attachmentSource === 'FA' ? 'invoice' : att.attachmentSource === 'RP' ? 'annual-fee' : 'order')}
                                          title="Otevřít přílohu v prohlížeči"
                                        >
                                          <FontAwesomeIcon icon={faEye} style={{ fontSize: '0.8rem', opacity: 0.7, flexShrink: 0, marginTop: '0.2rem' }} />
                                          <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                            {att.original_name || att.original_filename || att.originalni_nazev_souboru || att.nazev_souboru || `#${att.id}`}
                                          </span>
                                        </div>
                                      </Td>
                                      <Td style={{ width: '95px', minWidth: '95px', maxWidth: '95px', fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                        {fmtAttachSize(att.velikost_souboru_b || att.velikost_b || att.velikost)}
                                      </Td>
                                      <Td style={{ width: '130px', minWidth: '130px', maxWidth: '130px', verticalAlign: 'top' }}>
                                        <Pill $tone="default">{prettyAttachType(att.typ_prilohy || att.attachment_type)}</Pill>
                                      </Td>
                                      <Td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', verticalAlign: 'top' }}>
                                        <Pill
                                          $tone={att.attachmentSource === 'FA' ? 'warn' : att.attachmentSource === 'RP' ? 'success' : 'info'}
                                          style={{ fontSize: '0.72rem', fontWeight: 700 }}
                                        >
                                          {att.attachmentSource === 'FA' ? 'Faktura' : att.attachmentSource === 'RP' ? 'Roční poplatek' : 'Objednávka'}
                                        </Pill>
                                      </Td>
                                      <Td style={{ width: '220px', minWidth: '220px', maxWidth: '220px', verticalAlign: 'top', textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                        {att.objednavka_id ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-start' }}>
                                            {renderOrderLink({ id: att.objednavka_id, cislo_objednavky: att.cislo_objednavky })}
                                            {(() => {
                                              const pred = att.objednavka_predmet;
                                              if (!pred) return null;
                                              return (
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', lineHeight: '1.3', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                                  {pred}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        ) : att.objednavka_predmet ? (
                                          <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                            {att.objednavka_predmet}
                                          </div>
                                        ) : '-'}
                                      </Td>
                                      <Td style={{ width: '220px', minWidth: '220px', maxWidth: '220px', verticalAlign: 'top', textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                        {att.invoice_id ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-start' }}>
                                            {renderInvoiceLink({ id: att.invoice_id, objednavka_id: att.objednavka_id, cislo_faktury: att.cislo_faktury || `#${att.invoice_id}` })}
                                            {(() => {
                                              const pozn = att.fa_poznamka;
                                              if (!pozn) return null;
                                              return (
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', lineHeight: '1.3', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                                  {pozn}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        ) : '-'}
                                      </Td>
                                      <Td style={{ width: '180px', minWidth: '180px', maxWidth: '180px', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{att.dodavatel || '-'}</Td>
                                      <Td style={{ width: '140px', minWidth: '140px', maxWidth: '140px', fontSize: '0.82rem', color: '#64748b', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{att.druh_objednavky_label || '-'}</Td>
                                    </Tr>
                                  ))}
                                </tbody>
                              </Table>
                            </TableWrapper>
                            {renderPagination('invoiceAttachmentsList', pagedAllAttachments)}
                          </>
                        )}
                      </>
                    )}
                  </SectionCard>
                )}

                {/* Objednávky bez příloh */}
                {isBlockVisible('attachments', 'ordersWithoutAttachments') && (
                  <SectionCard id="section-ordersWithoutAttachments">
                    <SectionHeader>
                      <SmartTooltip text="Obnovit seznam objednávek bez příloh" preferredPosition="right">
                        <PageButton
                          onClick={() => handleLoadOrdersWithoutAttachments(1)}
                          disabled={attachmentsLoading}
                          style={{ padding: '0.25rem 0.5rem', lineHeight: 1, marginRight: '0.5rem' }}
                        >
                          <FontAwesomeIcon icon={faRefresh} spin={attachmentsLoading} />
                        </PageButton>
                      </SmartTooltip>
                      <SectionTitle style={{ flex: 1 }}>
                        Objednávky bez příloh
                      </SectionTitle>
                      <SectionBadge $tone="warn">{(ordersWithoutAttachments && ordersWithoutAttachments.pagination && ordersWithoutAttachments.pagination.total) || '...'}</SectionBadge>
                    </SectionHeader>
                    {ordersWithoutAttachments && (
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort onClick={() => handleTableSort('ordersWithoutAttachments', 'cislo_objednavky')}>Objednávka{sortIcon('ordersWithoutAttachments', 'cislo_objednavky')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutAttachments', 'nazev')}>Předmět{sortIcon('ordersWithoutAttachments', 'nazev')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutAttachments', 'stav')}>Stav{sortIcon('ordersWithoutAttachments', 'stav')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutAttachments', 'dodavatel')}>Dodavatel{sortIcon('ordersWithoutAttachments', 'dodavatel')}</ThSort>
                              <ThSort onClick={() => handleTableSort('ordersWithoutAttachments', 'objednatel')}>Objednatel{sortIcon('ordersWithoutAttachments', 'objednatel')}</ThSort>
                              <ThRSort onClick={() => handleTableSort('ordersWithoutAttachments', 'castka')}>Částka{sortIcon('ordersWithoutAttachments', 'castka')}</ThRSort>
                            </tr>
                          </thead>
                          <tbody>
                            {displayOrdersWithoutAttachments.map(order => {
                              // 🔴 Červené podbarvit: objednávky které mají JEN přílohu "Finanční kontrola" a žádné jiné
                              const hasOnlyFinancialControl = order.has_only_financial_control === true || order.has_only_financial_control === 1;
                              return (
                                <Tr key={order.id} style={{ backgroundColor: hasOnlyFinancialControl ? '#fee2e2' : undefined }}>
                                  <Td style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{renderOrderLink(order)}</Td>
                                  <Td style={{ maxWidth: '250px', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                    {order.nazev || '-'}
                                  </Td>
                                  <Td>
                                    <Pill $tone="default">{order.stav}</Pill>
                                  </Td>
                                  <Td style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{order.dodavatel || '-'}</Td>
                                  <Td style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{order.objednatel || order.autor || '-'}</Td>
                                  <TdR>{order.castka ? fmtCurrency(order.castka) : '-'}</TdR>
                                </Tr>
                              );
                            })}
                          </tbody>
                        </Table>
                        {ordersWithoutAttachments && ordersWithoutAttachments.pagination && ordersWithoutAttachments.pagination.total_pages > 1 && (
                          <PaginationContainer>
                            <PaginationInfo>
                              Zobrazeno {((ordersWithoutAttachmentsPage - 1) * (ordersWithoutAttachments.pagination.per_page || 25)) + 1}–{Math.min(ordersWithoutAttachmentsPage * (ordersWithoutAttachments.pagination.per_page || 25), ordersWithoutAttachments.pagination.total)} z {ordersWithoutAttachments.pagination.total}
                            </PaginationInfo>
                            <PaginationControls>
                              <PageButton onClick={() => handleLoadOrdersWithoutAttachments(1)} disabled={ordersWithoutAttachmentsPage <= 1}>««</PageButton>
                              <PageButton onClick={() => handleLoadOrdersWithoutAttachments(ordersWithoutAttachmentsPage - 1)} disabled={ordersWithoutAttachmentsPage <= 1}>‹</PageButton>
                              <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>Stránka {ordersWithoutAttachmentsPage} z {ordersWithoutAttachments.pagination.total_pages || 1}</span>
                              <PageButton onClick={() => handleLoadOrdersWithoutAttachments(ordersWithoutAttachmentsPage + 1)} disabled={ordersWithoutAttachmentsPage >= (ordersWithoutAttachments.pagination.total_pages || 1)}>›</PageButton>
                              <PageButton onClick={() => handleLoadOrdersWithoutAttachments(ordersWithoutAttachments.pagination.total_pages || 1)} disabled={ordersWithoutAttachmentsPage >= (ordersWithoutAttachments.pagination.total_pages || 1)}>»»</PageButton>
                            </PaginationControls>
                          </PaginationContainer>
                        )}
                      </TableWrapper>
                    )}
                  </SectionCard>
                )}

                {/* Faktury bez příloh */}
                {isBlockVisible('attachments', 'invoicesWithoutAttachments') && (
                  <SectionCard id="section-invoicesWithoutAttachments">
                    <SectionHeader>
                      <SmartTooltip text="Obnovit seznam faktur bez příloh" preferredPosition="right">
                        <PageButton
                          onClick={() => handleLoadInvoicesWithoutAttachments(1)}
                          disabled={attachmentsLoading}
                          style={{ padding: '0.25rem 0.5rem', lineHeight: 1, marginRight: '0.5rem' }}
                        >
                          <FontAwesomeIcon icon={faRefresh} spin={attachmentsLoading} />
                        </PageButton>
                      </SmartTooltip>
                      <SectionTitle style={{ flex: 1 }}>
                        Faktury bez příloh
                      </SectionTitle>
                      <SectionBadge $tone="warn">{(invoicesWithoutAttachments && invoicesWithoutAttachments.pagination && invoicesWithoutAttachments.pagination.total) || '...'}</SectionBadge>
                    </SectionHeader>
                    {invoicesWithoutAttachments && (
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'cislo_faktury')}>Faktura{sortIcon('invoicesWithoutAttachments', 'cislo_faktury')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'stav')}>Stav{sortIcon('invoicesWithoutAttachments', 'stav')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'datum_splatnosti')}>Splatnost{sortIcon('invoicesWithoutAttachments', 'datum_splatnosti')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'cislo_objednavky')}>Objednávka{sortIcon('invoicesWithoutAttachments', 'cislo_objednavky')}</ThSort>
                              <ThSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'dodavatel')}>Dodavatel{sortIcon('invoicesWithoutAttachments', 'dodavatel')}</ThSort>
                              <ThRSort onClick={() => handleTableSort('invoicesWithoutAttachments', 'castka')}>Částka{sortIcon('invoicesWithoutAttachments', 'castka')}</ThRSort>
                            </tr>
                          </thead>
                          <tbody>
                            {displayInvoicesWithoutAttachments.map(invoice => (
                              <Tr key={invoice.id}>
                                <Td style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{renderInvoiceLink(invoice)}</Td>
                                <Td>
                                  <Pill $tone="default">{invoice.stav}</Pill>
                                </Td>
                                <Td>{invoice.datum_splatnosti ? new Date(invoice.datum_splatnosti).toLocaleDateString('cs-CZ') : '-'}</Td>
                                <Td style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{invoice.objednavka_id ? renderOrderLink({ id: invoice.objednavka_id, cislo_objednavky: invoice.cislo_objednavky }) : '-'}</Td>
                                <Td style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{invoice.dodavatel || '-'}</Td>
                                <TdR>{invoice.castka ? fmtCurrency(invoice.castka) : '-'}</TdR>
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                        {invoicesWithoutAttachments && invoicesWithoutAttachments.pagination && invoicesWithoutAttachments.pagination.total_pages > 1 && (
                          <PaginationContainer>
                            <PaginationInfo>
                              Zobrazeno {((invoicesWithoutAttachmentsPage - 1) * (invoicesWithoutAttachments.pagination.per_page || 25)) + 1}–{Math.min(invoicesWithoutAttachmentsPage * (invoicesWithoutAttachments.pagination.per_page || 25), invoicesWithoutAttachments.pagination.total)} z {invoicesWithoutAttachments.pagination.total}
                            </PaginationInfo>
                            <PaginationControls>
                              <PageButton onClick={() => handleLoadInvoicesWithoutAttachments(1)} disabled={invoicesWithoutAttachmentsPage <= 1}>««</PageButton>
                              <PageButton onClick={() => handleLoadInvoicesWithoutAttachments(invoicesWithoutAttachmentsPage - 1)} disabled={invoicesWithoutAttachmentsPage <= 1}>‹</PageButton>
                              <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>Stránka {invoicesWithoutAttachmentsPage} z {invoicesWithoutAttachments.pagination.total_pages || 1}</span>
                              <PageButton onClick={() => handleLoadInvoicesWithoutAttachments(invoicesWithoutAttachmentsPage + 1)} disabled={invoicesWithoutAttachmentsPage >= (invoicesWithoutAttachments.pagination.total_pages || 1)}>›</PageButton>
                              <PageButton onClick={() => handleLoadInvoicesWithoutAttachments(invoicesWithoutAttachments.pagination.total_pages || 1)} disabled={invoicesWithoutAttachmentsPage >= (invoicesWithoutAttachments.pagination.total_pages || 1)}>»»</PageButton>
                            </PaginationControls>
                          </PaginationContainer>
                        )}
                      </TableWrapper>
                    )}
                  </SectionCard>
                )}
              </>
            )}

            {activeTab === 'pivot' && (
              <SectionCard id="section-pivotTable">
                <SectionHeader>
                  <SectionTitle><FontAwesomeIcon icon={faTable} style={{ marginRight: '0.5rem', opacity: 0.7 }} />Agregační tabulka</SectionTitle>
                  <PivotHeaderActions>
                    <Select
                      value={pivotConfig.dataset}
                      onChange={(event) => setPivotConfig(prev => ({ ...prev, dataset: event.target.value }))}
                      style={{ flex: '0 0 auto', width: 'auto', fontSize: '0.85rem' }}
                    >
                      <option value="all">Vše dohromady</option>
                      <option value="orders">Objednávky</option>
                      <option value="invoices">Faktury</option>
                      <option value="contracts">Smlouvy</option>
                    </Select>
                    {pivotConfig.metric !== 'count' && pivotConfig.colMode !== 'metrics' && (
                      <Select
                        value={pivotConfig.aggFunc || 'sum'}
                        onChange={(e) => setPivotConfig(prev => ({ ...prev, aggFunc: e.target.value }))}
                        style={{ flex: '0 0 auto', width: 'auto', fontSize: '0.85rem' }}
                        title="Způsob agregace číselné hodnoty"
                      >
                        <option value="sum">Σ Suma</option>
                        <option value="avg">⌀ Průměr</option>
                        <option value="min">↓ Min</option>
                        <option value="max">↑ Max</option>
                      </Select>
                    )}
                    <button
                      onClick={() => setPivotConfig(prev => ({ ...prev, colMode: prev.colMode === 'metrics' ? 'fields' : 'metrics', colMetrics: null }))}
                      title={pivotConfig.colMode === 'metrics' ? 'Přepnout: textová pole jako sloupce' : 'Přepnout: metriky jako sloupce – vyber které metriky se zobrazí'}
                      style={{ border: `1px solid ${pivotConfig.colMode === 'metrics' ? '#6d28d9' : '#cbd5e1'}`, background: pivotConfig.colMode === 'metrics' ? '#ede9fe' : '#f8fafc', color: pivotConfig.colMode === 'metrics' ? '#5b21b6' : '#64748b', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      Σ… Metriky sl.
                    </button>
                    <button
                      onClick={() => setPivotShowPct(p => !p)}
                      title="Zobrazit % ze součtu sloupce"
                      style={{ border: `1px solid ${pivotShowPct ? '#0891b2' : '#cbd5e1'}`, background: pivotShowPct ? '#cffafe' : '#f8fafc', color: pivotShowPct ? '#0e7490' : '#64748b', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      <FontAwesomeIcon icon={faPercent} />
                    </button>
                    <button
                      onClick={handlePivotExportCsv}
                      title="Exportovat do CSV"
                      style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      <FontAwesomeIcon icon={faDownload} /> CSV
                    </button>
                    <button
                      onClick={() => setPivotConfig({ dataset: 'all', rowFields: ['usek'], colFields: ['financing'], metric: 'count', aggFunc: 'sum', colMode: 'fields', colMetrics: null })}
                      title="Resetovat konfiguraci tabulky"
                      style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      <FontAwesomeIcon icon={faRefresh} />
                    </button>
                  </PivotHeaderActions>
                </SectionHeader>
                <PivotPanel>
                  <PivotZonesStack>
                    <PivotZone onDragOver={(event) => event.preventDefault()} onDrop={(event) => handlePivotDrop(event, 'row')}>
                      <PivotZoneTitle>Řádky (textová pole)</PivotZoneTitle>
                      <PivotZoneBody>
                        {(pivotConfig.rowFields || []).length > 0 ? (
                          (pivotConfig.rowFields || []).map((fieldId, index) => (
                            <PivotChip
                              key={`row_${fieldId}_${index}`}
                              $tone={pivotToneByKey(fieldId, 'text')}
                              draggable
                              onDragStart={(event) => handlePivotDragStart(event, 'text', fieldId, 'row', index)}
                              onDrop={(event) => {
                                const fromIndex = Number(event.dataTransfer.getData('from-index'));
                                const fromZone = event.dataTransfer.getData('pivot-zone');
                                if (fromZone === 'row') {
                                  handlePivotReorder(fromIndex, index, 'row');
                                }
                              }}
                              onDragOver={(event) => event.preventDefault()}
                            >
                              <FontAwesomeIcon icon={faGripVertical} />
                              {pivotTextLabelMap.get(fieldId) || fieldId}
                              <PivotChipIndex>{index + 1}</PivotChipIndex>
                              <PivotChipButton
                                onClick={() =>
                                  setPivotConfig(prev => ({
                                    ...prev,
                                    rowFields: (prev.rowFields || []).filter((item, idx) => idx !== index)
                                  }))
                                }
                              >
                                <FontAwesomeIcon icon={faXmark} />
                              </PivotChipButton>
                            </PivotChip>
                          ))
                        ) : (
                          <PivotHint>Sem přetáhni pole pro řádky.</PivotHint>
                        )}
                      </PivotZoneBody>
                    </PivotZone>

                    <PivotZone
                      onDragOver={(event) => { if (pivotConfig.colMode !== 'metrics') event.preventDefault(); }}
                      onDrop={(event) => { if (pivotConfig.colMode !== 'metrics') handlePivotDrop(event, 'col'); }}
                    >
                      <PivotZoneTitle>
                        Sloupce
                        {pivotConfig.colMode === 'metrics'
                          ? <span style={{ fontSize: '0.72rem', color: '#5b21b6', background: '#ede9fe', borderRadius: '5px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>výběr metrik</span>
                          : <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>(textová pole)</span>}
                      </PivotZoneTitle>
                      <PivotZoneBody>
                        {pivotConfig.colMode === 'metrics' ? (
                          pivotMetricOptions.map(option => {
                            const isActive = !pivotConfig.colMetrics || pivotConfig.colMetrics.includes(option.key);
                            return (
                              <PivotChip
                                key={option.key}
                                $tone={isActive ? 'metric' : 'muted'}
                                style={{ opacity: isActive ? 1 : 0.4, cursor: 'pointer', userSelect: 'none' }}
                                title={isActive ? 'Klikni pro skrytí této metriky' : 'Klikni pro zobrazení této metriky'}
                                onClick={() => setPivotConfig(prev => {
                                  const allKeys = pivotMetricOptions.map(o => o.key);
                                  const current = prev.colMetrics ?? allKeys;
                                  const next = current.includes(option.key)
                                    ? current.filter(k => k !== option.key)
                                    : [...current, option.key];
                                  return { ...prev, colMetrics: next.length === allKeys.length ? null : next };
                                })}
                              >
                                <FontAwesomeIcon icon={isActive ? faCheck : faXmark} style={{ fontSize: '0.7rem' }} />
                                {option.label}
                              </PivotChip>
                            );
                          })
                        ) : (pivotConfig.colFields || []).length > 0 ? (
                          (pivotConfig.colFields || []).map((fieldId, index) => (
                            <PivotChip
                              key={`col_${fieldId}_${index}`}
                              $tone={pivotToneByKey(fieldId, 'text')}
                              draggable
                              onDragStart={(event) => handlePivotDragStart(event, 'text', fieldId, 'col', index)}
                              onDrop={(event) => {
                                const fromIndex = Number(event.dataTransfer.getData('from-index'));
                                const fromZone = event.dataTransfer.getData('pivot-zone');
                                if (fromZone === 'col') {
                                  handlePivotReorder(fromIndex, index, 'col');
                                }
                              }}
                              onDragOver={(event) => event.preventDefault()}
                            >
                              <FontAwesomeIcon icon={faGripVertical} />
                              {pivotTextLabelMap.get(fieldId) || fieldId}
                              <PivotChipIndex>{index + 1}</PivotChipIndex>
                              <PivotChipButton
                                onClick={() =>
                                  setPivotConfig(prev => ({
                                    ...prev,
                                    colFields: (prev.colFields || []).filter((item, idx) => idx !== index)
                                  }))
                                }
                              >
                                <FontAwesomeIcon icon={faXmark} />
                              </PivotChipButton>
                            </PivotChip>
                          ))
                        ) : (
                          <PivotHint>Sem přetáhni pole pro sloupce.</PivotHint>
                        )}
                      </PivotZoneBody>
                    </PivotZone>

                    <PivotZone onDragOver={(event) => event.preventDefault()} onDrop={(event) => handlePivotDrop(event, 'metric')}>
                      <PivotZoneTitle>
                        {pivotConfig.colMode === 'metrics' ? 'Agregace' : 'Hodnota (číselná metrika)'}
                        {pivotConfig.colMode !== 'metrics' && pivotConfig.metric !== 'count' && (
                          <span style={{ fontSize: '0.72rem', color: '#0891b2', background: '#cffafe', borderRadius: '5px', padding: '0.1rem 0.4rem', fontWeight: 600 }}>
                            {({ avg: 'průměr', min: 'min', max: 'max', sum: 'suma' })[pivotConfig.aggFunc || 'sum'] || 'suma'}
                          </span>
                        )}
                      </PivotZoneTitle>
                      <PivotZoneBody>
                        {pivotConfig.colMode === 'metrics' ? (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {[{ value: 'sum', label: 'Σ Suma' }, { value: 'avg', label: '⌀ Průměr' }, { value: 'min', label: '↓ Min' }, { value: 'max', label: '↑ Max' }].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setPivotConfig(prev => ({ ...prev, aggFunc: opt.value }))}
                                style={{
                                  border: `1.5px solid ${(pivotConfig.aggFunc || 'sum') === opt.value ? '#0891b2' : '#cbd5e1'}`,
                                  background: (pivotConfig.aggFunc || 'sum') === opt.value ? '#cffafe' : '#f8fafc',
                                  color: (pivotConfig.aggFunc || 'sum') === opt.value ? '#0e7490' : '#64748b',
                                  borderRadius: '8px', padding: '0.35rem 0.7rem', cursor: 'pointer',
                                  fontSize: '0.82rem', fontWeight: (pivotConfig.aggFunc || 'sum') === opt.value ? 700 : 400
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : pivotConfig.metric ? (
                          <PivotChip
                            $tone={pivotToneByKey(pivotConfig.metric, 'metric')}
                            draggable
                            onDragStart={(event) => handlePivotDragStart(event, 'metric', pivotConfig.metric)}
                          >
                            <FontAwesomeIcon icon={faGripVertical} />
                            {pivotMetricLabelMap.get(pivotConfig.metric) || pivotConfig.metric}
                            <PivotChipIndex>H</PivotChipIndex>
                            <PivotChipButton onClick={() => setPivotConfig(prev => ({ ...prev, metric: '' }))}>
                              <FontAwesomeIcon icon={faXmark} />
                            </PivotChipButton>
                          </PivotChip>
                        ) : (
                          <PivotHint>Sem přetáhni metrické pole.</PivotHint>
                        )}
                      </PivotZoneBody>
                    </PivotZone>
                  </PivotZonesStack>

                  <PivotOptionsPanel>
                    <PivotOptionsGroup>
                      <PivotOptionsTitle>
                        <FontAwesomeIcon icon={faLayerGroup} /> Klasifikační pole
                      </PivotOptionsTitle>
                      <PivotChipsWrap>
                        {pivotTextGroups.order.length > 0 && (
                          <div style={{ width: '100%' }}>
                            <PivotHint style={{ fontWeight: 700, color: '#1e40af' }}>Objednávky</PivotHint>
                            <PivotChipsWrap>
                              {pivotTextGroups.order.map(option => (
                                <PivotChip
                                  key={option.key}
                                  $tone={pivotToneByKey(option.key, 'text')}
                                  draggable
                                  onDragStart={(event) => handlePivotDragStart(event, 'text', option.key)}
                                >
                                  <FontAwesomeIcon icon={faGripVertical} /> {option.label}
                                </PivotChip>
                              ))}
                            </PivotChipsWrap>
                          </div>
                        )}
                        {pivotTextGroups.invoice.length > 0 && (
                          <div style={{ width: '100%' }}>
                            <PivotHint style={{ fontWeight: 700, color: '#155e75' }}>Faktury</PivotHint>
                            <PivotChipsWrap>
                              {pivotTextGroups.invoice.map(option => (
                                <PivotChip
                                  key={option.key}
                                  $tone={pivotToneByKey(option.key, 'text')}
                                  draggable
                                  onDragStart={(event) => handlePivotDragStart(event, 'text', option.key)}
                                >
                                  <FontAwesomeIcon icon={faGripVertical} /> {option.label}
                                </PivotChip>
                              ))}
                            </PivotChipsWrap>
                          </div>
                        )}
                        {pivotTextGroups.contract.length > 0 && (
                          <div style={{ width: '100%' }}>
                            <PivotHint style={{ fontWeight: 700, color: '#166534' }}>Smlouvy</PivotHint>
                            <PivotChipsWrap>
                              {pivotTextGroups.contract.map(option => (
                                <PivotChip
                                  key={option.key}
                                  $tone={pivotToneByKey(option.key, 'text')}
                                  draggable
                                  onDragStart={(event) => handlePivotDragStart(event, 'text', option.key)}
                                >
                                  <FontAwesomeIcon icon={faGripVertical} /> {option.label}
                                </PivotChip>
                              ))}
                            </PivotChipsWrap>
                          </div>
                        )}
                        {pivotTextGroups.shared.length > 0 && (
                          <div style={{ width: '100%' }}>
                            <PivotHint style={{ fontWeight: 700, color: '#334155' }}>Sdílené</PivotHint>
                            <PivotChipsWrap>
                              {pivotTextGroups.shared.map(option => (
                                <PivotChip
                                  key={option.key}
                                  $tone={pivotToneByKey(option.key, 'text')}
                                  draggable
                                  onDragStart={(event) => handlePivotDragStart(event, 'text', option.key)}
                                >
                                  <FontAwesomeIcon icon={faGripVertical} /> {option.label}
                                </PivotChip>
                              ))}
                            </PivotChipsWrap>
                          </div>
                        )}
                        {availablePivotTextOptions.length === 0 && (
                          <PivotHint>Všechna textová pole jsou už použita.</PivotHint>
                        )}
                      </PivotChipsWrap>
                    </PivotOptionsGroup>

                    <PivotOptionsGroup>
                      <PivotOptionsTitle>
                        <FontAwesomeIcon icon={faLayerGroup} /> Číselné metriky
                      </PivotOptionsTitle>
                      <PivotChipsWrap>
                        {availablePivotMetricOptions.map(option => (
                          <PivotChip
                            key={option.key}
                            $tone={pivotToneByKey(option.key, 'metric')}
                            draggable
                            onDragStart={(event) => handlePivotDragStart(event, 'metric', option.key)}
                          >
                            <FontAwesomeIcon icon={faGripVertical} /> {option.label}
                          </PivotChip>
                        ))}
                        {availablePivotMetricOptions.length === 0 && (
                          <PivotHint>Všechny metriky jsou už použité.</PivotHint>
                        )}
                      </PivotChipsWrap>
                    </PivotOptionsGroup>
                  </PivotOptionsPanel>
                </PivotPanel>
                <SearchBox>
                  <SearchInput
                    type="text"
                    placeholder="🔍 Fulltext vyhledávání ve všech zobrazených datech..."
                    value={getSearchQuery('pivotTable')}
                    onChange={(e) => setSearchQuery('pivotTable', e.target.value)}
                  />
                </SearchBox>
                {pagedPivotRows.isFiltered && (
                  <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                    Nalezeno {pagedPivotRows.total} z {pagedPivotRows.originalTotal} záznamů
                  </div>
                )}
                <TableWrapper style={{ margin: 0 }}>
                  <Table>
                    <thead>
                      <tr>
                        <Th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {pivotNodesWithChildren.length > 0 && (
                              <PivotTreeToggle
                                onClick={handlePivotExpandAll}
                                title={pivotAllExpanded ? 'Sbalit vše' : 'Rozbalit vše'}
                                style={{ color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.1rem 0.3rem', background: '#f8fafc' }}
                              >
                                <FontAwesomeIcon icon={pivotAllExpanded ? faMinus : faPlus} />
                              </PivotTreeToggle>
                            )}
                            {(pivotConfig.rowFields || []).map(key => pivotTextShortLabelMap.get(key) || key).join(' / ') || 'Řádky'}
                          </div>
                        </Th>
                        {pivotTable.colKeys.map(colKey => (
                          <ThR
                            key={colKey}
                            title={pivotConfig.colMode === 'metrics' ? (pivotMetricLabelMap.get(colKey) || colKey) : colKey}
                            style={{ whiteSpace: pivotConfig.colMode === 'metrics' ? 'nowrap' : 'normal', minWidth: '80px', maxWidth: '130px', wordBreak: 'break-word', fontSize: '0.8rem' }}
                          >
                            {pivotConfig.colMode === 'metrics' ? (pivotMetricLabelMap.get(colKey) || colKey) : colKey}
                          </ThR>
                        ))}
                        <ThR style={{ whiteSpace: 'nowrap', minWidth: '90px' }}>
                          {pivotConfig.colMode === 'metrics' ? 'Celkem (prim.)' : 'Celkem'}
                        </ThR>
                      </tr>
                    </thead>
                    <tbody>
                      {pivotRowNodes.length === 0 && (
                        <Tr>
                          <Td colSpan={pivotTable.colKeys.length + 2}>
                            <EmptyState>Bez dat — přetáhni pole do Řádků a Sloupců</EmptyState>
                          </Td>
                        </Tr>
                      )}
                      {pagedPivotRows.items.map(node => {
                        const isExpanded = pivotExpanded[node.id] ?? node.depth === 0;
                        const hasChildren = node.children.length > 0;
                        const rowAcc = pivotTable.getRowTotal(node);
                        const grandAcc = pivotTable.grandTotal;
                        const rowPctOfGrand = grandAcc && grandAcc.count > 0
                          ? (pivotConfig.metric === 'count'
                            ? grandAcc.count > 0 ? (rowAcc.count / grandAcc.count * 100).toFixed(1) : 0
                            : grandAcc.sum > 0 ? (rowAcc.sum / grandAcc.sum * 100).toFixed(1) : 0)
                          : 0;
                        return (
                          <Tr key={node.id}>
                            <Td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: `${node.depth * 14}px` }}>
                                {hasChildren && (
                                  <PivotTreeToggle
                                    onClick={() =>
                                      setPivotExpanded(prev => ({
                                        ...prev,
                                        [node.id]: !isExpanded
                                      }))
                                    }
                                    aria-label={isExpanded ? 'Sbalit' : 'Rozbalit'}
                                  >
                                    <FontAwesomeIcon icon={isExpanded ? faMinus : faPlus} />
                                  </PivotTreeToggle>
                                )}
                                <strong>{renderPivotCellLabel(node)}</strong>
                              </div>
                            </Td>
                            {pivotTable.colKeys.map(colKey => {
                              const acc = pivotTable.getValue(node, colKey);
                              const isMetricMode = pivotConfig.colMode === 'metrics';
                              const cellValue = isMetricMode ? formatMetricForKey(acc, colKey) : formatMetric(acc);
                              const colTotalAcc = pivotTable.totalForCol(colKey);
                              const pct = !isMetricMode && pivotShowPct && colTotalAcc && colTotalAcc.count > 0
                                ? (pivotConfig.metric === 'count'
                                  ? colTotalAcc.count > 0 ? (acc.count / colTotalAcc.count * 100).toFixed(1) : 0
                                  : colTotalAcc.sum > 0 ? (acc.sum / colTotalAcc.sum * 100).toFixed(1) : 0)
                                : null;
                              return (
                                <TdR key={`${node.id}_${colKey}`}>
                                  {cellValue}
                                  {pct !== null && <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1 }}>{pct} %</div>}
                                </TdR>
                              );
                            })}
                            <TdR>
                              <strong>{formatMetric(rowAcc)}</strong>
                              {pivotShowPct && pivotConfig.colMode !== 'metrics' && <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1 }}>{rowPctOfGrand} %</div>}
                            </TdR>
                          </Tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <Tr>
                        <Td><strong>Celkem</strong></Td>
                        {pivotTable.colKeys.map(colKey => (
                          <TdR key={`total_${colKey}`}><strong>
                            {pivotConfig.colMode === 'metrics'
                              ? formatMetricForKey(pivotTable.totalForCol(colKey), colKey)
                              : formatMetric(pivotTable.totalForCol(colKey))}
                          </strong></TdR>
                        ))}
                        <TdR><strong>{pivotConfig.colMode === 'metrics' ? '' : formatMetric(pivotTable.grandTotal)}</strong></TdR>
                      </Tr>
                    </tfoot>
                  </Table>
                </TableWrapper>
                {renderPagination('pivotTable', pagedPivotRows)}
              </SectionCard>
            )}
            
            {/* ====================================================================
                TAB: PŘEHLED POKLADEN - Nový modul pro přehled pokladních knih
                ==================================================================== */}
            {activeTab === 'cashbook' && (
              <>
                {isBlockVisible('cashbook', 'cashbookOverview') && (
                  <SectionCard id="section-cashbookOverview">
                    <SectionHeader>
                      <SectionTitle><FontAwesomeIcon icon={faCoins} style={{ marginRight: '0.5rem', opacity: 0.7 }} />Přehled pokladen</SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Zobrazení aktuálního období */}
                        <SectionBadge $tone="info" style={{ fontSize: '0.85rem', fontWeight: '700', padding: '0.35rem 0.75rem' }}>
                          {cashbookFilters.mesic
                            ? `${['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'][cashbookFilters.mesic - 1]} ${cashbookFilters.rok}`
                            : `Celý rok ${cashbookFilters.rok}`}
                        </SectionBadge>
                        <button onClick={handleExportCsv_cashbookOverview} title="Exportovat do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FontAwesomeIcon icon={faDownload} />CSV</button>
                        {cashbookLoading && <SectionBadge $tone="info">Načítám...</SectionBadge>}
                      </div>
                    </SectionHeader>
                    
                    {/* Filtry: Měsíc (rok se bere z globálního filtru) */}
                    <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Období:</label>
                        <select
                          value={cashbookFilters.mesic || 'all'}
                          onChange={(e) => setCashbookFilters(prev => {
                            const next = { ...prev, mesic: e.target.value === 'all' ? null : Number(e.target.value) };
                            try { localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_cashbook_filters`, JSON.stringify(next)); } catch (_) {}
                            return next;
                          })}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          <option value="all">Celý rok {cashbookFilters.rok}</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                            const label = new Date(2000, m - 1, 1).toLocaleDateString('cs-CZ', { month: 'long' });
                            return <option key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)} {cashbookFilters.rok}</option>;
                          })}
                        </select>
                      </div>

                      {/* Fulltext vyhledávání */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap' }}>Hledat:</label>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.75rem', pointerEvents: 'none' }} />
                          <input
                            type="text"
                            value={cashbookSearch}
                            onChange={(e) => setCashbookSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setCashbookSearchActive(cashbookSearch.trim()); }}
                            placeholder="doklad, obsah, komu, částka, LP kód… (Enter)"
                            style={{ width: '100%', padding: '0.4rem 1.8rem 0.4rem 2rem', borderRadius: '6px', border: `1px solid ${cashbookSearchActive ? '#3b82f6' : '#cbd5e1'}`, fontSize: '0.8rem', boxSizing: 'border-box', outline: 'none', background: cashbookSearchActive ? '#eff6ff' : '#fff', transition: 'border-color 0.15s' }}
                          />
                          {cashbookSearch && (
                            <button
                              onClick={() => { setCashbookSearch(''); setCashbookSearchActive(''); }}
                              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                              title="Vymazat hledání"
                            >
                              <FontAwesomeIcon icon={faXmark} style={{ fontSize: '0.8rem' }} />
                            </button>
                          )}
                        </div>
                        {cashbookSearchActive && (
                          <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: '600', whiteSpace: 'nowrap', background: '#dbeafe', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            aktivní
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Summary statistiky */}
                    {cashbookData?.summary && (() => {
                      const s = cashbookData.summary;
                      const obdobiTxt = cashbookFilters.mesic ? `${cashbookFilters.mesic}/${cashbookFilters.rok}` : `celý rok ${cashbookFilters.rok}`;
                      return (
                        <div style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%)', borderBottom: '1px solid #3b82f6', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div title={`Počet evidovaných pokladen v období ${obdobiTxt}.\nKaždá pokladna je počítána jednou bez ohledu na počet uživatelů.`}>
                            <div style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'help' }}>Počet pokladen</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af', fontFamily: 'monospace' }}>{s.celkem_pokladen || 0}</div>
                          </div>
                          <div title={`Součet všech příjemů ve všech pokladnách za ${obdobiTxt}.\nPříjmy = přijaté částky na pokladně (hotovostní příjmy PPD).`}>
                            <div style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'help' }}>Celkové příjmy</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#15803d', fontFamily: 'monospace' }}>{fmtCurrency(s.celkem_prijmy || 0)}</div>
                          </div>
                          <div title={`Součet všech výdajů ve všech pokladnách za ${obdobiTxt}.\nVýdaje = vyplacené částky z pokladny (hotovostní výdaje VPD).`}>
                            <div style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'help' }}>Celkové výdaje</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#b91c1c', fontFamily: 'monospace' }}>{fmtCurrency(s.celkem_vydaje || 0)}</div>
                          </div>
                          <div title={`Součet konečných stavů všech pokladen k poslednímu dostupnému měsíci za ${obdobiTxt}.\nKonečný stav = Převod z předcházejího + Příjmy − Výdaje.\nPři zobrazení celého roku = stav k poslednímu uzavřenému měsíci.`}>
                            <div style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'help' }}>Konečný stav</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af', fontFamily: 'monospace' }}>{fmtCurrency(s.celkovy_koncovy_stav || 0)}</div>
                          </div>
                          <div title={`Celkový počet dokladů (operací) ve všech pokladních knihách za ${obdobiTxt}.`} style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'help' }}>Počet operací</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#475569', fontFamily: 'monospace' }}>{(s.celkem_zaznamu || 0).toLocaleString('cs-CZ')}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tabulka pokladních knih */}
                    {!cashbookLoading && cashbookData?.books && cashbookData.books.length > 0 ? (
                      <TableWrapper style={{ margin: 0 }}>
                        <Table>
                          <thead>
                            <tr>
                              <Th style={{ width: '30px', textAlign: 'center' }}>
                                <span
                                  style={{ cursor: 'pointer', fontSize: '1rem', fontWeight: '900', color: TAB_TONES.cashbook.base, userSelect: 'none' }}
                                  title="Rozbalit / sbalit vše"
                                  onClick={() => {
                                    const allKeys = cashbookBooksToRender.map(b => 
                                      b.mesic ? `month_${b.kniha_id}` : `year_${b.pokladna_id}_${b.rok}`
                                    );
                                    const allExpanded = allKeys.every(key => expandedCashbookRows.has(key));
                                    if (allExpanded) {
                                      setExpandedCashbookRows(new Set());
                                    } else {
                                      setExpandedCashbookRows(new Set(allKeys));
                                      // Načíst položky - pro měsíční knihy i pro všechny měsíce ročních agregací
                                      cashbookBooksToRender.forEach(b => {
                                        if (b.mesic && b.kniha_id && !cashbookEntries[b.kniha_id]) {
                                          loadCashbookEntries(b.kniha_id);
                                        } else if (!b.mesic && b.mesice) {
                                          b.mesice.forEach(month => {
                                            if (month.kniha_id && !cashbookEntries[month.kniha_id]) {
                                              loadCashbookEntries(month.kniha_id);
                                            }
                                          });
                                        }
                                      });
                                    }
                                  }}
                                >
                                  {cashbookBooksToRender.map(b => 
                                    b.mesic ? `month_${b.kniha_id}` : `year_${b.pokladna_id}_${b.rok}`
                                  ).every(key => expandedCashbookRows.has(key)) ? '\u2212' : '+'}
                                </span>
                              </Th>
                              <Th>Pokladna</Th>
                              <Th style={{ width: '100px', textAlign: 'center' }}>Období</Th>
                              <ThR>Počáteční stav</ThR>
                              <ThR>Převod z předch.</ThR>
                              <ThR style={{ color: '#15803d' }}>Příjmy</ThR>
                              <ThR style={{ color: '#b91c1c' }}>Výdaje</ThR>
                              <ThR style={{ color: '#1e40af', fontWeight: '700' }}>Konečný stav</ThR>
                              <ThC>Počet operací</ThC>
                              <Th style={{ width: '100px', textAlign: 'center' }}>Stav</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {cashbookBooksToRender.length === 0 && cbMatchData && (
                              <tr>
                                <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                  <FontAwesomeIcon icon={faSearch} style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 0.75rem' }} />
                                  <div>Žádné pokladny ani záznamy neodpovídají hledání "{cashbookSearchActive}"</div>
                                  <button onClick={() => { setCashbookSearch(''); setCashbookSearchActive(''); }} style={{ marginTop: '0.75rem', padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: '#475569' }}>Zrušit vyhledávání</button>
                                </td>
                              </tr>
                            )}
                            {cashbookBooksToRender.map(book => {
                              // Generovat unikátní klíč pro každý řádek
                              const uniqueKey = book.mesic 
                                ? `month_${book.kniha_id}` 
                                : `year_${book.pokladna_id}_${book.rok}`;
                              
                              const isExpanded = expandedCashbookRows.has(uniqueKey);
                              const entries = cashbookEntries[book.kniha_id]; // undefined=loading, []=empty, [...]=data
                              const obdobi = book.mesic ? `${book.mesic}/${book.rok}` : String(book.rok);
                              const isYearAggregate = !book.mesic && book.mesice && book.mesice.length > 0;
                              
                              return (
                                <React.Fragment key={uniqueKey}>
                                  <Tr
                                    $highlight={isExpanded}
                                    style={{ cursor: 'pointer', background: isExpanded ? '#eff6ff' : undefined }}
                                    onClick={() => {
                                      setExpandedCashbookRows(prev => {
                                        const next = new Set(prev);
                                        if (next.has(uniqueKey)) {
                                          next.delete(uniqueKey);
                                        } else {
                                          next.add(uniqueKey);
                                          if (book.mesic && book.kniha_id && !cashbookEntries[book.kniha_id]) {
                                            // Měsíční kniha - načíst její položky
                                            loadCashbookEntries(book.kniha_id);
                                          } else if (isYearAggregate) {
                                            // Celoroční agregace - načíst položky všech měsíců
                                            (book.mesice || []).forEach(month => {
                                              if (month.kniha_id && !cashbookEntries[month.kniha_id]) {
                                                loadCashbookEntries(month.kniha_id);
                                              }
                                            });
                                          }
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '1rem', color: TAB_TONES.cashbook.base }}>
                                      {isExpanded ? '\u2212' : '+'}
                                    </Td>
                                    <Td>
                                      <div style={{ fontWeight: '600', color: '#334155' }}>
                                        {book.pokladna_nazev || `Pokladna ${book.cislo_pokladny}`}
                                        <span style={{ fontWeight: '400', color: '#94a3b8', fontSize: '0.8rem', marginLeft: '0.4rem' }}>(č. {book.cislo_pokladny})</span>
                                      </div>
                                      {book.hlavni_uzivatel && (
                                        <div style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '0.15rem', fontWeight: '500' }}>👤 {book.hlavni_uzivatel}</div>
                                      )}
                                      {book.dalsi_uzivatele && book.dalsi_uzivatele.length > 0 && (
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Přístup: {book.dalsi_uzivatele.join(', ')}</div>
                                      )}
                                    </Td>
                                    <TdC style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{obdobi}</TdC>
                                    <TdR>{fmtCurrency(book.pocatecni_stav_rok)}</TdR>
                                    <TdR>{fmtCurrency(book.prevod_z_predchoziho)}</TdR>
                                    <TdR style={{ color: '#15803d', fontWeight: '600' }}>+{fmtCurrency(book.celkove_prijmy)}</TdR>
                                    <TdR style={{ color: '#b91c1c', fontWeight: '600' }}>−{fmtCurrency(book.celkove_vydaje)}</TdR>
                                    <TdR style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.95rem' }}>{fmtCurrency(book.koncovy_stav)}</TdR>
                                    <TdC>
                                      <SectionBadge $tone="info">{book.pocet_zaznamu || 0}</SectionBadge>
                                    </TdC>
                                    <TdC>
                                      {(() => {
                                        if (isYearAggregate && book.mesice && book.mesice.length > 0) {
                                          // Celoroční: zobrazit každý měsíc jako pílu se stavem + LP supercript
                                          const mesNazvy = ['Led','Ún','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
                                          const sorted = [...book.mesice].sort((a, b) => (a.mesic||0) - (b.mesic||0));
                                          return (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                                              {sorted.map((m, i) => {
                                                const zamceno = m.stav_knihy === 'zamknuta_spravcem' || !!m.zamknuta_spravcem_kdy;
                                                const uzavrena = m.stav_knihy === 'uzavrena_uzivatelem';
                                                const color = zamceno ? '#7c3aed' : uzavrena ? '#64748b' : '#15803d';
                                                const bg = zamceno ? '#ede9fe' : uzavrena ? '#f1f5f9' : '#dcfce7';
                                                const title = zamceno ? 'Zamčeno správcem' : uzavrena ? 'Uzavřeno uživatelem' : 'Aktivní (otevřeno)';
                                                const lpSuper = book.lp_kod_povinny != null
                                                  ? <sup style={{ fontSize: '0.6em', fontWeight: '700', color: book.lp_kod_povinny ? '#b45309' : '#0369a1', marginLeft: '1px' }}>{book.lp_kod_povinny ? '+' : '\u2212'}</sup>
                                                  : null;
                                                return (
                                                  <span key={i} title={title} style={{
                                                    display: 'inline-flex', alignItems: 'baseline',
                                                    fontSize: '0.68rem', fontWeight: '600',
                                                    color, background: bg,
                                                    border: `1px solid ${color}33`,
                                                    borderRadius: '4px', padding: '1px 4px',
                                                    whiteSpace: 'nowrap', lineHeight: 1.5
                                                  }}>
                                                    {mesNazvy[(m.mesic||1)-1]}{lpSuper}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          );
                                        }
                                        // Měsíční řádek
                                        const stav = book.stav_knihy;
                                        const zamceno = stav === 'zamknuta_spravcem' || !!book.zamknuta_spravcem_kdy;
                                        return (
                                          <>
                                            {zamceno && <SectionBadge $tone="warning">Zamčeno</SectionBadge>}
                                            {!zamceno && stav === 'aktivni' && <SectionBadge $tone="success">Aktivní</SectionBadge>}
                                            {!zamceno && stav === 'uzavrena_uzivatelem' && <SectionBadge $tone="neutral">Uzavřená</SectionBadge>}
                                            {!zamceno && !stav && <SectionBadge $tone="neutral">-</SectionBadge>}
                                            {book.lp_kod_povinny != null && (
                                              <div style={{ marginTop: '0.25rem' }}>
                                                <SectionBadge $tone={book.lp_kod_povinny ? 'warning' : 'info'} style={{ fontSize: '0.65rem' }}>
                                                  LP{book.lp_kod_povinny
                                                    ? <sup style={{ fontWeight: '700' }}>+</sup>
                                                    : <sup style={{ fontWeight: '700' }}>−</sup>}
                                                </SectionBadge>
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </TdC>
                                  </Tr>
                                  
                                  {/* Expanded detail */}
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={10} style={{ padding: '0', background: '#eff6ff', borderBottom: '2px solid #3b82f6' }}>
                                        <div style={{ padding: '1rem 2rem' }}>
                                          {isYearAggregate ? (
                                            // Celoroční agregace - zobrazit všechny měsíce s jejich položkami
                                            <>
                                              {(book.mesice || []).map((month, mIdx) => {
                                                const monthEntries = cashbookEntries[month.kniha_id]; // undefined=loading, []=empty
                                                const mesicNazev = new Date(2000, month.mesic - 1, 1).toLocaleDateString('cs-CZ', { month: 'long' });
                                                const mesicLabel = mesicNazev.charAt(0).toUpperCase() + mesicNazev.slice(1);
                                                return (
                                                  <div key={month.kniha_id || mIdx} style={{
                                                    marginBottom: mIdx < (book.mesice.length - 1) ? '1rem' : 0,
                                                    borderBottom: mIdx < (book.mesice.length - 1) ? '2px dashed #bfdbfe' : 'none',
                                                    paddingBottom: mIdx < (book.mesice.length - 1) ? '1rem' : 0
                                                  }}>
                                                    {/* Hlavička měsíce */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                      <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#1e40af', minWidth: '120px' }}>
                                                        {mesicLabel} {book.rok}
                                                      </div>
                                                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                                                        <span style={{ color: '#15803d' }}>+{fmtCurrency(month.celkove_prijmy)}</span>
                                                        <span style={{ color: '#b91c1c' }}>−{fmtCurrency(month.celkove_vydaje)}</span>
                                                        <span style={{ color: '#1e40af', fontWeight: '600' }}>{fmtCurrency(month.koncovy_stav)}</span>
                                                        {month.stav_knihy === 'aktivni' && <SectionBadge $tone="success" style={{ fontSize: '0.75rem' }}>Aktivní</SectionBadge>}
                                                        {month.stav_knihy === 'uzavrena_uzivatelem' && <SectionBadge $tone="neutral" style={{ fontSize: '0.75rem' }}>Uzavřená</SectionBadge>}
                                                        {month.stav_knihy === 'zamknuta_spravcem' && <SectionBadge $tone="warning" style={{ fontSize: '0.75rem' }}>Zamčeno</SectionBadge>}
                                                      </div>
                                                    </div>
                                                    {/* Položky měsíce */}
                                                    {monthEntries === undefined ? (
                                                      <div style={{ padding: '0.5rem 0', fontSize: '0.8rem', color: '#a8a29e', fontStyle: 'italic' }}>Načítám položky...</div>
                                                    ) : monthEntries.length === 0 ? (
                                                      <div style={{ padding: '0.5rem 0', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Žádné záznamy v tomto měsíci</div>
                                                    ) : (
                                                      <TableWrapper style={{ margin: 0 }}>
                                                        <Table>
                                                          <thead>
                                                            <tr>
                                                              <Th style={{ width: '100px' }}>Datum</Th>
                                                              <Th style={{ width: '110px' }}>Číslo dokladu</Th>
                                                              <Th>Obsah zápisu</Th>
                                                              <Th style={{ width: '140px' }}>Komu/Od koho</Th>
                                                              <ThR style={{ color: '#15803d' }}>Příjem</ThR>
                                                              <ThR style={{ color: '#b91c1c' }}>Výdaj</ThR>
                                                              <ThR>Zůstatek</ThR>
                                                              <Th style={{ width: '110px' }}>LP kód</Th>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {monthEntries.map((entry, idx) => {
                                                              const isEntryMatch = cashbookNormSearch && cbMatchData?.entryMatchSets[month.kniha_id]?.has(idx);
                                                              return (
                                                                <Tr key={entry.id || idx} style={{ fontSize: '0.8rem', background: isEntryMatch ? '#fefce8' : undefined }}>
                                                                  <Td>{entry.datum_zapisu ? new Date(entry.datum_zapisu).toLocaleDateString('cs-CZ') : '-'}</Td>
                                                                  <Td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{cbHighlightText(entry.cislo_dokladu, cashbookNormSearch)}</Td>
                                                                  <Td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cbHighlightText(entry.obsah_zapisu, cashbookNormSearch)}</Td>
                                                                  <Td style={{ fontSize: '0.75rem' }}>{cbHighlightText(entry.komu_od_koho, cashbookNormSearch)}</Td>
                                                                  <TdR style={{ color: entry.castka_prijem > 0 ? '#15803d' : '#94a3b8' }}>
                                                                    {entry.castka_prijem > 0 ? fmtCurrency(entry.castka_prijem) : '-'}
                                                                  </TdR>
                                                                  <TdR style={{ color: entry.castka_vydaj > 0 ? '#b91c1c' : '#94a3b8' }}>
                                                                    {entry.castka_vydaj > 0 ? fmtCurrency(entry.castka_vydaj) : '-'}
                                                                  </TdR>
                                                                  <TdR style={{ fontWeight: '600', color: '#334155' }}>{fmtCurrency(entry.zustatek_po_operaci || 0)}</TdR>
                                                                  <Td style={{ fontSize: '0.75rem' }}>
                                                                    {entry.detail_items && entry.detail_items.length > 0 ? (
                                                                      <div>{entry.detail_items.map((item, ii) => <div key={ii}>{cbHighlightText(item.lp_kod, cashbookNormSearch)} ({fmtCurrency(item.castka)})</div>)}</div>
                                                                    ) : cbHighlightText(entry.lp_kod, cashbookNormSearch)}
                                                                  </Td>
                                                                </Tr>
                                                              );
                                                            })}
                                                          </tbody>
                                                        </Table>
                                                      </TableWrapper>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </>
                                          ) : (
                                            // Měsíční kniha - zobrazit položky
                                            <>
                                              <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#1e40af' }}>
                                                Položky pokladní knihy:
                                              </div>
                                              
                                              {entries === undefined ? (
                                                <div style={{ padding: '2rem', textAlign: 'center', color: '#a8a29e', fontSize: '0.875rem' }}>
                                                  Načítám položky...
                                                </div>
                                              ) : entries.length === 0 ? (
                                                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                                                  Žádné záznamy v tomto měsíci
                                                </div>
                                              ) : (
                                                <TableWrapper style={{ margin: 0 }}>
                                                  <Table>
                                                    <thead>
                                                      <tr>
                                                        <Th style={{ width: '100px' }}>Datum zápisu</Th>
                                                        <Th style={{ width: '120px' }}>Číslo dokladu</Th>
                                                        <Th>Obsah zápisu</Th>
                                                        <Th style={{ width: '150px' }}>Komu/Od koho</Th>
                                                        <ThR style={{ color: '#15803d' }}>Příjem</ThR>
                                                        <ThR style={{ color: '#b91c1c' }}>Výdaj</ThR>
                                                        <ThR>Zůstatek</ThR>
                                                        <Th style={{ width: '120px' }}>LP kód</Th>
                                                        <Th style={{ width: '180px' }}>Poznámka</Th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {entries.map((entry, idx) => {
                                                        const isEntryMatch = cashbookNormSearch && cbMatchData?.entryMatchSets[book.kniha_id]?.has(idx);
                                                        return (
                                                          <Tr key={entry.id || idx} style={{ fontSize: '0.875rem', background: isEntryMatch ? '#fefce8' : undefined }}>
                                                            <Td>{entry.datum_zapisu ? new Date(entry.datum_zapisu).toLocaleDateString('cs-CZ') : '-'}</Td>
                                                            <Td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cbHighlightText(entry.cislo_dokladu, cashbookNormSearch)}</Td>
                                                            <Td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                              {cbHighlightText(entry.obsah_zapisu, cashbookNormSearch)}
                                                            </Td>
                                                            <Td style={{ fontSize: '0.8rem' }}>{cbHighlightText(entry.komu_od_koho, cashbookNormSearch)}</Td>
                                                            <TdR style={{ color: entry.castka_prijem > 0 ? '#15803d' : '#94a3b8', fontWeight: entry.castka_prijem > 0 ? '600' : 'normal' }}>
                                                              {entry.castka_prijem > 0 ? fmtCurrency(entry.castka_prijem) : '-'}
                                                            </TdR>
                                                            <TdR style={{ color: entry.castka_vydaj > 0 ? '#b91c1c' : '#94a3b8', fontWeight: entry.castka_vydaj > 0 ? '600' : 'normal' }}>
                                                              {entry.castka_vydaj > 0 ? fmtCurrency(entry.castka_vydaj) : '-'}
                                                            </TdR>
                                                            <TdR style={{ fontWeight: '600', color: '#334155' }}>{fmtCurrency(entry.zustatek_po_operaci || 0)}</TdR>
                                                            <Td style={{ fontSize: '0.8rem' }}>
                                                              {entry.detail_items && entry.detail_items.length > 0 ? (
                                                                <div style={{ fontSize: '11px', color: '#666' }}>
                                                                  {entry.detail_items.map((item, itemIdx) => (
                                                                    <div key={itemIdx}>
                                                                      {cbHighlightText(item.lp_kod, cashbookNormSearch)} ({fmtCurrency(item.castka)})
                                                                    </div>
                                                                  ))}
                                                                </div>
                                                              ) : cbHighlightText(entry.lp_kod, cashbookNormSearch)}
                                                            </Td>
                                                            <Td style={{ fontSize: '0.8rem' }}>{entry.poznamka || '-'}</Td>
                                                          </Tr>
                                                        );
                                                      })}
                                                    </tbody>
                                                  </Table>
                                                </TableWrapper>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </Table>
                      </TableWrapper>
                    ) : !cashbookLoading ? (
                      <EmptyState>Žádná data pro zvolené období</EmptyState>
                    ) : null}
                  </SectionCard>
                )}

                {/* ── Grafy přehledu pokladen ── */}
                {cashbookData?.books?.length > 0 && (() => {
                  const obdobiLabel = cashbookFilters.mesic ? `${cashbookFilters.mesic}/${cashbookFilters.rok}` : `rok ${cashbookFilters.rok}`;

                  // ── Graf 1: Výdaje podle pokladen (donut) ─────────────────
                  // Agregovat per pokladna (pro celoroční zobrazení sloučit měsíce té samé pokladny)
                  const pokladnaMap = {};
                  cashbookData.books.forEach(book => {
                    const key = book.pokladna_id || book.cislo_pokladny;
                    const label = book.pokladna_nazev || `Pokladna ${book.cislo_pokladny}`;
                    if (!pokladnaMap[key]) pokladnaMap[key] = { label, prijmy: 0, vydaje: 0 };
                    pokladnaMap[key].prijmy += parseFloat(book.celkove_prijmy || 0);
                    pokladnaMap[key].vydaje += parseFloat(book.celkove_vydaje || 0);
                  });
                  const p1Entries  = Object.values(pokladnaMap).filter(p => p.vydaje > 0).sort((a, b) => b.vydaje - a.vydaje);
                  const p1Labels   = p1Entries.map(p => p.label);
                  const p1Vydaje   = p1Entries.map(p => Math.round(p.vydaje));
                  const p1Prijmy   = p1Entries.map(p => Math.round(p.prijmy));
                  const p1TotalV   = p1Vydaje.reduce((s, v) => s + v, 0) || 1;
                  const p1Colors   = buildChartColors(p1Labels.length, CHART_COLORS);
                  const donut1Data = {
                    labels: p1Labels,
                    datasets: [{ data: p1Vydaje, backgroundColor: p1Colors, borderWidth: 2, borderColor: '#fff' }]
                  };
                  const donut1Opts = {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        display: ctx => (ctx.dataset.data[ctx.dataIndex] / p1TotalV) >= 0.05,
                        formatter: v => Math.round(v / p1TotalV * 100) + ' %',
                        color: '#fff', font: { size: 11, weight: 'bold' },
                        textShadowColor: 'rgba(0,0,0,0.4)', textShadowBlur: 3,
                      },
                      tooltip: {
                        callbacks: {
                          label: ctx => ` ${ctx.label}: ${fmtCurrency(ctx.parsed)} (${Math.round(ctx.parsed / p1TotalV * 100)} %)`
                        }
                      }
                    }
                  };

                  // ── Graf 2: LP kódy z položek (donut) ────────────────────
                  const lpMap = {};
                  Object.values(cashbookEntries).forEach(entries => {
                    if (!Array.isArray(entries)) return;
                    entries.forEach(entry => {
                      const items = entry.detail_items && entry.detail_items.length > 0 ? entry.detail_items : null;
                      if (items) {
                        items.forEach(item => {
                          if (!item.lp_kod) return;
                          if (!lpMap[item.lp_kod]) lpMap[item.lp_kod] = { vydaje: 0, pocet: 0 };
                          lpMap[item.lp_kod].vydaje += parseFloat(item.castka || 0);
                          lpMap[item.lp_kod].pocet  += 1;
                        });
                      } else if (entry.lp_kod) {
                        if (!lpMap[entry.lp_kod]) lpMap[entry.lp_kod] = { vydaje: 0, pocet: 0 };
                        lpMap[entry.lp_kod].vydaje += parseFloat(entry.castka_vydaj || 0);
                        lpMap[entry.lp_kod].pocet  += 1;
                      }
                    });
                  });
                  
                  // ✨ Seskupení LP kódů podle prefixu (např. LPPT1,2,3 u sebe)
                  const lpSorted  = Object.entries(lpMap).sort((a, b) => {
                    // Extrahovat prefix (část před první číslicí)
                    const getPrefixAndNum = (kod) => {
                      const match = kod.match(/^([A-Za-z]+)(\d+)?$/);
                      if (match) {
                        return { prefix: match[1], num: parseInt(match[2] || '0', 10) };
                      }
                      return { prefix: kod, num: 0 };
                    };
                    
                    const prefixA = getPrefixAndNum(a[0]);
                    const prefixB = getPrefixAndNum(b[0]);
                    
                    // Nejprve řadit podle prefixu (abecedně)
                    if (prefixA.prefix !== prefixB.prefix) {
                      return prefixA.prefix.localeCompare(prefixB.prefix);
                    }
                    
                    // V rámci stejného prefixu řadit podle čísla
                    return prefixA.num - prefixB.num;
                  });
                  
                  const lpLabels  = lpSorted.map(([k]) => k);
                  const lpVydaje  = lpSorted.map(([, v]) => Math.round(v.vydaje));
                  const lpPocet   = lpSorted.map(([, v]) => v.pocet);
                  const lpTotalV  = lpVydaje.reduce((s, v) => s + v, 0) || 1;
                  const lpColors  = buildChartColors(lpLabels.length, CHART_COLORS);
                  const hasLpData = lpLabels.length > 0;
                  const loadedCount = Object.values(cashbookEntries).filter(e => Array.isArray(e)).length;
                  const donut2Data = {
                    labels: lpLabels,
                    datasets: [{ data: lpVydaje, backgroundColor: lpColors, borderWidth: 2, borderColor: '#fff' }]
                  };
                  const donut2Opts = {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        display: ctx => (ctx.dataset.data[ctx.dataIndex] / lpTotalV) >= 0.05,
                        formatter: v => Math.round(v / lpTotalV * 100) + ' %',
                        color: '#fff', font: { size: 11, weight: 'bold' },
                        textShadowColor: 'rgba(0,0,0,0.4)', textShadowBlur: 3,
                      },
                      tooltip: {
                        callbacks: {
                          label: ctx => ` ${ctx.label}: ${fmtCurrency(ctx.parsed)} (${Math.round(ctx.parsed / lpTotalV * 100)} %)`
                        }
                      }
                    }
                  };

                  return (
                    <div id="section-cashbookCharts" style={{ marginTop: '1.25rem' }}>
                      <ChartGrid>
                        {/* Graf 1 – Výdaje per pokladna */}
                        <ChartCard>
                          <SectionTitle style={{ marginBottom: '0.25rem' }}>
                            <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                            Výdaje podle pokladen
                          </SectionTitle>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            Podíl výdajů per pokladna — {obdobiLabel} — celkem {fmtCurrency(p1TotalV)}
                          </div>
                          <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: `Výdaje podle pokladen — ${obdobiLabel}`, el: <Doughnut data={donut1Data} options={withFsFont(donut1Opts)} plugins={[ChartDataLabels]} /> })}>
                            <FontAwesomeIcon icon={faExpand} />
                          </ChartExpandBtn>
                          <div style={{ display: 'flex', gap: '1rem', height: '480px', alignItems: 'center' }}>
                            <div style={{ flex: '0 0 52%', position: 'relative', height: '100%' }}>
                              <Doughnut data={donut1Data} options={donut1Opts} plugins={[ChartDataLabels]} />
                            </div>
                            <ChartLegendScroll>
                              {p1Entries.map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  <div style={{ width: 12, height: 12, background: p1Colors[i], borderRadius: 3, flexShrink: 0, marginTop: 3 }} />
                                  <div style={{ lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{p.label}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                                      Výdaje: {fmtCurrency(p.vydaje)}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#10b981' }}>
                                      Příjmy: {fmtCurrency(p.prijmy)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </ChartLegendScroll>
                          </div>
                        </ChartCard>

                        {/* Graf 2 – LP kódy */}
                        <ChartCard>
                          <SectionTitle style={{ marginBottom: '0.25rem' }}>
                            <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                            Výdaje podle LP kódů
                          </SectionTitle>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                            {hasLpData
                              ? `Podíl výdajů per LP kód — z ${loadedCount} načtených měsíců — celkem ${fmtCurrency(lpTotalV)}`
                              : loadedCount === 0
                                ? 'Načítám položky…'
                                : 'Žádné LP kódy v evidovaných zápisech'}
                          </div>
                          {hasLpData ? (
                            <>
                              <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: `Výdaje podle LP kódů — ${obdobiLabel}`, el: <Doughnut data={donut2Data} options={withFsFont(donut2Opts)} plugins={[ChartDataLabels]} /> })}>
                                <FontAwesomeIcon icon={faExpand} />
                              </ChartExpandBtn>
                              <div style={{ display: 'flex', gap: '1rem', height: '480px', alignItems: 'center' }}>
                                <div style={{ flex: '0 0 52%', position: 'relative', height: '100%' }}>
                                  <Doughnut data={donut2Data} options={donut2Opts} plugins={[ChartDataLabels]} />
                                </div>
                                <ChartLegendScroll>
                                  {lpSorted.map(([kod, vals], i) => {
                                    // Extrahovat prefix pro vizuální oddělení skupin
                                    const getPrefix = (k) => k.match(/^([A-Za-z]+)/)?.[1] || k;
                                    const currentPrefix = getPrefix(kod);
                                    const prevPrefix = i > 0 ? getPrefix(lpSorted[i - 1][0]) : null;
                                    const showDivider = i > 0 && currentPrefix !== prevPrefix;
                                    
                                    return (
                                      <React.Fragment key={i}>
                                        {showDivider && (
                                          <div style={{ 
                                            gridColumn: '1 / -1', 
                                            height: '1px', 
                                            background: 'linear-gradient(to right, #cbd5e1 0%, #cbd5e1 50%, transparent 50%)',
                                            backgroundSize: '8px 1px',
                                            margin: '0.35rem 0',
                                            opacity: 0.6
                                          }} />
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <div style={{ width: 12, height: 12, background: lpColors[i], borderRadius: 3, flexShrink: 0 }} />
                                          <div style={{ fontSize: '0.75rem', color: '#1e293b', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontWeight: 600 }}>{kod}</span>
                                            <span style={{ color: '#64748b', fontWeight: 500 }}>({vals.pocet})</span>
                                            <span style={{ color: '#64748b', marginLeft: '0.35rem' }}>: {fmtCurrency(vals.vydaje)}</span>
                                          </div>
                                        </div>
                                      </React.Fragment>
                                    );
                                  })}
                                </ChartLegendScroll>
                              </div>
                            </>
                          ) : (
                            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem', flexDirection: 'column', gap: '0.5rem' }}>
                              <FontAwesomeIcon icon={faChartPie} style={{ fontSize: '2rem', opacity: 0.3 }} />
                              <span>{loadedCount === 0 ? 'Načítám data…' : 'Žádné LP kódy v zápisech'}</span>
                            </div>
                          )}
                        </ChartCard>
                      </ChartGrid>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ====================================================================
                TAB: DOHADNÉ POLOŽKY — objednávky bez faktury, financované z LP/Smluv
                ==================================================================== */}
            {activeTab === 'dohadne' && (
              <>
                {/* ── Kvartální filtry ── */}
                {(() => {
                  const rok = parseInt(filters.orderYear || new Date().getFullYear(), 10);
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth() + 1;
                  const QUARTERS = [
                    { key: 'Q1',  label: '1. kvartál', sub: 'Led – Bře', od: `${rok}-01-01`, ddo: `${rok}-03-31`, firstMonth: 1 },
                    { key: 'Q2',  label: '2. kvartál', sub: 'Dub – Čvn', od: `${rok}-04-01`, ddo: `${rok}-06-30`, firstMonth: 4 },
                    { key: 'Q3',  label: '3. kvartál', sub: 'Čvc – Zář', od: `${rok}-07-01`, ddo: `${rok}-09-30`, firstMonth: 7 },
                    { key: 'Q4',  label: '4. kvartál', sub: 'Říj – Pro', od: `${rok}-10-01`, ddo: `${rok}-12-31`, firstMonth: 10 },
                    { key: 'ALL', label: 'Celý rok',   sub: `Led – Pro`, od: `${rok}-01-01`, ddo: `${rok}-12-31`, firstMonth: 1 },
                  ];
                  const isQAvailable = (q) =>
                    q.key === 'ALL' ||
                    rok < currentYear ||
                    (rok === currentYear && currentMonth >= q.firstMonth);
                  return (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {QUARTERS.map((q, qi) => {
                        const available = isQAvailable(q);
                        const active = dohadneSelectedQ === q.key;
                        const isAll = q.key === 'ALL';
                        return (
                          <React.Fragment key={q.key}>
                            {isAll && <div style={{ width: '1px', height: '40px', background: '#cbd5e1', alignSelf: 'center', margin: '0 0.25rem' }} />}
                            <button
                              disabled={!available}
                              onClick={() => {
                                if (!available || active) return;
                                setDohadneSelectedQ(q.key);
                                setDohadneDatumy(q.od, q.ddo);
                                setDohadneData(null);
                                loadDohadnePolozky(q.od, q.ddo);
                              }}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                padding: '0.45rem 1.1rem', borderRadius: '10px',
                                border: active ? `2px solid ${isAll ? '#1d4ed8' : '#c2410c'}` : '1px solid #cbd5e1',
                                background: active ? (isAll ? '#1d4ed8' : '#c2410c') : available ? '#fff' : '#f1f5f9',
                                color: active ? '#fff' : available ? '#334155' : '#94a3b8',
                                fontWeight: active ? 700 : 500,
                                fontSize: '0.82rem', cursor: available ? 'pointer' : 'not-allowed',
                                opacity: available ? 1 : 0.5, transition: 'all 0.15s',
                                minWidth: isAll ? '100px' : '90px',
                              }}
                            >
                              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{q.label}</span>
                              <span style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '1px' }}>{q.sub} {rok}</span>
                            </button>
                          </React.Fragment>
                        );
                      })}
                      {/* ── Stavový filtr ── */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.75rem', alignItems: 'center', flexWrap: 'wrap', borderLeft: '1px solid #cbd5e1', paddingLeft: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Zobrazit i:</span>
                        {[
                          { stav: 'Ke schválení', color: '#b45309', bg: '#fef3c7' },
                          { stav: 'Schválená',    color: '#065f46', bg: '#d1fae5' },
                          { stav: 'Rozpracovaná', color: '#1e40af', bg: '#dbeafe' },
                        ].map(({ stav, color, bg }) => {
                          const checked = dohadneStavFilter.has(stav);
                          return (
                            <label key={stav} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', padding: '0.25rem 0.6rem', borderRadius: '6px', border: `1px solid ${checked ? color : '#e2e8f0'}`, background: checked ? bg : '#f8fafc', fontSize: '0.78rem', fontWeight: checked ? 700 : 400, color: checked ? color : '#64748b', transition: 'all 0.12s', userSelect: 'none' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDohadneStav(stav)}
                                style={{ accentColor: color, cursor: 'pointer', width: '13px', height: '13px' }}
                              />
                              {stav}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Blok 0: Dle čísla účtu ── */}
                {isBlockVisible('dohadne', 'dohadneLpUctu') && (
                  <SectionCard id="section-dohadneLpUctu" style={{ marginBottom: '1.25rem' }}>
                    <SectionHeader>
                      <SectionTitle>
                        <FontAwesomeIcon icon={faHourglassHalf} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                        Dohadné položky — Limitované přísliby - dle LP účtu
                      </SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {dohadneData?.lp_uctu && (
                          <>
                            <SectionBadge $tone="warn">{dohadneData.lp_uctu.total_uctu_skupin ?? 0} účtů</SectionBadge>
                            <SectionBadge $tone="info">{dohadneData.lp_uctu.total_objednavek ?? 0} objednávek</SectionBadge>
                            <SectionBadge $tone="default">Před schválením: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.lp_uctu.castka_pre_schvaleni ?? 0)}</SectionBadge>
                            <SectionBadge $tone="success">Odeslané: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.lp_uctu.castka_odeslane ?? 0)}</SectionBadge>
                            <SectionBadge $tone="error" style={{ fontWeight: 700 }}>Celkem: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.lp_uctu.castka_celkem ?? 0)}</SectionBadge>
                          </>
                        )}
                        <button onClick={handleExportCsv_dohadneLpUctu} title="Exportovat Dle účtu do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <FontAwesomeIcon icon={faDownload} />CSV
                        </button>
                      </div>
                    </SectionHeader>

                    {dohadneLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #fed7aa', borderTop: '3px solid #c2410c', borderRadius: '50%', animation: 'gatespin 0.8s linear infinite' }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#c2410c' }}>Načítám dohadné položky…</div>
                      </div>
                    )}

                    {dohadneData?.lp_uctu?.groups?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0.75rem' }}>
                        {/* Záhlaví skupin */}
                        <div style={{ display: 'grid', gridTemplateColumns: '20px 60px 1fr 1fr 80px 110px 110px 110px', gap: '0.5rem', padding: '0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <div
                            title={dohadneData.lp_uctu.groups.every(g => expandedDohadneLpUctu.has(g.cislo_uctu)) ? 'Sbalit vše' : 'Rozbalit vše'}
                            onClick={() => {
                              const allExp = dohadneData.lp_uctu.groups.every(g => expandedDohadneLpUctu.has(g.cislo_uctu));
                              setExpandedDohadneLpUctu(allExp ? new Set() : new Set(dohadneData.lp_uctu.groups.map(g => g.cislo_uctu)));
                            }}
                            style={{ cursor: 'pointer', color: '#c2410c', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                          >
                            {dohadneData.lp_uctu.groups.every(g => expandedDohadneLpUctu.has(g.cislo_uctu)) ? '\u2212' : '+'}
                          </div>
                          <div>Č. účtu</div>
                          <div>Název účtu</div>
                          <div>LP kódy</div>
                          <div style={{ textAlign: 'right' }}>Počet obj.</div>
                          <div style={{ textAlign: 'right' }}>Před schválením</div>
                          <div style={{ textAlign: 'right' }}>Odeslané</div>
                          <div style={{ textAlign: 'right' }}>Celkem</div>
                        </div>
                        {/* Skupiny */}
                        {dohadneData.lp_uctu.groups.map(grp => {
                          const grpKey = grp.cislo_uctu;
                          const grpOpen = expandedDohadneLpUctu.has(grpKey);
                          const fmtKc = (v) => new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v ?? 0);
                          return (
                            <div key={grpKey} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                              <div
                                onClick={() => setExpandedDohadneLpUctu(prev => { const next = new Set(prev); grpOpen ? next.delete(grpKey) : next.add(grpKey); return next; })}
                                style={{ display: 'grid', gridTemplateColumns: '20px 60px 1fr 1fr 80px 110px 110px 110px', gap: '0.5rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#fff7ed' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                              >
                                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#c2410c', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                <span style={{ fontWeight: '800', color: '#78350f', fontSize: '0.95rem' }}>{grp.cislo_uctu}</span>
                                <span style={{ fontWeight: '700', color: '#78350f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{grp.nazev_uctu || '—'}</span>
                                <span style={{ fontSize: '0.73rem', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {(grp.lp_kody_v_uctu || []).join(', ')}
                                </span>
                                <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end', fontSize: '0.75rem' }}>{grp.pocet_objednavek} obj.</SectionBadge>
                                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#b45309', textAlign: 'right' }}>{fmtKc(grp.castka_pre_schvaleni)}</span>
                                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#059669', textAlign: 'right' }}>{fmtKc(grp.castka_odeslane)}</span>
                                <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{fmtKc(grp.castka_celkem)}</span>
                              </div>
                              {grpOpen && (
                                <div style={{ padding: '0.5rem 0.5rem 0.75rem 1rem', background: '#f8fafc' }}>
                                  <TableWrapper style={{ margin: 0 }}>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <ThSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'ev_cislo')}>Číslo{sortIcon(`dohadneUctu_${grpKey}`, 'ev_cislo')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'dt_obj')}>Dt. vytv.{sortIcon(`dohadneUctu_${grpKey}`, 'dt_obj')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'predmet')}>Předmět{sortIcon(`dohadneUctu_${grpKey}`, 'predmet')}</ThSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'cislo_lp')}>LP kód{sortIcon(`dohadneUctu_${grpKey}`, 'cislo_lp')}</ThNarrowSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'objednatel')}>Objednatel{sortIcon(`dohadneUctu_${grpKey}`, 'objednatel')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'schvalovatel')}>Schvalovatel{sortIcon(`dohadneUctu_${grpKey}`, 'schvalovatel')}</ThSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'usek')}>Úsek{sortIcon(`dohadneUctu_${grpKey}`, 'usek')}</ThNarrowSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'stav')}>Stav{sortIcon(`dohadneUctu_${grpKey}`, 'stav')}</ThNarrowSort>
                                          <ThRSort onClick={() => handleTableSort(`dohadneUctu_${grpKey}`, 'castka')}>Částka{sortIcon(`dohadneUctu_${grpKey}`, 'castka')}</ThRSort>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sortTableData(grp.objednavky, `dohadneUctu_${grpKey}`, {
                                          ev_cislo:     o => o.cislo_objednavky || '',
                                          dt_obj:       o => o.dt_vytvoreni || '',
                                          predmet:      o => o.predmet || '',
                                          cislo_lp:     o => o.cislo_lp || '',
                                          objednatel:   o => `${o.objednatel_prijmeni || ''} ${o.objednatel_jmeno || ''}`.trim(),
                                          schvalovatel: o => `${o.schvalovatel_prijmeni || ''} ${o.schvalovatel_jmeno || ''}`.trim() || `${o.prikazce_prijmeni || ''} ${o.prikazce_jmeno || ''}`.trim(),
                                          usek:         o => getUsekLabel(o) || '',
                                          stav:         o => o.stav_objednavky || '',
                                          castka:       o => String(o.castka || 0),
                                        }).map(obj => (
                                          <Tr key={obj.id}>
                                            <Td>{renderOrderLink(obj, null)}</Td>
                                            <Td>{formatDateCz(obj.dt_vytvoreni)}</Td>
                                            <SubjectTd>{obj.predmet || '—'}</SubjectTd>
                                            <TdNarrow style={{ fontWeight: 600, color: '#78350f' }}>{obj.cislo_lp || '—'}</TdNarrow>
                                            <Td>
                                              <NameStack>
                                                {renderNameLine(buildFullName(obj.objednatel_jmeno, obj.objednatel_prijmeni))}
                                              </NameStack>
                                            </Td>
                                            <Td>
                                              <NameStack>
                                                {renderNameLine(
                                                  buildFullName(obj.schvalovatel_jmeno, obj.schvalovatel_prijmeni) ||
                                                  buildFullName(obj.prikazce_jmeno, obj.prikazce_prijmeni)
                                                )}
                                              </NameStack>
                                            </Td>
                                            <TdNarrow>{getUsekLabel(obj) || '—'}</TdNarrow>
                                            <TdNarrow>
                                              <span style={{ display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#ffedd5', color: '#9a3412' }}>{obj.stav_objednavky}</span>
                                            </TdNarrow>
                                            <TdR style={{ fontFamily: 'monospace', fontWeight: 600, color: obj.typ_castky === 'pre_schvaleni' ? '#b45309' : '#059669' }}>{new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(obj.castka ?? 0)} Kč</TdR>
                                          </Tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </TableWrapper>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : dohadneData && !dohadneLoading ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: '2rem', opacity: 0.25, display: 'block', margin: '0 auto 0.5rem' }} />
                        Žádné LP dohadné položky dle účtu pro zvolený kvartál
                      </div>
                    ) : !dohadneData && !dohadneLoading ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Vyberte kvartál pro zobrazení dat</div>
                    ) : null}
                  </SectionCard>
                )}

                {/* ── Blok 1: Limitované přísliby ── */}
                {isBlockVisible('dohadne', 'dohadneLp') && (
                  <SectionCard id="section-dohadneLp" style={{ marginBottom: '1.25rem' }}>
                    <SectionHeader>
                      <SectionTitle>
                        <FontAwesomeIcon icon={faHourglassHalf} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                        Dohadné položky — Limitované přísliby - dle LP kódu
                      </SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {dohadneData?.lp && (
                          <>
                            <SectionBadge $tone="warn">{dohadneData.lp.total_lp_skupin ?? 0} LP skupin</SectionBadge>
                            <SectionBadge $tone="info">{dohadneData.lp.total_objednavek ?? 0} objednávek</SectionBadge>
                            <SectionBadge $tone="default">Před schválením: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.lp.castka_pre_schvaleni ?? 0)}</SectionBadge>
                            <SectionBadge $tone="success">Odeslané: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.lp.castka_odeslane ?? 0)}</SectionBadge>
                            <SectionBadge $tone="error" style={{ fontWeight: 700 }}>Celkem: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.lp.castka_celkem ?? 0)}</SectionBadge>
                          </>
                        )}
                        <button onClick={handleExportCsv_dohadneLp} title="Exportovat LP dohadné do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <FontAwesomeIcon icon={faDownload} />CSV
                        </button>
                      </div>
                    </SectionHeader>

                    {dohadneLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #fed7aa', borderTop: '3px solid #c2410c', borderRadius: '50%', animation: 'gatespin 0.8s linear infinite' }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#c2410c' }}>Načítám dohadné položky…</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Prosím čekejte, zpracovávám data z databáze.</div>
                      </div>
                    )}

                    {dohadneData?.lp?.groups?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0.75rem' }}>
                        {/* Záhlaví skupin */}
                        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 80px 110px 110px 110px', gap: '0.5rem', padding: '0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <div
                            title={dohadneData.lp.groups.every(g => expandedDohadneLp.has(String(g.lp_id))) ? 'Sbalit vše' : 'Rozbalit vše'}
                            onClick={() => {
                              const allExp = dohadneData.lp.groups.every(g => expandedDohadneLp.has(String(g.lp_id)));
                              setExpandedDohadneLp(allExp ? new Set() : new Set(dohadneData.lp.groups.map(g => String(g.lp_id))));
                            }}
                            style={{ cursor: 'pointer', color: '#c2410c', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                          >
                            {dohadneData.lp.groups.every(g => expandedDohadneLp.has(String(g.lp_id))) ? '\u2212' : '+'}
                          </div>
                          <div>LP kód / Název</div>
                          <div>LP Účet</div>
                          <div style={{ textAlign: 'right' }}>Počet obj.</div>
                          <div style={{ textAlign: 'right' }}>Před schválením</div>
                          <div style={{ textAlign: 'right' }}>Odeslané</div>
                          <div style={{ textAlign: 'right' }}>Celkem</div>
                        </div>
                        {/* Skupiny */}
                        {dohadneData.lp.groups.map(grp => {
                          const grpKey = String(grp.lp_id);
                          const grpOpen = expandedDohadneLp.has(grpKey);
                          const fmtKc = (v) => new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v ?? 0);
                          return (
                            <div key={grpKey} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                              <div
                                onClick={() => setExpandedDohadneLp(prev => { const next = new Set(prev); grpOpen ? next.delete(grpKey) : next.add(grpKey); return next; })}
                                style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 80px 110px 110px 110px', gap: '0.5rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#fff7ed' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                              >
                                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#c2410c', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                <span style={{ fontWeight: '700', color: '#78350f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {grp.cislo_lp || `LP#${grp.lp_id}`}
                                  {grp.nazev_uctu && <span style={{ fontWeight: 400, color: '#92400e', marginLeft: '0.4rem', fontSize: '0.8rem' }}>– {grp.nazev_uctu}</span>}
                                </span>
                                <span style={{ fontSize: '0.73rem', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{grp.cislo_uctu || '—'}</span>
                                <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end', fontSize: '0.75rem' }}>{grp.pocet_objednavek} obj.</SectionBadge>
                                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#b45309', textAlign: 'right' }}>{fmtKc(grp.castka_pre_schvaleni)}</span>
                                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#059669', textAlign: 'right' }}>{fmtKc(grp.castka_odeslane)}</span>
                                <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{fmtKc(grp.castka_celkem)}</span>
                              </div>
                              {grpOpen && (
                                <div style={{ padding: '0.5rem 0.5rem 0.75rem 1rem', background: '#f8fafc' }}>
                                  <TableWrapper style={{ margin: 0 }}>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <ThSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'ev_cislo')}>Číslo{sortIcon(`dohadneLp_${grpKey}`, 'ev_cislo')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'dt_obj')}>Dt. vytv.{sortIcon(`dohadneLp_${grpKey}`, 'dt_obj')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'predmet')}>Předmět{sortIcon(`dohadneLp_${grpKey}`, 'predmet')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'objednatel')}>Objednatel{sortIcon(`dohadneLp_${grpKey}`, 'objednatel')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'schvalovatel')}>Schvalovatel{sortIcon(`dohadneLp_${grpKey}`, 'schvalovatel')}</ThSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'usek')}>Úsek{sortIcon(`dohadneLp_${grpKey}`, 'usek')}</ThNarrowSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'druh')}>Druh{sortIcon(`dohadneLp_${grpKey}`, 'druh')}</ThNarrowSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'stav')}>Stav{sortIcon(`dohadneLp_${grpKey}`, 'stav')}</ThNarrowSort>
                                          <ThRSort onClick={() => handleTableSort(`dohadneLp_${grpKey}`, 'castka')}>Částka{sortIcon(`dohadneLp_${grpKey}`, 'castka')}</ThRSort>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sortTableData(grp.objednavky, `dohadneLp_${grpKey}`, {
                                          ev_cislo:     o => o.cislo_objednavky || '',
                                          dt_obj:       o => o.dt_vytvoreni || '',
                                          predmet:      o => o.predmet || '',
                                          objednatel:   o => `${o.objednatel_prijmeni || ''} ${o.objednatel_jmeno || ''}`.trim(),
                                          schvalovatel: o => `${o.schvalovatel_prijmeni || ''} ${o.schvalovatel_jmeno || ''}`.trim() || `${o.prikazce_prijmeni || ''} ${o.prikazce_jmeno || ''}`.trim(),
                                          usek:         o => getUsekLabel(o) || '',
                                          druh:         o => o.druh_objednavky_kod || '',
                                          stav:         o => o.stav_objednavky || '',
                                          castka:       o => String(o.castka || 0),
                                        }).map(obj => (
                                          <Tr key={obj.id}>
                                            <Td>{renderOrderLink(obj, null)}</Td>
                                            <Td>{formatDateCz(obj.dt_vytvoreni)}</Td>
                                            <SubjectTd>{obj.predmet || '—'}</SubjectTd>
                                            <Td>
                                              <NameStack>
                                                {renderNameLine(buildFullName(obj.objednatel_jmeno, obj.objednatel_prijmeni))}
                                              </NameStack>
                                            </Td>
                                            <Td>
                                              <NameStack>
                                                {renderNameLine(
                                                  buildFullName(obj.schvalovatel_jmeno, obj.schvalovatel_prijmeni) ||
                                                  buildFullName(obj.prikazce_jmeno, obj.prikazce_prijmeni)
                                                )}
                                              </NameStack>
                                            </Td>
                                            <TdNarrow>{getUsekLabel(obj) || '—'}</TdNarrow>
                                            <TdNarrow>{getOrderTypeLabel(obj)}</TdNarrow>
                                            <TdNarrow>
                                              <span style={{ display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#ffedd5', color: '#9a3412' }}>{obj.stav_objednavky}</span>
                                            </TdNarrow>
                                            <TdR style={{ fontFamily: 'monospace', fontWeight: 600, color: obj.typ_castky === 'pre_schvaleni' ? '#b45309' : '#059669' }}>{new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(obj.castka ?? 0)} Kč</TdR>
                                          </Tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </TableWrapper>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : dohadneData && !dohadneLoading ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: '2rem', opacity: 0.25, display: 'block', margin: '0 auto 0.5rem' }} />
                        Žádné LP dohadné položky pro zvolený kvartál
                      </div>
                    ) : !dohadneData && !dohadneLoading ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Vyberte kvartál pro zobrazení dat</div>
                    ) : null}
                  </SectionCard>
                )}

                {/* ── Blok 2: Smlouvy ── */}
                {isBlockVisible('dohadne', 'dohadneSmlouvy') && (
                  <SectionCard id="section-dohadneSmlouvy">
                    <SectionHeader>
                      <SectionTitle>
                        <FontAwesomeIcon icon={faHourglassHalf} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                        Dohadné položky — Smlouvy
                      </SectionTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {dohadneData?.smlouvy && (
                          <>
                            <SectionBadge $tone="warn">{dohadneData.smlouvy.total_smlouvy_skupin ?? dohadneData.smlouvy.total_smluv ?? 0} smluv</SectionBadge>
                            <SectionBadge $tone="info">{dohadneData.smlouvy.total_objednavek ?? 0} objednávek</SectionBadge>
                            <SectionBadge $tone="default">Před schválením: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.smlouvy.castka_pre_schvaleni ?? 0)}</SectionBadge>
                            <SectionBadge $tone="success">Odeslané: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.smlouvy.castka_odeslane ?? 0)}</SectionBadge>
                            <SectionBadge $tone="error" style={{ fontWeight: 700 }}>Celkem: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(dohadneData.smlouvy.castka_celkem ?? 0)}</SectionBadge>
                          </>
                        )}
                        <button onClick={handleExportCsv_dohadneSmlouvy} title="Exportovat Smlouvy dohadné do CSV" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <FontAwesomeIcon icon={faDownload} />CSV
                        </button>
                      </div>
                    </SectionHeader>

                    {dohadneData?.smlouvy?.groups?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0.75rem' }}>
                        {/* Záhlaví skupin */}
                        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 80px 110px 110px 110px', gap: '0.5rem', padding: '0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <div
                            title={dohadneData.smlouvy.groups.every(g => expandedDohadneSmlouvy.has(String(g.cislo_smlouvy))) ? 'Sbalit vše' : 'Rozbalit vše'}
                            onClick={() => {
                              const allExp = dohadneData.smlouvy.groups.every(g => expandedDohadneSmlouvy.has(String(g.cislo_smlouvy)));
                              setExpandedDohadneSmlouvy(allExp ? new Set() : new Set(dohadneData.smlouvy.groups.map(g => String(g.cislo_smlouvy))));
                            }}
                            style={{ cursor: 'pointer', color: '#c2410c', fontSize: '0.9rem', fontWeight: '900', textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
                          >
                            {dohadneData.smlouvy.groups.every(g => expandedDohadneSmlouvy.has(String(g.cislo_smlouvy))) ? '\u2212' : '+'}
                          </div>
                          <div>Číslo smlouvy</div>
                          <div>Dodavatel smlouvy</div>
                          <div style={{ textAlign: 'right' }}>Počet obj.</div>
                          <div style={{ textAlign: 'right' }}>Před schválením</div>
                          <div style={{ textAlign: 'right' }}>Odeslané</div>
                          <div style={{ textAlign: 'right' }}>Celkem</div>
                        </div>
                        {/* Skupiny */}
                        {dohadneData.smlouvy.groups.map(grp => {
                          const grpKey = String(grp.cislo_smlouvy);
                          const grpOpen = expandedDohadneSmlouvy.has(grpKey);
                          const fmtKc = (v) => new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v ?? 0);
                          return (
                            <div key={grpKey} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                              <div
                                onClick={() => setExpandedDohadneSmlouvy(prev => { const next = new Set(prev); grpOpen ? next.delete(grpKey) : next.add(grpKey); return next; })}
                                style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 80px 110px 110px 110px', gap: '0.5rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#fff7ed' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                              >
                                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#c2410c', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '\u2212' : '+'}</span>
                                <div style={{ overflow: 'hidden' }}>
                                  <div style={{ fontWeight: '700', color: '#78350f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{grp.cislo_smlouvy || '—'}</div>
                                  {grp.nazev_smlouvy && <div style={{ fontSize: '0.75rem', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{grp.nazev_smlouvy}</div>}
                                </div>
                                <span style={{ fontSize: '0.78rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{grp.nazev_firmy || '—'}</span>
                                <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end', fontSize: '0.75rem' }}>{grp.pocet_objednavek} obj.</SectionBadge>
                                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#b45309', textAlign: 'right' }}>{fmtKc(grp.castka_pre_schvaleni)}</span>
                                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#059669', textAlign: 'right' }}>{fmtKc(grp.castka_odeslane)}</span>
                                <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{fmtKc(grp.castka_celkem)}</span>
                              </div>
                              {grpOpen && (
                                <div style={{ padding: '0.5rem 0.5rem 0.75rem 1rem', background: '#f8fafc' }}>
                                  <TableWrapper style={{ margin: 0 }}>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <ThSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'ev_cislo')}>Číslo{sortIcon(`dohadneSml_${grpKey}`, 'ev_cislo')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'dt_obj')}>Dt. vytv.{sortIcon(`dohadneSml_${grpKey}`, 'dt_obj')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'predmet')}>Předmět{sortIcon(`dohadneSml_${grpKey}`, 'predmet')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'objednatel')}>Objednatel{sortIcon(`dohadneSml_${grpKey}`, 'objednatel')}</ThSort>
                                          <ThSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'schvalovatel')}>Schvalovatel{sortIcon(`dohadneSml_${grpKey}`, 'schvalovatel')}</ThSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'usek')}>Úsek{sortIcon(`dohadneSml_${grpKey}`, 'usek')}</ThNarrowSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'druh')}>Druh{sortIcon(`dohadneSml_${grpKey}`, 'druh')}</ThNarrowSort>
                                          <ThNarrowSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'stav')}>Stav{sortIcon(`dohadneSml_${grpKey}`, 'stav')}</ThNarrowSort>
                                          <ThRSort onClick={() => handleTableSort(`dohadneSml_${grpKey}`, 'castka')}>Částka{sortIcon(`dohadneSml_${grpKey}`, 'castka')}</ThRSort>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sortTableData(grp.objednavky, `dohadneSml_${grpKey}`, {
                                          ev_cislo:     o => o.cislo_objednavky || '',
                                          dt_obj:       o => o.dt_vytvoreni || '',
                                          predmet:      o => o.predmet || '',
                                          objednatel:   o => `${o.objednatel_prijmeni || ''} ${o.objednatel_jmeno || ''}`.trim(),
                                          schvalovatel: o => `${o.schvalovatel_prijmeni || ''} ${o.schvalovatel_jmeno || ''}`.trim() || `${o.prikazce_prijmeni || ''} ${o.prikazce_jmeno || ''}`.trim(),
                                          usek:         o => getUsekLabel(o) || '',
                                          druh:         o => o.druh_objednavky_kod || '',
                                          stav:         o => o.stav_objednavky || '',
                                          castka:       o => String(o.castka || 0),
                                        }).map(obj => (
                                          <Tr key={obj.id}>
                                            <Td>{renderOrderLink(obj, null)}</Td>
                                            <Td>{formatDateCz(obj.dt_vytvoreni)}</Td>
                                            <SubjectTd>{obj.predmet || '—'}</SubjectTd>
                                            <Td>
                                              <NameStack>
                                                {renderNameLine(buildFullName(obj.objednatel_jmeno, obj.objednatel_prijmeni))}
                                              </NameStack>
                                            </Td>
                                            <Td>
                                              <NameStack>
                                                {renderNameLine(
                                                  buildFullName(obj.schvalovatel_jmeno, obj.schvalovatel_prijmeni) ||
                                                  buildFullName(obj.prikazce_jmeno, obj.prikazce_prijmeni)
                                                )}
                                              </NameStack>
                                            </Td>
                                            <TdNarrow>{getUsekLabel(obj) || '—'}</TdNarrow>
                                            <TdNarrow>{getOrderTypeLabel(obj)}</TdNarrow>
                                            <TdNarrow>
                                              <span style={{ display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#ffedd5', color: '#9a3412' }}>{obj.stav_objednavky}</span>
                                            </TdNarrow>
                                            <TdR style={{ fontFamily: 'monospace', fontWeight: 600, color: obj.typ_castky === 'pre_schvaleni' ? '#b45309' : '#059669' }}>{new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(obj.castka ?? 0)} Kč</TdR>
                                          </Tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </TableWrapper>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : dohadneData && !dohadneLoading ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: '2rem', opacity: 0.25, display: 'block', margin: '0 auto 0.5rem' }} />
                        Žádné smlouvy dohadné položky pro zvolený kvartál
                      </div>
                    ) : !dohadneData && !dohadneLoading ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Vyberte kvartál pro zobrazení dat</div>
                    ) : null}
                  </SectionCard>
                )}
              </>
            )}
          </Section>
        </ContentGrid>
      </PageContainer>
    </PageWrapper>
    {fullscreenChart && ReactDOM.createPortal(
      <ChartOverlay onClick={(e) => { if (e.target === e.currentTarget) setFullscreenChart(null); }}>
        <ChartFullscreenBox>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionTitle style={{ margin: 0 }}>{fullscreenChart.title}</SectionTitle>
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
    {viewerAttachment && (
      <AttachmentViewer
        attachment={viewerAttachment}
        closeOnOverlayClick={false}
        onClose={() => {
          lastViewerCloseAtRef.current = Date.now();
          if (viewerAttachment.blobUrl?.startsWith('blob:')) {
            window.URL.revokeObjectURL(viewerAttachment.blobUrl);
          }
          setViewerAttachment(null);
        }}
      />
    )}

    {/* ======================================================
        DOKONČENÍ OBJEDNÁVKY – výběr režimu (rychle / s náhledem)
        ====================================================== */}
    {showCompletionModeDialog && completionTarget && ReactDOM.createPortal(
      <div
        onClick={() => { setShowCompletionModeDialog(false); setCompletionTarget(null); }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000000
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '16px',
            width: '480px',
            maxWidth: '92vw',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#fff',
            padding: '1.25rem 1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '1.4rem' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Dokončení objednávky</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '2px' }}>
                {completionTarget.cislo_objednavky || `#${completionTarget.id}`}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>
            <p style={{ margin: '0 0 1.25rem', color: '#374151', lineHeight: 1.5 }}>
              Vyberte způsob dokončení. Finanční kontrola (PDF) bude v obou případech vygenerována a připojena jako příloha.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Rychlé dokončení */}
              <button
                onClick={handleQuickComplete}
                disabled={completionInProgress}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '1rem 1.25rem',
                  background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '10px',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#4ade80'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; }}
              >
                <FontAwesomeIcon icon={faBolt} style={{ color: '#16a34a', marginTop: '2px', fontSize: '1.1rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '2px' }}>Rychlé dokončení</div>
                  <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                    PDF finanční kontroly se vygeneruje a připojí automaticky na pozadí. Bez náhledu.
                  </div>
                </div>
              </button>

              {/* S náhledem */}
              <button
                onClick={() => { setShowCompletionModeDialog(false); setShowFinancialPreviewModal(true); }}
                disabled={completionInProgress}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '1rem 1.25rem',
                  background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: '10px',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#60a5fa'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
              >
                <FontAwesomeIcon icon={faEye} style={{ color: '#2563eb', marginTop: '2px', fontSize: '1.1rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '2px' }}>Dokončit s náhledem</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                    Zobrazit náhled finanční kontroly před dokončením a potvrdit.
                  </div>
                </div>
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={() => { setShowCompletionModeDialog(false); setCompletionTarget(null); }}
              style={{
                marginTop: '1rem', width: '100%', padding: '0.6rem',
                background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px',
                cursor: 'pointer', color: '#374151', fontWeight: 600, fontSize: '0.9rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}
            >
              Zrušit
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* ======================================================
        DOKONČENÍ S NÁHLEDEM – FinancialControlConfirmationModal
        ====================================================== */}
    {showFinancialPreviewModal && completionTarget && (
      <FinancialControlConfirmationModal
        order={completionTarget}
        onConfirm={handleConfirmWithPreview}
        onCancel={() => {
          setShowFinancialPreviewModal(false);
          setCompletionTarget(null);
        }}
        generatedBy={_buildGeneratedBy()}
        token={token}
        username={username}
      />
    )}

    {/* ======================================================
        LP EDIT MODAL – dodatečné doplnění LP rozkladu
        ====================================================== */}
    {lpEditModal && ReactDOM.createPortal(
      <ChartOverlay onClick={() => { if (!lpEditModal.saving) setLpEditModal(null); }}>
        <LpEditBox onClick={e => e.stopPropagation()}>
          <LpEditHeader>
            <LpEditTitle>
              <FontAwesomeIcon icon={faPen} style={{ marginRight: '0.5rem', color: '#0369a1' }} />
              Rozklad na LP — FA {lpEditModal.invoice.fa_cislo_vema || lpEditModal.invoice.cislo_faktury || ('#' + lpEditModal.invoice.id)}
            </LpEditTitle>
            <LpEditClose onClick={() => { if (!lpEditModal.saving) setLpEditModal(null); }} title="Zavřít">
              ×
            </LpEditClose>
          </LpEditHeader>

          {lpEditModal.loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
              Načítám LP data…
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem', color: '#475569', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.6rem 0.9rem' }}>
                <span><b>Objednávka:</b> {lpEditModal.order.ev_cislo || lpEditModal.order.cislo_objednavky || ('#' + lpEditModal.order.id)}</span>
                <span><b>Částka FA k rozložení:</b> <strong style={{ color: '#0369a1', fontSize: '0.9rem' }}>{new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(Number(lpEditModal.faktura?.fa_castka ?? 0))}</strong></span>
                {lpEditModal.lpCerpani.length > 0 && (
                  <span><b>Již rozloženo:</b> <strong style={{ color: '#16a34a' }}>{new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(lpEditModal.lpCerpani.reduce((s, r) => s + (parseFloat(r.castka) || 0), 0))}</strong></span>
                )}
              </div>
              <LPCerpaniEditor
                faktura={lpEditModal.faktura}
                orderData={lpEditModal.orderData}
                lpCerpani={lpEditModal.lpCerpani}
                availableLPCodes={lpEditModal.availableLPCodes}
                onChange={newLp => setLpEditModal(prev => prev ? { ...prev, lpCerpani: newLp } : null)}
                disabled={lpEditModal.saving}
              />
              <LpEditFooter>
                <LpEditBtn
                  style={{ background: '#f1f5f9', color: '#374151' }}
                  onClick={() => setLpEditModal(null)}
                  disabled={lpEditModal.saving}
                >
                  Zrušit
                </LpEditBtn>
                <LpEditBtn
                  style={{ background: '#0369a1', color: '#fff' }}
                  onClick={handleSaveLpCerpaniEdit}
                  disabled={lpEditModal.saving}
                >
                  {lpEditModal.saving ? (
                    <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.4rem' }} />Ukládám…</>
                  ) : (
                    <><FontAwesomeIcon icon={faCheck} style={{ marginRight: '0.4rem' }} />Uložit LP rozklad</>
                  )}
                </LpEditBtn>
              </LpEditFooter>
            </>
          )}
        </LpEditBox>
      </ChartOverlay>,
      document.body
    )}
    </>
  );
}

