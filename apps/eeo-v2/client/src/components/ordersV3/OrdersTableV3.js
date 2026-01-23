/**
 * OrdersTableV3.js
 * 
 * Základní tabulka pro Orders V3 s TanStack Table
 * Sloupce přesně jako v původním Orders25List.js
 * 
 * Optimalizováno pro širokoúhlé monitory s horizontal scrollem
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMinus,
  faCheckCircle,
  faHourglassHalf,
  faTimesCircle,
  faShield,
  faFileContract,
  faClock,
  faFilePen,
  faCircleNotch,
  faTruck,
  faXmark,
  faEdit,
  faFileInvoice,
  faFileWord,
  faBolt,
  faBoltLightning,
  faGripVertical,
  faEyeSlash,
  faTimes,
  faUndo,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);

  /* Optimalizace pro širokoúhlé monitory */
  @media (min-width: 1920px) {
    font-size: 0.95rem;
  }

  @media (min-width: 2560px) {
    font-size: 1rem;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  table-layout: auto; /* Dynamická šířka sloupců */
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
`;

const TableHead = styled.thead`
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 0.5rem;
  text-align: ${props => props.$align || 'left'};
  font-weight: 600;
  color: #334155;
  border-bottom: 2px solid #cbd5e1;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  transition: background-color 0.2s ease;
  position: relative;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background-color: ${props => props.$sortable ? '#e2e8f0' : 'transparent'};
    
    .column-actions {
      opacity: 1;
    }
  }

  /* Drag & Drop styling */
  &[data-dragging="true"] {
    opacity: 0.5;
    background-color: #dbeafe;
  }

  &[data-drag-over="true"] {
    border-left: 3px solid #3b82f6;
  }

  /* Resize handle */
  .resize-handle {
    position: absolute;
    right: -8px;
    top: 0;
    height: 100%;
    width: 16px;
    cursor: col-resize;
    user-select: none;
    touch-action: none;
    background: transparent;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &::before {
      content: '';
      width: 3px;
      height: 60%;
      background: transparent;
      border-radius: 2px;
      transition: background 0.15s ease;
    }
    
    &:hover::before {
      background: #3b82f6;
    }
    
    &:active::before {
      background: #2563eb;
      width: 4px;
    }
  }

  /* Šířky sloupců */
  width: ${props => {
    if (props.$width) return props.$width;
    return 'auto';
  }};
`;

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  align-items: ${props => {
    if (props.$align === 'center') return 'center';
    if (props.$align === 'right') return 'flex-end';
    return 'flex-start';
  }};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${props => {
    if (props.$align === 'center') return 'center';
    if (props.$align === 'right') return 'flex-end';
    return 'space-between';
  }};
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
`;

const HeaderTextWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`;

const HeaderText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
`;

const SortIndexBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: ${props => props.$asc ? '#3b82f6' : '#ef4444'};
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 9px;
  margin-left: 4px;
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 4px 6px;
  font-size: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  transition: all 0.15s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const TableToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  gap: 1rem;
`;

const ToolbarInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #64748b;
`;

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #94a3b8;
    color: #1e293b;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 0.875rem;
  }
`;

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #3b82f6;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
  margin-left: 4px;
`;

const ColumnActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
`;

const ColumnActionButton = styled.button`
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-size: 0.85rem;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  &.hide-column:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  &.drag-handle {
    cursor: grab;
    
    &:active {
      cursor: grabbing;
    }
  }
`;

const TableBody = styled.tbody`
  /* Základní styling */
  tr {
    transition: background-color 0.15s ease;
  }

  tr:hover {
    filter: brightness(0.95);
  }
  
  /* Podřádek styling */
  tr.subrow {
    background-color: #fef3c7 !important;
    
    td {
      padding: 0;
    }
  }
`;

const TableCell = styled.td`
  padding: 0.65rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: ${props => props.$align || 'left'};
  vertical-align: middle;
  color: #1e293b;
  font-size: 0.875rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const ExpandButton = styled.button`
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #475569;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    const colors = {
      NOVA: 'rgba(219, 234, 254, 0.4)',
      KE_SCHVALENI: 'rgba(254, 226, 226, 0.4)',
      SCHVALENA: 'rgba(254, 215, 170, 0.4)',
      ZAMITNUTA: 'rgba(229, 231, 235, 0.4)',
      ROZPRACOVANA: 'rgba(254, 243, 199, 0.4)',
      ODESLANA: 'rgba(224, 231, 255, 0.4)',
      POTVRZENA: 'rgba(221, 214, 254, 0.4)',
      K_UVEREJNENI_DO_REGISTRU: 'rgba(204, 251, 241, 0.4)',
      UVEREJNENA: 'rgba(209, 250, 229, 0.4)',
      DOKONCENA: 'rgba(209, 250, 229, 0.4)',
      ZRUSENA: 'rgba(254, 202, 202, 0.4)',
      CANCELLED: 'rgba(254, 202, 202, 0.4)',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || 'rgba(241, 245, 249, 0.4)';
  }};
  color: ${props => {
    const colors = {
      NOVA: '#1e40af',
      KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZRUSENA: '#dc2626',
      CANCELLED: '#dc2626',
      EMPTY: '#64748b',
    };
    return colors[props.$status] || '#64748b';
  }};
  border: 1.5px solid ${props => {
    const colors = {
      NOVA: '#1e40af',
      KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZRUSENA: '#dc2626',
      CANCELLED: '#dc2626',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || '#94a3b8';
  }};
`;

const ActionMenu = styled.div`
  display: flex;
  gap: 0.35rem;
  justify-content: center;
  align-items: center;
`;

const ActionMenuButton = styled.button`
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #475569;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.edit:hover:not(:disabled) {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1e40af;
  }

  &.create-invoice:hover:not(:disabled) {
    background: #d1fae5;
    border-color: #10b981;
    color: #065f46;
  }

  &.export-document:hover:not(:disabled) {
    background: #fef3c7;
    border-color: #f59e0b;
    color: #92400e;
  }

  &.delete:hover:not(:disabled) {
    background: #fee2e2;
    border-color: #ef4444;
    color: #dc2626;
  }
`;

const SubRowContainer = styled.div`
  padding: 1rem;
  background-color: #fffbeb;
  border-left: 3px solid #fbbf24;
  line-height: 1.5;
  
  h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    color: #92400e;
    font-weight: 600;
  }
  
  .sub-row-section {
    margin-bottom: 1rem;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .sub-row-label {
    font-weight: 600;
    color: #78350f;
    margin-right: 0.5rem;
  }
  
  .sub-row-value {
    color: #451a03;
  }
  
  .sub-row-list {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0 0;
    
    li {
      padding: 0.35rem 0;
      border-bottom: 1px solid #fde68a;
      
      &:last-child {
        border-bottom: none;
      }
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
  font-size: 1rem;
`;

const EmptyStateRow = styled.tr`
  td {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
    font-size: 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.3;
  }
  
  .empty-message {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .empty-hint {
    font-size: 0.9rem;
    color: #9ca3af;
  }
`;

const ErrorRow = styled.tr`
  td {
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #ef4444;
    opacity: 0.8;
  }
  
  .error-message {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #dc2626;
  }
  
  .error-detail {
    font-size: 0.9rem;
    color: #64748b;
    margin-top: 0.5rem;
    background: #fef2f2;
    padding: 0.75rem;
    border-radius: 6px;
    display: inline-block;
    max-width: 600px;
    word-break: break-word;
  }
`;


const LoadingRow = styled.tr`
  td {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
    font-size: 1rem;
  }
  
  .loading-spinner {
    font-size: 2rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;


/**
 * Renderuje podřádek s detaily objednávky
 */
const SubRowDetail = ({ order }) => {
  return (
    <SubRowContainer>
      <h4>Detail objednávky #{order.id}</h4>
      
      <div className="sub-row-section">
        <span className="sub-row-label">Předmět:</span>
        <span className="sub-row-value">{order.predmet || '---'}</span>
      </div>
      
      {order.poznamka && (
        <div className="sub-row-section">
          <span className="sub-row-label">Poznámka:</span>
          <span className="sub-row-value">{order.poznamka}</span>
        </div>
      )}
      
      {order.polozky && order.polozky.length > 0 && (
        <div className="sub-row-section">
          <span className="sub-row-label">Položky ({order.polozky.length}):</span>
          <ul className="sub-row-list">
            {order.polozky.slice(0, 5).map((item, idx) => (
              <li key={idx}>
                <span style={{ fontWeight: 500 }}>{item.nazev || item.popis || 'Položka'}</span>
                {item.mnozstvi && <span> - {item.mnozstvi} {item.jednotka || 'ks'}</span>}
                {item.cena_s_dph && (
                  <span style={{ float: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                    {parseFloat(item.cena_s_dph).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                  </span>
                )}
              </li>
            ))}
            {order.polozky.length > 5 && (
              <li style={{ fontStyle: 'italic', color: '#92400e' }}>
                ... a dalších {order.polozky.length - 5} položek
              </li>
            )}
          </ul>
        </div>
      )}
      
      {order.prilohy && order.prilohy.length > 0 && (
        <div className="sub-row-section">
          <span className="sub-row-label">Přílohy:</span>
          <span className="sub-row-value">{order.prilohy.length} souborů</span>
        </div>
      )}
    </SubRowContainer>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Získá zobrazovací stav objednávky - používá DB sloupec 'stav_objednavky' (čitelný český název)
 */
const getOrderDisplayStatus = (order) => {
  // Backend vrací sloupec 'stav_objednavky' který už obsahuje čitelný český název
  // např. "Nová", "Ke schválení", "Schválená", "Dokončená", "Fakturace", atd.
  return order.stav_objednavky || '---';
};

/**
 * Mapuje čitelný stav na systémový kód pro barvy a ikony
 */
const mapUserStatusToSystemCode = (userStatus) => {
  // Kontrola na začátek textu pro různé varianty
  if (userStatus && typeof userStatus === 'string') {
    if (userStatus.startsWith('Zamítnut')) return 'ZAMITNUTA';
    if (userStatus.startsWith('Schválen')) return 'SCHVALENA';
    if (userStatus.startsWith('Dokončen')) return 'DOKONCENA';
    if (userStatus.startsWith('Zrušen')) return 'ZRUSENA';
    if (userStatus.startsWith('Archivován')) return 'ARCHIVOVANO';
  }
  
  const mapping = {
    'Ke schválení': 'ODESLANA_KE_SCHVALENI',
    'Nová': 'NOVA',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Má být zveřejněna': 'K_UVEREJNENI_DO_REGISTRU',
    'Uveřejněná': 'UVEREJNENA',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Čeká se': 'CEKA_SE',
    'Fakturace': 'FAKTURACE',
    'Věcná správnost': 'VECNA_SPRAVNOST',
    'Zkontrolována': 'ZKONTROLOVANA',
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA',
  };
  return mapping[userStatus] || 'DEFAULT';
};

/**
 * Formátuje financování podle OrderV2 logiky
 * Vrací název typu financování (zkrácený)
 */
const getFinancovaniText = (order) => {
  // Backend vrací financovani jako objekt (už parsované)
  if (order.financovani && typeof order.financovani === 'object' && !Array.isArray(order.financovani)) {
    const fullText = order.financovani.typ_nazev || order.financovani.typ || '---';
    
    // Zkrátit víceoslovné názvy: "Limitovaný příslib" -> "Limitovaný p."
    if (fullText !== '---') {
      const words = fullText.trim().split(/\s+/);
      if (words.length > 1) {
        // První slovo celé + první písmeno dalších slov s tečkou
        return words[0] + ' ' + words.slice(1).map(w => w.charAt(0) + '.').join(' ');
      }
    }
    
    return fullText;
  }
  return '---';
};

/**
 * Získá detail financování (LP kódy, číslo smlouvy, ID individuálního schválení, atd.)
 */
const getFinancovaniDetail = (order) => {
  // Backend vrací financovani jako objekt (už parsované)
  if (!order.financovani || typeof order.financovani !== 'object' || Array.isArray(order.financovani)) {
    return '';
  }
  
  const typ = order.financovani.typ || '';
  
  // LP - zobrazit jen LP kód (bez názvu/popisu)
  if (typ === 'LP') {
    // Priorita 1: lp_nazvy array s kompletními daty - zobrazit jen kód
    if (order.financovani.lp_nazvy && Array.isArray(order.financovani.lp_nazvy) && order.financovani.lp_nazvy.length > 0) {
      const lpKody = order.financovani.lp_nazvy
        .map(lp => lp.cislo_lp || lp.kod || '')
        .filter(Boolean);
      
      if (lpKody.length > 0) {
        return lpKody.join(', ');
      }
    }
    // Fallback: lp_kody array (jen kódy bez názvů)
    else if (order.financovani.lp_kody && Array.isArray(order.financovani.lp_kody) && order.financovani.lp_kody.length > 0) {
      return order.financovani.lp_kody.join(', ');
    }
  }
  // Smlouva - zobrazit číslo smlouvy
  else if (typ === 'SMLOUVA') {
    return order.financovani.cislo_smlouvy || '';
  }
  // Individuální schválení - zobrazit ID individuálního schválení
  else if (typ === 'INDIVIDUALNI_SCHVALENI') {
    return order.financovani.individualni_schvaleni || '';
  }
  
  return '';
};

/**
 * Získá systémový status kód - DB sloupec 1:1
 */
const getOrderSystemStatus = (order) => {
  // Backend vrací stav_workflow_kod jako array (už parsované): ["NOVA", "KE_SCHVALENI", ...]
  if (order.stav_workflow_kod) {
    // Pokud je to array, použít přímo
    if (Array.isArray(order.stav_workflow_kod) && order.stav_workflow_kod.length > 0) {
      // Vrátit poslední stav z pole
      return order.stav_workflow_kod[order.stav_workflow_kod.length - 1];
    }
    
    // Fallback pro starý formát (JSON string) - pro zpětnou kompatibilitu
    if (typeof order.stav_workflow_kod === 'string') {
      try {
        const stavy = JSON.parse(order.stav_workflow_kod);
        if (Array.isArray(stavy) && stavy.length > 0) {
          return stavy[stavy.length - 1];
        }
      } catch (err) {
        console.warn('Failed to parse stav_workflow_kod:', err);
      }
    }
  }

  return 'NOVA';
};

/**
 * Formátuje datum
 */
const formatDateOnly = (date) => {
  if (!date) return '---';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('cs-CZ');
};

/**
 * Získá celkovou cenu s DPH - DB sloupec 1:1
 */
const getOrderTotalPriceWithDPH = (order) => {
  // Backend vrací cena_s_dph přímo z DB
  if (order.cena_s_dph != null && order.cena_s_dph !== '') {
    const value = parseFloat(order.cena_s_dph);
    if (!isNaN(value)) return value;
  }
  
  return 0;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OrdersTableV3 - Základní tabulka s TanStack Table
 * 
 * @param {Array} data - Pole objednávek
 * @param {Array} columns - Konfigurace sloupců
 * @param {Object} sorting - Aktuální třídění
 * @param {Function} onSortingChange - Handler pro změnu třídění
 * @param {boolean} isLoading - Stav načítání
 * @param {Object} error - Error objekt pokud došlo k chybě
 */
const OrdersTableV3 = ({
  data = [],
  visibleColumns = [], // pole ID sloupců k zobrazení
  columnOrder = [], // pořadí sloupců
  sorting = [],
  onSortingChange,
  onRowExpand,
  onActionClick,
  onColumnVisibilityChange,
  onColumnReorder,
  userId, // Přidáno pro localStorage per user
  isLoading = false,
  error = null,
  canEdit = () => true,
  canCreateInvoice = () => true,
  canExportDocument = () => true,
  canDelete = () => false,
  canHardDelete = () => false,
  showRowColoring = false, // Podbarvení řádků podle stavu
  getRowBackgroundColor = null, // Funkce pro získání barvy pozadí
}) => {
  // State pro expandované řádky
  const [expandedRows, setExpandedRows] = useState({});
  
  // State pro column filters (lokální filtrace v tabulce)
  const [columnFilters, setColumnFilters] = useState({});
  
  // State pro drag & drop
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // State pro resizing - načíst z localStorage (per user)
  const [columnSizing, setColumnSizing] = useState(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`ordersV3_columnSizing_${userId}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  
  // Uložit column sizing do localStorage při změně (per user)
  useEffect(() => {
    if (userId && Object.keys(columnSizing).length > 0) {
      localStorage.setItem(`ordersV3_columnSizing_${userId}`, JSON.stringify(columnSizing));
    }
  }, [columnSizing, userId]);
  
  // Handler pro toggle expandování
  const handleRowExpand = useCallback((orderId) => {
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
    onRowExpand?.(orderId);
  }, [onRowExpand]);
  
  // Handler pro skrytí sloupce
  const handleHideColumn = useCallback((columnId) => {
    onColumnVisibilityChange?.(columnId, false);
  }, [onColumnVisibilityChange]);
  
  // Drag & Drop handlers
  const handleDragStart = useCallback((columnId) => {
    setDraggedColumn(columnId);
  }, []);
  
  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  }, []);
  
  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);
  
  const handleDrop = useCallback((e, targetColumnId) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetColumnId) {
      // Předat oba parametry (from, to) do callback
      onColumnReorder?.(draggedColumn, targetColumnId);
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  }, [draggedColumn, onColumnReorder]);
  
  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  }, []);
  
  // Definice sloupců přesně jako v původním Orders25List.js
  const columns = useMemo(() => {
    const allColumns = [
      {
        id: 'expander',
        header: '',
        cell: ({ row }) => {
          const order = row.original;
          const isExpanded = expandedRows[order.id];
          
          return (
            <ExpandButton
              onClick={() => handleRowExpand(order.id)}
              title={isExpanded ? 'Sbalit' : 'Rozbalit'}
            >
              <FontAwesomeIcon icon={isExpanded ? faMinus : faPlus} />
            </ExpandButton>
          );
        },
        size: 50,
        enableSorting: false,
      },
      {
        id: 'approve',
        header: () => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '0.9rem', opacity: 0.7 }} />
          </div>
        ),
        cell: ({ row }) => {
          const order = row.original;
          // TODO: Implementovat logiku schválení
          return null;
        },
        size: 60,
        enableSorting: false,
      },
      {
        accessorKey: 'dt_objednavky',
        id: 'dt_objednavky',
        header: 'Datum',
        cell: ({ row }) => {
          const order = row.original;
          const lastModified = order.dt_aktualizace || order.dt_objednavky;
          const created = order.dt_vytvoreni || order.dt_objednavky;
          
          return (
            <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
              <div>{formatDateOnly(lastModified)}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{formatDateOnly(created)}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                {created ? new Date(created).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
            </div>
          );
        },
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'cislo_objednavky',
        id: 'cislo_objednavky',
        header: 'Evidenční číslo',
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div style={{ textAlign: 'left', whiteSpace: 'normal' }}>
              <div style={{ fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>
                {(order.mimoradna_udalost === 1 || order.mimoradna_udalost === '1') && (
                  <span style={{ color: '#dc2626', marginRight: '4px' }}>
                    <FontAwesomeIcon icon={faBoltLightning} />
                  </span>
                )}
                {order.cislo_objednavky || '---'}
                {order.id && (
                  <sup style={{ fontSize: '0.6rem', color: '#9ca3af', marginLeft: '2px' }}>
                    #{order.id}
                  </sup>
                )}
              </div>
              {order.predmet && (
                <div style={{
                  fontSize: '1em',
                  fontWeight: 600,
                  color: '#1e293b',
                  marginTop: '4px',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {order.predmet}
                </div>
              )}
            </div>
          );
        },
        size: 180,
        enableSorting: true,
      },
      {
        accessorKey: 'financovani',
        id: 'financovani',
        header: 'Financování',
        cell: ({ row }) => {
          const order = row.original;
          const financovaniText = getFinancovaniText(order); // Zkrácený název
          const detailText = getFinancovaniDetail(order);
          
          // Plný název pro title (tooltip)
          const fullName = order.financovani?.typ_nazev || order.financovani?.typ || '';
          
          return (
            <div 
              style={{ textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3' }}
              title={fullName || undefined}
            >
              <div style={{ fontWeight: 600, color: '#7c3aed' }}>{financovaniText}</div>
              {detailText && (
                <div style={{ 
                  fontSize: '0.8em', 
                  color: '#6b7280', 
                  marginTop: '2px',
                  fontWeight: 500
                }}>
                  {detailText}
                </div>
              )}
            </div>
          );
        },
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'objednatel_garant',
        id: 'objednatel_garant',
        header: 'Objednatel / Garant',
        cell: ({ row }) => {
          const order = row.original;
          // DB sloupce 1:1 bez konverzí
          const objednatel = order.objednatel_jmeno || '---';
          const garant = order.garant_jmeno || '---';
          
          return (
            <div style={{ lineHeight: '1.3' }}>
              <div style={{ fontWeight: 500 }}>{objednatel}</div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{garant}</div>
            </div>
          );
        },
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'prikazce_schvalovatel',
        id: 'prikazce_schvalovatel',
        header: 'Příkazce / Schvalovatel',
        cell: ({ row }) => {
          const order = row.original;
          // DB sloupce 1:1 bez konverzí
          const prikazce = order.prikazce_jmeno || '---';
          const schvalovatel = order.schvalovatel_jmeno || '---';
          
          return (
            <div style={{ lineHeight: '1.3' }}>
              <div style={{ fontWeight: 500 }}>{prikazce}</div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{schvalovatel}</div>
            </div>
          );
        },
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'dodavatel_nazev',
        id: 'dodavatel_nazev',
        header: 'Dodavatel',
        cell: ({ row }) => {
          const order = row.original;
          
          if (!order.dodavatel_nazev) {
            return <div style={{ color: '#9ca3af' }}>---</div>;
          }
          
          return (
            <div style={{ lineHeight: '1.5' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95em', marginBottom: '2px' }}>
                {order.dodavatel_nazev}
              </div>
              
              {order.dodavatel_adresa && (
                <div style={{ 
                  fontSize: '0.80em', 
                  color: '#4b5563',
                  marginBottom: '2px'
                }}>
                  {order.dodavatel_adresa}
                </div>
              )}
              
              {order.dodavatel_ico && (
                <div style={{ 
                  fontSize: '0.80em', 
                  color: '#6b7280',
                  fontWeight: 500
                }}>
                  IČO: {order.dodavatel_ico}
                </div>
              )}
              
              {(order.dodavatel_kontakt_jmeno || order.dodavatel_kontakt_email || order.dodavatel_kontakt_telefon) && (
                <div style={{
                  fontSize: '0.80em',
                  color: '#1f2937',
                  marginTop: '4px',
                  fontWeight: 500
                }}>
                  {order.dodavatel_kontakt_jmeno && (
                    <div>Kontakt: {order.dodavatel_kontakt_jmeno}</div>
                  )}
                  {order.dodavatel_kontakt_email && (
                    <div>✉ {order.dodavatel_kontakt_email}</div>
                  )}
                  {order.dodavatel_kontakt_telefon && (
                    <div>☎ {order.dodavatel_kontakt_telefon}</div>
                  )}
                </div>
              )}
            </div>
          );
        },
        size: 240,
        enableSorting: true,
      },
      {
        accessorKey: 'stav_objednavky',
        id: 'stav_objednavky',
        header: 'Stav',
        cell: ({ row }) => {
          const order = row.original;
          const displayStatus = getOrderDisplayStatus(order); // Čitelný český název z DB
          const statusCode = mapUserStatusToSystemCode(displayStatus); // Převod na systémový kód
          
          // Mapování systémových kódů na ikony
          const iconMap = {
            NOVA: faFilePen,
            ODESLANA_KE_SCHVALENI: faClock,
            SCHVALENA: faShield,
            POTVRZENA: faCheckCircle,
            UVEREJNENA: faFileContract,
            DOKONCENA: faTruck,
            ZRUSENA: faXmark,
            ZAMITNUTA: faXmark,
            ODESLANA: faCheckCircle,
            FAKTURACE: faFileInvoice,
            VECNA_SPRAVNOST: faCheckCircle,
            ZKONTROLOVANA: faCheckCircle,
            CEKA_POTVRZENI: faClock,
            K_UVEREJNENI_DO_REGISTRU: faClock,
          };
          
          return (
            <StatusBadge $status={statusCode}>
              <FontAwesomeIcon icon={iconMap[statusCode] || faCircleNotch} style={{ fontSize: '12px' }} />
              <span>{displayStatus}</span>
            </StatusBadge>
          );
        },
        size: 150,
        enableSorting: true,
      },
      {
        accessorKey: 'stav_registru',
        id: 'stav_registru',
        header: 'Stav registru',
        cell: ({ row }) => {
          const order = row.original;
          const registr = order.registr_smluv;
          
          let stavText = '';
          let statusCode = 'EMPTY';
          let icon = null;
          
          // Získání workflow stavu (podle OrderV2)
          let workflowStatus = null;
          if (order.stav_workflow_kod) {
            try {
              const parsed = Array.isArray(order.stav_workflow_kod) 
                ? order.stav_workflow_kod 
                : JSON.parse(order.stav_workflow_kod);
              
              if (Array.isArray(parsed) && parsed.length > 0) {
                workflowStatus = parsed[parsed.length - 1];
              } else {
                workflowStatus = parsed;
              }
            } catch (e) {
              workflowStatus = order.stav_workflow_kod;
            }
          }
          
          // Logika podle OrderV2:
          // 1. Pokud existuje dt_zverejneni A registr_iddt -> "Zveřejněno"
          // 2. Pokud workflow stav = 'UVEREJNIT' NEBO zverejnit === 'ANO' -> "Má být zveřejněno"
          // 3. Jinak -> prázdné
          
          if (registr) {
            // 1. Zveřejněno - má vyplněné oboje dt_zverejneni I registr_iddt
            if (registr.dt_zverejneni && registr.registr_iddt) {
              stavText = 'Zveřejněno';
              icon = faCheckCircle;
              statusCode = 'UVEREJNENA';
            }
            // 2. Má být zveřejněno - workflow = UVEREJNIT NEBO zverejnit === 'ANO'
            else if (workflowStatus === 'UVEREJNIT' || registr.zverejnit === 'ANO') {
              stavText = 'Má být zveřejněno';
              icon = faClock;
              statusCode = 'KE_SCHVALENI';
            }
          }
          // Kontrola i pokud registr neexistuje, ale workflow = UVEREJNIT
          else if (workflowStatus === 'UVEREJNIT') {
            stavText = 'Má být zveřejněno';
            icon = faClock;
            statusCode = 'KE_SCHVALENI';
          }
          
          // Pokud nemáme žádný stav, vrať ---
          if (!stavText) {
            return <div style={{ color: '#94a3b8', fontSize: '0.9em' }}>---</div>;
          }
          
          return (
            <StatusBadge $status={statusCode}>
              <FontAwesomeIcon icon={icon} style={{ fontSize: '12px' }} />
              <span>{stavText}</span>
            </StatusBadge>
          );
        },
        size: 150,
        enableSorting: true,
      },
      {
        accessorKey: 'max_cena_s_dph',
        id: 'max_cena_s_dph',
        header: 'Max. cena s DPH',
        cell: ({ row }) => {
          const maxPrice = parseFloat(row.original.max_cena_s_dph || 0);
          const fakturaPrice = parseFloat(row.original.faktury_celkova_castka_s_dph || 0);
          const isOverLimit = fakturaPrice > 0 && maxPrice > 0 && fakturaPrice > maxPrice;
          
          return (
            <div style={{
              textAlign: 'right',
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              color: isOverLimit ? '#dc2626' : 'inherit'
            }}>
              {!isNaN(maxPrice) && maxPrice > 0 
                ? `${maxPrice.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč` 
                : '---'}
            </div>
          );
        },
        size: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'cena_s_dph',
        id: 'cena_s_dph',
        header: 'Cena s DPH',
        cell: ({ row }) => {
          const price = getOrderTotalPriceWithDPH(row.original);
          
          return (
            <div style={{
              textAlign: 'right',
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              {!isNaN(price) && price > 0 
                ? `${price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč` 
                : '---'}
            </div>
          );
        },
        size: 110,
        enableSorting: true,
      },
      {
        accessorKey: 'faktury_celkova_castka_s_dph',
        id: 'faktury_celkova_castka_s_dph',
        header: 'Cena FA s DPH',
        cell: ({ row }) => {
          const order = row.original;
          const price = parseFloat(order.faktury_celkova_castka_s_dph || 0);
          const maxPrice = parseFloat(order.max_cena_s_dph || 0);
          const isOverLimit = price > 0 && maxPrice > 0 && price > maxPrice;
          
          return (
            <div style={{
              textAlign: 'right',
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              color: '#059669'
            }}>
              {!isNaN(price) && price > 0 
                ? `${price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč` 
                : '---'}
            </div>
          );
        },
        size: 130,
        enableSorting: true,
      },
      {
        id: 'actions',
        header: () => (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '16px' }} />
          </div>
        ),
        meta: {
          align: 'center',
        },
        cell: ({ row }) => {
          const order = row.original;
          const showDelete = canDelete(order);
          const isHardDelete = canHardDelete(order);
          
          return (
            <ActionMenu>
              <ActionMenuButton
                className="edit"
                onClick={() => onActionClick?.('edit', order)}
                title="Editovat"
                disabled={!canEdit(order)}
              >
                <FontAwesomeIcon icon={faEdit} />
              </ActionMenuButton>
              
              <ActionMenuButton
                className="create-invoice"
                onClick={() => onActionClick?.('create-invoice', order)}
                title="Evidovat fakturu"
                disabled={!canCreateInvoice(order)}
              >
                <FontAwesomeIcon icon={faFileInvoice} />
              </ActionMenuButton>
              
              <ActionMenuButton
                className="export-document"
                onClick={() => onActionClick?.('export', order)}
                title="Generovat DOCX"
                disabled={!canExportDocument(order)}
              >
                <FontAwesomeIcon icon={faFileWord} />
              </ActionMenuButton>
              
              {showDelete && (
                <ActionMenuButton
                  className="delete"
                  onClick={() => onActionClick?.('delete', order)}
                  title={isHardDelete ? "Smazat objednávku (ADMIN: hard/soft delete)" : "Deaktivovat objednávku (soft delete)"}
                  disabled={false}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </ActionMenuButton>
              )}
            </ActionMenu>
          );
        },
        size: 140,
        enableSorting: false,
      },
    ];

    // Filtrovat pouze viditelné sloupce
    let filtered = allColumns;
    if (visibleColumns && visibleColumns.length > 0) {
      filtered = allColumns.filter(col => visibleColumns.includes(col.id));
    }
    
    // Seřadit podle columnOrder
    if (columnOrder && columnOrder.length > 0) {
      filtered = filtered.sort((a, b) => {
        const indexA = columnOrder.indexOf(a.id);
        const indexB = columnOrder.indexOf(b.id);
        
        // Pokud sloupec není v columnOrder, dát ho na konec
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
    }
    
    return filtered;
  }, [visibleColumns, columnOrder, handleRowExpand, onActionClick, canEdit, canCreateInvoice, canExportDocument, expandedRows]);

  // Filtrovat data podle columnFilters (lokální filtr v tabulce)
  const filteredData = useMemo(() => {
    if (Object.keys(columnFilters).length === 0) return data;
    
    return data.filter(row => {
      return Object.entries(columnFilters).every(([columnId, filterValue]) => {
        if (!filterValue) return true;
        
        const cellValue = row[columnId];
        if (cellValue === null || cellValue === undefined) return false;
        
        // Case-insensitive string match
        return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
    });
  }, [data, columnFilters]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
    enableMultiSort: true, // Povolit multi-column sorting
    maxMultiSortColCount: 5, // Maximálně 5 sloupců pro třídění
    isMultiSortEvent: (e) => e.shiftKey, // Shift+click pro multi-sort
  });

  const activeFiltersCount = Object.values(columnFilters).filter(v => v).length;
  const hasActiveSorting = sorting.length > 0;
  const hasData = data && data.length > 0;
  const colSpan = table.getAllColumns().length;

  return (
    <TableContainer>
      {/* Toolbar s info a reset tlačítky */}
      {(hasActiveSorting || activeFiltersCount > 0) && (
        <TableToolbar>
          <ToolbarInfo>
            {hasActiveSorting && (
              <span>
                🔄 Třídění: <strong>{sorting.length}</strong> {sorting.length === 1 ? 'sloupec' : 'sloupce'}
              </span>
            )}
            {activeFiltersCount > 0 && (
              <span>
                🔍 Filtry: <strong>{activeFiltersCount}</strong>
                <FilterBadge>{filteredData.length}</FilterBadge>
              </span>
            )}
          </ToolbarInfo>
          <ToolbarActions>
            {activeFiltersCount > 0 && (
              <ResetButton onClick={() => setColumnFilters({})}>
                <FontAwesomeIcon icon={faTimes} />
                Vymazat filtry
              </ResetButton>
            )}
            {hasActiveSorting && (
              <ResetButton onClick={() => onSortingChange?.([])}>
                <FontAwesomeIcon icon={faUndo} />
                Reset třídění
              </ResetButton>
            )}
          </ToolbarActions>
        </TableToolbar>
      )}
      
      <Table>
        <TableHead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const columnId = header.column.id;
                const canHide = columnId !== 'expander' && columnId !== 'actions';
                
                return (
                  <TableHeaderCell
                    key={header.id}
                    $align={header.column.columnDef.meta?.align || 'left'}
                    $sortable={header.column.getCanSort()}
                    $width={columnSizing[columnId] || (header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined)}
                    data-dragging={draggedColumn === columnId}
                    data-drag-over={dragOverColumn === columnId}
                    draggable={canHide}
                    onDragStart={() => handleDragStart(columnId)}
                    onDragOver={(e) => handleDragOver(e, columnId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, columnId)}
                    onDragEnd={handleDragEnd}
                  >
                    <HeaderContent $align={header.column.columnDef.meta?.align || 'left'}>
                      {/* První řádek: název + sorting + akce */}
                      <HeaderRow $align={header.column.columnDef.meta?.align || 'left'}>
                        <HeaderTextWrapper
                          onClick={(e) => {
                            // Shift+click pro multi-column sorting
                            if (header.column.getCanSort()) {
                              const handler = header.column.getToggleSortingHandler();
                              if (handler) {
                                handler(e);
                              }
                            }
                          }}
                        >
                          <HeaderText>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (() => {
                              const sortDirection = header.column.getIsSorted();
                              const sortIndex = sorting.findIndex(s => s.id === columnId);
                              
                              if (sortDirection && sorting.length > 1 && sortIndex !== -1) {
                                // Zobrazit index třídění pokud je více sloupců
                                return (
                                  <SortIndexBadge $asc={sortDirection === 'asc'}>
                                    {sortIndex + 1}
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </SortIndexBadge>
                                );
                              } else if (sortDirection) {
                                // Zobrazit pouze šipku pokud je jeden sloupec
                                return (
                                  <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </HeaderText>
                        </HeaderTextWrapper>
                        
                        {canHide && (
                          <ColumnActions className="column-actions">
                            <ColumnActionButton
                              className="drag-handle"
                              title="Přesunout sloupec (táhněte)"
                            >
                              <FontAwesomeIcon icon={faGripVertical} />
                            </ColumnActionButton>
                            <ColumnActionButton
                              className="hide-column"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHideColumn(columnId);
                              }}
                              title="Skrýt sloupec"
                            >
                              <FontAwesomeIcon icon={faEyeSlash} />
                            </ColumnActionButton>
                          </ColumnActions>
                        )}
                      </HeaderRow>
                      
                      {/* Druhý řádek: filtrovací pole v celé šířce */}
                      {header.column.getCanSort() && (
                        <ColumnFilterInput
                          type="text"
                          placeholder="Filtrovat..."
                          value={columnFilters[columnId] || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            setColumnFilters(prev => ({
                              ...prev,
                              [columnId]: e.target.value
                            }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </HeaderContent>
                    
                    {/* Resize handle */}
                    {canHide && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = e.currentTarget.parentElement.offsetWidth;
                          
                          // Přidat vizuální feedback
                          document.body.style.cursor = 'col-resize';
                          document.body.style.userSelect = 'none';
                          
                          const handleMouseMove = (moveEvent) => {
                            const diff = moveEvent.clientX - startX;
                            const newWidth = Math.max(50, startWidth + diff);
                            setColumnSizing(prev => ({
                              ...prev,
                              [columnId]: `${newWidth}px`
                            }));
                          };
                          
                          const handleMouseUp = () => {
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    )}
                  </TableHeaderCell>
                );
              })}
            </tr>
          ))}
        </TableHead>
        <TableBody>
          {error ? (
            <ErrorRow>
              <td colSpan={colSpan}>
                <div className="error-icon">
                  <FontAwesomeIcon icon={faTimesCircle} />
                </div>
                <div className="error-message">
                  Chyba při načítání objednávek
                </div>
                <div className="error-detail">
                  {error.message || error.toString()}
                </div>
              </td>
            </ErrorRow>
          ) : isLoading ? (
            <LoadingRow>
              <td colSpan={colSpan}>
                <div className="loading-spinner">
                  <FontAwesomeIcon icon={faCircleNotch} spin />
                </div>
                <div style={{ marginTop: '1rem' }}>Načítání objednávek...</div>
              </td>
            </LoadingRow>
          ) : !hasData ? (
            <EmptyStateRow>
              <td colSpan={colSpan}>
                <div className="empty-icon">
                  <FontAwesomeIcon icon={faFileContract} />
                </div>
                <div className="empty-message">
                  Žádné objednávky nenalezeny
                </div>
                <div className="empty-hint">
                  Zkuste změnit filtry nebo vytvořit novou objednávku
                </div>
              </td>
            </EmptyStateRow>
          ) : (
            table.getRowModel().rows.map(row => {
              const order = row.original;
              const isExpanded = expandedRows[order.id];
              const rowColSpan = row.getVisibleCells().length;
              
              // Získat barvu pozadí řádku
              let rowStyle = {};
              if (showRowColoring && getRowBackgroundColor) {
                const bgColor = getRowBackgroundColor(order);
                if (bgColor) {
                  rowStyle.background = `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 50%, ${bgColor} 100%)`;
                }
              } else {
                // Výchozí striping pokud není podbarvení zapnuté
                const rowIndex = table.getRowModel().rows.indexOf(row);
                rowStyle.backgroundColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
              }
              
              return (
                <React.Fragment key={row.id}>
                  <tr style={rowStyle}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        $align={cell.column.columnDef.meta?.align || 'left'}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr className="subrow">
                      <td colSpan={rowColSpan}>
                        <SubRowDetail order={order} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrdersTableV3;
