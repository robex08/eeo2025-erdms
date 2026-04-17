import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faSync, faFilter, faLayerGroup, faGripVertical, faXmark, faPlus, faMinus, faSearch, faChartBar, faSort, faSortUp, faSortDown, faPaperclip, faExternalLinkAlt, faFile, faFilePdf, faFileWord, faFileExcel, faFileImage, faFileArchive, faFileAlt, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { getOrderV2, lockOrderV2, listInvoiceAttachmentsV2, downloadOrderAttachment, downloadInvoiceAttachment } from '../services/apiOrderV2';
import { getOrderAttachmentsV3 } from '../services/apiOrderV3';
import AttachmentViewer from '../components/invoices/AttachmentViewer';
import { listMajetekOrdersV3 } from '../services/apiOrdersV3';
import { formatDateOnly } from '../utils/format';
import OrdersPaginationV3 from '../components/ordersV3/OrdersPaginationV3';
import { CustomSelect } from '../components/CustomSelect';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

// ─── Přílohy - konstanty a utility ───────────────────────────────────────────
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
  return code.split('_').filter(Boolean).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
};
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

// ─── Styled: Attach Popup ─────────────────────────────────────────────────────
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

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: transparent;
  padding: 1.5rem 1rem 2rem;
`;

const PageContainer = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1rem;
  color: white;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  order: 2;

  @media (max-width: 768px) {
    order: 1;
    width: 100%;
  }
`;

const Title = styled.h2`
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  order: 1;

  @media (max-width: 768px) {
    order: 2;
    width: 100%;
    justify-content: center;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
`;

const FilterPanel = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FilterTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FilterItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SearchField = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #64748b;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    color: #1e293b;
  }
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  flex: 1;
  font-size: 0.95rem;
  color: #1e293b;
  background: transparent;

  &::placeholder {
    color: #94a3b8;
  }
`;

const PeriodWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PeriodLabel = styled.label`
  font-weight: 600;
  font-size: 1rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
`;

const PeriodSelector = styled.select`
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  option {
    background: #1e40af;
    color: white;
  }
`;

const ClickableOrderNumber = styled.span`
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const ReloadButton = styled.button`
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
`;

const FilterLabel = styled.div`
  font-size: 0.85rem;
  color: #475569;
  font-weight: 600;
  margin-right: 0.35rem;
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #334155;
  user-select: none;
  transition: color 0.15s ease;

  &:hover {
    color: #1e293b;
  }

  input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #3b82f6;
  }
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin: 0;
`;

const SummaryCard = styled.div`
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
  text-align: right;
`;

const SummaryLabel = styled.div`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1e40af;
  margin-bottom: 0.25rem;
  text-align: right;
`;

const SummaryValue = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  text-align: right;
`;

const TableWrapperInner = styled.div`
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { height: 8px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; min-width: 40px; }
  &::-webkit-scrollbar-thumb:hover { background: #64748b; }
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

const TableWrapperOuter = styled.div`
  position: relative;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
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

  th {
    text-align: left;
    padding: 0.5rem 0.6rem;
    color: #334155;
    font-weight: 600;
    border-bottom: 2px solid #cbd5e1;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    font-size: 0.8rem;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s ease;

    &:hover {
      background: #e2e8f0;
    }
  }

  td {
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid #f1f5f9;
    white-space: nowrap;
    vertical-align: top;
  }

  td.td-wrap {
    white-space: normal;
    word-break: break-word;
    vertical-align: top;
  }

  tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.15s ease;

    &:nth-of-type(even) {
      background-color: #f8fafc;
    }

    &:hover {
      background-color: #e8f0fe !important;
    }
  }

  tbody tr.base-row {
    &:nth-of-type(even) {
      background-color: #f8fafc;
    }

    &:hover {
      background-color: #e8f0fe !important;
    }
  }

  tbody tr.group-row {
    background: #f1f5ff;
    font-weight: 600;
    color: #1e3a8a;

    &:hover {
      background: #dbeafe !important;
    }
  }

  tbody tr.group-row.group-depth-0 { background: #eef2ff; }
  tbody tr.group-row.group-depth-1 { background: #e0e7ff; }
  tbody tr.group-row.group-depth-2 { background: #dbeafe; }
  tbody tr.group-row.group-depth-3 { background: #e0f2fe; }

  tbody tr.child-row {
    background: #f8fafc;
    color: #334155;
    
    &:nth-of-type(even) {
      background-color: #f1f5f9;
    }

    &:hover {
      background-color: #e8f0fe !important;
    }
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #64748b;
`;

const AggregationPanel = styled.div`
  margin-top: 1.5rem;
  margin-bottom: 1.75rem;
  display: grid;
  grid-template-columns: 7fr 3fr;
  gap: 1.25rem;
  align-items: stretch;
`;

const AggregationLeft = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(280px, 2fr);
  gap: 1.25rem;
  align-items: stretch;
`;

const FiltersAndAggregation = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 1.25rem;
  align-items: stretch;
`;

const AggregationChartPanel = styled.div`
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ChartContainer = styled.div`
  flex: 1;
  min-height: 0;
  height: 100%;
`;


const ChartPlaceholder = styled.div`
  flex: 1;
  border-radius: 10px;
  background: repeating-linear-gradient(
    -45deg,
    rgba(59, 130, 246, 0.08),
    rgba(59, 130, 246, 0.08) 12px,
    rgba(59, 130, 246, 0.16) 12px,
    rgba(59, 130, 246, 0.16) 24px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e3a8a;
  font-weight: 600;
  font-size: 0.95rem;
`;

const AggregationBox = styled.div`
  border: 1px dashed #cbd5f5;
  border-radius: 12px;
  padding: 1rem;
  background: #f8fafc;
  min-height: 120px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const AggregationTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
`;

const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: #eef2f7;
  color: #334155;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
`;

const ChipButton = styled.button`
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
`;

const ChipIndex = styled.sup`
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  margin-left: 0.25rem;
  line-height: 1;
`;

const ChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
`;

const AggregationActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-left: auto;
  justify-content: flex-end;
  align-self: flex-start;
`;

const ActionButton = styled.button`
  border: 1px solid #cbd5f5;
  background: white;
  color: #1e40af;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #eef2ff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;


const HintText = styled.div`
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
`;


const PlaceholderBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  text-align: center;
`;

const PlaceholderTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
`;

const PlaceholderText = styled.p`
  margin: 0;
  color: #4b5563;
  max-width: 520px;
`;

export default function MajetekOverviewPage() {
  const navigate = useNavigate();
  const { token, username, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext) || {};
  const isMountedRef = useRef(false);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  const userId = userDetail?.user_id;
  const getUserKey = useCallback((baseKey) => {
    const sid = userId || 'anon';
    return `${baseKey}_${sid}`;
  }, [userId]);

  const getUserStorage = useCallback((baseKey, defaultValue = null) => {
    try {
      const item = localStorage.getItem(getUserKey(baseKey));
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }, [getUserKey]);

  const setUserStorage = useCallback((baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (error) {
      // Ignorovat chyby zápisu
    }
  }, [getUserKey]);

  const [pagination, setPagination] = useState(() => ({
    page: 1,
    per_page: getUserStorage('majetek_per_page', 50),
    total: 0,
    total_pages: 0
  }));
  const [period, setPeriod] = useState(() => getUserStorage('majetek_period', 'all'));
  const [invoiceFilter, setInvoiceFilter] = useState(() => getUserStorage('majetek_invoice_filter', { withInvoice: true, withoutInvoice: true }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupFields, setGroupFields] = useState(() => getUserStorage('majetek_group_fields', []));
  const [globalSearch, setGlobalSearch] = useState(() => getUserStorage('majetek_global_search', ''));
  const [expanded, setExpanded] = useState({});
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [sorting, setSorting] = useState([]);

  // Přílohy - stav
  const [viewerAttachment, setViewerAttachment] = useState(null);
  const lastViewerCloseAtRef = useRef(0);
  const attachCacheRef = useRef({});
  const [badgeColors, setBadgeColors] = useState({});
  const [attachPopup, setAttachPopup] = useState(null);

  // Zavřít attach popup při kliknutí mimo popup nebo mimo badge
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

  const handleInvoiceFilterChange = useCallback((field, checked) => {
    setInvoiceFilter(prev => ({ ...prev, [field]: checked }));
  }, []);

  const handleItemsPerPageChange = (value) => {
    setPagination(prev => ({ ...prev, per_page: Number(value) }));
  };

  const periodOptions = [
    { value: 'last-month', label: 'Poslední měsíc' },
    { value: 'current-month', label: 'Aktuální měsíc' },
    { value: 'last-quarter', label: 'Poslední kvartál' },
    { value: 'all-months', label: 'Aktuální rok' },
    { value: 'all', label: 'Vše' }
  ];

  const groupOptions = [
    { id: 'dodavatel', columnId: 'dodavatel_nazev', label: 'Dodavatel' },
    { id: 'druh', columnId: 'druh_objednavky_nazev', label: 'Druh objednávky' },
    { id: 'stav', columnId: 'workflow_last', label: 'Stav workflow' },
    { id: 'strediska', columnId: 'strediska_nazvy', label: 'Střediska' },
    { id: 'usek', columnId: 'usek_kod', label: 'Úsek' },
    { id: 'budova', columnId: 'budova_kod', label: 'Budova' },
    { id: 'mistnost', columnId: 'mistnost_kod', label: 'Místnost' },
    { id: 'rok', columnId: 'rok', label: 'Rok' },
    { id: 'objednatel', columnId: 'objednatel_zkr', label: 'Objednatel' },
    { id: 'schvalovatel', columnId: 'schvalovatel_zkr', label: 'Schvalovatel' }
  ];

  const fetchData = useCallback(async (page = 1) => {
    if (!token || !username) return;
    setLoading(true);
    setError('');

    try {
      const response = await listMajetekOrdersV3({
        token,
        username,
        page,
        per_page: pagination.per_page,
        period,
        filters: {}
      });

      if (!isMountedRef.current) return;
      const pageOrders = response?.data?.orders || [];
      const pagePagination = response?.data?.pagination || { page, per_page: pagination.per_page, total: 0, total_pages: 0 };
      setOrders(pageOrders);
      setPagination(pagePagination);

      const totalCount = Number(pagePagination.total || 0);
      const perPage = Number(pagePagination.per_page || 0);
      if (totalCount > 0 && totalCount > perPage) {
        try {
          const allResponse = await listMajetekOrdersV3({
            token,
            username,
            page: 1,
            per_page: totalCount,
            period,
            filters: {}
          });
          if (!isMountedRef.current) return;
          setAllOrders(allResponse?.data?.orders || pageOrders);
        } catch (allErr) {
          if (!isMountedRef.current) return;
          setAllOrders(pageOrders);
        }
      } else {
        setAllOrders(pageOrders);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Nepodařilo se načíst data');
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  }, [token, username, period, pagination.per_page]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !username) return;
    fetchData(1);
  }, [period, fetchData, token, username]);

  useEffect(() => {
    if (!token || !username) return;
    fetchData(1);
  }, [pagination.per_page, fetchData, token, username]);

  useEffect(() => {
    setUserStorage('majetek_period', period);
  }, [period, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_invoice_filter', invoiceFilter);
  }, [invoiceFilter, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_global_search', globalSearch);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [globalSearch, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_group_fields', groupFields);
  }, [groupFields, setUserStorage]);

  useEffect(() => {
    setUserStorage('majetek_per_page', pagination.per_page);
  }, [pagination.per_page, setUserStorage]);

  const toggleSelect = useCallback((field) => {
    setSelectStates(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const formatCurrency = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(number);
  };

  const getLocationSummary = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return '-';
    const unique = new Map();
    items.forEach(item => {
      const key = [item.usek_kod, item.budova_kod, item.mistnost_kod].filter(Boolean).join(' / ');
      if (!key) return;
      unique.set(key, item.poznamka || '');
    });
    return Array.from(unique.keys()).slice(0, 3).join(' • ');
  };

  const getUniqueCode = (items = [], key) => {
    if (!Array.isArray(items) || items.length === 0) return '';
    const values = Array.from(new Set(items.map(item => item[key]).filter(Boolean)));
    if (values.length === 0) return '';
    return values.length === 1 ? values[0] : 'Více';
  };

  const getWorkflowLast = (workflow) => {
    if (Array.isArray(workflow) && workflow.length > 0) {
      return workflow[workflow.length - 1];
    }
    if (typeof workflow === 'string') return workflow;
    return '-';
  };

  const workflowLabels = {
    NOVA: 'Nová',
    ODESLANA_KE_SCHVALENI: 'Odeslaná ke schválení',
    SCHVALENA: 'Schválená',
    ZAMITNUTA: 'Zamítnutá',
    ROZPRACOVANA: 'Rozpracovaná',
    ODESLANA: 'Odeslaná',
    POTVRZENA: 'Potvrzená',
    UVEREJNIT: 'K uveřejnění',
    K_UVEREJNENI_DO_REGISTRU: 'K uveřejnění',
    FAKTURACE: 'Fakturace',
    VECNA_SPRAVNOST: 'Věcná správnost',
    ZKONTROLOVANA: 'Zkontrolovaná',
    DOKONCENA: 'Dokončená',
    ZRUSENA: 'Zrušená',
    SMAZANA: 'Smazaná',
    UVEREJNENA: 'Uveřejněná'
  };

  const getWorkflowLabel = (status) => {
    if (!status) return '-';
    const key = String(status).toUpperCase();
    return workflowLabels[key] || status;
  };

  const aggregationSource = useMemo(() => (allOrders.length ? allOrders : orders), [allOrders, orders]);

  const summary = useMemo(() => {
    const totalOrders = aggregationSource.length;
    const totalInvoices = aggregationSource.reduce((acc, order) => acc + Number(order.faktury_celkova_castka_s_dph || 0), 0);
    const ordersWithInvoices = aggregationSource.filter(order => Number(order.pocet_faktur || 0) > 0).length;
    return { totalOrders, totalInvoices, ordersWithInvoices };
  }, [aggregationSource]);

  const availableGroupOptions = useMemo(() => {
    return groupOptions.filter(opt => !groupFields.includes(opt.columnId));
  }, [groupFields]);

  const handleDropGroup = (event) => {
    event.preventDefault();
    const optionId = event.dataTransfer.getData('text/plain');
    const option = groupOptions.find(opt => opt.id === optionId || opt.columnId === optionId);
    if (!option || groupFields.includes(option.columnId)) return;
    setGroupFields(prev => [...prev, option.columnId]);
  };

  const handleReorderGroup = (fromIndex, toIndex) => {
      const handleItemsPerPageChange = (value) => {
        setPagination(prev => ({ ...prev, per_page: Number(value) }));
      };

    if (fromIndex === toIndex) return;
    setGroupFields(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const tableData = useMemo(() => {
    const normalized = aggregationSource.map(order => {
      // Pro faktury je datum v "datum" sloupci (z UNION), pro objednávky v "dt_objednavky"
      const datum = order.datum || order.dt_objednavky;
      return {
        ...order,
        dt_objednavky: datum, // Normalizace datumu
        workflow_last: getWorkflowLabel(getWorkflowLast(order.stav_workflow_kod)),
        usek_kod: getUniqueCode(order.umisteni_polozky, 'usek_kod'),
        budova_kod: getUniqueCode(order.umisteni_polozky, 'budova_kod'),
        mistnost_kod: getUniqueCode(order.umisteni_polozky, 'mistnost_kod'),
        rok: datum ? new Date(datum).getFullYear() : '',
        usek_zkr: order.usek_zkr || '',
        objednatel_zkr: (() => {
          const p = order.objednatel_prijmeni || ''; const i = order.objednatel_jmeno_init || '';
          return p ? (i ? `${p} ${i}.` : p) : '';
        })(),
        schvalovatel_zkr: (() => {
          const p = order.schvalovatel_prijmeni || ''; const i = order.schvalovatel_jmeno_init || '';
          return p ? (i ? `${p} ${i}.` : p) : '';
        })()
      };
    });

    // Filtr podle přítomnosti faktur
    let filtered = normalized;
    const { withInvoice, withoutInvoice } = invoiceFilter;
    
    if (!withInvoice || !withoutInvoice) {
      filtered = normalized.filter(row => {
        const hasFaktura = Number(row.pocet_faktur || 0) > 0;
        if (withInvoice && !withoutInvoice) return hasFaktura;
        if (!withInvoice && withoutInvoice) return !hasFaktura;
        return true;
      });
    }

    // Globální vyhledávání
    if (!globalSearch) return filtered;
    const needle = globalSearch.toLowerCase();
    return filtered.filter(row => {
      return [
        row.cislo_objednavky,
        row.cislo_smlouvy,
        row.predmet,
        row.dodavatel_nazev,
        row.workflow_last,
        row.strediska_nazvy,
        row.druh_objednavky_nazev,
        row.umisteni_majetku,
        row.fa_cislo_vema,
        row.usek_kod,
        row.budova_kod,
        row.mistnost_kod,
        row.rok
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle));
    });
  }, [aggregationSource, globalSearch, invoiceFilter]);

  const aggregationData = tableData;

  const pagedTableData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.per_page;
    const end = start + pagination.per_page;
    return tableData.slice(start, end);
  }, [tableData, pagination.page, pagination.per_page]);

  const columnHelper = useMemo(() => createColumnHelper(), []);

  const handleEditOrder = useCallback(async (order) => {
    if (!order?.id) return;

    // Neklikat na faktury (ID začíná "F")
    if (String(order.id).startsWith('F')) {
      console.log('ℹ️ [MajetekOverview] Faktura - nelze editovat jako objednávku');
      return;
    }

    try {
      // ✅ V2 API - načti aktuální data z DB pro kontrolu lock_info
      const dbOrder = await getOrderV2(
        order.id,
        token,
        username,
        true // enriched = true
      );

      if (!dbOrder) {
        showToast?.('Nepodařilo se načíst objednávku z databáze', { type: 'error' });
        return;
      }

      // 🔒 Kontrola zamčení jiným uživatelem
      if (dbOrder.lock_info?.locked === true && !dbOrder.lock_info?.is_owned_by_me && !dbOrder.lock_info?.is_expired) {
        const lockInfo = dbOrder.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
        showToast?.(
          `Objednávka je zamčená uživatelem ${lockedByUserName}`,
          { type: 'warning' }
        );
        return;
      }

      // 🔒 Zamkni objednávku před navigací
      if (dbOrder.lock_info?.is_owned_by_me !== true) {
        try {
          await lockOrderV2({ orderId: order.id, token, username });
        } catch (lockError) {
          console.warn('⚠️ [MajetekOverview] Nepodařilo se zamknout objednávku před navigací:', lockError);
        }
      }

      // ✅ Naviguj na formulář
      navigate(`/order-form-25?edit=${order.id}`, {
        state: {
          returnTo: '/majetek-overview',
          highlightOrderId: order.id
        }
      });

    } catch (error) {
      console.error('❌ [MajetekOverview] Chyba při kontrole dostupnosti objednávky:', error);
      showToast?.('Chyba při kontrole dostupnosti objednávky', { type: 'error' });
    }
  }, [token, username, navigate, showToast]);

  // ─── Přílohy - callbacks ──────────────────────────────────────────────────
  const calculateBadgeColor = useCallback((items) => {
    if (!items || items.length === 0) return '#dc2626';
    const orderAttachments = items.filter(a => a.attachmentSource === 'ORDER');
    const invoiceAttachments = items.filter(a => a.attachmentSource === 'INVOICE');
    const objPodklady = orderAttachments.filter(a => a.typ_prilohy === 'PODKLADY' || a.attachment_type === 'PODKLADY').length;
    const objCestovniPrikaz = orderAttachments.filter(a => a.typ_prilohy === 'CESTOVNI_PRIKAZ' || a.attachment_type === 'CESTOVNI_PRIKAZ').length;
    const objCertifikat = orderAttachments.filter(a => a.typ_prilohy === 'CERTIFIKAT' || a.attachment_type === 'CERTIFIKAT').length;
    const faFaktura = invoiceAttachments.filter(a => a.typ_prilohy === 'FAKTURA' || a.attachment_type === 'FAKTURA').length;
    const hasBasicObjAttach = objPodklady >= 1 || objCestovniPrikaz >= 1;
    if (!hasBasicObjAttach) return '#dc2626';
    const hasCompleteFaktura = faFaktura >= 2;
    const hasCompleteObj = objPodklady >= 2 || (objCestovniPrikaz >= 1 && objCertifikat >= 1);
    if (hasCompleteFaktura && hasCompleteObj) return '#16a34a';
    if (faFaktura >= 2) return '#fbbf24';
    return '#f97316';
  }, []);

  const handleAttachBadgeClick = useCallback(async (entityId, entityType, e, invoiceIds = null, knownCount = null) => {
    e.stopPropagation();
    const key = `${entityType}_${entityId}`;
    if (attachPopup?.key === key) { setAttachPopup(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const POPUP_W = 360, MARGIN = 16;
    const itemCount = (knownCount != null && knownCount > 0) ? knownCount : 3;
    const POPUP_H_EST = 50 + Math.min(itemCount * 72, 300) + 8;
    const vw = window.innerWidth, vh = window.innerHeight;
    // Pokud je více místa vlevo (tj. ikona blíže pravému okraji), otevři popup doleva
    // (pravý okraj popupu = pravý okraj ikony). Jinak standardně doleva od levého okraje ikony.
    const spaceRight = vw - rect.left - POPUP_W - MARGIN;
    const spaceLeft  = rect.right - POPUP_W - MARGIN;
    let left;
    if (spaceRight < 0 && spaceLeft >= 0) {
      // Ikona blíže pravému okraji — popup otevřít doleva od prvku
      left = rect.right - POPUP_W;
    } else {
      left = rect.left;
    }
    // Závěrečné oříznutí tak, aby popup nikdy nepřesáhl viewport
    if (left + POPUP_W + MARGIN > vw) left = vw - POPUP_W - MARGIN;
    if (left < MARGIN) left = MARGIN;
    const spaceBelow = vh - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    let top;
    if (spaceBelow >= POPUP_H_EST) {
      top = rect.bottom + 6;
    } else if (spaceAbove >= POPUP_H_EST) {
      top = rect.top - POPUP_H_EST - 6;
    } else {
      top = spaceBelow > spaceAbove ? rect.bottom + 6 : Math.max(MARGIN, rect.top - POPUP_H_EST - 6);
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
        rawItems = [
          ...orderArr.map(a => ({ ...a, attachmentSource: 'ORDER', order_id: entityId })),
          ...invoiceAttachments.map(a => ({ ...a, attachmentSource: 'INVOICE' }))
        ];
      } else if (entityType === 'order') {
        rawItems = await getOrderAttachmentsV3({ token, username, orderId: entityId });
      } else {
        rawItems = await listInvoiceAttachmentsV2(entityId, token, username);
      }
      const rawArr = Array.isArray(rawItems) ? rawItems : (rawItems?.attachments || rawItems?.data || []);
      const items = rawArr.map(a => ({
        ...a,
        attachmentSource: a.attachmentSource || (entityType === 'order' ? 'ORDER' : (entityType === 'invoice' ? 'INVOICE' : null)),
        order_id:   a.order_id || (entityType === 'order' ? entityId : (a.objednavka_id || null)),
        invoice_id: a.invoice_id || (entityType === 'invoice' ? entityId : (a.faktura_id || null)),
        original_name: a.originalni_nazev_souboru || a.original_name || a.nazev_souboru || `Příloha ${a.id}`,
      }));
      attachCacheRef.current[key] = items;
      const badgeColor = calculateBadgeColor(items);
      setBadgeColors(prev => ({ ...prev, [key]: badgeColor }));
      setAttachPopup(prev => prev?.key === key ? { ...prev, items, loading: false, badgeColor } : prev);
    } catch (err) {
      setAttachPopup(prev => prev?.key === key ? { ...prev, loading: false, error: true } : prev);
    }
  }, [attachPopup, token, username, calculateBadgeColor]);

  const handleOpenAttachment = useCallback(async (att, entityType) => {
    const now = Date.now();
    if (now - lastViewerCloseAtRef.current < 300) return;
    const fileName = att.original_name || att.originalni_nazev_souboru || att.nazev_souboru || `priloha_${att.id}`;
    if (!att.id || !token || !username) return;
    try {
      let blob;
      if (att.attachmentSource === 'INVOICE' || (entityType === 'invoice' && att.invoice_id)) {
        if (!att.invoice_id) throw new Error('Chybí ID faktury');
        blob = await downloadInvoiceAttachment(att.invoice_id, att.id, username, token);
      } else {
        const orderId = att.order_id || att.objednavka_id;
        if (!orderId) throw new Error('Chybí ID objednávky');
        blob = await downloadOrderAttachment(orderId, att.id, username, token);
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
      showToast?.(`Chyba při otevírání přílohy: ${err?.message || 'Neznámá chyba'}`, 'error');
    }
  }, [token, username, showToast]);

  const renderAttachBadge = useCallback((entityId, entityType, knownCount, invoiceIds = null, backendColor = null) => {
    const key = `${entityType}_${entityId}`;
    const isOpen = attachPopup?.key === key;
    const count = (knownCount != null && knownCount !== '') ? Number(knownCount) : null;
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
          title={`Přílohy${count != null ? ` (${count})` : ''}`}
        >
          <FontAwesomeIcon icon={faPaperclip} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{count != null ? count : '?'}</span>
        </div>
        {isOpen && ReactDOM.createPortal(
          <AttachPopupContainer data-attach-popup="1" style={{ top: `${attachPopup.popupPos?.top ?? 0}px`, left: `${attachPopup.popupPos?.left ?? 0}px` }}>
            <AttachPopupHeader>
              {attachPopup.loading ? 'Přílohy' : `Přílohy (${attachPopup.items.length})`}
            </AttachPopupHeader>
            {attachPopup.loading ? (
              <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>Načítám...</div>
            ) : attachPopup.error ? (
              <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#ef4444' }}>Chyba při načítání</div>
            ) : attachPopup.items.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Žádné přílohy</div>
            ) : (
              <AttachPopupList>
                {(() => {
                  const orderAttachments = attachPopup.items.filter(a => a.attachmentSource === 'ORDER');
                  const invoiceAttachments = attachPopup.items.filter(a => a.attachmentSource === 'INVOICE');
                  const renderAttachmentItem = (att) => {
                    const name = att.original_name || att.originalni_nazev_souboru || att.nazev_souboru || `Příloha ${att.id}`;
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
                          title="Otevřít náhled"
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
                          <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fef3c7', borderTop: '1px solid #fde047' }}>Faktury ({invoiceAttachments.length})</div>
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

  const columns = useMemo(() => [
    columnHelper.accessor('usek_kod', {
      header: 'Inv. úsek',
      enableSorting: true,
      meta: { style: { maxWidth: '120px', wordBreak: 'break-word', whiteSpace: 'normal' } },
      cell: info => info.getValue() || '',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('budova_kod', {
      header: 'Budova',
      enableSorting: true,
      meta: { style: { maxWidth: '120px', wordBreak: 'break-word', whiteSpace: 'normal' } },
      cell: info => info.getValue() || '',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('mistnost_kod', {
      header: 'Místnost',
      enableSorting: true,
      meta: { style: { maxWidth: '120px', wordBreak: 'break-word', whiteSpace: 'normal' } },
      cell: info => info.getValue() || '',
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('umisteni_majetku', {
      header: 'FA umístění',
      enableSorting: true,
      size: 100,
      meta: { style: { width: '100px', minWidth: '80px', maxWidth: '120px' } },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('rok', {
      header: 'Rok',
      enableSorting: true,
      size: 50,
      meta: { style: { width: '50px', minWidth: '45px', maxWidth: '60px' } },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('dt_objednavky', {
      header: 'Datum obj.',
      enableSorting: true,
      size: 90,
      meta: { style: { width: '90px', minWidth: '80px', maxWidth: '100px' } },
      cell: info => formatDateOnly(info.getValue()),
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('cislo_objednavky', {
      header: 'Ev. číslo / Smlouva',
      enableSorting: true,
      size: 180,
      meta: { style: { width: '180px', minWidth: '170px', whiteSpace: 'nowrap' } },
      cell: info => {
        const row = info.row.original;
        const cislo = info.getValue();
        const smlouva = row.cislo_smlouvy;
        const isInvoice = String(row.id || '').startsWith('F');

        if (isInvoice) {
          // Pro faktury: zobrazit pouze smlouvu nebo prázdné
          const displayValue = smlouva || '';
          return <span style={{ whiteSpace: 'nowrap' }}>{displayValue}</span>;
        }

        // Pro objednávky: zobrazit číslo nebo smlouvu
        const displayValue = cislo || smlouva || '-';
        return (
          <ClickableOrderNumber
            onClick={() => handleEditOrder(row)}
            title="Kliknutím otevřete detail objednávky"
          >
            {displayValue}
          </ClickableOrderNumber>
        );
      },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('dodavatel_nazev', {
      header: 'Dodavatel',
      enableSorting: true,
      size: 130,
      meta: { style: { width: '130px', minWidth: '100px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('predmet', {
      header: 'Předmět',
      enableSorting: true,
      size: 160,
      meta: { style: { width: '160px', minWidth: '140px' }, tdClass: 'td-wrap' },
      cell: info => (
        <span style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
          lineHeight: '1.3',
          whiteSpace: 'normal'
        }} title={info.getValue()}>{info.getValue()}</span>
      ),
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('workflow_last', {
      header: 'Stav',
      enableSorting: true,
      size: 120,
      meta: { style: { width: '120px', minWidth: '100px', maxWidth: '140px' } },
      cell: info => {
        const row = info.row.original;
        const stav = info.getValue();
        const isInvoice = String(row.id || '').startsWith('F');
        
        // Pro samostatné faktury zobrazit jen "-"
        if (isInvoice) {
          return '-';
        }
        
        // Pro objednávky: stav + " / Faktura" pokud má fakturu
        const hasFaktura = Number(row.pocet_faktur || 0) > 0;
        return hasFaktura ? `${stav} / Faktura` : stav;
      },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('druh_objednavky_nazev', {
      header: 'Druh obj. / FA VS',
      enableSorting: true,
      size: 160,
      meta: { style: { width: '160px', minWidth: '150px', whiteSpace: 'nowrap' } },
      cell: info => {
        const row = info.row.original;
        const nazev = info.getValue();
        const isInvoice = String(row.id || '').startsWith('F');
        
        if (isInvoice) {
          // Pro faktury: zobrazit "Faktura VS:" + číslo faktury
          const faCislo = row.fa_cislo_vema || '';
          return <span style={{ whiteSpace: 'nowrap' }}>Faktura VS: {faCislo}</span>;
        }
        
        // Pro objednávky: zobrazit druh + MAJ badge
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {nazev || '-'}
            <sup style={{ 
              fontSize: '0.7em', 
              fontWeight: '700', 
              marginLeft: '4px',
              color: '#1e40af',
              backgroundColor: '#dbeafe',
              padding: '2px 4px',
              borderRadius: '3px'
            }}>MAJ</sup>
          </span>
        );
      },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('usek_zkr', {
      header: 'Úsek',
      enableSorting: true,
      size: 55,
      meta: { style: { width: '55px', minWidth: '45px', maxWidth: '65px' } },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.display({
      id: 'objednatel_schvalovatel',
      header: 'Objednatel / Schválil',
      enableSorting: false,
      size: 130,
      meta: { style: { width: '130px', minWidth: '110px' }, tdClass: 'td-wrap' },
      cell: info => {
        if (info.row.getIsGrouped()) return null;
        const row = info.row.original;
        const isInvoice = row.source_type === 'INVOICE';
        const line1 = row.objednatel_zkr || '';
        const line2 = row.schvalovatel_zkr || '';
        if (!line1 && !line2) return null;
        return (
          <div style={{ lineHeight: '1.3', fontSize: '0.8rem' }}>
            {line1 && <div style={{ color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={isInvoice ? 'Přidal fakturu' : 'Objednatel'}>{line1}</div>}
            {line2 && <div style={{ color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={isInvoice ? 'Věcná správnost' : 'Schvalovatel (příkazce)'}>{line2}</div>}
          </div>
        );
      }
    }),
    columnHelper.accessor('objednatel_zkr', {
      header: 'Objednatel',
      enableSorting: true,
      size: 120,
      meta: { style: { width: '120px', minWidth: '100px', maxWidth: '150px' } },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('schvalovatel_zkr', {
      header: 'Schvalovatel',
      enableSorting: true,
      size: 120,
      meta: { style: { width: '120px', minWidth: '100px', maxWidth: '150px' } },
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor('strediska_nazvy', {
      header: 'Střediska',
      enableSorting: true,
      size: 150,
      meta: { style: { width: '150px', minWidth: '140px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35' } },
      cell: info => (
        <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35', display: 'block' }}>
          {info.getValue() || ''}
        </span>
      ),
      aggregationFn: () => null,
      aggregatedCell: () => ''
    }),
    columnHelper.accessor(row => Number(row.max_cena_s_dph || 0), {
      id: 'max_cena_s_dph',
      header: 'Max cena s DPH',
      enableSorting: true,
      size: 110,
      meta: { style: { width: '110px', minWidth: '90px', maxWidth: '120px', textAlign: 'right' } },
      cell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      aggregationFn: 'sum',
      aggregatedCell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      )
    }),
    columnHelper.accessor(row => Number(row.polozky_celkova_cena_s_dph || 0), {
      id: 'polozky_celkova_cena_s_dph',
      header: 'POL částka',
      enableSorting: true,
      size: 100,
      meta: { style: { width: '100px', minWidth: '85px', maxWidth: '115px', textAlign: 'right' } },
      cell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      aggregationFn: 'sum',
      aggregatedCell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      )
    }),
    columnHelper.accessor(row => Number(row.faktury_celkova_castka_s_dph || 0), {
      id: 'faktury_celkova_castka_s_dph',
      header: 'FA částka',
      enableSorting: true,
      size: 100,
      meta: { style: { width: '100px', minWidth: '85px', maxWidth: '115px', textAlign: 'right' } },
      cell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      aggregationFn: 'sum',
      aggregatedCell: info => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {formatCurrency(info.getValue())}
        </span>
      )
    }),
    columnHelper.display({
      id: 'prilohy',
      header: 'Přílohy',
      enableSorting: false,
      size: 72,
      meta: { style: { width: '72px', minWidth: '60px', maxWidth: '80px', textAlign: 'center', verticalAlign: 'middle' } },
      cell: info => {
        if (info.row.getIsGrouped()) return null;
        const row = info.row.original;
        const count = Number(row.pocet_priloh ?? 0);
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{renderAttachBadge(row.id, 'order-combined', count, null, row.attachment_color || null)}</div>;
      }
    })
  ], [columnHelper, handleEditOrder, renderAttachBadge]);

  const table = useReactTable({
    data: pagedTableData,
    columns,
    state: {
      grouping: groupFields,
      expanded,
      sorting,
      columnVisibility: {
        objednatel_zkr: groupFields.includes('objednatel_zkr'),
        schvalovatel_zkr: groupFields.includes('schvalovatel_zkr')
      }
    },
    autoResetPageIndex: false,
    onGroupingChange: setGroupFields,
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableGrouping: true,
    enableSorting: true
  });

  const chartInfo = useMemo(() => {
    const primaryField = groupFields[0];
    if (!primaryField) return null;
    const secondaryField = groupFields[1] || null;
    const buckets = new Map();

    const getValue = (row, field) => {
      if (!field) return 'Celkem';
      const raw = row?.[field];
      if (Array.isArray(raw)) return raw.length ? raw.join(', ') : 'Neurčeno';
      return raw ? String(raw) : 'Neurčeno';
    };

    aggregationData.forEach(row => {
      const primary = getValue(row, primaryField);
      const secondary = secondaryField ? getValue(row, secondaryField) : 'Celkem';
      if (!buckets.has(primary)) buckets.set(primary, new Map());
      const inner = buckets.get(primary);
      if (!inner.has(secondary)) inner.set(secondary, { items: 0, invoices: 0 });
      const entry = inner.get(secondary);
      entry.items += 1;
      entry.invoices += Number(row?.faktury_celkova_castka_s_dph || 0);
    });

    const primaryTotals = Array.from(buckets.entries()).map(([label, inner]) => {
      let total = 0;
      inner.forEach(value => { total += value.items; });
      return { label, total };
    });
    const sortedPrimaries = primaryTotals.sort((a, b) => b.total - a.total).slice(0, 10);
    const labels = sortedPrimaries.map(entry => entry.label);

    const secondaryTotals = new Map();
    buckets.forEach(inner => {
      inner.forEach((value, key) => {
        secondaryTotals.set(key, (secondaryTotals.get(key) || 0) + value.invoices);
      });
    });
    const sortedSecondary = Array.from(secondaryTotals.entries())
      .sort((a, b) => b[1] - a[1]);
    const topLimit = 10;
    const topSecondary = sortedSecondary.slice(0, topLimit).map(entry => entry[0]);
    const hasOther = sortedSecondary.length > topLimit;

    if (hasOther) {
      buckets.forEach(inner => {
        let otherItems = 0;
        let otherInvoices = 0;
        Array.from(inner.keys()).forEach(key => {
          if (!topSecondary.includes(key)) {
            const entry = inner.get(key);
            otherItems += entry?.items || 0;
            otherInvoices += entry?.invoices || 0;
            inner.delete(key);
          }
        });
        if (otherItems > 0 || otherInvoices > 0) {
          inner.set('Ostatní', { items: otherItems, invoices: otherInvoices });
        }
      });
    }

    const secondaryLabels = new Set();
    sortedPrimaries.forEach(entry => {
      const inner = buckets.get(entry.label);
      inner?.forEach((_, key) => secondaryLabels.add(key));
    });

    return {
      labels,
      secondaryLabels: Array.from(secondaryLabels),
      buckets
    };
  }, [aggregationData, groupFields]);

  const chartPalette = [
    'rgba(59, 130, 246, 0.65)',
    'rgba(14, 116, 144, 0.65)',
    'rgba(99, 102, 241, 0.65)',
    'rgba(16, 185, 129, 0.65)',
    'rgba(245, 158, 11, 0.65)',
    'rgba(239, 68, 68, 0.65)',
    'rgba(124, 58, 237, 0.65)',
    'rgba(2, 132, 199, 0.65)'
  ];

  const buildInvoiceDatasets = useCallback(() => {
    if (!chartInfo) return [];
    return chartInfo.secondaryLabels.map((secondary, index) => {
      const data = chartInfo.labels.map(label => {
        const inner = chartInfo.buckets.get(label);
        const entry = inner?.get(secondary);
        return entry?.invoices || 0;
      });
      const itemsData = chartInfo.labels.map(label => {
        const inner = chartInfo.buckets.get(label);
        const entry = inner?.get(secondary);
        return entry?.items || 0;
      });
      const color = chartPalette[index % chartPalette.length];
      return {
        label: secondary,
        data,
        itemsData,
        backgroundColor: color,
        borderColor: color.replace('0.65', '1'),
        borderWidth: 1,
        borderRadius: 6,
        stack: 'invoices'
      };
    });
  }, [chartInfo, chartPalette]);

  const chartData = useMemo(() => {
    if (!chartInfo) return null;
    return {
      labels: chartInfo.labels,
      datasets: buildInvoiceDatasets()
    };
  }, [chartInfo, buildInvoiceDatasets]);

  const hasMultipleStacks = (chartInfo?.secondaryLabels?.length || 0) > 1;

  const stackedOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', display: hasMultipleStacks },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const value = context.parsed?.y || 0;
            const items = context.dataset?.itemsData?.[context.dataIndex] || 0;
            return `${context.dataset.label}: ${items} ks, ${formatCurrency(value)}`;
          }
        }
      },
      datalabels: {
        color: '#ffffff',
        anchor: 'center',
        align: 'center',
        clamp: true,
        display: (context) => {
          const items = context.dataset?.itemsData?.[context.dataIndex];
          return Number(items) > 0;
        },
        formatter: (value, context) => {
          const items = context.dataset?.itemsData?.[context.dataIndex];
          return items ? `${items}` : '';
        },
        font: {
          size: 11,
          weight: '700'
        }
      }
    },
    scales: {
      x: { stacked: hasMultipleStacks, ticks: { color: '#1e293b', maxRotation: 30, minRotation: 0 } },
      y: {
        stacked: hasMultipleStacks,
        ticks: {
          color: '#1e293b',
          precision: 0,
          beginAtZero: true,
          callback: (value) => formatCurrency(value)
        }
      }
    }
  }), [hasMultipleStacks]);

  const totalItems = tableData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pagination.per_page)));

  const normalizeGroupLabel = useCallback((value) => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Neurčeno';
    if (value == null || value === '') return 'Neurčeno';
    return String(value);
  }, []);

  const getGroupedCount = useCallback((row) => {
    if (!chartInfo || !groupFields.length) return row.subRows.length;

    if (row.depth === 0 && groupFields[0]) {
      const label = normalizeGroupLabel(row.getValue(groupFields[0]));
      const inner = chartInfo.buckets.get(label);
      if (!inner) return row.subRows.length;
      let total = 0;
      inner.forEach(value => { total += value.items; });
      return total;
    }

    if (row.depth === 1 && groupFields[0] && groupFields[1]) {
      const parent = row.getParentRow?.();
      const primaryLabel = normalizeGroupLabel(parent?.getValue(groupFields[0]));
      const secondaryLabel = normalizeGroupLabel(row.getValue(groupFields[1]));
      const inner = chartInfo.buckets.get(primaryLabel);
      const entry = inner?.get(secondaryLabel);
      if (entry) return entry.items;
    }

    return row.subRows.length;
  }, [chartInfo, groupFields, normalizeGroupLabel]);

  useEffect(() => {
    if (pagination.page > totalPages) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [pagination.page, totalPages]);

  const handlePageChange = useCallback((nextPage) => {
    setPagination(prev => ({ ...prev, page: nextPage }));
  }, []);

  return (
    <PageWrapper>
      <PageContainer>
        <Header>
          <TitleSection>
            <Title>
              Přehled majetku
              <FontAwesomeIcon icon={faList} />
            </Title>
          </TitleSection>

          <HeaderActions>
            <PeriodWrapper>
              <PeriodLabel>
                <FontAwesomeIcon icon={faCalendarAlt} />
                Období:
              </PeriodLabel>
              <PeriodSelector value={period} onChange={(e) => setPeriod(e.target.value)} disabled={loading}>
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </PeriodSelector>
            </PeriodWrapper>
            <ReloadButton
              onClick={() => fetchData(1)}
              disabled={loading}
              $loading={loading}
              title="Obnovit data"
              aria-label="Obnovit data"
            >
              <FontAwesomeIcon icon={faSync} />
            </ReloadButton>
          </HeaderActions>
        </Header>

        <Card>
          <AggregationPanel>
            <FiltersAndAggregation>
              <AggregationLeft>
                <AggregationBox onDragOver={(e) => e.preventDefault()} onDrop={handleDropGroup}>
                  <AggregationTitle>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FontAwesomeIcon icon={faLayerGroup} /> Agregace (grouping)
                    </span>
                    <AggregationActions>
                      <ActionButton
                        type="button"
                        onClick={() => setGroupFields([])}
                        disabled={groupFields.length === 0}
                        title="Odebrat všechny agregace"
                      >
                        Zrušit vše
                      </ActionButton>
                      <ActionButton
                        type="button"
                        onClick={() => setGroupFields(groupOptions.map(opt => opt.columnId))}
                        disabled={groupFields.length === groupOptions.length}
                        title="Přidat všechna pole do agregace"
                      >
                        Přidat vše
                      </ActionButton>
                    </AggregationActions>
                  </AggregationTitle>
                  {groupFields.length === 0 && (
                    <PlaceholderText>Sem přetáhni pole pro agregaci.</PlaceholderText>
                  )}
                  {groupFields.length > 0 && (
                    <ChipsWrap>
                      {groupFields.map((fieldId, index) => {
                        const meta = groupOptions.find(opt => opt.columnId === fieldId);
                        return (
                          <Chip
                            key={fieldId}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', fieldId);
                              e.dataTransfer.setData('from-index', String(index));
                            }}
                            onDrop={(e) => {
                              const fromIndex = Number(e.dataTransfer.getData('from-index'));
                              if (!Number.isInteger(fromIndex)) return;
                              handleReorderGroup(fromIndex, index);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                          >
                            <FontAwesomeIcon icon={faGripVertical} />
                            {meta?.label || fieldId}
                            <ChipIndex>{index + 1}</ChipIndex>
                            <ChipButton onClick={() => setGroupFields(prev => prev.filter(id => id !== fieldId))}>
                              <FontAwesomeIcon icon={faXmark} />
                            </ChipButton>
                          </Chip>
                        );
                      })}
                    </ChipsWrap>
                  )}
                </AggregationBox>
                <AggregationBox>
                  <AggregationTitle>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FontAwesomeIcon icon={faLayerGroup} /> Připravená pole
                    </span>
                  </AggregationTitle>
                  <ChipsWrap>
                    {availableGroupOptions.map(option => (
                      <Chip
                        key={option.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', option.id)}
                      >
                        <FontAwesomeIcon icon={faGripVertical} />
                        {option.label}
                      </Chip>
                    ))}
                  </ChipsWrap>
                </AggregationBox>
              </AggregationLeft>
              <SummaryRow>
                <SummaryCard>
                  <SummaryLabel>Celkem objednávek</SummaryLabel>
                  <SummaryValue>{summary.totalOrders}</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Objednávky s fakturou</SummaryLabel>
                  <SummaryValue>{summary.ordersWithInvoices}</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Faktury celkem (s DPH)</SummaryLabel>
                  <SummaryValue>{formatCurrency(summary.totalInvoices)}</SummaryValue>
                </SummaryCard>
              </SummaryRow>
              <FilterPanel>
                <FilterHeader>
                  <FilterTitle>
                    <FontAwesomeIcon icon={faFilter} /> Filtry
                  </FilterTitle>
                </FilterHeader>

                <FilterGrid>
                  <FilterItem>
                    <FilterLabel>Hledání</FilterLabel>
                    <SearchField>
                      <FontAwesomeIcon icon={faSearch} />
                      <SearchInput
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        placeholder="Hledat v tabulce"
                      />
                    </SearchField>
                  </FilterItem>
                  <FilterItem>
                    <FilterLabel>Přítomnost faktury</FilterLabel>
                    <CheckboxGroup>
                      <CheckboxLabel>
                        <input
                          type="checkbox"
                          checked={invoiceFilter.withInvoice}
                          onChange={(e) => handleInvoiceFilterChange('withInvoice', e.target.checked)}
                        />
                        S fakturou
                      </CheckboxLabel>
                      <CheckboxLabel>
                        <input
                          type="checkbox"
                          checked={invoiceFilter.withoutInvoice}
                          onChange={(e) => handleInvoiceFilterChange('withoutInvoice', e.target.checked)}
                        />
                        Bez faktury
                      </CheckboxLabel>
                    </CheckboxGroup>
                  </FilterItem>
                </FilterGrid>
              </FilterPanel>
            </FiltersAndAggregation>
            <AggregationChartPanel>
              <AggregationTitle>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FontAwesomeIcon icon={faChartBar} /> Agregační graf
                </span>
              </AggregationTitle>
              {chartData ? (
                <ChartContainer>
                  <Bar data={chartData} options={stackedOptions} />
                </ChartContainer>
              ) : (
                <ChartPlaceholder>Zapni grouping pro graf</ChartPlaceholder>
              )}
            </AggregationChartPanel>
          </AggregationPanel>

          {error && (
            <PlaceholderBox>
              <PlaceholderTitle>Chyba načtení</PlaceholderTitle>
              <PlaceholderText>{error}</PlaceholderText>
            </PlaceholderBox>
          )}

          {!error && (
            <>
              <TableWrapper>
                <Table>
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                            style={{
                              cursor: header.column.getCanSort() ? 'pointer' : 'default',
                              whiteSpace: 'nowrap',
                              width: header.column.columnDef.meta?.style?.width,
                              minWidth: header.column.columnDef.meta?.style?.minWidth,
                              textAlign: header.column.columnDef.meta?.style?.textAlign,
                            }}
                          >
                            {header.isPlaceholder ? null : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: header.column.columnDef.meta?.style?.textAlign === 'center' ? 'center' : header.column.columnDef.meta?.style?.textAlign === 'right' ? 'flex-end' : undefined }}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanSort() && (() => {
                                  const sortDir = header.column.getIsSorted();
                                  return (
                                    <span style={{ marginLeft: '0.2rem', fontSize: '0.65rem', opacity: sortDir ? 1 : 0.3, color: sortDir ? '#2563eb' : 'inherit' }}>
                                      {!sortDir ? '⇅' : sortDir === 'asc' ? '↑' : '↓'}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={columns.length}>
                          <EmptyState>Načítám data…</EmptyState>
                        </td>
                      </tr>
                    )}
                    {!loading && table.getRowModel().rows.length === 0 && (
                      <tr>
                        <td colSpan={columns.length}>
                          <EmptyState>Žádné záznamy pro zvolený filtr.</EmptyState>
                        </td>
                      </tr>
                    )}
                    {!loading && table.getRowModel().rows.map(row => (
                      <tr
                        key={row.id}
                        className={row.getIsGrouped()
                          ? `group-row group-depth-${row.depth}`
                          : row.depth > 0
                            ? 'child-row'
                            : 'base-row'
                        }
                      >
                        {(() => {
                          const visibleCells = row.getVisibleCells();
                          const hasVisibleGrouped = row.getIsGrouped() && visibleCells.some(c => c.getIsGrouped());
                          return visibleCells.map((cell, cellIndex) => {
                            if (row.getIsGrouped()) {
                              // Viditelný grupovací sloupec (Dodavatel, Střediska, Rok, ...): TanStack ho přesunul na správnou pozici
                              if (cell.getIsGrouped()) {
                                return (
                                  <td key={cell.id} style={cell.column.columnDef.meta?.style || {}}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: `${row.depth * 12}px`, whiteSpace: 'nowrap' }}>
                                      <button
                                        onClick={row.getToggleExpandedHandler()}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                      >
                                        <FontAwesomeIcon icon={row.getIsExpanded() ? faMinus : faPlus} />
                                      </button>
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())} ({getGroupedCount(row)})
                                    </span>
                                  </td>
                                );
                              }
                              // Skrytý grupovací sloupec (objednatel_zkr, schvalovatel_zkr): žádná viditelná buňka nemá getIsGrouped()=true
                              // → fallback: expander zobrazit v první viditelné buňce
                              if (!hasVisibleGrouped && cellIndex === 0) {
                                return (
                                  <td key={cell.id} style={cell.column.columnDef.meta?.style || {}}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: `${row.depth * 12}px`, whiteSpace: 'nowrap' }}>
                                      <button
                                        onClick={row.getToggleExpandedHandler()}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                      >
                                        <FontAwesomeIcon icon={row.getIsExpanded() ? faMinus : faPlus} />
                                      </button>
                                      {String(row.groupingValue ?? '(neuvedeno)')} ({getGroupedCount(row)})
                                    </span>
                                  </td>
                                );
                              }
                              // Agregovaná data (součty cen)
                              if (cell.getIsAggregated()) {
                                return (
                                  <td key={cell.id} style={cell.column.columnDef.meta?.style || {}}>
                                    {flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                );
                              }
                              // Placeholder nebo ostatní buňky skupinového řádku: prázdné
                              return <td key={cell.id} style={cell.column.columnDef.meta?.style || {}} />;
                            }
                            // Normální datový řádek
                            return (
                              <td key={cell.id} style={cell.column.columnDef.meta?.style || {}} className={cell.column.columnDef.meta?.tdClass || undefined}>
                                {cell.getIsPlaceholder() ? null : flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          });
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>

              {totalItems > 0 && (
                <OrdersPaginationV3
                  currentPage={pagination.page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={pagination.per_page}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  loading={loading}
                />
              )}

            </>
          )}
        </Card>
      </PageContainer>

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
    </PageWrapper>
  );
}
