/**
 * OrdersTableV3.js
 * 
 * Základní tabulka pro Orders V3 s TanStack Table
 * Sloupce přesně jako v původním Orders25List.js
 * 
 * Optimalizováno pro širokoúhlé monitory s horizontal scrollem
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DatePicker from '../DatePicker';
import OperatorInput from '../OperatorInput';
import useExpandedRowsV3 from '../../hooks/ordersV3/useExpandedRowsV3';
import OrderExpandedRowV3 from './OrderExpandedRowV3';
import { updateOrder } from '../../services/api2auth';
import { getOrderDetailV3 } from '../../services/apiOrderV3';
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
  faSearch,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// KEYFRAMES
// ============================================================================

// 🎯 Animace pro zvýraznění řádku po návratu z editace
const highlightPulse = keyframes`
  0% {
    background-color: #fef3c7;
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
  }
  50% {
    background-color: #fde68a;
    box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
  }
  100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
  }
`;

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const TableWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const TableContainer = styled.div`
  width: 100%;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  overflow-y: hidden;

  /* Optimalizace pro širokoúhlé monitory */
  @media (min-width: 1920px) {
    font-size: 0.95rem;
  }

  @media (min-width: 2560px) {
    font-size: 1rem;
  }

  /* Skrýt normální scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
`;

const FixedScrollbarContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 2px solid #cbd5e1;
  overflow-x: auto;
  overflow-y: hidden;
  z-index: 1000;
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.15);

  /* Vlastní scrollbar design */
  &::-webkit-scrollbar {
    height: 14px;
  }

  &::-webkit-scrollbar-track {
    background: #e2e8f0;
    border-radius: 0;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
    border-radius: 0;
    border: 2px solid #e2e8f0;
    
    &:hover {
      background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
    }
    
    &:active {
      background: #1e40af;
    }
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #3b82f6 #e2e8f0;
`;

const FixedScrollbarContent = styled.div`
  height: 1px;
  pointer-events: none;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  /* Sticky nefunguje kvůli Layout overflow structure - vypnuto */
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
  gap: 0.25rem;
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

const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  margin-top: 4px;

  > svg:first-of-type {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 12px !important;
    height: 12px !important;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 16px;
  height: 16px;

  &:hover {
    color: #6b7280;
  }

  > svg {
    width: 10px !important;
    height: 10px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.35rem 1.75rem 0.35rem 1.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.7rem;
  background: #f9fafb;
  transition: all 0.15s ease;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
    font-size: 0.7rem;
  }
`;

const ColumnFilterSelect = styled.select`
  width: 100%;
  padding: 0.35rem 1.75rem 0.35rem 1.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.7rem;
  background: #f9fafb;
  transition: all 0.15s ease;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background-color: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
    font-size: 0.7rem;
  }
  
  option {
    padding: 0.5rem;
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
  word-wrap: break-word;
  overflow-wrap: break-word;
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

// ============================================================================
// APPROVAL DIALOG STYLED COMPONENTS
// ============================================================================

const ApprovalDialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ApprovalDialog = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 1200px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ApprovalDialogHeader = styled.div`
  background: linear-gradient(135deg, #10b981, #059669);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 2px solid #047857;
`;

const ApprovalDialogIcon = styled.div`
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 8px rgba(4, 120, 87, 0.5));
`;

const ApprovalDialogTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.125rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  flex: 1;
`;

const ApprovalDialogContent = styled.div`
  padding: 1.25rem;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
`;

const ApprovalTwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const ApprovalLeftColumn = styled.div`
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const ApprovalRightColumn = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  height: fit-content;
`;

const ApprovalCompactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const ApprovalCompactItem = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ApprovalCompactLabel = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 600;
`;

const ApprovalCompactValue = styled.div`
  font-size: 0.875rem;
  color: #0f172a;
  line-height: 1.4;
  word-break: break-word;
`;

const ApprovalSection = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  
  &:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const ApprovalSectionTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
`;

const ApprovalDialogTopGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  grid-column: 1 / -1;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ApprovalDialogSection = styled.div`
  margin-bottom: ${props => props.$fullWidth ? '1rem' : '0'};
  grid-column: ${props => props.$fullWidth ? '1 / -1' : 'auto'};

  &:last-child {
    margin-bottom: 0;
  }
`;

const ApprovalDialogLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ApprovalDialogValue = styled.div`
  font-size: 0.9375rem;
  color: #0f172a;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  line-height: 1.4;
`;

const ApprovalDialogNote = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  font-style: italic;
  margin-top: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: #f1f5f9;
  border-left: 3px solid #cbd5e1;
  border-radius: 4px;
`;

const ApprovalDialogTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.625rem;
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
  background: ${props => props.$hasError ? '#fef2f2' : 'white'};

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#dc2626' : '#10b981'};
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const ApprovalDialogError = styled.div`
  color: #ef4444;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-top: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &:before {
    content: '⚠️';
    font-size: 0.875rem;
  }
`;

const ApprovalDialogActions = styled.div`
  display: flex;
  gap: 0.625rem;
  margin-top: 1.25rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
`;

const ApprovalDialogButton = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => {
    if (props.$approve) {
      return `
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }
      `;
    } else if (props.$reject) {
      return `
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
          transform: translateY(-1px);
        }
      `;
    } else if (props.$postpone) {
      return `
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
          transform: translateY(-1px);
        }
      `;
    } else {
      return `
        background: #f1f5f9;
        color: #475569;
        
        &:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
      `;
    }
  }}
  
  &:active {
    transform: translateY(0);
  }
`;

const ApprovalLPItem = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ApprovalLPHeader = styled.div`
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
`;

const ApprovalLPRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  color: #64748b;
  
  strong {
    color: #0f172a;
    font-size: 0.875rem;
  }
  
  ${props => props.$highlight && `
    background: #f8fafc;
    padding: 0.5rem;
    margin: 0.25rem -0.5rem;
    border-radius: 4px;
  `}
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Získá zobrazovací stav objednávky - PŘÍMO z DB sloupce stav_objednavky (už je to český popis)
 * @param {Object} order - Objednávka z backendu
 * @returns {string} - Český název stavu (např. "Dokončená", "Uveřejněna v registru smluv")
 */
const getOrderDisplayStatus = (order) => {
  // Backend vrací sloupec 'stav_objednavky' který JUŽ OBSAHUJE ČESKÝ POPIS
  // např. "Dokončená", "Odeslaná dodavateli", "Uveřejněna v registru smluv"
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
// MULTISELECT PRO STAV (separátní komponenta kvůli hooks)
// ============================================================================

const StavMultiSelect = ({ columnId, localColumnFilters, handleFilterChange, orderStatesList }) => {
  const [stavDropdownOpen, setStavDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Hodnota jako pole (synchronizace s filter panelem)
  const currentValue = Array.isArray(localColumnFilters[columnId]) 
    ? localColumnFilters[columnId] 
    : (localColumnFilters[columnId] ? [localColumnFilters[columnId]] : []);
  
  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setStavDropdownOpen(false);
      }
    };
    
    if (stavDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [stavDropdownOpen]);
  
  const handleToggleStav = useCallback((kod) => {
    const newValue = currentValue.includes(kod)
      ? currentValue.filter(v => v !== kod)
      : [...currentValue, kod];
    
    // ✅ Uložit jako POLE pro backend
    handleFilterChange(columnId, newValue.length > 0 ? newValue : '');
  }, [currentValue, columnId, handleFilterChange]);
  
  const displayText = currentValue.length === 0 
    ? 'Všechny stavy...' 
    : `Vybráno: ${currentValue.length}`;
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative', marginTop: '4px' }}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setStavDropdownOpen(!stavDropdownOpen);
        }}
        style={{
          width: '100%',
          padding: '0.375rem 1.5rem 0.375rem 0.5rem',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '0.8125rem',
          background: 'white',
          cursor: 'pointer',
          position: 'relative',
          color: currentValue.length > 0 ? '#1f2937' : '#9ca3af',
          fontWeight: currentValue.length > 0 ? '500' : '400',
        }}
      >
        {displayText}
        <svg
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '14px',
            height: '14px',
            pointerEvents: 'none'
          }}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {stavDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '2px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {orderStatesList && orderStatesList.length > 0 && orderStatesList.map((status, idx) => {
            const kod = status.kod_stavu || status.kod || '';
            const nazev = status.nazev_stavu || status.nazev || kod;
            const isSelected = currentValue.includes(kod);
            
            return (
              <div
                key={status.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStav(kod);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  background: isSelected ? '#eff6ff' : 'white',
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'white';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ 
                  fontWeight: isSelected ? '500' : '400',
                  color: isSelected ? '#2563eb' : '#1f2937'
                }}>
                  {nazev}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  columnFilters = {}, // ✅ External column filters from parent
  sorting = [],
  onSortingChange,
  onRowExpand,
  onActionClick,
  onColumnVisibilityChange,
  onColumnReorder,
  onColumnFiltersChange, // Callback pro změny filtrů
  orderStatesList = [], // ✅ Číselník stavů z API
  userId, // Přidáno pro localStorage per user
  token, // 🆕 Pro API volání
  username, // 🆕 Pro API volání
  isLoading = false,
  error = null,
  canEdit = () => true,
  canCreateInvoice = () => true,
  canExportDocument = () => true,
  canDelete = () => false,
  canHardDelete = () => false,
  showRowColoring = false, // Podbarvení řádků podle stavu
  getRowBackgroundColor = null, // Funkce pro získání barvy pozadí
  highlightOrderId = null, // 🎯 ID objednávky k zvýraznění po návratu z editace
}) => {
  // Hook pro expandované řádky s lazy loading a localStorage persistence
  const {
    isExpanded,
    toggleRow,
    getRowDetail,
    loadOrderDetail,
    loadingDetails,
    errors,
    refreshDetail
  } = useExpandedRowsV3({ token, username, userId });
  
  // State pro column filters (lokální - zobrazení v UI)
  const [localColumnFilters, setLocalColumnFilters] = useState(columnFilters || {});
  
  // ✅ Synchronizace external columnFilters s local state POUZE při změně z parent
  useEffect(() => {
    // Aktualizuj POUZE pokud se external změnil a nejsme uprostřed lokální editace
    if (JSON.stringify(columnFilters) !== JSON.stringify(localColumnFilters)) {
      setLocalColumnFilters(columnFilters || {});
    }
  }, [columnFilters]);
  
  // Ref pro debounce timery
  const filterTimers = useRef({});
  
  // Refs pro fixed scrollbar synchronizaci
  const tableContainerRef = useRef(null);
  const fixedScrollbarRef = useRef(null);
  const [showFixedScrollbar, setShowFixedScrollbar] = useState(false);
  
  // State pro drag & drop
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // State pro hromadné rozbalování
  const [isBulkExpanding, setIsBulkExpanding] = useState(false);
  
  // State pro schvalovací dialog
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [orderToApprove, setOrderToApprove] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalCommentError, setApprovalCommentError] = useState('');
  
  // State pro resizing - načíst z localStorage (per user)
  const [columnSizing, setColumnSizing] = useState(() => {
    if (userId) {
      try {
        const saved = localStorage.getItem(`ordersV3_columnSizing_v2_${userId}`);
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
      localStorage.setItem(`ordersV3_columnSizing_v2_${userId}`, JSON.stringify(columnSizing));
    }
  }, [columnSizing, userId]);
  
  // Debounced filter change - posílá změny do parent komponenty po 1000ms
  const handleFilterChange = useCallback((columnId, value) => {
    console.log('🔄 handleFilterChange:', { columnId, value, type: Array.isArray(value) ? 'array' : typeof value });
    
    // ✅ Pro stav_objednavky mapuj na 'stav' pro backend
    const backendColumnId = columnId === 'stav_objednavky' ? 'stav' : columnId;
    
    // Update lokální state okamžitě (pro UI) - zachovej POLE!
    setLocalColumnFilters(prev => {
      const newFilters = {
        ...prev,
        [columnId]: value  // ✅ Nezměň typ! Pokud je pole, zachovej pole
      };
      
      // ✅ OKAMŽITĚ ulož do localStorage (aby přežil refresh dat)
      if (userId) {
        try {
          const prefsKey = `ordersV3_preferences_${userId}`;
          const savedPrefs = localStorage.getItem(prefsKey);
          if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            prefs.columnFilters = newFilters;
            localStorage.setItem(prefsKey, JSON.stringify(prefs));
            console.log('💾 Uloženo do LS:', { columnId, value, isArray: Array.isArray(value), allFilters: newFilters });
          } else {
            // Vytvoř nový objekt pokud neexistuje
            const newPrefs = {
              columnFilters: newFilters,
              showDashboard: true,
              showFilters: true,
              dashboardMode: 'full',
              showRowColoring: false,
              itemsPerPage: 50,
              selectedPeriod: 'current-month'
            };
            localStorage.setItem(prefsKey, JSON.stringify(newPrefs));
            console.log('💾 Vytvořen nový LS:', { columnId, value, isArray: Array.isArray(value) });
          }
        } catch (e) {
          console.error('❌ Error saving filter to localStorage:', e);
        }
      }
      
      return newFilters;
    });
    
    // Debounce pro volání API (1000ms)
    if (filterTimers.current[columnId]) {
      clearTimeout(filterTimers.current[columnId]);
    }
    
    filterTimers.current[columnId] = setTimeout(() => {
      console.log('⏰ Debounce dokončen, volám parent callback', { backendColumnId, value, isArray: Array.isArray(value) });
      // ✅ Volání parent callback pro API update - použij BACKEND column ID
      if (onColumnFiltersChange) {
        onColumnFiltersChange(backendColumnId, value);
      }
    }, 1000);
  }, [onColumnFiltersChange, userId]);
  
  // Cleanup timers při unmount
  useEffect(() => {
    return () => {
      Object.values(filterTimers.current).forEach(clearTimeout);
    };
  }, []);
  
  // Synchronizace fixed scrollbar s hlavní tabulkou
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const fixedScrollbar = fixedScrollbarRef.current;
    
    if (!tableContainer || !fixedScrollbar) return;
    
    // Zjistit, zda je potřeba scrollbar (obsah je širší než container)
    const checkScrollbarNeeded = () => {
      const isNeeded = tableContainer.scrollWidth > tableContainer.clientWidth;
      setShowFixedScrollbar(isNeeded);
      
      // Nastavit šířku obsahu fixed scrollbaru na šířku tabulky
      if (isNeeded) {
        const fixedContent = fixedScrollbar.querySelector('div');
        if (fixedContent) {
          fixedContent.style.width = `${tableContainer.scrollWidth}px`;
        }
      }
    };
    
    // Synchronizace scroll pozice: hlavní tabulka -> fixed scrollbar
    const syncFromTable = () => {
      if (fixedScrollbar && tableContainer) {
        fixedScrollbar.scrollLeft = tableContainer.scrollLeft;
      }
    };
    
    // Synchronizace scroll pozice: fixed scrollbar -> hlavní tabulka
    const syncFromScrollbar = () => {
      if (tableContainer && fixedScrollbar) {
        tableContainer.scrollLeft = fixedScrollbar.scrollLeft;
      }
    };
    
    // Observer pro změny velikosti (resize, nová data)
    const resizeObserver = new ResizeObserver(() => {
      checkScrollbarNeeded();
    });
    
    resizeObserver.observe(tableContainer);
    
    // Event listeners
    tableContainer.addEventListener('scroll', syncFromTable);
    fixedScrollbar.addEventListener('scroll', syncFromScrollbar);
    
    // Počáteční kontrola při načtení
    checkScrollbarNeeded();
    
    // Cleanup
    return () => {
      resizeObserver.disconnect();
      tableContainer.removeEventListener('scroll', syncFromTable);
      fixedScrollbar.removeEventListener('scroll', syncFromScrollbar);
    };
  }, [data]); // Re-run když se změní data
  
  // Handler pro toggle expandování
  // Handler pro rozbalení řádku s lazy loading
  const handleRowExpand = useCallback(async (orderId) => {
    toggleRow(orderId);
    
    // Pokud se řádek rozbaluje (ne sbaluje), načíst data
    if (!isExpanded(orderId)) {
      await loadOrderDetail(orderId);
    }
    
    onRowExpand?.(orderId);
  }, [toggleRow, isExpanded, loadOrderDetail, onRowExpand]);
  
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
  
  // Handler pro zpracování schválení objednávky
  const handleApprovalAction = useCallback(async (action) => {
    if (!orderToApprove) return;

    // ⚠️ VALIDACE: Pro Odložit a Zamítnout je poznámka POVINNÁ
    if ((action === 'reject' || action === 'postpone') && !approvalComment.trim()) {
      setApprovalCommentError('Poznámka je povinná pro zamítnutí nebo odložení');
      return;
    }

    // Vymaž validaci pokud je vše OK
    setApprovalCommentError('');

    try {
      // Načti současný workflow stav
      let workflowStates = [];
      try {
        if (Array.isArray(orderToApprove.stav_workflow_kod)) {
          workflowStates = [...orderToApprove.stav_workflow_kod];
        } else if (typeof orderToApprove.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(orderToApprove.stav_workflow_kod);
        }
      } catch (e) {
        workflowStates = [];
      }

      // Připrav nový workflow stav podle akce
      let newWorkflowStates = workflowStates.filter(s => 
        !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA', 'SCHVALENA'].includes(s)
      );

      let orderUpdate = {
        schvaleni_komentar: approvalComment || '', // ✅ Ukládá se vždy - i prázdný pro schválení
        mimoradna_udalost: orderToApprove.mimoradna_udalost // ✅ ZACHOVAT status Mimořádná událost
      };

      const timestamp = new Date().toISOString();

      switch (action) {
        case 'approve':
          // Schválit - přidej SCHVALENA
          newWorkflowStates.push('SCHVALENA');
          orderUpdate.stav_objednavky = 'Schválená';
          orderUpdate.dt_schvaleni = timestamp;
          orderUpdate.schvalil_uzivatel_id = userId;
          break;

        case 'reject':
          // Zamítnout - přidej ZAMITNUTA
          newWorkflowStates.push('ZAMITNUTA');
          orderUpdate.stav_objednavky = 'Zamítnutá';
          orderUpdate.dt_schvaleni = timestamp;
          orderUpdate.schvalil_uzivatel_id = userId;
          break;

        case 'postpone':
          // Odložit - přidej CEKA_SE (také zaznamenat kdo a kdy)
          newWorkflowStates.push('CEKA_SE');
          orderUpdate.stav_objednavky = 'Čeká se';
          orderUpdate.dt_schvaleni = timestamp;
          orderUpdate.schvalil_uzivatel_id = userId;
          break;

        default:
          return;
      }

      orderUpdate.stav_workflow_kod = JSON.stringify(newWorkflowStates);

      // Zavři dialog
      setShowApprovalDialog(false);
      setOrderToApprove(null);
      setApprovalComment('');
      setApprovalCommentError('');

      // 🔥 API CALL na pozadí pro update
      await updateOrder({ token, username, payload: { id: orderToApprove.id, ...orderUpdate } });
      
      // Zavolej onActionClick pro refresh celého seznamu
      if (onActionClick) {
        onActionClick('refresh');
      }
    } catch (error) {
      console.error('Chyba při schvalování objednávky:', error);
      setApprovalCommentError('Chyba při ukládání schválení. Zkuste to znovu.');
    }
  }, [orderToApprove, approvalComment, token, username, userId, onActionClick]);
  
  // Handler pro globální expand/collapse všech řádků na stránce
  // MUSÍ být před useMemo pro columns, protože se v něm používá
  const handleToggleAllRows = useCallback(async () => {
    // table.getRowModel() není dostupný zde, takže použijeme data prop
    const anyExpanded = data.some(order => isExpanded(order.id));
    
    if (anyExpanded) {
      // Collapse all - okamžitě bez animace
      data.forEach(order => {
        if (isExpanded(order.id)) {
          toggleRow(order.id);
        }
      });
    } else {
      // Expand all - postupně s animací
      setIsBulkExpanding(true);
      
      const ordersToExpand = data.filter(order => !isExpanded(order.id));
      
      for (let i = 0; i < ordersToExpand.length; i++) {
        const order = ordersToExpand[i];
        await handleRowExpand(order.id);
        
        // Malá pauza pro plynulé rozbalování
        if (i < ordersToExpand.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
      
      setIsBulkExpanding(false);
    }
  }, [data, isExpanded, handleRowExpand, toggleRow]);
  
  // Definice sloupců přesně jako v původním Orders25List.js
  const columns = useMemo(() => {
    const allColumns = [
      {
        id: 'expander',
        header: ({ table }) => {
          const rows = table.getRowModel().rows;
          const anyExpanded = rows.some(row => isExpanded(row.original.id));
          
          return (
            <ExpandButton
              onClick={handleToggleAllRows}
              title={anyExpanded ? 'Sbalit vše' : 'Rozbalit vše'}
              disabled={isBulkExpanding}
            >
              <FontAwesomeIcon 
                icon={isBulkExpanding ? faCircleNotch : (anyExpanded ? faMinus : faPlus)} 
                spin={isBulkExpanding}
              />
            </ExpandButton>
          );
        },
        cell: ({ row }) => {
          const order = row.original;
          const expanded = isExpanded(order.id);
          
          return (
            <ExpandButton
              onClick={() => handleRowExpand(order.id)}
              title={expanded ? 'Sbalit' : 'Rozbalit'}
            >
              <FontAwesomeIcon icon={expanded ? faMinus : faPlus} />
            </ExpandButton>
          );
        },
        size: 50,
        enableSorting: false,
      },
      {
        id: 'approve',
        header: () => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '0.9rem', opacity: 0.7 }} />
          </div>
        ),
        cell: ({ row }) => {
          const order = row.original;
          
          // Kontrola workflow stavu
          let workflowStates = [];
          try {
            if (Array.isArray(order.stav_workflow_kod)) {
              workflowStates = order.stav_workflow_kod;
            } else if (typeof order.stav_workflow_kod === 'string') {
              workflowStates = JSON.parse(order.stav_workflow_kod);
            }
          } catch (e) {
            workflowStates = [];
          }
          
          const allowedStates = ['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'SCHVALENA', 'ZAMITNUTA'];
          const lastState = workflowStates.length > 0 
            ? (typeof workflowStates[workflowStates.length - 1] === 'string' 
                ? workflowStates[workflowStates.length - 1] 
                : (workflowStates[workflowStates.length - 1].kod_stavu || workflowStates[workflowStates.length - 1].nazev_stavu || '')
              ).toUpperCase()
            : '';
          
          const isAllowedState = allowedStates.includes(lastState);
          
          if (!isAllowedState) return null;
          
          // Určení ikony podle stavu
          const pendingStates = ['ODESLANA_KE_SCHVALENI', 'CEKA_SE'];
          const approvedStates = ['SCHVALENA', 'ZAMITNUTA'];
          const isPending = pendingStates.includes(lastState);
          const isApproved = approvedStates.includes(lastState);
          
          // Použití barev z STATUS_COLORS (jako v dashboardu) + křížek pro zamítnutou
          let icon, iconColor, hoverBgColor, hoverBorderColor, hoverIconColor;
          
          if (isPending) {
            // Ke schválení - červená + hodiny
            icon = faHourglassHalf;
            iconColor = '#dc2626'; // červená
            hoverBgColor = '#fecaca';
            hoverBorderColor = '#dc2626';
            hoverIconColor = '#991b1b';
          } else if (lastState === 'SCHVALENA') {
            // Schválená - oranžová + fajfka
            icon = faCheckCircle;
            iconColor = '#ea580c'; // oranžová
            hoverBgColor = '#fed7aa';
            hoverBorderColor = '#ea580c';
            hoverIconColor = '#c2410c';
          } else {
            // Zamítnutá - šedá + křížek
            icon = faTimesCircle;
            iconColor = '#6b7280'; // šedá
            hoverBgColor = '#e5e7eb';
            hoverBorderColor = '#6b7280';
            hoverIconColor = '#4b5563';
          }
          
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const orderDetail = await getOrderDetailV3({ token, username, orderId: order.id });
                    // DEBUG: Order detail loaded with enriched data
                    setOrderToApprove(orderDetail);
                    setApprovalComment(orderDetail.schvaleni_komentar || '');
                    setShowApprovalDialog(true);
                  } catch (error) {
                    console.error('Chyba při načítání detailu objednávky:', error);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  color: iconColor,
                  cursor: 'pointer',
                  padding: '0.35rem 0.5rem',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = hoverBgColor;
                  e.currentTarget.style.borderColor = hoverBorderColor;
                  e.currentTarget.style.color = hoverIconColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.color = iconColor;
                }}
                title={isPending ? "Schválit objednávku (ke schválení)" : "Zobrazit schválení (vyřízeno)"}
              >
                <FontAwesomeIcon icon={icon} />
              </button>
            </div>
          );
        },
        size: 45,
        enableSorting: false,
        meta: {
          align: 'center',
          fixed: true,
        },
      },
      {
        accessorKey: 'dt_objednavky',
        id: 'dt_objednavky',
        header: 'Datum',
        cell: ({ row }) => {
          const order = row.original;
          const lastModified = order.dt_objednavky; // datum aktualizace
          const created = order.dt_vytvoreni || order.dt_objednavky;
          
          return (
            <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
              <div style={{ fontWeight: 'bold' }}>{formatDateOnly(lastModified)}</div>
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
                  fontWeight: 'normal',
                  color: '#1e293b',
                  marginTop: '4px',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.3',
                  maxHeight: '2.6em'
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
        size: 300,
        enableSorting: true,
      },
      {
        accessorKey: 'stav_objednavky',
        id: 'stav_objednavky',
        header: 'Stav',
        cell: ({ row }) => {
          const order = row.original;
          const displayStatus = getOrderDisplayStatus(order); // Český popis PŘÍMO z DB
          const statusCode = mapUserStatusToSystemCode(displayStatus); // Převod na systémový kód pro ikonu
          
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
                title={
                  !canCreateInvoice(order)
                    ? 'Evidování faktury je dostupné pouze ve stavech: Fakturace, Věcná správnost, Zkontrolována (ne v Dokončená)'
                    : 'Evidovat fakturu k této objednávce'
                }
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
  }, [visibleColumns, columnOrder, handleRowExpand, handleToggleAllRows, onActionClick, canEdit, canCreateInvoice, canExportDocument, isExpanded]);

  // Filtrovat data podle columnFilters (lokální filtr v tabulce)
  // ⚠️ VYPNUTO - Filtrování se provádí na backendu v API
  // Data jsou již vyfiltrovaná, takže lokální filtr by je filtroval 2x
  const filteredData = useMemo(() => {
    // Vrátit data bez dalšího filtrování - backend už je vyfiltroval
    return data;
  }, [data]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true, // Povolit 3-state sorting: asc -> desc -> none
    enableMultiSort: true, // Povolit multi-column sorting
    maxMultiSortColCount: 5, // Maximálně 5 sloupců pro třídění
    isMultiSortEvent: (e) => e.shiftKey, // Shift+click pro multi-sort
  });

  const activeFiltersCount = Object.values(localColumnFilters).filter(v => v).length;
  const hasActiveSorting = sorting.length > 0;
  const hasData = data && data.length > 0;
  const colSpan = table.getAllColumns().length;

  return (
    <>
    <TableWrapper>
    <TableContainer ref={tableContainerRef}>
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
              <ResetButton onClick={() => {
                // Clear local filters immediately
                setLocalColumnFilters({});
                // Call parent to clear all filters
                Object.keys(localColumnFilters).forEach(columnId => {
                  onColumnFiltersChange?.(columnId, '');
                });
              }}>
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
                const canHide = columnId !== 'expander' && columnId !== 'actions' && columnId !== 'approve';
                
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
                      {header.column.getCanSort() && (() => {
                        const columnId = header.column.id;
                        
                        // Datum sloupec - DatePicker
                        if (columnId === 'dt_objednavky') {
                          return (
                            <div style={{ position: 'relative', marginTop: '4px' }}>
                              <DatePicker
                                fieldName={`${columnId}_filter`}
                                value={localColumnFilters[columnId] || ''}
                                onChange={(value) => handleFilterChange(columnId, value)}
                                placeholder="Datum"
                                variant="compact"
                              />
                            </div>
                          );
                        }
                        
                        // Stav objednávky - MULTISELECT z číselníku (načítá z DB - 25_ciselnik_stavy)
                        if (columnId === 'stav_objednavky') {
                          return (
                            <StavMultiSelect
                              columnId={columnId}
                              localColumnFilters={localColumnFilters}
                              handleFilterChange={handleFilterChange}
                              orderStatesList={orderStatesList}
                            />
                          );
                        }
                        
                        // Číselné sloupce - OperatorInput
                        if (columnId === 'max_cena_s_dph' || columnId === 'cena_s_dph' || columnId === 'faktury_celkova_castka_s_dph') {
                          return (
                            <div style={{ position: 'relative', marginTop: '4px' }}>
                              <OperatorInput
                                value={localColumnFilters[columnId] || ''}
                                onChange={(value) => handleFilterChange(columnId, value)}
                                placeholder={
                                  columnId === 'max_cena_s_dph' ? 'Max. cena s DPH' :
                                  columnId === 'cena_s_dph' ? 'Cena s DPH' :
                                  'Cena FA s DPH'
                                }
                              />
                            </div>
                          );
                        }
                        
                        // Textové sloupce - standardní input
                        return (
                          <ColumnFilterWrapper>
                            <FontAwesomeIcon icon={faSearch} />
                            <ColumnFilterInput
                              type="text"
                              placeholder="Filtrovat..."
                              value={localColumnFilters[columnId] || ''}
                              onChange={(e) => handleFilterChange(columnId, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {localColumnFilters[columnId] && (
                              <ColumnClearButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFilterChange(columnId, '');
                                }}
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </ColumnClearButton>
                            )}
                          </ColumnFilterWrapper>
                        );
                      })()}
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
              const expanded = isExpanded(order.id);
              const rowColSpan = row.getVisibleCells().length;
              
              // Získat detail data z hooku
              const rowDetail = expanded ? getRowDetail(order.id) : null;
              const isLoadingDetail = expanded && loadingDetails.includes(order.id);
              const detailError = expanded && errors[order.id] ? errors[order.id] : null;
              
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
              
              // 🎯 Highlight animace pro právě editovanou objednávku
              const isHighlighted = highlightOrderId && order.id === highlightOrderId;
              if (isHighlighted) {
                rowStyle.animation = `${highlightPulse} 2s ease-out`;
              }
              
              return (
                <React.Fragment key={row.id}>
                  <tr 
                    style={rowStyle}
                    data-order-id={order.id} // 🎯 Pro scroll targeting
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        $align={cell.column.columnDef.meta?.align || 'left'}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </tr>
                  {expanded && (
                    <OrderExpandedRowV3
                      order={order}
                      detail={rowDetail}
                      loading={isLoadingDetail}
                      error={detailError}
                      onRetry={() => loadOrderDetail(order.id)}
                      onForceRefresh={() => refreshDetail(order.id)}
                      colSpan={rowColSpan}
                      token={token}
                      username={username}
                      onActionClick={onActionClick}
                      canEdit={canEdit}
                    />
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
    </TableWrapper>
    
    {/* Fixed horizontal scrollbar - vždy na spodním okraji layoutu */}
    {showFixedScrollbar && ReactDOM.createPortal(
      <FixedScrollbarContainer ref={fixedScrollbarRef}>
        <FixedScrollbarContent />
      </FixedScrollbarContainer>,
      document.body
    )}

      {/* 🎯 Schvalovací dialog */}
      {showApprovalDialog && orderToApprove && ReactDOM.createPortal(
        <ApprovalDialogOverlay>
          <ApprovalDialog onClick={(e) => e.stopPropagation()}>
            <ApprovalDialogHeader>
              <ApprovalDialogIcon>✅</ApprovalDialogIcon>
              <ApprovalDialogTitle>
                Schválení objednávky
                <span style={{ 
                  marginLeft: '1rem', 
                  fontSize: '0.9em', 
                  fontWeight: 700,
                  color: '#fbbf24',
                  background: '#065f46',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  border: '2px solid #047857',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                }}>
                  {orderToApprove.stav_objednavky || '---'}
                </span>
                {(orderToApprove.mimoradna_udalost == 1 || orderToApprove.mimoradna_udalost === '1') && (
                  <span style={{ 
                    marginLeft: '0.5rem',
                    fontSize: '1.1em',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    color: '#dc2626',
                    fontWeight: 'bold'
                  }} title="Mimořádná událost">
                    <FontAwesomeIcon icon={faBoltLightning} />
                  </span>
                )}
              </ApprovalDialogTitle>
            </ApprovalDialogHeader>

            <ApprovalDialogContent>
              {/* 2-Column Layout: Levý sloupec = základní info, pravý = financování */}
              <ApprovalTwoColumnLayout>
                {/* LEVÝ SLOUPEC - Základní informace */}
                <ApprovalLeftColumn>
                  <ApprovalCompactList>
                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Číslo:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        <strong>{orderToApprove.cislo_objednavky || orderToApprove.ev_cislo || `#${orderToApprove.id}`}</strong>
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Předmět:</ApprovalCompactLabel>
                      <ApprovalCompactValue>{orderToApprove.predmet || '---'}</ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Objednatel:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        {(() => {
                          // V3 používá flat fields: objednatel_jmeno, objednatel_prijmeni, objednatel_titul_pred, objednatel_titul_za
                          if (orderToApprove.objednatel_jmeno || orderToApprove.objednatel_prijmeni) {
                            const titul_pred = orderToApprove.objednatel_titul_pred ? orderToApprove.objednatel_titul_pred + ' ' : '';
                            const jmeno = orderToApprove.objednatel_jmeno || '';
                            const prijmeni = orderToApprove.objednatel_prijmeni || '';
                            const titul_za = orderToApprove.objednatel_titul_za ? ', ' + orderToApprove.objednatel_titul_za : '';
                            return `${titul_pred}${jmeno} ${prijmeni}${titul_za}`.replace(/\s+/g, ' ').trim();
                          }
                          return '---';
                        })()}
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Garant:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        {(() => {
                          // V3 používá flat fields: garant_jmeno, garant_prijmeni, garant_titul_pred, garant_titul_za
                          if (orderToApprove.garant_jmeno || orderToApprove.garant_prijmeni) {
                            const titul_pred = orderToApprove.garant_titul_pred ? orderToApprove.garant_titul_pred + ' ' : '';
                            const jmeno = orderToApprove.garant_jmeno || '';
                            const prijmeni = orderToApprove.garant_prijmeni || '';
                            const titul_za = orderToApprove.garant_titul_za ? ', ' + orderToApprove.garant_titul_za : '';
                            return `${titul_pred}${jmeno} ${prijmeni}${titul_za}`.replace(/\s+/g, ' ').trim();
                          }
                          return '---';
                        })()}
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    {(() => {
                      // Parse strediska_kod if it's a string
                      let strediska_array = orderToApprove.strediska_kod;
                      if (typeof strediska_array === 'string') {
                        try {
                          strediska_array = JSON.parse(strediska_array);
                        } catch (e) {
                          strediska_array = null;
                        }
                      }
                      
                      if (strediska_array && Array.isArray(strediska_array) && strediska_array.length > 0) {
                        return (
                          <ApprovalCompactItem>
                            <ApprovalCompactLabel>Střediska:</ApprovalCompactLabel>
                            <ApprovalCompactValue>
                              {orderToApprove._enriched?.strediska && Array.isArray(orderToApprove._enriched.strediska) && orderToApprove._enriched.strediska.length > 0
                                ? orderToApprove._enriched.strediska.map(s => s.nazev || s.kod).join(', ')
                                : strediska_array.join(', ')}
                            </ApprovalCompactValue>
                          </ApprovalCompactItem>
                        );
                      }
                      return null;
                    })()}

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Max. cena:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>
                          {orderToApprove.max_cena_s_dph 
                            ? `${parseFloat(orderToApprove.max_cena_s_dph).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`
                            : '---'}
                        </strong>
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>
                  </ApprovalCompactList>

                  {/* Poznámka ke schválení - v levém sloupci */}
                  <ApprovalSection style={{ marginTop: '1rem' }}>
                    <ApprovalSectionTitle>📝 Poznámka ke schválení (nepovinná)</ApprovalSectionTitle>
                    <ApprovalDialogTextarea
                      $hasError={!!approvalCommentError}
                      value={approvalComment}
                      onChange={(e) => {
                        setApprovalComment(e.target.value);
                        if (approvalCommentError) {
                          setApprovalCommentError('');
                        }
                      }}
                      placeholder="Nepovinná poznámka ke schválení (povinná pro Odložit/Zamítnout)..."
                    />
                    {approvalCommentError && (
                      <ApprovalDialogError>{approvalCommentError}</ApprovalDialogError>
                    )}
                  </ApprovalSection>
                </ApprovalLeftColumn>

                {/* PRAVÝ SLOUPEC - Financování (LP/Smlouvy) */}
                <ApprovalRightColumn>
                  {/* LP */}
                  {orderToApprove.financovani?.lp_kody && Array.isArray(orderToApprove.financovani.lp_kody) && orderToApprove.financovani.lp_kody.length > 0 && (
                    <>
                      <ApprovalSectionTitle>💰 Limitované přísliby</ApprovalSectionTitle>
                      {(() => {
                        const lpInfo = orderToApprove._enriched?.lp_info || [];
                        
                        if (lpInfo.length > 0) {
                          return lpInfo.map((lp, idx) => {
                            // Výpočet procenta čerpání (plánovaného)
                            const hodnotaLP = parseFloat(lp.total_limit) || 0;
                            const cerpanoPredpoklad = parseFloat(lp.cerpano_predpoklad) || 0;
                            const cerpanoSkutecne = parseFloat(lp.cerpano_skutecne) || 0;
                            const percentCerpani = hodnotaLP > 0 ? Math.round((cerpanoPredpoklad / hodnotaLP) * 100) : 0;
                            const hasLimit = hodnotaLP > 0;
                            
                            return (
                              <ApprovalLPItem key={idx}>
                                <ApprovalLPHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{lp.kod} — {lp.nazev}</span>
                                  {hasLimit && (
                                    <div style={{
                                      background: percentCerpani <= 100 ? '#dcfce7' : '#fee2e2',
                                      color: percentCerpani <= 100 ? '#166534' : '#991b1b',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.875rem',
                                      fontWeight: 700,
                                      border: `1px solid ${percentCerpani <= 100 ? '#86efac' : '#fca5a5'}`,
                                      minWidth: '50px',
                                      textAlign: 'center'
                                    }}>
                                      {percentCerpani}%
                                    </div>
                                  )}
                                </ApprovalLPHeader>
                                <ApprovalLPRow>
                                  <span>Celkový limit:</span>
                                  <strong>{lp.total_limit ? parseFloat(lp.total_limit).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow>
                                  <span>Čerpáno (předpokl.):</span>
                                  <strong>{cerpanoPredpoklad.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow $highlight>
                                  <span>Zbývá (předpokl.):</span>
                                  <strong style={{ color: lp.remaining_budget && parseFloat(lp.remaining_budget) < 0 ? '#dc2626' : '#059669' }}>
                                    {lp.remaining_budget ? parseFloat(lp.remaining_budget).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč
                                  </strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow>
                                  <span>Čerpáno (skutečně):</span>
                                  <strong>{cerpanoSkutecne.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                                </ApprovalLPRow>
                                
                                {/* Roční plán čerpání - progress bar */}
                                {hodnotaLP > 0 && (() => {
                                  const currentMonth = new Date().getMonth();
                                  const currentMonthName = new Date().toLocaleDateString('cs-CZ', { month: 'long' });
                                  const planedPercentForCurrentMonth = Math.floor(((currentMonth + 1) / 12.0) * 100.0);
                                  const isUnderPlan = percentCerpani <= planedPercentForCurrentMonth;
                                  
                                  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                                  
                                  return (
                                    <ApprovalLPRow style={{ flexDirection: 'column', alignItems: 'flex-start', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Roční plán čerpání:</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isUnderPlan ? '#059669' : '#dc2626' }}>
                                          {percentCerpani}% / {planedPercentForCurrentMonth}% ({currentMonthName})
                                        </span>
                                      </div>
                                      <div style={{
                                        display: 'flex',
                                        width: '100%',
                                        minHeight: '36px',
                                        gap: '2px',
                                        background: '#f1f5f9',
                                        borderRadius: '4px',
                                        padding: '3px',
                                        position: 'relative'
                                      }}>
                                        {Array.from({ length: 12 }).map((_, monthIndex) => {
                                          const isCurrentMonth = monthIndex === currentMonth;
                                          const planedPercent = Math.floor(((monthIndex + 1) / 12.0) * 100.0);
                                          
                                          let bgColor;
                                          if (isCurrentMonth) {
                                            bgColor = isUnderPlan ? '#22c55e' : '#ef4444';
                                          } else if (monthIndex < currentMonth) {
                                            bgColor = '#94a3b8';
                                          } else {
                                            bgColor = '#e2e8f0';
                                          }
                                          
                                          const textColor = isCurrentMonth ? '#ffffff' : (monthIndex < currentMonth ? '#1e293b' : '#64748b');
                                          
                                          return (
                                            <div
                                              key={monthIndex}
                                              style={{
                                                flex: 1,
                                                background: bgColor,
                                                borderRadius: '3px',
                                                position: 'relative',
                                                border: isCurrentMonth ? '2px solid #0f172a' : 'none',
                                                minHeight: '30px',
                                                paddingLeft: '1px',
                                                paddingRight: '1px'
                                              }}
                                              title={`${percentCerpani}% / ${planedPercent}%`}
                                            >
                                              <div style={{
                                                position: 'absolute',
                                                top: '2px',
                                                right: '3px',
                                                fontSize: '0.5rem',
                                                fontWeight: 500,
                                                opacity: 0.6,
                                                color: textColor,
                                                zIndex: 10
                                              }}>
                                                {romanNumerals[monthIndex]}
                                              </div>
                                              
                                              <div style={{ 
                                                position: 'absolute',
                                                bottom: '0px',
                                                left: '0',
                                                right: '0',
                                                textAlign: 'center',
                                                fontSize: '0.65rem', 
                                                fontWeight: 700,
                                                color: textColor
                                              }}>
                                                {planedPercent}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </ApprovalLPRow>
                                  );
                                })()}
                              </ApprovalLPItem>
                            );
                          });
                        } else {
                          return <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{orderToApprove.financovani.lp_kody.join(', ')}</div>;
                        }
                      })()}
                      {orderToApprove.financovani?.lp_poznamka && (
                        <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                          <strong>Poznámka:</strong> {orderToApprove.financovani.lp_poznamka}
                        </div>
                      )}
                    </>
                  )}

                  {/* Smlouva */}
                  {(orderToApprove.cislo_smlouvy || orderToApprove.financovani?.cislo_smlouvy) && (
                    <>
                      <ApprovalSectionTitle style={{ marginTop: orderToApprove.financovani?.lp_kody ? '1rem' : '0' }}>📄 Smlouva</ApprovalSectionTitle>
                      {(() => {
                        const smlouvaInfo = orderToApprove._enriched?.smlouva_info;
                        const cisloSmlouvy = orderToApprove.cislo_smlouvy || orderToApprove.financovani?.cislo_smlouvy;
                        
                        if (smlouvaInfo && smlouvaInfo.hodnota) {
                          const hodnotaSmlouvy = parseFloat(smlouvaInfo.hodnota) || 0;
                          const cerpanoPozadovano = parseFloat(smlouvaInfo.cerpano_pozadovano) || 0;
                          const percentCerpani = hodnotaSmlouvy > 0 ? Math.round((cerpanoPozadovano / hodnotaSmlouvy) * 100) : 0;
                          const hasStropovaCena = hodnotaSmlouvy > 0;
                          
                          return (
                            <ApprovalLPItem>
                              <ApprovalLPHeader>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{cisloSmlouvy}</span>
                                  {hasStropovaCena && (
                                    <div style={{
                                      background: percentCerpani <= 100 ? '#dcfce7' : '#fee2e2',
                                      color: percentCerpani <= 100 ? '#166534' : '#991b1b',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '4px',
                                      fontSize: '0.875rem',
                                      fontWeight: 700,
                                      border: `1px solid ${percentCerpani <= 100 ? '#86efac' : '#fca5a5'}`,
                                      minWidth: '50px',
                                      textAlign: 'center'
                                    }}>
                                      {percentCerpani}%
                                    </div>
                                  )}
                                </div>
                              </ApprovalLPHeader>
                              <ApprovalLPRow>
                                <span>Hodnota smlouvy:</span>
                                <strong>{parseFloat(smlouvaInfo.hodnota).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                              </ApprovalLPRow>
                              <ApprovalLPRow>
                                <span>Čerpáno (požad.):</span>
                                <strong>{smlouvaInfo.cerpano_pozadovano ? parseFloat(smlouvaInfo.cerpano_pozadovano).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                              </ApprovalLPRow>
                              <ApprovalLPRow $highlight>
                                <span>Zbývá (požad.):</span>
                                <strong style={{ color: smlouvaInfo.zbyva_pozadovano && parseFloat(smlouvaInfo.zbyva_pozadovano) < 0 ? '#dc2626' : '#059669' }}>
                                  {smlouvaInfo.zbyva_pozadovano ? parseFloat(smlouvaInfo.zbyva_pozadovano).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč
                                </strong>
                              </ApprovalLPRow>
                              <ApprovalLPRow>
                                <span>Čerpáno (skut.):</span>
                                <strong>{smlouvaInfo.cerpano_skutecne ? parseFloat(smlouvaInfo.cerpano_skutecne).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                              </ApprovalLPRow>
                              
                              {/* Roční plán čerpání - progress bar */}
                              {hodnotaSmlouvy > 0 && (() => {
                                const currentMonth = new Date().getMonth(); // 0-11
                                const currentMonthName = new Date().toLocaleDateString('cs-CZ', { month: 'long' });
                                const planedPercentForCurrentMonth = Math.floor(((currentMonth + 1) / 12.0) * 100.0);
                                const isUnderPlan = percentCerpani <= planedPercentForCurrentMonth;
                                
                                const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                                
                                return (
                                  <ApprovalLPRow style={{ flexDirection: 'column', alignItems: 'flex-start', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Roční plán čerpání:</span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isUnderPlan ? '#059669' : '#dc2626' }}>
                                        {percentCerpani}% / {planedPercentForCurrentMonth}% ({currentMonthName})
                                      </span>
                                    </div>
                                    <div style={{
                                      display: 'flex',
                                      width: '100%',
                                      minHeight: '36px',
                                      gap: '2px',
                                      background: '#f1f5f9',
                                      borderRadius: '4px',
                                      padding: '3px',
                                      position: 'relative'
                                    }}>
                                      {Array.from({ length: 12 }).map((_, monthIndex) => {
                                        const isCurrentMonth = monthIndex === currentMonth;
                                        const planedPercent = Math.floor(((monthIndex + 1) / 12.0) * 100.0);
                                        
                                        let bgColor;
                                        if (isCurrentMonth) {
                                          bgColor = isUnderPlan ? '#22c55e' : '#ef4444';
                                        } else if (monthIndex < currentMonth) {
                                          bgColor = '#94a3b8';
                                        } else {
                                          bgColor = '#e2e8f0';
                                        }
                                        
                                        const textColor = isCurrentMonth ? '#ffffff' : (monthIndex < currentMonth ? '#1e293b' : '#64748b');
                                        
                                        return (
                                          <div
                                            key={monthIndex}
                                            style={{
                                              flex: 1,
                                              background: bgColor,
                                              borderRadius: '3px',
                                              position: 'relative',
                                              border: isCurrentMonth ? '2px solid #0f172a' : 'none',
                                              minHeight: '30px',
                                              paddingLeft: '1px',
                                              paddingRight: '1px'
                                            }}
                                            title={`${percentCerpani}% / ${planedPercent}%`}
                                          >
                                            <div style={{
                                              position: 'absolute',
                                              top: '2px',
                                              right: '3px',
                                              fontSize: '0.5rem',
                                              fontWeight: 500,
                                              opacity: 0.6,
                                              color: textColor,
                                              zIndex: 10
                                            }}>
                                              {romanNumerals[monthIndex]}
                                            </div>
                                            
                                            <div style={{ 
                                              position: 'absolute',
                                              bottom: '0px',
                                              left: '0',
                                              right: '0',
                                              textAlign: 'center',
                                              fontSize: '0.65rem', 
                                              fontWeight: 700,
                                              color: textColor
                                            }}>
                                              {planedPercent}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </ApprovalLPRow>
                                );
                              })()}
                            </ApprovalLPItem>
                          );
                        } else {
                          return (
                            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                              Číslo: <strong>{cisloSmlouvy}</strong>
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}
                </ApprovalRightColumn>
              </ApprovalTwoColumnLayout>

              <ApprovalDialogActions>
                <ApprovalDialogButton onClick={() => {
                  setShowApprovalDialog(false);
                  setOrderToApprove(null);
                  setApprovalComment('');
                  setApprovalCommentError('');
                }}>
                  Storno
                </ApprovalDialogButton>

                <ApprovalDialogButton 
                  $postpone
                  onClick={() => handleApprovalAction('postpone')}
                >
                  ⏰ Odložit
                </ApprovalDialogButton>

                <ApprovalDialogButton 
                  $reject
                  onClick={() => handleApprovalAction('reject')}
                >
                  ❌ Zamítnout
                </ApprovalDialogButton>

                <ApprovalDialogButton 
                  $approve
                  onClick={() => handleApprovalAction('approve')}
                >
                  ✅ Schválit
                </ApprovalDialogButton>
              </ApprovalDialogActions>
            </ApprovalDialogContent>
          </ApprovalDialog>
        </ApprovalDialogOverlay>,
        document.body
      )}
    </>
  );
};

export default OrdersTableV3;
