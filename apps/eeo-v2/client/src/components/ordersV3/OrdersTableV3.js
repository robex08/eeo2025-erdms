/**
 * OrdersTableV3.js
 * 
 * Základní tabulka pro Orders V3 s TanStack Table
 * Sloupce přesně jako v původním Orders25List.js
 * 
 * Optimalizováno pro širokoúhlé monitory s horizontal scrollem
 */

import React, { useMemo, useState, useCallback } from 'react';
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
    right: 0;
    top: 0;
    height: 100%;
    width: 5px;
    cursor: col-resize;
    user-select: none;
    touch-action: none;
    background: transparent;
    
    &:hover {
      background: #3b82f6;
    }
    
    &:active {
      background: #2563eb;
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
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const HeaderText = styled.span`
  flex: 1;
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
  tr:nth-of-type(odd) {
    background-color: #ffffff;
  }

  tr:nth-of-type(even) {
    background-color: #f9fafb;
  }

  tr:hover {
    background-color: #f1f5f9;
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
      NOVA: '#dbeafe',
      KE_SCHVALENI: '#fee2e2',
      SCHVALENA: '#fed7aa',
      ZAMITNUTA: '#e5e7eb',
      ROZPRACOVANA: '#fef3c7',
      ODESLANA: '#e0e7ff',
      POTVRZENA: '#ddd6fe',
      K_UVEREJNENI_DO_REGISTRU: '#ccfbf1',
      UVEREJNENA: '#d1fae5',
      DOKONCENA: '#d1fae5',
      ZRUSENA: '#fecaca',
      CANCELLED: '#fecaca',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || '#f1f5f9';
  }};
  color: ${props => {
    const colors = {
      NOVA: '#1e40af',
      KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#f59e0b',
      ODESLANA: '#6366f1',
      POTVRZENA: '#7c3aed',
      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZRUSENA: '#dc2626',
      CANCELLED: '#dc2626',
      EMPTY: '#64748b',
    };
    return colors[props.$status] || '#64748b';
  }};
  border: 1px solid ${props => {
    const colors = {
      NOVA: '#93c5fd',
      KE_SCHVALENI: '#fca5a5',
      SCHVALENA: '#fdba74',
      ZAMITNUTA: '#d1d5db',
      ROZPRACOVANA: '#fde68a',
      ODESLANA: '#a5b4fc',
      POTVRZENA: '#c4b5fd',
      K_UVEREJNENI_DO_REGISTRU: '#5eead4',
      UVEREJNENA: '#6ee7b7',
      DOKONCENA: '#6ee7b7',
      ZRUSENA: '#f87171',
      CANCELLED: '#f87171',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || '#cbd5e1';
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
 * Získá zobrazovací stav objednávky
 */
const getOrderDisplayStatus = (order) => {
  if (order.isDraft || order.je_koncept) return 'Nova / koncept';
  if (order.stav_workflow) {
    if (typeof order.stav_workflow === 'object') {
      return order.stav_workflow.nazev_stavu || order.stav_workflow.nazev || 'Neznámý stav';
    }
    return String(order.stav_workflow);
  }
  return order.stav_objednavky || 'Neznámý stav';
};

/**
 * Získá systémový status kód
 */
const getOrderSystemStatus = (order) => {
  if (order.isDraft || order.je_koncept) return 'NOVA';
  
  // Mapování z workflow stavu
  const workflowMap = {
    'ODESLANA_KE_SCHVALENI': 'KE_SCHVALENI',
    'SCHVALENA': 'SCHVALENA',
    'ZAMITNUTA': 'ZAMITNUTA',
    'ROZPRACOVANA': 'ROZPRACOVANA',
    'ODESLANA': 'ODESLANA',
    'POTVRZENA': 'POTVRZENA',
    'K_UVEREJNENI': 'K_UVEREJNENI_DO_REGISTRU',
    'UVEREJNENA': 'UVEREJNENA',
    'DOKONCENA': 'DOKONCENA',
    'ZRUSENA': 'ZRUSENA',
    'CANCELLED': 'CANCELLED',
  };

  if (order.stav_workflow) {
    const kod = typeof order.stav_workflow === 'object' 
      ? order.stav_workflow.kod_stavu 
      : order.stav_workflow;
    
    return workflowMap[kod] || kod;
  }

  return order.stav_objednavky || 'NOVA';
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
 * Získá celkovou cenu s DPH
 */
const getOrderTotalPriceWithDPH = (order) => {
  if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
    const value = parseFloat(order.polozky_celkova_cena_s_dph);
    if (!isNaN(value) && value > 0) return value;
  }
  
  if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
    return order.polozky.reduce((sum, item) => {
      const cena = parseFloat(item.cena_s_dph || 0);
      return sum + (isNaN(cena) ? 0 : cena);
    }, 0);
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
 */
const OrdersTableV3 = ({
  data = [],
  visibleColumns = [], // pole ID sloupců k zobrazení
  sorting = [],
  onSortingChange,
  onRowExpand,
  onActionClick,
  onColumnVisibilityChange,
  onColumnReorder,
  isLoading = false,
  canEdit = () => true,
  canCreateInvoice = () => true,
  canExportDocument = () => true,
}) => {
  // State pro expandované řádky
  const [expandedRows, setExpandedRows] = useState({});
  
  // State pro drag & drop
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // State pro resizing
  const [columnSizing, setColumnSizing] = useState({});
  
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
        header: 'Datum objednávky',
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
                {order.mimoradna_udalost && (
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
        accessorKey: 'zpusob_financovani',
        id: 'zpusob_financovani',
        header: 'Financování',
        cell: ({ row }) => {
          const order = row.original;
          let financovaniText = '---';
          let detailText = '';
          
          if (order.financovani && typeof order.financovani === 'object') {
            financovaniText = order.financovani.typ_nazev || order.financovani.typ || '---';
            
            const typ = order.financovani.typ || '';
            if (typ === 'LP' && order.financovani.lp_kody) {
              detailText = Array.isArray(order.financovani.lp_kody) 
                ? order.financovani.lp_kody.join(', ') 
                : order.financovani.lp_kody;
            } else if (typ === 'SMLOUVA') {
              detailText = order.financovani.cislo_smlouvy || '';
            }
          }
          
          return (
            <div style={{ textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3' }}>
              <div style={{ fontWeight: 600, color: '#7c3aed' }}>{financovaniText}</div>
              {detailText && (
                <div style={{ fontSize: '0.8em', color: '#6b7280', marginTop: '2px' }}>
                  {detailText}
                </div>
              )}
            </div>
          );
        },
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'objednatel_garant',
        id: 'objednatel_garant',
        header: 'Objednatel / Garant',
        cell: ({ row }) => {
          const order = row.original;
          const objednatel = order.objednatel_uzivatel?.cele_jmeno || order.objednatel?.cele_jmeno || '---';
          const garant = order.garant_uzivatel?.cele_jmeno || order.garant?.cele_jmeno || '---';
          
          return (
            <div style={{ lineHeight: '1.3' }}>
              <div style={{ fontWeight: 500 }}>{objednatel}</div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{garant}</div>
            </div>
          );
        },
        size: 180,
        enableSorting: true,
      },
      {
        accessorKey: 'prikazce_schvalovatel',
        id: 'prikazce_schvalovatel',
        header: 'Příkazce / Schvalovatel',
        cell: ({ row }) => {
          const order = row.original;
          const prikazce = order.prikazce_uzivatel?.cele_jmeno || order.prikazce?.cele_jmeno || '---';
          const schvalovatel = order.schvalovatel_uzivatel?.cele_jmeno || order.schvalovatel?.cele_jmeno || '---';
          
          return (
            <div style={{ lineHeight: '1.3' }}>
              <div style={{ fontWeight: 500 }}>{prikazce}</div>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{schvalovatel}</div>
            </div>
          );
        },
        size: 180,
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
            <div style={{ lineHeight: '1.4', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 500 }}>{order.dodavatel_nazev}</div>
              {order.dodavatel_ico && (
                <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                  IČO: {order.dodavatel_ico}
                </div>
              )}
            </div>
          );
        },
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'stav_objednavky',
        id: 'stav_objednavky',
        header: 'Stav',
        cell: ({ row }) => {
          const order = row.original;
          const statusCode = getOrderSystemStatus(order);
          const displayStatus = getOrderDisplayStatus(order);
          
          const iconMap = {
            NOVA: faFilePen,
            KE_SCHVALENI: faClock,
            SCHVALENA: faShield,
            POTVRZENA: faCheckCircle,
            UVEREJNENA: faFileContract,
            DOKONCENA: faTruck,
            ZRUSENA: faXmark,
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
          
          if (!registr || (!registr.dt_zverejneni && !registr.zverejnit)) {
            return <div style={{ color: '#94a3b8', fontSize: '0.9em' }}>---</div>;
          }
          
          let stavText = '';
          let statusCode = 'EMPTY';
          let icon = null;
          
          if (registr.dt_zverejneni && registr.registr_iddt) {
            stavText = 'Zveřejněno';
            statusCode = 'UVEREJNENA';
            icon = faCheckCircle;
          } else if (registr.zverejnit === 'ANO') {
            stavText = 'Má být zveřejněno';
            statusCode = 'KE_SCHVALENI';
            icon = faClock;
          }
          
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
        size: 130,
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
        size: 130,
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
          <div style={{ textAlign: 'center' }}>
            <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '16px' }} />
          </div>
        ),
        cell: ({ row }) => {
          const order = row.original;
          
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
            </ActionMenu>
          );
        },
        size: 120,
        enableSorting: false,
      },
    ];

    // Filtrovat pouze viditelné sloupce
    if (visibleColumns && visibleColumns.length > 0) {
      return allColumns.filter(col => visibleColumns.includes(col.id));
    }
    
    return allColumns;
  }, [visibleColumns, handleRowExpand, onActionClick, canEdit, canCreateInvoice, canExportDocument, expandedRows]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  if (isLoading) {
    return (
      <TableContainer>
        <EmptyState>Načítání objednávek...</EmptyState>
      </TableContainer>
    );
  }

  if (!data || data.length === 0) {
    return (
      <TableContainer>
        <EmptyState>
          Žádné objednávky nenalezeny.
          <br />
          <small style={{ color: '#9ca3af', marginTop: '0.5rem', display: 'block' }}>
            Zkuste změnit filtry nebo vytvořit novou objednávku.
          </small>
        </EmptyState>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
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
                    <HeaderContent>
                      <HeaderText onClick={header.column.getToggleSortingHandler()}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted()] ?? ''}
                          </span>
                        )}
                      </HeaderText>
                      
                      {canHide && (
                        <ColumnActions className="column-actions">
                          <ColumnActionButton
                            className="drag-handle"
                            title="Přesunout sloupec"
                            onMouseDown={(e) => e.stopPropagation()}
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
                    </HeaderContent>
                    
                    {/* Resize handle */}
                    {canHide && (
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startWidth = header.column.getSize();
                          
                          const handleMouseMove = (moveEvent) => {
                            const diff = moveEvent.clientX - startX;
                            const newWidth = Math.max(50, startWidth + diff);
                            setColumnSizing(prev => ({
                              ...prev,
                              [columnId]: `${newWidth}px`
                            }));
                          };
                          
                          const handleMouseUp = () => {
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
          {table.getRowModel().rows.map(row => {
            const order = row.original;
            const isExpanded = expandedRows[order.id];
            const colSpan = row.getVisibleCells().length;
            
            return (
              <React.Fragment key={row.id}>
                <tr>
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
                    <td colSpan={colSpan}>
                      <SubRowDetail order={order} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrdersTableV3;
