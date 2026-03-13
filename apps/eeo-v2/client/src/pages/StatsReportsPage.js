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
  faChevronDown,
  faChevronRight,
  faFile,
  faFileInvoice,
  faEye,
  faCheck,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
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
  downloadInvoiceAttachment
} from '../services/apiOrderV2';
import AttachmentViewer from '../components/invoices/AttachmentViewer';
import DatePicker from '../components/DatePicker';
import { listOrdersV3 } from '../services/apiOrdersV3';
import { listInvoices25 } from '../services/api25invoices';
import { getSmlouvyList } from '../services/apiSmlouvy';
import { fetchCiselniky, fetchUseky } from '../services/api2auth';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PAGE_TABS = [
  { id: 'control', label: 'Finanční kontrola', icon: faTriangleExclamation },
  { id: 'spend', label: 'Čerpání', icon: faMoneyBillWave },
  { id: 'stats', label: 'Statistiky', icon: faChartLine },
  { id: 'reports', label: 'Reporty', icon: faReceipt },
  { id: 'attachments', label: 'Přílohy', icon: faPaperclip },
  { id: 'pivot', label: 'Agregační tabulka - vlastní', icon: faTable }
];

const TAB_TONES = {
  control: { base: '#b91c1c', soft: '#fee2e2' },
  spend: { base: '#0f766e', soft: '#ccfbf1' },
  stats: { base: '#1d4ed8', soft: '#dbeafe' },
  reports: { base: '#b45309', soft: '#fef3c7' },
  attachments: { base: '#7c3aed', soft: '#ede9fe' },
  pivot: { base: '#0891b2', soft: '#cffafe' }
};

const SECTION_BLOCKS = {
  control: [
    { key: 'ordersOverLimit', label: 'Faktury vyšší než schválená objednávka' },
    { key: 'ordersAfterInvoice', label: 'Objednávka vytvořená po doručení faktury' },
    { key: 'ordersInvoicesWithoutAttachments', label: 'Objednávky s fakturami bez příloh' },
    { key: 'invoicesWithoutAttachments', label: 'Faktury bez přílohy' },
    { key: 'overdueInvoices', label: 'Faktury po splatnosti 14+ dní' },
    { key: 'cancelledOrders', label: 'Stornované / smazané objednávky' }
  ],
  spend: [
    { key: 'spendByFinancingUsek', label: 'Čerpání s rozpadem po úsecích' },
    { key: 'spendByUsekFinancing', label: 'Čerpání: Úsek → Financování' },
    { key: 'spendByDruhFinancing', label: 'Čerpání: Druh → Financování' },
    { key: 'spendByLpKod', label: 'Čerpání LP: podle LP kódu' }
  ],
  stats: [
    { key: 'chartFinancing', label: 'Financování – počet a částka' },
    { key: 'chartUsek', label: 'Úseky – počet a částka' },
    { key: 'chartDruh', label: 'Druhy objednávek – počet a částka' },
    { key: 'chartLpKod', label: 'LP kódy – počet a částka' },
    { key: 'chartTopSuppliers', label: 'Top dodavatelé (částka)' },
    { key: 'chartTopBuyers', label: 'Top objednatelé (počet a částka)' }
  ],
  reports: [
    { key: 'ordersWithoutInvoice', label: 'Objednávky bez faktury 2+ měsíce (schváleno+)' },
    { key: 'ordersWithInvoiceNotDone', label: 'Objednávky s fakturou, nedokončené' },
    { key: 'topSuppliers', label: 'Top dodavatelé (LP vs smlouvy)' }
  ],
  attachments: [
    { key: 'orderAttachmentsByType', label: 'Přílohy objednávek podle typu' },
    { key: 'invoiceAttachmentsByType', label: 'Přílohy faktur podle typu' },
    { key: 'ordersWithoutAttachments', label: 'Objednávky bez příloh' },
    { key: 'invoicesWithoutAttachments', label: 'Faktury bez příloh' }
  ],
  pivot: [
    { key: 'pivotTable', label: 'Agregační tabulka' }
  ]
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
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
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

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: rgba(255, 255, 255, 0.96);
  border-radius: 16px;
  padding: 1.5rem 1.4rem 1.75rem;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
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

const PivotHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 220px;
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

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;

  a {
    font: inherit;
    letter-spacing: inherit;
  }
`;

const Tr = styled.tr`
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;

  ${props => props.$inactive ? `
    color: #94a3b8;
    text-decoration: line-through;
  ` : ''}

  &:hover {
    background-color: #f3f4f6;
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
  max-width: 320px;
  white-space: normal;
  word-break: break-word;
`;

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

const ChartWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 280px;
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
  return date ? date.toLocaleDateString('cs-CZ') : '-';
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

const getOrdererName = (order) => {
  return order?.objednatel_uzivatel?.cele_jmeno || order?.objednatel?.cele_jmeno || order?.objednatel_jmeno || order?.objednatel || '';
};

const getGarantName = (order) => {
  return order?.garant_uzivatel?.cele_jmeno || order?.garant?.cele_jmeno || order?.garant_jmeno || order?.garant || '';
};

const getPrikazceName = (order) => {
  return order?.prikazce_uzivatel?.cele_jmeno || order?.prikazce?.cele_jmeno || order?.prikazce_jmeno || order?.prikazce || '';
};

const getSchvalovatelName = (order) => {
  return order?.schvalovatel_uzivatel?.cele_jmeno || order?.schvalovatel?.cele_jmeno || order?.schvalovatel_jmeno || order?.schvalovatel || '';
};

const getApproverName = (order) => {
  return order?.prikazce_uzivatel?.cele_jmeno
    || order?.schvalovatel_uzivatel?.cele_jmeno
    || order?.prikazce_jmeno
    || order?.schvalovatel_jmeno
    || order?.schvalovatel
    || order?.prikazce
    || '';
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
  return order?.usek_zkr || order?.usek?.usek_zkr || order?.usek_nazev || order?.usek || '';
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
  usek_zkr: invoice.objednavka_usek_zkr || invoice.usek_zkr || ''
});

const getContractLimit = (contract) => {
  const limit = parseFloat(contract?.limit_celkem || contract?.limit || contract?.limit_celkovy || 0);
  return Number.isNaN(limit) ? 0 : limit;
};

const getContractSpent = (contract) => {
  const spent = parseFloat(contract?.cerpano || contract?.celkem_cerpano || 0);
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
function FilterMultiSelect({ options, values, onChange, placeholder }) {
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
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '0.5rem 2rem 0.5rem 0.75rem',
          border: isActive ? '2px solid #f59e0b' : '1px solid #e5e7eb',
          borderRadius: '6px', fontSize: '0.875rem',
          background: isActive ? '#fffbeb' : '#ffffff',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'relative',
          color: !isActive ? '#9ca3af' : '#1f2937',
          fontWeight: isActive ? '600' : '400',
          boxShadow: isActive ? '0 0 0 2px rgba(245,158,11,0.2)' : 'none',
          minHeight: '38px', userSelect: 'none', boxSizing: 'border-box'
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
              <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: '999px', padding: '0.15rem 0.5rem 0.15rem 0.65rem', fontSize: '0.74rem', fontWeight: '600' }}>
                {opt.label}
                <button type="button" onClick={() => toggle(v)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '0.85rem', fontWeight: '700' }}>×</button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export default function StatsReportsPage() {
  const { token, username, user, user_id } = useContext(AuthContext);
  const progress = useContext(ProgressContext);
  const { showToast } = useContext(ToastContext) || {};
  const navigate = useNavigate();
  const userKey = user_id || user?.id || username || 'guest';

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
  // Ref pro detekci prvního načtení per-user dat (fallback pro async auth)
  const lsLoadedForKey = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState(null);
  const lastViewerCloseAtRef = useRef(0);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  useEffect(() => {
    if (!fullscreenChart) return;
    const onKey = (e) => { if (e.key === 'Escape') setFullscreenChart(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreenChart]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
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
  const [dataMeta, setDataMeta] = useState({ loadedAt: null, truncated: false });
  const [loadError, setLoadError] = useState('');
  const [tablePaging, setTablePaging] = useState({});
  const [expandedSpendFinancing, setExpandedSpendFinancing] = useState(() => new Set());
  const [expandedSpendUseks, setExpandedSpendUseks] = useState(() => new Set());
  const [expandedSpendUsekF, setExpandedSpendUsekF] = useState(() => new Set());
  const [expandedSpendUsekFSub, setExpandedSpendUsekFSub] = useState(() => new Set());
  const [expandedSpendDruh, setExpandedSpendDruh] = useState(() => new Set());
  const [expandedSpendDruhSub, setExpandedSpendDruhSub] = useState(() => new Set());
  const [expandedSpendLp, setExpandedSpendLp] = useState(() => new Set());
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
    usekIds: [],
    financingValues: [],
    orderTypes: []
  };

  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [pendingFilters, setPendingFilters] = useState(FILTER_DEFAULTS);

  // Načtení uloženého tabu + filtrů po znám userKey (řeší async auth kontext)
  useEffect(() => {
    if (!userKey || userKey === 'guest') return;
    if (lsLoadedForKey.current === userKey) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);

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

  const getPagedItems = useCallback((items, key) => {
    const { page, pageSize } = getTablePaging(key);
    const total = items.length;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: items.slice(start, end),
      page: safePage,
      pageSize,
      total,
      totalPages
    };
  }, [getTablePaging]);

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
      const [usekyRaw, financovaniRaw, druhyRaw, stavyRaw, faStavyRaw, faStatusRaw] = await Promise.all([
        fetchUseky({ token, username }),
        fetchCiselniky({ token, username, typ: 'FINANCOVANI_ZDROJ' }),
        fetchCiselniky({ token, username, typ: 'DRUH_OBJEDNAVKY' }),
        fetchCiselniky({ token, username, typ: 'OBJEDNAVKA' }),
        fetchCiselniky({ token, username, typ: 'FAKTURA_STAV' }),
        fetchCiselniky({ token, username, typ: 'FAKTURA_STATUS' })
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
    } catch (e) {
      setDictionaryUseky([]);
      setDictionaryFinancing([]);
      setDictionaryOrderTypes([]);
      setDictionaryOrderStates([]);
      setDictionaryInvoiceStates([]);
    }
  }, [token, username]);

  const loadOrders = useCallback(async () => {
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
        filters: backendFilters
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
        return { data: all, truncated: false };
      }
      if (!pagination && batch.length < MAX_ORDERS_BATCH) {
        return { data: all, truncated: false };
      }
    }

    return { data: all, truncated: true };
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

  const handleLoadData = useCallback(async () => {
    if (!token || !username) return;
    setLoading(true);
    setLoadError('');
    if (progress?.start) progress.start();
    try {
      await loadLookups();
      const [ordersResult, invoicesResult, contractsResult] = await Promise.all([
        loadOrders(),
        loadInvoices(),
        loadContracts()
      ]);
      setOrders(ordersResult.data || []);
      setInvoices(invoicesResult.data || []);
      setContracts(contractsResult || []);
      setDataMeta({
        loadedAt: new Date().toISOString(),
        truncated: ordersResult.truncated || invoicesResult.truncated
      });
      if (progress?.done) progress.done();
    } catch (e) {
      setOrders([]);
      setInvoices([]);
      setContracts([]);
      setDataMeta({ loadedAt: null, truncated: false });
      setLoadError(e?.message || 'Nepodařilo se načíst data.');
      if (progress?.fail) progress.fail();
    } finally {
      setLoading(false);
      setTimeout(() => setIsInitialized(true), 300);
    }
  }, [token, username, loadLookups, loadOrders, loadInvoices, loadContracts, progress]);

  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!token || !username || initialLoadRef.current) return;
    initialLoadRef.current = true;
    handleLoadData();
  }, [token, username, handleLoadData]);

  const [applyTrigger, setApplyTrigger] = useState(0);
  const loadDataRef = useRef(handleLoadData);
  useEffect(() => { loadDataRef.current = handleLoadData; }, [handleLoadData]);
  useEffect(() => {
    if (applyTrigger === 0) return;
    loadDataRef.current();
  }, [applyTrigger]);

  const handleLoadAttachmentsStats = useCallback(async () => {
    if (!token || !username) return;
    if (progress?.start) progress.start();
    try {
      const [orderAttachments, invoiceAttachments] = await Promise.all([
        listAttachmentsV2(null, token, username),
        listInvoiceAttachmentsV2(null, token, username)
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
      const result = await getOrdersWithoutAttachmentsV2(token, username, { page, per_page: 25 });
      setOrdersWithoutAttachments(result);
      setOrdersWithoutAttachmentsPage(page);
    } catch (e) {
      console.error('📎 Orders Without Attachments Error:', e);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [token, username]);

  const handleLoadInvoicesWithoutAttachments = useCallback(async (page = 1) => {
    if (!token || !username) return;
    setAttachmentsLoading(true);
    try {
      const result = await getInvoicesWithoutAttachmentsV2(token, username, { page, per_page: 25 });
      setInvoicesWithoutAttachments(result);
      setInvoicesWithoutAttachmentsPage(page);
    } catch (e) {
      console.error('📎 Invoices Without Attachments Error:', e);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [token, username]);

  // Load attachments tab data when tab is activated
  useEffect(() => {
    if (activeTab === 'attachments') {
      if (!orderAttachmentsStats && !invoiceAttachmentsStats) {
        handleLoadAttachmentsTabStats();
      }
      if (!ordersWithoutAttachments) {
        handleLoadOrdersWithoutAttachments(1);
      }
      if (!invoicesWithoutAttachments) {
        handleLoadInvoicesWithoutAttachments(1);
      }
    }
  }, [activeTab, orderAttachmentsStats, invoiceAttachmentsStats, ordersWithoutAttachments, invoicesWithoutAttachments, handleLoadAttachmentsTabStats, handleLoadOrdersWithoutAttachments, handleLoadInvoicesWithoutAttachments]);

  const ordersById = useMemo(() => new Map(orders.map(order => [String(order.id), order])), [orders]);
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

  const getOrderFinancingCode = useCallback((order) => {
    const fin = parseFinancing(order?.financovani);
    return String(fin?.typ || fin?.kod_stavu || order?.financovani || '');
  }, []);

  const getOrderFinancingLabel = useCallback((order) => {
    const fin = parseFinancing(order?.financovani);
    const code = fin?.typ || fin?.kod_stavu || '';
    return fin?.typ_nazev || fin?.nazev || fin?.nazev_stavu || financingMap[String(code)] || code || '';
  }, [financingMap]);

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

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
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
      if (filters.usekIds.length > 0) {
        const usekCode = String(order?.usek_id ?? '');
        if (!filters.usekIds.includes(usekCode)) return false;
      }
      if (filters.orderYear) {
        const oDate = toDate(getOrderDate(order));
        if (!oDate || String(oDate.getFullYear()) !== String(filters.orderYear)) return false;
      }
      return true;
    });
  }, [orders, filters.dateFrom, filters.dateTo, filters.financingValues, filters.orderTypes, filters.usekIds, filters.orderYear, getOrderFinancingCode, getOrderTypeCode, getOrderDate]);

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
    const ordersOverLimit = filteredOrders.filter(order => {
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      if (!invoicesForOrder.length) return false;
      const invoiceSum = invoicesForOrder.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
      const limit = getOrderLimit(order);
      return limit > 0 && invoiceSum > limit;
    });

    const ordersAfterInvoice = filteredOrders.flatMap(order => {
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      const orderDate = toDateOnly(getOrderDate(order));
      return invoicesForOrder
        .filter(inv => {
          const invoiceDate = toDateOnly(inv.datum_doruceni || inv.datum_vystaveni);
          return orderDate && invoiceDate && invoiceDate < orderDate;
        })
        .map(inv => ({ order, invoice: inv }));
    });

    const ordersInvoicesWithoutAttachments = filteredOrders.filter(order => {
      const invoicesForOrder = invoicesByOrderId[String(order.id)] || [];
      if (!invoicesForOrder.length) return false;
      return invoicesForOrder.some(inv => !inv.ma_prilohy);
    });

    const invoicesWithoutAttachments = filteredInvoices.filter(inv => !inv.ma_prilohy);

    const overdueInvoices = filteredInvoices.filter(inv => {
      const dueDate = toDate(inv.datum_splatnosti);
      if (!dueDate) return false;
      const days = daysBetween(dueDate, now);
      return days !== null && days > 14 && !isInvoiceSettled(inv);
    });

    const cancelledOrders = filteredOrders.filter(order => {
      const isInactive = order?.active === false || order?.aktivni === false || order?.aktivni === 0 || order?.aktivni === '0';
      if (isInactive) return true;
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
  }, [filteredOrders, filteredInvoices, invoicesByOrderId, getOrderStatusCode]);

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

    const topSuppliers = Object.entries(
      filteredOrders.reduce((acc, order) => {
        const supplier = getSupplierName(order) || 'Neurčeno';
        const financing = getOrderFinancingLabel(order) || 'Neurčeno';
        const amount = getOrderAmount(order);
        if (!acc[supplier]) {
          acc[supplier] = { total: 0, split: {} };
        }
        acc[supplier].total += amount;
        acc[supplier].split[financing] = (acc[supplier].split[financing] || 0) + amount;
        return acc;
      }, {})
    )
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      ordersWithoutInvoice,
      ordersWithInvoiceNotDone,
      topSuppliers
    };
  }, [filteredOrders, invoicesByOrderId, getOrderStatusCode, getOrderTypeLabel, getOrderFinancingLabel]);

  const pagedOrdersOverLimit = useMemo(
    () => getPagedItems(controlSections.ordersOverLimit, 'ordersOverLimit'),
    [controlSections.ordersOverLimit, getPagedItems]
  );
  const pagedOrdersAfterInvoice = useMemo(
    () => getPagedItems(controlSections.ordersAfterInvoice, 'ordersAfterInvoice'),
    [controlSections.ordersAfterInvoice, getPagedItems]
  );
  const pagedOrdersInvoicesWithoutAttachments = useMemo(
    () => getPagedItems(controlSections.ordersInvoicesWithoutAttachments, 'ordersInvoicesWithoutAttachments'),
    [controlSections.ordersInvoicesWithoutAttachments, getPagedItems]
  );
  const pagedInvoicesWithoutAttachments = useMemo(
    () => getPagedItems(controlSections.invoicesWithoutAttachments, 'invoicesWithoutAttachments'),
    [controlSections.invoicesWithoutAttachments, getPagedItems]
  );
  const pagedOverdueInvoices = useMemo(
    () => getPagedItems(controlSections.overdueInvoices, 'overdueInvoices'),
    [controlSections.overdueInvoices, getPagedItems]
  );
  const pagedCancelledOrders = useMemo(
    () => getPagedItems(controlSections.cancelledOrders, 'cancelledOrders'),
    [controlSections.cancelledOrders, getPagedItems]
  );
  const pagedFinancingOptions = useMemo(
    () => getPagedItems(financingOptions, 'financingOptions'),
    [financingOptions, getPagedItems]
  );
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
  }, [filteredOrders, getOrderFinancingCode, getOrderFinancingLabel, getOrdererUsekCode, getOrdererUsekLabel]);

  // Úsek → Financování
  const spendByUsekGroups = useMemo(() => {
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
  }, [filteredOrders, getOrderFinancingCode, getOrderFinancingLabel, getOrdererUsekCode, getOrdererUsekLabel]);

  // Druh objednávky → Financování
  const spendByDruhGroups = useMemo(() => {
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
  }, [filteredOrders, getOrderFinancingCode, getOrderFinancingLabel, getOrderTypeCode, getOrderTypeLabel]);

  // LP financování → LP kód (cislo_lp) → objednávky
  const spendByLpKodGroups = useMemo(() => {
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
          if (!groups[code]) groups[code] = { code, label, orders: [], count: 0, amount: 0 };
          const amt = getOrderAmount(order);
          groups[code].orders.push(order);
          groups[code].count += 1;
          groups[code].amount += amt;
        });
      }
    });
    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
  }, [filteredOrders]);

  const pagedOrdersWithoutInvoice = useMemo(
    () => getPagedItems(reportSections.ordersWithoutInvoice, 'ordersWithoutInvoice'),
    [reportSections.ordersWithoutInvoice, getPagedItems]
  );
  const pagedOrdersWithInvoiceNotDone = useMemo(
    () => getPagedItems(reportSections.ordersWithInvoiceNotDone, 'ordersWithInvoiceNotDone'),
    [reportSections.ordersWithInvoiceNotDone, getPagedItems]
  );
  const pagedTopSuppliers = useMemo(
    () => getPagedItems(reportSections.topSuppliers, 'topSuppliers'),
    [reportSections.topSuppliers, getPagedItems]
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

    const sortByKey = obj => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b, 'cs-CZ')));

    return {
      ordersByType,
      ordersByUsek: Object.fromEntries(Object.entries(byUsek).sort(([a], [b]) => a.localeCompare(b, 'cs-CZ'))),
      byFinancing: sortByKey(byFinancing),
      byUsek: sortByKey(byUsek),
      byDruh: sortByKey(byDruh),
      byLpKod: sortByKey(byLpKod),
      topSuppliers,
      topBuyers
    };
  }, [filteredOrders, getOrderTypeLabel, getOrderFinancingLabel, getOrdererUsekCode, getOrderAmount, parseFinancing, getOrdererName]);

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
        return getUsekLabel(linkedOrder) || 'Chybi hodnota';
      }
      if (linkedContract) {
        return getContractUsek(linkedContract) || 'Chybi hodnota';
      }
      return invoice?.usek_zkr || 'Neurčeno';
    };

    const orderRows = filteredOrders.map(order => {
      const invoicesForOrder = invoicesByOrderId[String(order?.id)] || [];
      const invoicedAmount = getOrderInvoicedAmount(order, invoicesForOrder);
      const plannedAmount = getOrderPlannedAmount(order);
      const limitAmount = getOrderLimit(order);
      return {
      id: order.id,
      usek: getUsekLabel(order) || 'Neurčeno',
      financing: getOrderFinancingLabel(order) || 'Neurčeno',
      type: getOrderTypeLabel(order) || 'Neurčeno',
      status: getOrderStatusLabel(order) || 'Neurčeno',
      supplier: getSupplierName(order) || 'Neurčeno',
      orderer: getOrdererName(order) || 'Neurčeno',
      amount: invoicedAmount,
      amount_invoiced: invoicedAmount,
      amount_planned: plannedAmount,
      amount_limit: limitAmount,
      hasInvoice: (invoicesByOrderId[String(order.id)] || []).length > 0 ? 'Ano' : 'Ne',
      source: 'Objednávky'
      };
    });

    const invoiceRows = filteredInvoices.map(inv => {
      const linkedOrder = inv?.objednavka_id != null ? ordersById.get(String(inv.objednavka_id)) : null;
      const linkedContract = resolveContract(linkedOrder, inv);
      const invoiceAmount = getInvoiceAmount(inv);
      return {
      id: inv.id,
      usek: resolveUsekForInvoice(inv, linkedOrder, linkedContract),
      status: getInvoiceStatusLabel(inv) || 'Neurčeno',
      type: inv.fa_typ || 'Neurčeno',
      paid: inv.zaplacena ? 'Ano' : 'Ne',
      hasAttachment: inv.ma_prilohy ? 'Ano' : 'Ne',
        amount: invoiceAmount,
        amount_invoiced: invoiceAmount,
        amount_planned: 0,
        amount_limit: 0,
      attachmentType: normalizeAttachmentTypes(inv.prilohy),
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
      const base = {
        usek: getUsekLabel(order) || 'Neurčeno',
        financing: getOrderFinancingLabel(order) || 'Neurčeno',
        supplier: getSupplierName(order) || 'Neurčeno',
        orderer: getOrdererName(order) || 'Neurčeno',
        orderNumber: order?.ev_cislo || order?.cislo_objednavky || 'Chybi hodnota',
        orderType: getOrderTypeLabel(order) || 'Neurčeno',
        orderStatus: getOrderStatusLabel(order) || 'Neurčeno',
        hasInvoice: invoicesForOrder.length ? 'Ano' : 'Ne'
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
          hasAttachment: 'Chybi hodnota',
          attachmentType: 'Chybi hodnota',
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
        financing: 'Chybi hodnota',
        supplier: 'Chybi hodnota',
        orderer: 'Chybi hodnota',
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
  }, [filteredOrders, filteredInvoices, contracts, invoicesByOrderId, contractsById, contractsByNumber, getOrderFinancingLabel, getOrderTypeLabel, getOrderStatusLabel, getInvoiceStatusLabel]);

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
      metric: 'count'
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
        { key: 'usek', label: 'Úsek' },
        { key: 'status', label: 'Stav faktury' },
        { key: 'type', label: 'Typ faktury' },
        { key: 'paid', label: 'Zaplaceno' },
        { key: 'hasAttachment', label: 'Má přílohu' },
        { key: 'source', label: 'Zdroj' }
      ];
    }
    if (pivotConfig.dataset === 'contracts') {
      return [
        { key: 'usek', label: 'Úsek' },
        { key: 'status', label: 'Stav smlouvy' },
        { key: 'type', label: 'Druh smlouvy' },
        { key: 'source', label: 'Zdroj' }
      ];
    }
    if (pivotConfig.dataset === 'all') {
      return [
        { key: 'source', label: 'Zdroj' },
        { key: 'usek', label: 'Úsek' },
        { key: 'financing', label: 'Financování' },
        { key: 'orderNumber', label: 'Číslo objednávky' },
        { key: 'invoiceNumber', label: 'Číslo faktury' },
        { key: 'contractNumber', label: 'Číslo smlouvy' },
        { key: 'orderType', label: 'Druh objednávky' },
        { key: 'invoiceType', label: 'Typ faktury' },
        { key: 'contractType', label: 'Druh smlouvy' },
        { key: 'orderStatus', label: 'Stav objednávky' },
        { key: 'invoiceStatus', label: 'Stav faktury' },
        { key: 'contractStatus', label: 'Stav smlouvy' },
        { key: 'supplier', label: 'Dodavatel' },
        { key: 'orderer', label: 'Objednatel' },
        { key: 'hasInvoice', label: 'Má fakturu' },
        { key: 'paid', label: 'Zaplaceno' },
        { key: 'hasAttachment', label: 'Má přílohu' },
        { key: 'attachmentType', label: 'Klasifikace přílohy' }
      ];
    }
    return [
      { key: 'usek', label: 'Úsek' },
      { key: 'financing', label: 'Financování' },
      { key: 'type', label: 'Druh objednávky' },
      { key: 'status', label: 'Stav objednávky' },
      { key: 'supplier', label: 'Dodavatel' },
      { key: 'orderer', label: 'Objednatel' },
      { key: 'hasInvoice', label: 'Má fakturu' },
      { key: 'source', label: 'Zdroj' }
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

    if (!pivotConfig.rowFields?.length || !pivotConfig.colFields?.length) {
      return {
        rowTree: [],
        colKeys: [],
        getValue: () => 0,
        getRowTotal: () => 0,
        totalForCol: () => 0,
        grandTotal: 0
      };
    }

    const makeKey = (record, fields) => fields.map(field => record[field] || 'Chybi hodnota').join(' / ');

    const colKeys = Array.from(new Set(rows.map(r => makeKey(r, pivotConfig.colFields)))).sort();

    const metricForRecord = (record) => {
      if (pivotConfig.metric === 'count') return 1;
      if (pivotConfig.metric === 'amount_invoiced') return Number(record.amount_invoiced || record.amount || 0);
      if (pivotConfig.metric === 'amount_planned') return Number(record.amount_planned || 0);
      if (pivotConfig.metric === 'amount_limit') return Number(record.amount_limit || 0);
      if (pivotConfig.metric === 'limit') return Number(record.limit || 0);
      if (pivotConfig.metric === 'spent') return Number(record.spent || 0);
      return 0;
    };

    const root = {
      id: 'root',
      label: 'root',
      depth: -1,
      children: [],
      childMap: new Map(),
      colTotals: new Map(),
      total: 0
    };

    const ensureChild = (parent, label, fieldKey, depth) => {
      if (parent.childMap.has(label)) return parent.childMap.get(label);
      const child = {
        id: `${parent.id}::${fieldKey}=${label}`,
        label,
        fieldKey,
        depth,
        children: [],
        childMap: new Map(),
        colTotals: new Map(),
        total: 0
      };
      parent.childMap.set(label, child);
      parent.children.push(child);
      return child;
    };

    rows.forEach((record) => {
      const colKey = makeKey(record, pivotConfig.colFields);
      const metricValue = metricForRecord(record);

      root.total += metricValue;
      root.colTotals.set(colKey, (root.colTotals.get(colKey) || 0) + metricValue);

      let node = root;
      pivotConfig.rowFields.forEach((fieldKey, index) => {
        const label = record[fieldKey] || 'Chybi hodnota';
        node = ensureChild(node, label, fieldKey, index);
        node.total += metricValue;
        node.colTotals.set(colKey, (node.colTotals.get(colKey) || 0) + metricValue);
      });
    });

    const sortTree = (node) => {
      node.children.sort((a, b) => b.total - a.total);
      node.children.forEach(sortTree);
    };

    sortTree(root);

    return {
      rowTree: root.children,
      colKeys,
      getValue: (node, colKey) => node.colTotals.get(colKey) || 0,
      getRowTotal: (node) => node.total || 0,
      totalForCol: (colKey) => root.colTotals.get(colKey) || 0,
      grandTotal: root.total || 0
    };
  }, [pivotData, pivotConfig]);

  const formatMetric = (value) => {
    if (pivotConfig.metric === 'count') return value;
    return fmtCurrency(value);
  };

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

  const handleFilterChange = (key, value) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = useCallback(() => {
    const merged = { ...filters, ...pendingFilters };
    setFilters(merged);
    setApplyTrigger(t => t + 1);
    try {
      if (userKey && userKey !== 'guest') {
        localStorage.setItem(filterLsKey, JSON.stringify(merged));
      }
    } catch (e) {}
  }, [pendingFilters, filters, userKey, filterLsKey]);

  const handleResetFilters = useCallback(() => {
    const cur = FILTER_DEFAULTS;
    setPendingFilters(cur);
    setFilters(cur);
    setApplyTrigger(t => t + 1);
    try {
      if (userKey && userKey !== 'guest') {
        localStorage.setItem(filterLsKey, JSON.stringify(cur));
      }
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey, filterLsKey]);

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
  const handleOpenAttachment = useCallback(async (att, type) => {
    const now = Date.now();
    if (now - lastViewerCloseAtRef.current < 300) return;

    const fileName = att.original_name || `priloha_${att.id}`;
    if (!att.id || !token || !username) return;

    try {
      let blob;
      if (type === 'invoice' && att.invoice_id) {
        blob = await downloadInvoiceAttachment(att.invoice_id, att.id, username, token);
      } else if (att.order_id) {
        blob = await downloadOrderAttachment(att.order_id, att.id, username, token);
      } else {
        return;
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
      console.error('Chyba při otevírání přílohy:', err);
      const msg = err?.message || 'Nepodařilo se otevřít přílohu';
      showToast?.(
        msg.includes('stáhnout') || msg.includes('nenalezena') || msg.includes('Not Found')
          ? `Příloha "${att.original_name}" není dostupná na tomto serveru (soubor neexistuje).`
          : `Chyba při otevírání přílohy: ${msg}`,
        'error'
      );
    }
  }, [token, username, showToast]);

  const renderOrderLink = (order) => (
    <LinkButton onClick={() => navigate(`/order-form-25?edit=${order.id}`, { state: { returnTo: '/stats-reports' } })}>

      {order.ev_cislo || order.cislo_objednavky || order.id}
    </LinkButton>
  );

  const renderInvoiceLink = (invoice) => (
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
      {invoice.cislo_faktury || invoice.id}
    </LinkButton>
  );

  const buildChartColors = useCallback((count, palette) => {
    if (!count) return [];
    return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
  }, []);

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

  return (
    <>
      <LoadingGate $visible={!isInitialized || loading}>
        <LoadingGateSpinner $visible={!isInitialized || loading} />
        <LoadingGateMessage $visible={!isInitialized || loading}>
          {isInitialized ? 'Obnovuji data z databáze…' : 'Načítám přehled statistik…'}
        </LoadingGateMessage>
        <LoadingGateSubtext $visible={!isInitialized || loading}>
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
            <SummaryLabel>Objednávky</SummaryLabel>
            <SummaryValue>{summary.totalOrders}</SummaryValue>
            <SummaryMeta>{fmtCurrency(summary.totalOrderAmount)}</SummaryMeta>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Faktury</SummaryLabel>
            <SummaryValue>{summary.totalInvoices}</SummaryValue>
            <SummaryMeta>{fmtCurrency(summary.totalInvoiceAmount)}</SummaryMeta>
          </SummaryCard>
          <SummaryCard title="Počet smluv, které mají alespoň jednu fakturu nebo objednávku">
            <SummaryLabel><FontAwesomeIcon icon={faFileContract} style={{ marginRight: '0.4rem', opacity: 0.7 }} />Aktivní smlouvy</SummaryLabel>
            <SummaryValue>{summary.totalContracts}</SummaryValue>
            <SummaryMeta>Limit: {fmtCurrency(summary.totalContractLimit)}</SummaryMeta>
          </SummaryCard>
          <SummaryCard title="Celková suma faktur napojených na smlouvy">
            <SummaryLabel><FontAwesomeIcon icon={faCoins} style={{ marginRight: '0.4rem', opacity: 0.7 }} />Vyčerpáno ze smluv</SummaryLabel>
            <SummaryValue>{fmtCurrency(summary.totalContractSpent)}</SummaryValue>
            <SummaryMeta>{dataMeta.loadedAt ? `Aktualizace ${new Date(dataMeta.loadedAt).toLocaleString('cs-CZ')}` : 'Bez dat'}</SummaryMeta>
          </SummaryCard>
        </SummaryGrid>

        {financingSummary.length > 0 && (
          <>
            <SectionTitle style={{ marginBottom: '0.75rem' }}>Financování (aktivní objednávky)</SectionTitle>
            <SummaryGrid>
              {financingSummary.map(item => (
                <SummaryCard key={item.label}>
                  <SummaryLabel>{item.label}</SummaryLabel>
                  <SummaryValue>{item.count}</SummaryValue>
                  <SummaryMeta>{fmtCurrency(item.amount)}</SummaryMeta>
                </SummaryCard>
              ))}
            </SummaryGrid>
          </>
        )}

        <TabsBar>
          <Tabs>
            {PAGE_TABS.map(tab => (
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
          {renderBlockSelect()}
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
                <FieldLabel>Úsek</FieldLabel>
                <FilterMultiSelect
                  options={usekOptions}
                  values={pendingFilters.usekIds}
                  onChange={v => handleFilterChange('usekIds', v)}
                  placeholder="Všechny úseky"
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
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Faktury vyšší než schválená objednávka</SectionTitle>
                    <SectionBadge $tone="danger">{controlSections.ordersOverLimit.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Objednávka</Th>
                          <Th>Dt. obj.</Th>
                          <Th>Předmět</Th>
                          <Th>Limit</Th>
                          <Th>Faktury</Th>
                          <Th>Objednatel</Th>
                          <Th>Schvalovatel</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>Druh</Th>
                          <Th>Poznámka</Th>
                          <Th>NŘK</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrdersOverLimit.items.map(order => {
                          const rowKey = `order_over_limit_${order.id}`;
                          const invoiceSum = (invoicesByOrderId[String(order.id)] || []).reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
                          return (
                            <Tr key={order.id}>
                              <Td>{renderOrderLink(order)}</Td>
                              <Td>{formatDateCz(getOrderDate(order))}</Td>
                              <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                              <Td>{fmtCurrency(getOrderLimit(order))}</Td>
                              <Td>{fmtCurrency(invoiceSum)}</Td>
                              <Td>{renderOrdererStack(order)}</Td>
                              <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                              <Td>{getOrdererUsekLabel(order)}</Td>
                              <Td>{getOrderFinancingLabel(order)}</Td>
                              <Td>{getOrderTypeLabel(order)}</Td>
                              <Td>{renderNoteCell(rowKey)}</Td>
                              <Td>{renderCheckCell(rowKey)}</Td>
                            </Tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('ordersOverLimit', pagedOrdersOverLimit)}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'ordersAfterInvoice') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Objednávka vytvořená po doručení faktury</SectionTitle>
                    <SectionBadge $tone="warn">{controlSections.ordersAfterInvoice.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Objednávka</Th>
                          <Th>Fa VS</Th>
                          <Th>Fa doručena</Th>
                          <Th>Objednatel</Th>
                          <Th>Schvalovatel</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>Druh</Th>
                          <Th>Poznámka</Th>
                          <Th>NŘK</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrdersAfterInvoice.items.map(({ order, invoice }) => {
                          const rowKey = `order_after_invoice_${order.id}_${invoice.id}`;
                          return (
                            <Tr key={rowKey}>
                              <Td>{renderOrderLink(order)}</Td>
                              <Td>{renderInvoiceLink(invoice)}</Td>
                              <Td>{formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni)}</Td>
                              <Td>{renderOrdererStack(order)}</Td>
                              <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                              <Td>{getOrdererUsekLabel(order)}</Td>
                              <Td>{getOrderFinancingLabel(order)}</Td>
                              <Td>{getOrderTypeLabel(order)}</Td>
                              <Td>{renderNoteCell(rowKey)}</Td>
                              <Td>{renderCheckCell(rowKey)}</Td>
                            </Tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('ordersAfterInvoice', pagedOrdersAfterInvoice)}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'ordersInvoicesWithoutAttachments') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Objednávky s fakturami bez příloh</SectionTitle>
                    <SectionBadge $tone="warn">{controlSections.ordersInvoicesWithoutAttachments.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Objednávka</Th>
                          <Th>Dt. obj.</Th>
                          <Th>Předmět</Th>
                          <Th>Objednatel</Th>
                          <Th>Schvalovatel</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>Druh</Th>
                          <Th>Poznámka</Th>
                          <Th>NŘK</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrdersInvoicesWithoutAttachments.items.map(order => {
                          const rowKey = `order_missing_invoice_attachment_${order.id}`;
                          return (
                            <Tr key={order.id}>
                              <Td>{renderOrderLink(order)}</Td>
                              <Td>{formatDateCz(getOrderDate(order))}</Td>
                              <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                              <Td>{renderOrdererStack(order)}</Td>
                              <Td>{renderApproverStack(order, getOrderStatusCode, getInvoiceApprovalDate)}</Td>
                              <Td>{getOrdererUsekLabel(order)}</Td>
                              <Td>{getOrderFinancingLabel(order)}</Td>
                              <Td>{getOrderTypeLabel(order)}</Td>
                              <Td>{renderNoteCell(rowKey)}</Td>
                              <Td>{renderCheckCell(rowKey)}</Td>
                            </Tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('ordersInvoicesWithoutAttachments', pagedOrdersInvoicesWithoutAttachments)}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'invoicesWithoutAttachments') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Faktury bez přílohy</SectionTitle>
                    <SectionBadge $tone="warn">{controlSections.invoicesWithoutAttachments.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Fa VS</Th>
                          <Th>Doručena</Th>
                          <Th>Objednávka/Smlouva</Th>
                          <Th>Částka</Th>
                          <Th>Příkazce</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>Druh</Th>
                          <Th>Poznámka</Th>
                          <Th>NŘK</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedInvoicesWithoutAttachments.items.map(invoice => {
                          const order = ordersById.get(String(invoice.objednavka_id)) || null;
                          const rowKey = `invoice_no_attachment_${invoice.id}`;
                          return (
                            <Tr key={invoice.id}>
                              <Td>{renderInvoiceLink(invoice)}</Td>
                              <Td>{formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni)}</Td>
                              <Td>{order ? renderOrderLink(order) : invoice.cislo_smlouvy || invoice.smlouva_id || '-'}</Td>
                              <Td>{fmtCurrency(getInvoiceAmount(invoice))}</Td>
                              <Td>{order ? getApproverName(order) : '-'}</Td>
                              <Td>{order ? getOrdererUsekLabel(order) : '-'}</Td>
                              <Td>{order ? getOrderFinancingLabel(order) : '-'}</Td>
                              <Td>{order ? getOrderTypeLabel(order) : '-'}</Td>
                              <Td>{renderNoteCell(rowKey)}</Td>
                              <Td>{renderCheckCell(rowKey)}</Td>
                            </Tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('invoicesWithoutAttachments', pagedInvoicesWithoutAttachments)}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'overdueInvoices') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Faktury po splatnosti 14+ dní</SectionTitle>
                    <SectionBadge $tone="danger">{controlSections.overdueInvoices.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Fa VS</Th>
                          <Th>Doručena</Th>
                          <Th>Stav</Th>
                          <Th>Částka</Th>
                          <Th>Splatnost</Th>
                          <Th>Objednávka/Smlouva</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>Druh</Th>
                          <Th>Poznámka</Th>
                          <Th>NŘK</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOverdueInvoices.items.map(invoice => {
                          const order = ordersById.get(String(invoice.objednavka_id)) || null;
                          const rowKey = `invoice_overdue_${invoice.id}`;
                          return (
                            <Tr key={invoice.id}>
                              <Td>{renderInvoiceLink(invoice)}</Td>
                              <Td>{formatDateCz(invoice.datum_doruceni || invoice.datum_vystaveni)}</Td>
                              <Td>{getInvoiceStatusLabel(invoice)}</Td>
                              <Td>{fmtCurrency(getInvoiceAmount(invoice))}</Td>
                              <Td>{formatDateCz(invoice.datum_splatnosti)}</Td>
                              <Td>{order ? renderOrderLink(order) : invoice.cislo_smlouvy || invoice.smlouva_id || '-'}</Td>
                              <Td>{order ? getOrdererUsekLabel(order) : '-'}</Td>
                              <Td>{order ? getOrderFinancingLabel(order) : '-'}</Td>
                              <Td>{order ? getOrderTypeLabel(order) : '-'}</Td>
                              <Td>{renderNoteCell(rowKey)}</Td>
                              <Td>{renderCheckCell(rowKey)}</Td>
                            </Tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('overdueInvoices', pagedOverdueInvoices)}
                  </SectionCard>
                )}

                {isBlockVisible('control', 'cancelledOrders') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Stornované / smazané objednávky</SectionTitle>
                    <SectionBadge $tone="danger">{controlSections.cancelledOrders.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Objednávka</Th>
                          <Th>Dt. obj.</Th>
                          <Th>Předmět</Th>
                          <Th>Stav</Th>
                          <Th>Objednatel</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>Druh</Th>
                          <Th>Poznámka</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedCancelledOrders.items.map(order => (
                          <Tr
                            key={order.id}
                            $inactive={order?.active === false || order?.aktivni === false || order?.aktivni === 0 || order?.aktivni === '0'}
                          >
                            <Td>{renderOrderLink(order)}</Td>
                            <Td>{formatDateCz(getOrderDate(order))}</Td>
                            <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                            <Td>{getOrderStatusLabel(order)}</Td>
                            <Td>{getOrdererName(order)}</Td>
                            <Td>{getOrdererUsekLabel(order)}</Td>
                            <Td>{getOrderFinancingLabel(order)}</Td>
                            <Td>{getOrderTypeLabel(order)}</Td>
                            <Td>{renderNoteCell(`order_cancelled_${order.id}`)}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('cancelledOrders', pagedCancelledOrders)}
                  </SectionCard>
                )}
              </>
            )}

            {activeTab === 'spend' && (
              <>
                {isBlockVisible('spend', 'spendByFinancingUsek') && (
                  <SectionCard>
                    <SectionHeader>
                      <SectionTitle>Přehled čerpání po financování a úsecích</SectionTitle>
                      <SectionBadge $tone="warn">{spendByFinancingGroups.length} typy</SectionBadge>
                    </SectionHeader>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {spendByFinancingGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          {/* Záhlaví soupce */}
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div />
                            <div>Financování</div>
                            <div style={{ textAlign: 'right' }}>Počet</div>
                            <div style={{ textAlign: 'right' }}>Celkem</div>
                          </div>
                          {spendByFinancingGroups.map(group => {
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
                              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#3b82f6', lineHeight: 1, textAlign: 'center' }}>{finOpen ? '−' : '+'}</span>
                              <span style={{ fontWeight: '700', color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</span>
                              <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                              <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                            </div>
                            {finOpen && (
                              <TableWrapper>
                                <Table>
                                  <thead>
                                    <tr>
                                      <Th style={{ width: '24px' }}></Th>
                                      <Th>Úsek</Th>
                                      <Th>Počet</Th>
                                      <Th>Celkem</Th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {usekyArr.map(usek => {
                                      const detailKey = `spendDetail_${group.code}_${usek.code}`;
                                      const usekOpen = expandedSpendUseks.has(detailKey);
                                      const pagedDetail = getPagedItems(usek.orders, detailKey);
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
                                              {usekOpen ? '−' : '+'}
                                            </Td>
                                            <Td>{usek.label}</Td>
                                            <Td>{usek.count}</Td>
                                            <Td>{fmtCurrency(usek.amount)}</Td>
                                          </Tr>
                                          {usekOpen && (
                                            <tr>
                                              <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                <TableWrapper style={{ margin: 0 }}>
                                                  <Table>
                                                    <thead>
                                                      <tr>
                                                        <Th>Číslo</Th>
                                                        <Th>Dt. obj.</Th>
                                                        <Th>Předmět</Th>
                                                        <Th>Objednatel</Th>
                                                        <Th>Stav</Th>
                                                        <Th>Financování</Th>
                                                        <Th>Druh</Th>
                                                        <Th>Částka</Th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {pagedDetail.items.map(order => (
                                                        <Tr key={order.id}>
                                                          <Td>{renderOrderLink(order)}</Td>
                                                          <Td>{formatDateCz(getOrderDate(order))}</Td>
                                                          <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                                                          <Td>{renderOrdererStack(order)}</Td>
                                                          <Td>{getOrderStatusLabel(order)}</Td>
                                                          <Td>{getOrderFinancingLabel(order)}</Td>
                                                          <Td>{getOrderTypeLabel(order)}</Td>
                                                          <Td>{fmtCurrency(getOrderAmount(order))}</Td>
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

                {/* === ÚSEK → FINANCOVÁNÍ === */}
                {isBlockVisible('spend', 'spendByUsekFinancing') && (
                  <SectionCard>
                    <SectionHeader>
                      <SectionTitle>Přehled čerpání po úsecích a financování</SectionTitle>
                      <SectionBadge $tone="warn">{spendByUsekGroups.length} úseků</SectionBadge>
                    </SectionHeader>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {spendByUsekGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div />
                            <div>Úsek</div>
                            <div style={{ textAlign: 'right' }}>Počet</div>
                            <div style={{ textAlign: 'right' }}>Celkem</div>
                          </div>
                          {spendByUsekGroups.map(group => {
                            const grpOpen = expandedSpendUsekF.has(group.code);
                            const finArr = Object.values(group.financing).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                            return (
                              <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendUsekF(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#16a34a', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '−' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                                </div>
                                {grpOpen && (
                                  <TableWrapper>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <Th style={{ width: '24px' }}></Th>
                                          <Th>Financování</Th>
                                          <Th>Počet</Th>
                                          <Th>Celkem</Th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {finArr.map(fin => {
                                          const detailKey = `spendUFDetail_${group.code}_${fin.code}`;
                                          const finOpen = expandedSpendUsekFSub.has(detailKey);
                                          const pagedDetail = getPagedItems(fin.orders, detailKey);
                                          return (
                                            <React.Fragment key={`${group.code}_${fin.code}`}>
                                              <Tr
                                                onClick={() => setExpandedSpendUsekFSub(prev => { const next = new Set(prev); if (next.has(detailKey)) next.delete(detailKey); else next.add(detailKey); return next; })}
                                                style={{ cursor: 'pointer', background: finOpen ? '#f0f9ff' : undefined }}
                                              >
                                                <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{finOpen ? '−' : '+'}</Td>
                                                <Td>{fin.label}</Td>
                                                <Td>{fin.count}</Td>
                                                <Td>{fmtCurrency(fin.amount)}</Td>
                                              </Tr>
                                              {finOpen && (
                                                <tr>
                                                  <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <TableWrapper style={{ margin: 0 }}>
                                                      <Table>
                                                        <thead>
                                                          <tr>
                                                            <Th>Číslo</Th>
                                                            <Th>Dt. obj.</Th>
                                                            <Th>Předmět</Th>
                                                            <Th>Objednatel</Th>
                                                            <Th>Stav</Th>
                                                            <Th>Financování</Th>
                                                            <Th>Druh</Th>
                                                            <Th>Částka</Th>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {pagedDetail.items.map(order => (
                                                            <Tr key={order.id}>
                                                              <Td>{renderOrderLink(order)}</Td>
                                                              <Td>{formatDateCz(getOrderDate(order))}</Td>
                                                              <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                                                              <Td>{renderOrdererStack(order)}</Td>
                                                              <Td>{getOrderStatusLabel(order)}</Td>
                                                              <Td>{getOrderFinancingLabel(order)}</Td>
                                                              <Td>{getOrderTypeLabel(order)}</Td>
                                                              <Td>{fmtCurrency(getOrderAmount(order))}</Td>
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
                  <SectionCard>
                    <SectionHeader>
                      <SectionTitle>Přehled čerpání po druhu a financování</SectionTitle>
                      <SectionBadge $tone="warn">{spendByDruhGroups.length} druhů</SectionBadge>
                    </SectionHeader>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {spendByDruhGroups.length === 0 ? (
                        <EmptyState>Bez dat pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div />
                            <div>Druh objednávky</div>
                            <div style={{ textAlign: 'right' }}>Počet</div>
                            <div style={{ textAlign: 'right' }}>Celkem</div>
                          </div>
                          {spendByDruhGroups.map(group => {
                            const grpOpen = expandedSpendDruh.has(group.code);
                            const finArr = Object.values(group.financing).sort((a, b) => a.code.localeCompare(b.code, 'cs-CZ'));
                            return (
                              <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendDruh(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: grpOpen ? '#fdf4ff' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#7c3aed', lineHeight: 1, textAlign: 'center' }}>{grpOpen ? '−' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#4c1d95', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.totalCount} obj.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.totalAmount)}</span>
                                </div>
                                {grpOpen && (
                                  <TableWrapper>
                                    <Table>
                                      <thead>
                                        <tr>
                                          <Th style={{ width: '24px' }}></Th>
                                          <Th>Financování</Th>
                                          <Th>Počet</Th>
                                          <Th>Celkem</Th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {finArr.map(fin => {
                                          const detailKey = `spendDFDetail_${group.code}_${fin.code}`;
                                          const finOpen = expandedSpendDruhSub.has(detailKey);
                                          const pagedDetail = getPagedItems(fin.orders, detailKey);
                                          return (
                                            <React.Fragment key={`${group.code}_${fin.code}`}>
                                              <Tr
                                                onClick={() => setExpandedSpendDruhSub(prev => { const next = new Set(prev); if (next.has(detailKey)) next.delete(detailKey); else next.add(detailKey); return next; })}
                                                style={{ cursor: 'pointer', background: finOpen ? '#f0f9ff' : undefined }}
                                              >
                                                <Td style={{ textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>{finOpen ? '−' : '+'}</Td>
                                                <Td>{fin.label}</Td>
                                                <Td>{fin.count}</Td>
                                                <Td>{fmtCurrency(fin.amount)}</Td>
                                              </Tr>
                                              {finOpen && (
                                                <tr>
                                                  <td colSpan={4} style={{ padding: '0.5rem 0.5rem 0.75rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <TableWrapper style={{ margin: 0 }}>
                                                      <Table>
                                                        <thead>
                                                          <tr>
                                                            <Th>Číslo</Th>
                                                            <Th>Dt. obj.</Th>
                                                            <Th>Předmět</Th>
                                                            <Th>Objednatel</Th>
                                                            <Th>Stav</Th>
                                                            <Th>Financování</Th>
                                                            <Th>Druh</Th>
                                                            <Th>Částka</Th>
                                                          </tr>
                                                        </thead>
                                                        <tbody>
                                                          {pagedDetail.items.map(order => (
                                                            <Tr key={order.id}>
                                                              <Td>{renderOrderLink(order)}</Td>
                                                              <Td>{formatDateCz(getOrderDate(order))}</Td>
                                                              <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                                                              <Td>{renderOrdererStack(order)}</Td>
                                                              <Td>{getOrderStatusLabel(order)}</Td>
                                                              <Td>{getOrderFinancingLabel(order)}</Td>
                                                              <Td>{getOrderTypeLabel(order)}</Td>
                                                              <Td>{fmtCurrency(getOrderAmount(order))}</Td>
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

                {/* === LP → LP KÓD (LPIT1, LPIT2...) → OBJEDNÁVKY === */}
                {isBlockVisible('spend', 'spendByLpKod') && (
                  <SectionCard>
                    <SectionHeader>
                      <SectionTitle>Čerpání LP podle LP kódu</SectionTitle>
                      <SectionBadge $tone="warn">{spendByLpKodGroups.length} LP kódů</SectionBadge>
                    </SectionHeader>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {spendByLpKodGroups.length === 0 ? (
                        <EmptyState>Bez objednávek LP pro zvolené filtry</EmptyState>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', padding: '0.25rem 1rem 0.25rem 1rem', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div />
                            <div>LP kód</div>
                            <div style={{ textAlign: 'right' }}>Počet</div>
                            <div style={{ textAlign: 'right' }}>Celkem</div>
                          </div>
                          {spendByLpKodGroups.map(group => {
                            const lpOpen = expandedSpendLp.has(group.code);
                            const pagedDetail = getPagedItems(group.orders, `spendLpKod_${group.code}`);
                            return (
                              <div key={group.code} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div
                                  onClick={() => setExpandedSpendLp(prev => { const next = new Set(prev); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; })}
                                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr 110px 190px', gap: '0.75rem', alignItems: 'center', padding: '0.7rem 1rem', background: lpOpen ? '#fffbeb' : '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#d97706', lineHeight: 1, textAlign: 'center' }}>{lpOpen ? '−' : '+'}</span>
                                  <span style={{ fontWeight: '700', color: '#78350f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</span>
                                  <SectionBadge $tone="warn" style={{ textAlign: 'right', justifySelf: 'end' }}>{group.count} obj.</SectionBadge>
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#374151', textAlign: 'right', fontWeight: '600' }}>{fmtCurrency(group.amount)}</span>
                                </div>
                                {lpOpen && (
                                  <div style={{ padding: '0.5rem 0.5rem 0.75rem 1rem', background: '#f8fafc' }}>
                                    <TableWrapper style={{ margin: 0 }}>
                                      <Table>
                                        <thead>
                                          <tr>
                                            <Th>Číslo</Th>
                                            <Th>Dt. obj.</Th>
                                            <Th>Předmět</Th>
                                            <Th>Objednatel</Th>
                                            <Th>Stav</Th>
                                            <Th>Úsek</Th>
                                            <Th>Druh</Th>
                                            <Th>Částka</Th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {pagedDetail.items.map(order => (
                                            <Tr key={order.id}>
                                              <Td>{renderOrderLink(order)}</Td>
                                              <Td>{formatDateCz(getOrderDate(order))}</Td>
                                              <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                                              <Td>{renderOrdererStack(order)}</Td>
                                              <Td>{getOrderStatusLabel(order)}</Td>
                                              <Td>{getOrdererUsekLabel(order)}</Td>
                                              <Td>{getOrderTypeLabel(order)}</Td>
                                              <Td>{fmtCurrency(getOrderAmount(order))}</Td>
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

              </>
            )}

            {activeTab === 'stats' && (
              <ChartGrid>

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
                  const finOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const finChartEl = labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <ChartWrapper><Bar data={finData} options={finOpts} /></ChartWrapper>;
                  return (
                    <ChartCard>
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
                  const usekOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const usekChartEl = labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <ChartWrapper><Bar data={usekData} options={usekOpts} /></ChartWrapper>;
                  return (
                    <ChartCard>
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
                  const druhOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const druhChartEl = labels.length === 0 ? <EmptyState>Bez dat</EmptyState> : <ChartWrapper><Bar data={druhData} options={druhOpts} /></ChartWrapper>;
                  return (
                    <ChartCard>
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
                  const lpOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: {
                    yCount: { type: 'linear', position: 'left', title: { display: true, text: 'Počet' }, grid: { drawOnChartArea: false } },
                    yAmount: { type: 'linear', position: 'right', title: { display: true, text: 'tis. Kč' }, ticks: { callback: v => `${v}k` } }
                  }};
                  const lpChartEl = <ChartWrapper><Bar data={lpData} options={lpOpts} /></ChartWrapper>;
                  return (
                    <ChartCard>
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
                    <ChartCard>
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
                    <ChartCard>
                      <SectionTitle>Top objednatelé (částka)</SectionTitle>
                      <ChartExpandBtn title="Celá obrazovka (ESC = zavřít)" onClick={() => setFullscreenChart({ title: 'Top objednatelé (částka)', el: <Bar data={buyerData} options={withFsFont(buyerOpts)} /> })}><FontAwesomeIcon icon={faExpand} /></ChartExpandBtn>
                      {buyerEl}
                    </ChartCard>
                  );
                })()}

              </ChartGrid>
            )}

            {activeTab === 'reports' && (
              <>
                {isBlockVisible('reports', 'ordersWithoutInvoice') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Objednávky bez faktury 2+ měsíce (schváleno+)</SectionTitle>
                    <SectionBadge $tone="warn">{reportSections.ordersWithoutInvoice.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Objednávka</Th>
                          <Th>Dt. obj.</Th>
                          <Th>Předmět</Th>
                          <Th>Stav</Th>
                          <Th>Objednatel</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>Druh</Th>
                          <Th>Částka</Th>
                          <Th>Poznámka</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrdersWithoutInvoice.items.map(order => (
                          <Tr key={order.id}>
                            <Td>{renderOrderLink(order)}</Td>
                            <Td>{formatDateCz(getOrderDate(order))}</Td>
                            <SubjectTd>{getOrderSubject(order)}</SubjectTd>
                            <Td>{getOrderStatusLabel(order)}</Td>
                            <Td>{getOrdererName(order)}</Td>
                            <Td>{getOrdererUsekLabel(order)}</Td>
                            <Td>{getOrderFinancingLabel(order)}</Td>
                            <Td>{getOrderTypeLabel(order)}</Td>
                            <Td>{fmtCurrency(getOrderAmount(order))}</Td>
                            <Td>{renderNoteCell(`report_no_invoice_${order.id}`)}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('ordersWithoutInvoice', pagedOrdersWithoutInvoice)}
                  </SectionCard>
                )}

                {isBlockVisible('reports', 'ordersWithInvoiceNotDone') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Objednávky s fakturou, nedokončené (mimo vzdělávání)</SectionTitle>
                    <SectionBadge $tone="warn">{reportSections.ordersWithInvoiceNotDone.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Objednávka</Th>
                          <Th>Dt. obj.</Th>
                          <Th>Stav</Th>
                          <Th>Objednatel</Th>
                          <Th>Úsek</Th>
                          <Th>Financování</Th>
                          <Th>VS faktur</Th>
                          <Th>Částka</Th>
                          <Th>Druh</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrdersWithInvoiceNotDone.items.map(order => (
                          <Tr key={order.id}>
                            <Td>{renderOrderLink(order)}</Td>
                            <Td>{formatDateCz(getOrderDate(order))}</Td>
                            <Td>{getOrderStatusLabel(order)}</Td>
                            <Td>{getOrdererName(order)}</Td>
                            <Td>{getOrdererUsekLabel(order)}</Td>
                            <Td>{getOrderFinancingLabel(order)}</Td>
                            <Td>{(invoicesByOrderId[String(order.id)] || []).map(inv => inv.cislo_faktury).filter(Boolean).join(', ')}</Td>
                            <Td>{fmtCurrency(getOrderAmount(order))}</Td>
                            <Td>{getOrderTypeLabel(order)}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('ordersWithInvoiceNotDone', pagedOrdersWithInvoiceNotDone)}
                  </SectionCard>
                )}

                {isBlockVisible('reports', 'topSuppliers') && (
                  <SectionCard>
                  <SectionHeader>
                    <SectionTitle>Top dodavatelé (LP vs smlouvy)</SectionTitle>
                    <SectionBadge $tone="warn">TOP {reportSections.topSuppliers.length}</SectionBadge>
                  </SectionHeader>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Dodavatel</Th>
                          <Th>Celkem</Th>
                          <Th>Rozpad</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedTopSuppliers.items.map(supplier => (
                          <Tr key={supplier.name}>
                            <Td>{supplier.name}</Td>
                            <Td>{fmtCurrency(supplier.total)}</Td>
                            <Td>
                              {Object.entries(supplier.split).map(([key, value]) => (
                                <Pill key={key} $tone="success" style={{ marginRight: '0.35rem' }}>
                                  {key}: {fmtCurrency(value)}
                                </Pill>
                              ))}
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                  {renderPagination('topSuppliers', pagedTopSuppliers)}
                  </SectionCard>
                )}
              </>
            )}

            {/* ===== ATTACHMENTS TAB ===== */}
            {activeTab === 'attachments' && (
              <>
                {/* Přílohy objednávek podle typu */}
                {isBlockVisible('attachments', 'orderAttachmentsByType') && (
                  <SectionCard>
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
                        Přílohy objednávek podle typu
                      </SectionTitle>
                      <SectionBadge $tone="info">{orderAttachmentsStats?.total || 0} příloh</SectionBadge>
                    </SectionHeader>
                    {attachmentsLoading && !orderAttachmentsStats ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Načítám statistiky...</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '1rem' }}>
                          {(orderAttachmentsStats?.types || []).map(item => (
                            <Pill
                              key={item.type}
                              $tone={expandedAttachmentType.orders === item.type ? 'primary' : 'default'}
                              onClick={() => {
                                if (expandedAttachmentType.orders === item.type) {
                                  setExpandedAttachmentType(prev => ({ ...prev, orders: null }));
                                  setAttachmentsByType(prev => ({ ...prev, orders: null }));
                                } else {
                                  handleLoadOrderAttachmentsByType(item.type, 1);
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                outline: expandedAttachmentType.orders === item.type ? '2px solid #3b82f6' : '1px solid transparent',
                                outlineOffset: '1px',
                                fontWeight: expandedAttachmentType.orders === item.type ? 700 : 400,
                              }}
                            >
                              {item.type}: {item.count}
                            </Pill>
                          ))}
                        </div>
                        {expandedAttachmentType.orders && attachmentsByType.orders && (
                          <TableWrapper>
                            <Table>
                              <thead>
                                <tr>
                                  <Th>Soubor / Příloha</Th>
                                  <Th>Objednávka</Th>
                                  <Th>Stav obj.</Th>
                                  <Th>Dodavatel</Th>
                                  <Th>Nahrál</Th>
                                  <Th>Datum</Th>
                                </tr>
                              </thead>
                              <tbody>
                                {(attachmentsByType.orders?.data || []).map(att => (
                                  <Tr key={att.id}>
                                    <Td>
                                      <span
                                        style={{ color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        onClick={() => handleOpenAttachment(att, 'order')}
                                        title="Otevřít přílohu"
                                      >
                                        <FontAwesomeIcon icon={faEye} style={{ fontSize: '0.8rem', opacity: 0.7 }} />
                                        {att.original_name}
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
                            {attachmentsByType.orders?.pagination && attachmentsByType.orders.pagination.total_pages > 1 && (
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
                          </TableWrapper>
                        )}
                      </>
                    )}
                  </SectionCard>
                )}

                {/* Přílohy faktur podle typu */}
                {isBlockVisible('attachments', 'invoiceAttachmentsByType') && (
                  <SectionCard>
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
                        Přílohy faktur podle typu
                      </SectionTitle>
                      <SectionBadge $tone="info">{invoiceAttachmentsStats?.total || 0} příloh</SectionBadge>
                    </SectionHeader>
                    {attachmentsLoading && !invoiceAttachmentsStats ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Načítám statistiky...</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '1rem' }}>
                          {(invoiceAttachmentsStats?.types || []).map(item => (
                            <Pill
                              key={item.type}
                              $tone={expandedAttachmentType.invoices === item.type ? 'primary' : 'default'}
                              onClick={() => {
                                if (expandedAttachmentType.invoices === item.type) {
                                  setExpandedAttachmentType(prev => ({ ...prev, invoices: null }));
                                  setAttachmentsByType(prev => ({ ...prev, invoices: null }));
                                } else {
                                  handleLoadInvoiceAttachmentsByType(item.type, 1);
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                outline: expandedAttachmentType.invoices === item.type ? '2px solid #3b82f6' : '1px solid transparent',
                                outlineOffset: '1px',
                                fontWeight: expandedAttachmentType.invoices === item.type ? 700 : 400,
                              }}
                            >
                              {item.type}: {item.count}
                            </Pill>
                          ))}
                        </div>
                        {expandedAttachmentType.invoices && attachmentsByType.invoices && (
                          <TableWrapper>
                            <Table>
                              <thead>
                                <tr>
                                  <Th>Soubor / Příloha</Th>
                                  <Th>Faktura</Th>
                                  <Th>Stav fa.</Th>
                                  <Th>Objednávka</Th>
                                  <Th>Nahrál</Th>
                                  <Th>Datum</Th>
                                </tr>
                              </thead>
                              <tbody>
                                {(attachmentsByType.invoices?.data || []).map(att => (
                                  <Tr key={att.id}>
                                    <Td>
                                      <span
                                        style={{ color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        onClick={() => handleOpenAttachment(att, 'invoice')}
                                        title="Otevřít přílohu"
                                      >
                                        <FontAwesomeIcon icon={faEye} style={{ fontSize: '0.8rem', opacity: 0.7 }} />
                                        {att.original_name}
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
                            {attachmentsByType.invoices?.pagination && attachmentsByType.invoices.pagination.total_pages > 1 && (
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
                          </TableWrapper>
                        )}
                      </>
                    )}
                  </SectionCard>
                )}

                {/* Objednávky bez příloh */}
                {isBlockVisible('attachments', 'ordersWithoutAttachments') && (
                  <SectionCard>
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
                      <SectionBadge $tone="warn">{ordersWithoutAttachments?.pagination?.total || '...'}</SectionBadge>
                    </SectionHeader>
                    {ordersWithoutAttachments && (
                      <TableWrapper>
                        <Table>
                          <thead>
                            <tr>
                              <Th>Objednávka</Th>
                              <Th>Předmět</Th>
                              <Th>Stav</Th>
                              <Th>Dodavatel</Th>
                              <Th>Autor</Th>
                              <Th>Částka</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {(ordersWithoutAttachments?.data || []).map(order => (
                              <Tr key={order.id}>
                                <Td>{renderOrderLink(order)}</Td>
                                <Td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {order.nazev || '-'}
                                </Td>
                                <Td>
                                  <Pill $tone="default">{order.stav}</Pill>
                                </Td>
                                <Td>{order.dodavatel || '-'}</Td>
                                <Td>{order.autor || '-'}</Td>
                                <Td>{order.castka ? fmtCurrency(order.castka) : '-'}</Td>
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                        {ordersWithoutAttachments?.pagination && ordersWithoutAttachments.pagination.total_pages > 1 && (
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
                  <SectionCard>
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
                      <SectionBadge $tone="warn">{invoicesWithoutAttachments?.pagination?.total || '...'}</SectionBadge>
                    </SectionHeader>
                    {invoicesWithoutAttachments && (
                      <TableWrapper>
                        <Table>
                          <thead>
                            <tr>
                              <Th>Faktura</Th>
                              <Th>Stav</Th>
                              <Th>Objednávka</Th>
                              <Th>Dodavatel</Th>
                              <Th>Částka</Th>
                              <Th>Splatnost</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {(invoicesWithoutAttachments?.data || []).map(invoice => (
                              <Tr key={invoice.id}>
                                <Td>{renderInvoiceLink(invoice)}</Td>
                                <Td>
                                  <Pill $tone="default">{invoice.stav}</Pill>
                                </Td>
                                <Td>{invoice.objednavka_id ? renderOrderLink({ id: invoice.objednavka_id, cislo_objednavky: invoice.cislo_objednavky }) : '-'}</Td>
                                <Td>{invoice.dodavatel || '-'}</Td>
                                <Td>{invoice.castka ? fmtCurrency(invoice.castka) : '-'}</Td>
                                <Td>{invoice.datum_splatnosti ? new Date(invoice.datum_splatnosti).toLocaleDateString('cs-CZ') : '-'}</Td>
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                        {invoicesWithoutAttachments?.pagination && invoicesWithoutAttachments.pagination.total_pages > 1 && (
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
              <SectionCard>
                <SectionHeader>
                  <SectionTitle>Kontingenční tabulka</SectionTitle>
                  <PivotHeaderActions>
                    <Select
                      value={pivotConfig.dataset}
                      onChange={(event) => setPivotConfig(prev => ({ ...prev, dataset: event.target.value }))}
                    >
                      <option value="all">Vše dohromady</option>
                      <option value="orders">Objednávky</option>
                      <option value="invoices">Faktury</option>
                      <option value="contracts">Smlouvy</option>
                    </Select>
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

                    <PivotZone onDragOver={(event) => event.preventDefault()} onDrop={(event) => handlePivotDrop(event, 'col')}>
                      <PivotZoneTitle>Sloupce (textová pole)</PivotZoneTitle>
                      <PivotZoneBody>
                        {(pivotConfig.colFields || []).length > 0 ? (
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
                      <PivotZoneTitle>Hodnota (číselná metrika)</PivotZoneTitle>
                      <PivotZoneBody>
                        {pivotConfig.metric ? (
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
                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>
                          {(pivotConfig.rowFields || []).map(key => pivotTextLabelMap.get(key) || key).join(' / ') || 'Řádky'}
                        </Th>
                        {pivotTable.colKeys.map(colKey => (
                          <Th key={colKey}>{colKey}</Th>
                        ))}
                        <Th>Celkem</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {pivotRowNodes.length === 0 && (
                        <Tr>
                          <Td colSpan={pivotTable.colKeys.length + 2}>
                            <EmptyState>Bez dat</EmptyState>
                          </Td>
                        </Tr>
                      )}
                      {pivotRowNodes.map(node => {
                        const isExpanded = pivotExpanded[node.id] ?? node.depth === 0;
                        const hasChildren = node.children.length > 0;
                        return (
                          <Tr key={node.id}>
                            <Td>
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
                                <strong>{node.label}</strong>
                              </div>
                            </Td>
                            {pivotTable.colKeys.map(colKey => (
                              <Td key={`${node.id}_${colKey}`}>{formatMetric(pivotTable.getValue(node, colKey))}</Td>
                            ))}
                            <Td><strong>{formatMetric(pivotTable.getRowTotal(node))}</strong></Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <Tr>
                        <Td><strong>Celkem</strong></Td>
                        {pivotTable.colKeys.map(colKey => (
                          <Td key={`total_${colKey}`}><strong>{formatMetric(pivotTable.totalForCol(colKey))}</strong></Td>
                        ))}
                        <Td><strong>{formatMetric(pivotTable.grandTotal)}</strong></Td>
                      </Tr>
                    </tfoot>
                  </Table>
                </TableWrapper>
              </SectionCard>
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
    </>
  );
}
