/**
 * Role Tab - Správa rolí s právy a vazbami na uživatele
 * Design podle DOCX šablon s TanStack Table
 *
 * @author Frontend Team
 * @date 2025-11-17
 * @version 4.0 - Přidána plná CRUD funkcionalita a přidělování práv (ADMIN, DICT_MANAGE)
 */

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPlus, faEdit, faTrash, faEraser, faTimes,
  faCheckCircle, faTimesCircle, faChevronDown, faChevronUp,
  faShield, faUser, faUsers, faKey, faGlobe, faUserShield,
  faEnvelope, faPhone, faBolt, faSyncAlt, faBroom, faCopy,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { Shield, Users, Key } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import { DictionaryCacheContext } from '../../../context/DictionaryCacheContext';
import apiv2Dictionaries from '../../../services/apiv2Dictionaries';
import ConfirmDialog from '../../ConfirmDialog';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import UniversalDictionaryDialog from '../UniversalDictionaryDialog';
import DictionaryConfirmDialog from '../DictionaryConfirmDialog';

// =============================================================================
// SCROLLBAR STYLES
// =============================================================================

const scrollbarStyles = `
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 4px;

    &:hover {
      background: #64748b;
    }
  }

  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

// =============================================================================
// STYLED COMPONENTS - podle DOCX vzoru
// =============================================================================

const Container = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 100%;

  svg.search-icon {
    position: absolute;
    left: 0.75rem;
    color: #6b7280;
    pointer-events: none;
    font-size: 1rem;
  }

  input {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 2.5rem;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: #9ca3af;
    }
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    color: #dc2626;
    transform: translateY(-50%) scale(1.2);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid ${props => props.$variant === 'primary' ? '#3b82f6' : props.$active ? '#3b82f6' : '#d1d5db'};
  border-radius: 8px;
  background: ${props => {
    if (props.$variant === 'primary') return '#3b82f6';
    if (props.$active) return '#eff6ff';
    return 'white';
  }};
  color: ${props => {
    if (props.$variant === 'primary') return 'white';
    if (props.$active) return '#3b82f6';
    return '#6b7280';
  }};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => {
      if (props.$variant === 'primary') return '#2563eb';
      if (props.$active) return '#dbeafe';
      return '#f9fafb';
    }};
    border-color: ${props => props.$variant === 'primary' ? '#2563eb' : '#3b82f6'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    font-size: 1rem;
  }
`;

const TableWrapper = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const TableContainer = styled.div`
  overflow-x: auto;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 4px;

    &:hover {
      background: #64748b;
    }
  }

  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  /* Pevné šířky pro specifické sloupce */
  th:nth-of-type(1), td:nth-of-type(1) { width: 375px !important; min-width: 375px !important; max-width: 375px !important; }   /* Název role - široký fixní */
  th:nth-of-type(2), td:nth-of-type(2) { width: auto !important; min-width: 200px !important; }                                   /* Popis - dynamický */
  th:nth-of-type(3), td:nth-of-type(3) { width: 100px !important; min-width: 100px !important; max-width: 100px !important; }   /* Počet práv - úzký fixní */
  th:nth-of-type(4), td:nth-of-type(4) { width: 100px !important; min-width: 100px !important; max-width: 100px !important; }   /* Počet uživatelů - úzký fixní */
  th:nth-of-type(5), td:nth-of-type(5) { width: 80px !important; min-width: 80px !important; max-width: 80px !important; }      /* Aktivní - úzký fixní */
  th:last-child, td:last-child { width: 110px !important; min-width: 110px !important; max-width: 110px !important; }           /* Akce - úzký fixní */
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Th = styled.th`
  padding: 1rem 0.75rem;
  text-align: center;
  color: white;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  white-space: nowrap;
  width: ${props => props.$width ? `${props.$width}px` : 'auto'};

  &:hover {
    background: ${props => props.$sortable ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  }

  &:first-of-type {
    text-align: left;
  }
`;

const Tbody = styled.tbody``;

const Td = styled.td`
  padding: 1rem 0.75rem;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  width: ${props => props.$width ? `${props.$width}px` : 'auto'};

  &:first-of-type {
    text-align: left;
  }
`;

const FilterRow = styled.tr`
  background: #f8f9fa;
`;

const FilterCell = styled.th`
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  width: ${props => props.$width ? `${props.$width}px` : 'auto'};
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;

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

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 0.75rem;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;

  &:hover {
    color: #ef4444;
  }

  svg {
    width: 12px !important;
    height: 12px !important;
  }
`;

const IconFilterButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 4px;

  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.1);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 20px !important;
    height: 20px !important;
  }
`;

const RoleName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  color: #1e293b;
`;

const RoleIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${props => props.$inactive
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$active ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.$active ? '#166534' : '#991b1b'};

  svg {
    width: 12px;
    height: 12px;
  }

  /* Puntík místo ikony */
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.$active ? '#22c55e' : '#ef4444'};
    margin-right: 0.25rem;
  }
`;

const StatBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 0.5rem;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${props => {
    if (props.$type === 'rights') return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    if (props.$type === 'users') return 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
    return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  }};
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const UserCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: help;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #1e293b;
    background: #f1f5f9;
  }

  ${props => props.$variant === 'expand' ? `
    &:hover {
      color: #1e293b;
      background: #f1f5f9;
    }
  ` : props.$variant === 'rights' ? `
    &:hover {
      color: #8b5cf6;
      background: #f5f3ff;
    }
  ` : props.$variant === 'edit' ? `
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  ` : props.$variant === 'delete' ? `
    &:hover {
      color: #dc2626;
      background: #fef2f2;
    }
  ` : ''}

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ExpandedRow = styled.tr`
  background: #f8fafc !important;

  &:hover {
    background: #f8fafc !important;
  }
`;

const ExpandedCell = styled.td`
  padding: 0 !important;
`;

const ExpandedContent = styled.div`
  padding: 1.5rem;
  border-top: 2px solid #e2e8f0;
`;

const Section = styled.div`
  margin-bottom: ${props => props.$last ? '0' : '1.5rem'};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;

  h4 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  svg {
    color: #3b82f6;
    width: 18px;
    height: 18px;
  }
`;

const PermissionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
`;

const PermissionCard = styled.div`
  padding: 0.875rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }
`;

const PermissionCode = styled.div`
  font-family: 'Courier New', monospace;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.375rem;
`;

const PermissionDesc = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.4;
`;

const UsersList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const UserCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
`;

const UserHeader = styled.div`
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const UserAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-weight: 700;
  color: #1e293b;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
`;

const UserMeta = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 1rem;

  > span {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const UserRightsCount = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.375rem 0.75rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);
`;

const UserRightsContent = styled.div`
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    opacity: 0.3;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    color: #64748b;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PaginationInfo = styled.div`
  color: #64748b;
  font-size: 0.875rem;
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PageButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #f8fafc;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #1f2937;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const PaginationButton = styled.button`
  padding: 0.4rem 0.65rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  min-width: 2.5rem;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #f8fafc;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.div`
  color: #64748b;
  font-size: 0.875rem;
`;

// =============================================================================
// PRÁVA MANAGEMENT DIALOG
// =============================================================================

const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const slideInUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const DialogContent = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 1100px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DialogHeader = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const DialogBody = styled.div`
  padding: 2rem;
  overflow-y: auto;
  flex: 1;

  ${scrollbarStyles}
`;

const DialogFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 2px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
`;

const PravaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PravaSection = styled.div`
  h3 {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const PravaList = styled.div`
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  max-height: 400px;
  overflow-y: auto;
  background: #fafbfc;

  ${scrollbarStyles}
`;

const PravoItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  transition: background 0.2s;
  background: white;

  &:first-of-type {
    border-radius: 10px 10px 0 0;
  }

  &:last-child {
    border-bottom: none;
    border-radius: 0 0 10px 10px;
  }

  &:only-child {
    border-radius: 10px;
  }

  &:hover {
    background: #f8fafc;
  }
`;

const PravoInfo = styled.div`
  flex: 1;
  min-width: 0;
  max-width: calc(100% - 120px);

  .kod {
    font-family: 'Courier New', monospace;
    font-weight: 700;
    color: #1e293b;
    font-size: 0.8125rem;
    margin-bottom: 0.25rem;
    word-break: break-word;
  }

  .popis {
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
`;

const PravoButton = styled.button`
  padding: 0.5rem 0.875rem;
  border: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  ${props => props.$variant === 'add' && `
    background: #10b981;
    color: white;

    &:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
  `}

  ${props => props.$variant === 'remove' && `
    background: #ef4444;
    color: white;

    &:hover:not(:disabled) {
      background: #dc2626;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
`;

const SecondaryButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: #f3f4f6;
  color: #374151;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Styled komponenty pro CopyPravaDialog
const DialogTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SearchInputStyled = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 2px solid #e5e7eb;
  background: white;
  color: #6b7280;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PravaManagementDialog = ({ role, availablePrava, onSave, onClose }) => {
  const [searchAssigned, setSearchAssigned] = useState('');
  const [searchAvailable, setSearchAvailable] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Lokální stav pro pending změny
  const [pendingChanges, setPendingChanges] = useState({
    toAdd: [],     // Pole ID práv k přidání
    toRemove: []   // Pole ID práv k odebrání
  });

  // Lokální přidání práva (přesune z available do assigned)
  const handleLocalAdd = (pravo) => {
    const originalAssignedIds = (role.prava_globalni || []).map(p => p.id);
    const wasOriginallyAssigned = originalAssignedIds.includes(pravo.id);
    
    setPendingChanges(prev => {
      // Pokud právo bylo v toRemove, jen ho odstraň odtamtud (= vrátí se do původního stavu)
      if (prev.toRemove.includes(pravo.id)) {
        return {
          toAdd: prev.toAdd,
          toRemove: prev.toRemove.filter(id => id !== pravo.id)
        };
      }
      
      // Jinak přidej do toAdd (pouze pokud nebylo původně přiřazené)
      if (!wasOriginallyAssigned && !prev.toAdd.includes(pravo.id)) {
        return {
          toAdd: [...prev.toAdd, pravo.id],
          toRemove: prev.toRemove
        };
      }
      
      return prev;
    });
  };

  // Lokální odebrání práva (přesune z assigned do available)
  const handleLocalRemove = (pravo) => {
    const originalAssignedIds = (role.prava_globalni || []).map(p => p.id);
    const wasOriginallyAssigned = originalAssignedIds.includes(pravo.id);
    
    setPendingChanges(prev => {
      // Pokud právo bylo v toAdd, jen ho odstraň odtamtud (= vrátí se do původního stavu)
      if (prev.toAdd.includes(pravo.id)) {
        return {
          toAdd: prev.toAdd.filter(id => id !== pravo.id),
          toRemove: prev.toRemove
        };
      }
      
      // Jinak přidej do toRemove (pouze pokud bylo původně přiřazené)
      if (wasOriginallyAssigned && !prev.toRemove.includes(pravo.id)) {
        return {
          toAdd: prev.toAdd,
          toRemove: [...prev.toRemove, pravo.id]
        };
      }
      
      return prev;
    });
  };

  // Počet změn
  const changesCount = pendingChanges.toAdd.length + pendingChanges.toRemove.length;
  const hasChanges = changesCount > 0;

  // Práva přiřazená k roli (s aplikovanými lokálními změnami)
  const assignedPrava = useMemo(() => {
    const originalAssigned = role.prava_globalni || [];
    
    // Přidej lokálně přidaná práva
    const addedPrava = availablePrava.filter(p => pendingChanges.toAdd.includes(p.id));
    
    // Odeber lokálně odebraná práva
    const current = [
      ...originalAssigned.filter(p => !pendingChanges.toRemove.includes(p.id)),
      ...addedPrava
    ];
    
    // Aplikuj filtr
    return current.filter(p => 
      p.kod_prava?.toLowerCase().includes(searchAssigned.toLowerCase()) ||
      p.popis?.toLowerCase().includes(searchAssigned.toLowerCase())
    );
  }, [role, availablePrava, searchAssigned, pendingChanges]);

  // Dostupná práva (s aplikovanými lokálními změnami)
  const availableToAssign = useMemo(() => {
    const originalAssignedIds = (role.prava_globalni || []).map(p => p.id);
    
    // Dostupná = (všechna - původně přiřazená - lokálně přidaná) + lokálně odebraná
    const current = availablePrava.filter(p => {
      const wasOriginallyAssigned = originalAssignedIds.includes(p.id);
      const isPendingAdd = pendingChanges.toAdd.includes(p.id);
      const isPendingRemove = pendingChanges.toRemove.includes(p.id);
      
      // Dostupné, pokud: (nebylo přiřazené A není pending add) NEBO je pending remove
      return (!wasOriginallyAssigned && !isPendingAdd) || isPendingRemove;
    });
    
    // Aplikuj filtr
    return current.filter(p => 
      p.kod_prava?.toLowerCase().includes(searchAvailable.toLowerCase()) ||
      p.popis?.toLowerCase().includes(searchAvailable.toLowerCase())
    );
  }, [role, availablePrava, searchAvailable, pendingChanges]);

  // Uložení změn
  const handleSave = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(pendingChanges.toAdd, pendingChanges.toRemove);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <DialogOverlay>
      <DialogContent>
        <DialogHeader>
          <h2>
            <Shield size={24} />
            Správa práv role: {role.nazev_role}
          </h2>
          <CloseButton onClick={onClose} title="Zavřít">
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </DialogHeader>

        <DialogBody>
          <PravaGrid>
            <PravaSection>
              <h3>
                <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
                Přiřazená práva ({assignedPrava.length})
              </h3>
              <SearchBox style={{ marginBottom: '1rem' }}>
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder="Hledat v přiřazených právech..."
                  value={searchAssigned}
                  onChange={(e) => setSearchAssigned(e.target.value)}
                />
                {searchAssigned && (
                  <ClearButton onClick={() => setSearchAssigned('')}>
                    <FontAwesomeIcon icon={faTimes} />
                  </ClearButton>
                )}
              </SearchBox>
              <PravaList>
                {assignedPrava.length === 0 ? (
                  <EmptyMessage>
                    {searchAssigned ? 'Žádná práva nenalezena' : 'Žádná přiřazená práva'}
                  </EmptyMessage>
                ) : (
                  assignedPrava.map((pravo, index) => {
                    const isPendingAdd = pendingChanges.toAdd.includes(pravo.id);
                    return (
                      <PravoItem 
                        key={`assigned-${pravo.id}-${index}`}
                        style={isPendingAdd ? { 
                          background: '#d1fae5', 
                          borderColor: '#10b981',
                          borderWidth: '2px' 
                        } : {}}
                      >
                        <PravoInfo>
                          <div className="kod">
                            {isPendingAdd && '✨ '}
                            {pravo.kod_prava}
                          </div>
                          {pravo.popis && <div className="popis">{pravo.popis}</div>}
                        </PravoInfo>
                        <PravoButton 
                          $variant="remove"
                          onClick={() => handleLocalRemove(pravo)}
                          title="Odebrat právo"
                        >
                          <FontAwesomeIcon icon={faTrash} /> Odebrat
                        </PravoButton>
                      </PravoItem>
                    );
                  })
                )}
              </PravaList>
            </PravaSection>

            <PravaSection>
              <h3>
                <FontAwesomeIcon icon={faPlus} style={{ color: '#3b82f6' }} />
                Dostupná práva ({availableToAssign.length})
              </h3>
              <SearchBox style={{ marginBottom: '1rem' }}>
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder="Hledat v dostupných právech..."
                  value={searchAvailable}
                  onChange={(e) => setSearchAvailable(e.target.value)}
                />
                {searchAvailable && (
                  <ClearButton onClick={() => setSearchAvailable('')}>
                    <FontAwesomeIcon icon={faTimes} />
                  </ClearButton>
                )}
              </SearchBox>
              <PravaList>
                {availableToAssign.length === 0 ? (
                  <EmptyMessage>
                    {searchAvailable ? 'Žádná práva nenalezena' : 'Všechna práva jsou přiřazena'}
                  </EmptyMessage>
                ) : (
                  availableToAssign.map((pravo, index) => {
                    const isPendingRemove = pendingChanges.toRemove.includes(pravo.id);
                    return (
                      <PravoItem 
                        key={`available-${pravo.id}-${index}`}
                        style={isPendingRemove ? { 
                          background: '#fee2e2', 
                          borderColor: '#ef4444',
                          borderWidth: '2px' 
                        } : {}}
                      >
                        <PravoInfo>
                          <div className="kod">
                            {isPendingRemove && '🗑️ '}
                            {pravo.kod_prava}
                          </div>
                          {pravo.popis && <div className="popis">{pravo.popis}</div>}
                        </PravoInfo>
                        <PravoButton 
                          $variant="add"
                          onClick={() => handleLocalAdd(pravo)}
                          title="Přidat právo"
                        >
                          <FontAwesomeIcon icon={faPlus} /> Přidat
                        </PravoButton>
                      </PravoItem>
                    );
                  })
                )}
              </PravaList>
            </PravaSection>
          </PravaGrid>
        </DialogBody>

        <DialogFooter>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {hasChanges && (
              <div style={{ 
                color: '#3b82f6', 
                fontSize: '0.9375rem',
                fontWeight: 600 
              }}>
                {changesCount} {changesCount === 1 ? 'změna' : changesCount < 5 ? 'změny' : 'změn'} čeká na uložení
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <SecondaryButton onClick={onClose} disabled={isSaving}>
              <FontAwesomeIcon icon={faTimes} />
              Storno
            </SecondaryButton>
            <ActionButton 
              $variant="primary" 
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              style={{ background: '#10b981', borderColor: '#10b981' }}
            >
              {isSaving ? (
                <>
                  <FontAwesomeIcon icon={faSyncAlt} spin />
                  Ukládám...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Uložit změny {hasChanges && `(${changesCount})`}
                </>
              )}
            </ActionButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </DialogOverlay>,
    document.body
  );
};

// =============================================================================
// DIALOG PRO KOPÍROVÁNÍ PRÁV MEZI ROLEMI
// =============================================================================

const CopyPravaDialog = ({ sourceRole, allRoles, onCopy, onClose }) => {
  const [selectedTargetRoleIds, setSelectedTargetRoleIds] = useState([]);
  const [selectedPravaIds, setSelectedPravaIds] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [searchRoleText, setSearchRoleText] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Inicializuj všechna práva jako vybraná při otevření
  useEffect(() => {
    if (sourceRole?.prava_globalni) {
      setSelectedPravaIds(sourceRole.prava_globalni.map(p => p.id));
    }
  }, [sourceRole]);

  // Filtrovaná práva podle vyhledávání
  const filteredPrava = useMemo(() => {
    if (!sourceRole?.prava_globalni) return [];
    if (!searchText) return sourceRole.prava_globalni;
    
    const search = searchText.toLowerCase();
    return sourceRole.prava_globalni.filter(p =>
      p.kod_prava?.toLowerCase().includes(search) ||
      p.popis?.toLowerCase().includes(search)
    );
  }, [sourceRole, searchText]);

  // Dostupné cílové role (bez zdrojové role) s filtrem
  const targetRoles = useMemo(() => {
    if (!allRoles || !sourceRole) return [];
    const filtered = allRoles.filter(r => r.id !== sourceRole.id);
    
    if (!searchRoleText) return filtered;
    
    const search = searchRoleText.toLowerCase();
    return filtered.filter(r => {
      const name = (r.nazev_role || r.kod_role || '').toLowerCase();
      return name.includes(search);
    });
  }, [allRoles, sourceRole, searchRoleText]);

  // Toggle cílové role
  const handleToggleTargetRole = (roleId) => {
    setSelectedTargetRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  // Vybrat/Zrušit všechny role
  const handleSelectAllRoles = () => {
    setSelectedTargetRoleIds(targetRoles.map(r => r.id));
  };

  const handleDeselectAllRoles = () => {
    setSelectedTargetRoleIds([]);
  };

  // Toggle konkrétního práva
  const handleTogglePravo = (pravoId) => {
    setSelectedPravaIds(prev =>
      prev.includes(pravoId)
        ? prev.filter(id => id !== pravoId)
        : [...prev, pravoId]
    );
  };

  // Vybrat/Zrušit vše
  const handleSelectAll = () => {
    setSelectedPravaIds(filteredPrava.map(p => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPravaIds([]);
  };

  // Otevřít confirm dialog
  const handleCopyClick = () => {
    if (selectedTargetRoleIds.length === 0 || selectedPravaIds.length === 0) {
      return;
    }
    setShowConfirmDialog(true);
  };

  // Provést kopírování po potvrzení
  const handleConfirmCopy = async () => {
    setShowConfirmDialog(false);
    setIsCopying(true);
    try {
      await onCopy(selectedTargetRoleIds, selectedPravaIds);
    } finally {
      setIsCopying(false);
    }
  };

  // Získej seznam cílových rolí pro zobrazení
  const getTargetRolesList = () => {
    return selectedTargetRoleIds
      .map(id => {
        const role = allRoles.find(r => r.id === id);
        return role ? (role.nazev_role || role.kod_role) : `Role ${id}`;
      });
  };

  const canCopy = selectedTargetRoleIds.length > 0 && selectedPravaIds.length > 0 && !isCopying;

  if (!sourceRole) return null;

  return createPortal(
    <DialogOverlay>
      <DialogContent style={{ maxWidth: '900px', width: '90%' }}>
        <DialogHeader>
          <DialogTitle>
            <FontAwesomeIcon icon={faCopy} style={{ marginRight: '0.75rem', color: '#3b82f6' }} />
            Kopírovat práva role: {sourceRole.nazev_role || sourceRole.kod_role}
          </DialogTitle>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </DialogHeader>

        <DialogBody>
          {/* Výběr cílových rolí (multi-select s checkboxy) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Cílové role ({selectedTargetRoleIds.length} vybráno)
            </label>

            {/* Vyhledávání rolí */}
            <SearchInputStyled
              type="text"
              placeholder="🔍 Hledat roli..."
              value={searchRoleText}
              onChange={(e) => setSearchRoleText(e.target.value)}
              style={{ marginBottom: '0.5rem' }}
            />

            {/* Tlačítka Vybrat/Zrušit všechny role */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleSelectAllRoles}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                ✓ Vybrat vše
              </button>
              <button
                onClick={handleDeselectAllRoles}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                ✗ Zrušit vše
              </button>
            </div>

            {/* Grid s rolemi */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '0.5rem',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '0.5rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              background: '#f9fafb'
            }}>
              {targetRoles.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '1rem',
                  color: '#6b7280'
                }}>
                  {searchRoleText ? 'Žádné role nenalezeny' : 'Žádné dostupné role'}
                </div>
              ) : (
                targetRoles.map(role => {
                  const isSelected = selectedTargetRoleIds.includes(role.id);
                  const roleName = role.nazev_role || role.kod_role || `Role ${role.id}`;
                  const pravaCount = (role.prava_globalni || []).length;
                  
                  return (
                    <label
                      key={role.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        background: isSelected ? '#dbeafe' : '#fff',
                        border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTargetRole(role.id)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1f2937',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {roleName}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#6b7280'
                        }}>
                          {pravaCount} práv
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Vyhledávání práv */}
          <div style={{ marginBottom: '1rem' }}>
            <SearchInputStyled
              type="text"
              placeholder="🔍 Hledat právo..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Tlačítka Vybrat vše / Zrušit vše */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✓ Vybrat vše ({filteredPrava.length})
            </button>
            <button
              onClick={handleDeselectAll}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✗ Zrušit vše
            </button>
          </div>

          {/* Grid s právy */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.75rem',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '0.5rem',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            background: '#f9fafb'
          }}>
            {filteredPrava.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '2rem',
                color: '#6b7280'
              }}>
                {searchText ? 'Žádná práva nenalezena' : 'Role nemá žádná práva'}
              </div>
            ) : (
              filteredPrava.map(pravo => {
                const isSelected = selectedPravaIds.includes(pravo.id);
                return (
                  <label
                    key={pravo.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: isSelected ? '#dbeafe' : '#fff',
                      border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTogglePravo(pravo.id)}
                      style={{
                        marginTop: '0.25rem',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '0.25rem'
                      }}>
                        {pravo.kod_prava}
                      </div>
                      {pravo.popis && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          lineHeight: '1.4'
                        }}>
                          {pravo.popis}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Info o výběru */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#0c4a6e'
          }}>
            <div style={{ marginBottom: '0.25rem' }}>
              <strong>Práv k kopírování:</strong> {selectedPravaIds.length} z {sourceRole.prava_globalni.length}
            </div>
            <div>
              <strong>Cílových rolí:</strong> {selectedTargetRoleIds.length}
            </div>
            {selectedTargetRoleIds.length > 0 && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '13px',
                color: '#075985'
              }}>
                ⚠️ Práva budou přidána do {selectedTargetRoleIds.length} {selectedTargetRoleIds.length === 1 ? 'role' : selectedTargetRoleIds.length < 5 ? 'rolí' : 'rolí'}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <CancelButton onClick={onClose} disabled={isCopying}>
            <FontAwesomeIcon icon={faTimes} style={{ marginRight: '0.5rem' }} />
            Zrušit
          </CancelButton>
          <SaveButton onClick={handleCopyClick} disabled={!canCopy}>
            <FontAwesomeIcon icon={faCopy} style={{ marginRight: '0.5rem' }} />
            {isCopying 
              ? 'Kopíruji...' 
              : `Kopírovat ${selectedPravaIds.length} práv → ${selectedTargetRoleIds.length} ${selectedTargetRoleIds.length === 1 ? 'role' : 'rolí'}`
            }
          </SaveButton>
        </DialogFooter>
      </DialogContent>

      {/* Confirm Dialog pro hromadné kopírování */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmCopy}
        title="⚠️ Hromadné kopírování práv"
        icon={faExclamationTriangle}
        variant="warning"
        confirmText="Ano, kopírovat"
        cancelText="Zrušit"
      >
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 1rem 0', fontSize: '15px', color: '#374151' }}>
            Chystáte se zkopírovat <strong>{selectedPravaIds.length} práv</strong> do <strong>{selectedTargetRoleIds.length} {selectedTargetRoleIds.length === 1 ? 'role' : selectedTargetRoleIds.length < 5 ? 'rolí' : 'rolí'}</strong>.
          </p>
        </div>

        {/* Seznam cílových rolí */}
        <div style={{
          padding: '1rem',
          background: '#fffbeb',
          border: '2px solid #fbbf24',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#92400e',
            marginBottom: '0.5rem'
          }}>
            Cílové role:
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            fontSize: '14px',
            color: '#78350f'
          }}>
            {getTargetRolesList().map((roleName, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>{roleName}</li>
            ))}
          </ul>
        </div>

        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          Tato operace přidá vybraná práva do všech uvedených rolí. Práva, která role již má, budou přeskočena.
        </p>
      </ConfirmDialog>
    </DialogOverlay>,
    document.body
  );
};

// =============================================================================
// KOMPONENTA
// =============================================================================

const RoleTab = () => {
  const { token, user: { username } = {}, userDetail, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { cache, loadDictionary, invalidateCache } = useContext(DictionaryCacheContext);

  // Kontrola oprávnění pro editaci
  const canEdit = hasPermission('ADMIN') || hasPermission('DICT_MANAGE');
  
  // SuperAdmin pro cleanup funkcionalitu
  const isSuperAdmin = userDetail?.roles?.some(role => role.kod_role === 'SUPERADMIN');

  // Helper functions for user-specific localStorage
  const user_id = userDetail?.user_id;
  const getUserKey = (baseKey) => {
    const sid = user_id || 'anon';
    return `${baseKey}_${sid}`;
  };

  const getUserStorage = (baseKey, defaultValue = null) => {
    try {
      const item = localStorage.getItem(getUserKey(baseKey));
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const setUserStorage = (baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (error) {
      // Ignorovat chyby zápisu
    }
  };

  const [data, setData] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(() => getUserStorage('role_search', ''));
  const [columnFilters, setColumnFilters] = useState(() => getUserStorage('role_columnFilters', {}));
  const [aktivniFilter, setAktivniFilter] = useState(() => getUserStorage('role_aktivniFilter', 'all')); // 'all' | 'aktivni' | 'neaktivni'
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [pageSize, setPageSize] = useState(() => getUserStorage('role_pageSize', 25));
  const [pageIndex, setPageIndex] = useState(() => getUserStorage('role_pageIndex', 0));

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' | 'edit'
  const [editingItem, setEditingItem] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

  // Práva dialog
  const [isPravaDialogOpen, setIsPravaDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [availablePrava, setAvailablePrava] = useState([]);

  // Copy práva dialog
  const [isCopyPravaDialogOpen, setIsCopyPravaDialogOpen] = useState(false);
  const [copySourceRole, setCopySourceRole] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadDictionary('role');
      // Normalizace dat - API vrací "Popis" s velkým P, potřebujeme "popis" s malým p
      // + Deduplikace práv (FE workaround pro BE bug s duplicitními vazbami)
      const normalizedData = (result || []).map(item => {
        // Deduplikace prava_globalni podle ID
        const uniquePrava = item.prava_globalni ? 
          Array.from(new Map(item.prava_globalni.map(p => [p.id, p])).values()) 
          : [];
        
        return {
          ...item,
          popis: item.Popis || item.popis || '',
          prava_globalni: uniquePrava
        };
      });
      setData(normalizedData);
    } catch (error) {
      showToast?.('Chyba při načítání rolí', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && username) {
      if (cache.role?.loaded && cache.role.data) {
        // Normalizace dat z cache - API vrací "Popis" s velkým P
        // + Deduplikace práv (FE workaround pro BE bug)
        const normalizedData = (cache.role.data || []).map(item => {
          const uniquePrava = item.prava_globalni ? 
            Array.from(new Map(item.prava_globalni.map(p => [p.id, p])).values()) 
            : [];
          
          return {
            ...item,
            popis: item.Popis || item.popis || '',
            prava_globalni: uniquePrava
          };
        });
        setData(normalizedData);
      } else {
        fetchData();
      }
    }
  }, [token, username, cache.role?.loaded]);

  useEffect(() => {
    setUserStorage('role_search', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('role_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('role_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('role_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('role_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  const handleAddNew = () => {
    setDialogMode('create');
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (role) => {
    setDialogMode('edit');
    setEditingItem(role);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (role) => {
    setDeletingItem(role);
    setIsConfirmOpen(true);
  };

  const handleSave = async (formData) => {
    console.log('🔵 RoleTab handleSave:', { dialogMode, formData, editingItem });
    
    try {
      if (dialogMode === 'create') {
        await apiv2Dictionaries.createRole({
          token,
          username,
          ...formData
        });
        showToast?.('Role byla úspěšně vytvořena', { type: 'success' });
      } else {
        await apiv2Dictionaries.updateRole({
          token,
          username,
          id: editingItem.id,
          ...formData
        });
        showToast?.('Role byla úspěšně aktualizována', { type: 'success' });
      }
      setIsDialogOpen(false);
      invalidateCache('role');
      fetchData();
    } catch (error) {
      console.error('🔴 RoleTab handleSave ERROR:', error);
      showToast?.(error.message || 'Chyba při ukládání role', { type: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await apiv2Dictionaries.deleteRole({
        token,
        username,
        id: deletingItem.id
      });
      showToast?.('Role byla úspěšně smazána', { type: 'success' });
      setIsConfirmOpen(false);
      invalidateCache('role');
      fetchData();
    } catch (error) {
      showToast?.(error.message || 'Chyba při mazání role', { type: 'error' });
    }
  };

  // Otevřít dialog pro správu práv
  const handleManagePrava = async (role) => {
    setSelectedRole(role);
    
    // Načíst všechna dostupná práva
    try {
      const pravaData = await loadDictionary('prava');
      setAvailablePrava(pravaData || []);
      setIsPravaDialogOpen(true);
    } catch (error) {
      showToast?.('Chyba při načítání práv', { type: 'error' });
    }
  };

  // Uložit hromadné změny v právech
  const handleSavePravaChanges = async (toAdd, toRemove) => {
    try {
      await apiv2Dictionaries.bulkUpdateRolePrava({
        token,
        username,
        role_id: selectedRole.id,
        prava_to_add: toAdd,
        prava_to_remove: toRemove
      });
      
      const addedCount = toAdd.length;
      const removedCount = toRemove.length;
      const message = [];
      if (addedCount > 0) message.push(`Přidáno: ${addedCount}`);
      if (removedCount > 0) message.push(`Odebráno: ${removedCount}`);
      
      showToast?.(`Práva byla aktualizována. ${message.join(', ')}`, { type: 'success' });
      
      // Invaliduj cache a načti fresh data
      invalidateCache('role');
      await fetchData();
      
    } catch (error) {
      showToast?.(error.message || 'Chyba při aktualizaci práv', { type: 'error' });
      throw error; // Re-throw aby dialog zůstal otevřený
    }
  };

  // Otevřít dialog pro kopírování práv
  const handleCopyPrava = (role) => {
    setCopySourceRole(role);
    setIsCopyPravaDialogOpen(true);
  };

  // Provést kopírování práv do cílové role
  const handleCopyPravaExecute = async (targetRoleIds, selectedPravaIds) => {
    try {
      let totalCopied = 0;
      let totalSkipped = 0;
      const results = [];

      // Procházej všechny cílové role
      for (const targetRoleId of targetRoleIds) {
        const targetRole = data.find(r => r.id === targetRoleId);
        if (!targetRole) continue;

        // Zjisti, která práva cílová role NEMÁ (jen ta přidáme)
        const targetPravaIds = (targetRole.prava_globalni || []).map(p => p.id);
        const pravaToAdd = selectedPravaIds.filter(id => !targetPravaIds.includes(id));

        if (pravaToAdd.length === 0) {
          totalSkipped++;
          continue;
        }

        // Kopíruj práva do této role
        await apiv2Dictionaries.bulkUpdateRolePrava({
          token,
          username,
          role_id: targetRoleId,
          prava_to_add: pravaToAdd,
          prava_to_remove: []
        });

        totalCopied += pravaToAdd.length;
        results.push({
          role: targetRole.nazev_role || targetRole.kod_role,
          count: pravaToAdd.length
        });
      }

      // Zobraz výsledky
      if (results.length === 0) {
        showToast?.('Všechny cílové role již mají vybraná práva', { type: 'info' });
      } else if (results.length === 1) {
        showToast?.(
          `✓ Zkopírováno ${results[0].count} práv do role "${results[0].role}"`,
          { type: 'success' }
        );
      } else {
        const summary = results.map(r => `  • ${r.role}: ${r.count} práv`).join('\n');
        showToast?.(
          `✓ Zkopírováno práv do ${results.length} rolí:\n${summary}`,
          { type: 'success', duration: 5000 }
        );
      }

      // Refresh dat
      invalidateCache('role');
      await fetchData();

      // Zavřít dialog
      setIsCopyPravaDialogOpen(false);
      setCopySourceRole(null);

    } catch (error) {
      showToast?.(error.message || 'Chyba při kopírování práv', { type: 'error' });
      throw error;
    }
  };

  // Vyčistit duplicitní práva (POUZE SUPERADMIN)
  const handleCleanupDuplicates = async () => {
    if (!window.confirm(
      '⚠️ POZOR! Tato akce smaže duplicitní přiřazení práv k rolím v databázi.\n\n' +
      'Duplicity vznikly v minulosti a brání správnému fungování systému.\n\n' +
      'Tato akce je nevratná. Pokračovat?'
    )) {
      return;
    }

    try {
      const result = await apiv2Dictionaries.cleanupDuplicatePrava({
        token,
        username,
        dry_run: false
      });

      const message = result.data?.message || 'Duplicity byly vyčištěny';
      const deletedCount = result.data?.deleted_count || 0;
      
      showToast?.(
        `${message}. Odstraněno ${deletedCount} duplicitních záznamů.`,
        { type: 'success' }
      );
      
      // Invaliduj cache a znovu načti data
      invalidateCache('role');
      await fetchData();
      
    } catch (error) {
      showToast?.(error.message || 'Chyba při čištění duplicit', { type: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'nazev_role',
        header: 'Název role',
        size: 375,
        minSize: 375,
        maxSize: 375,
        cell: ({ row }) => (
          <RoleName>
            <RoleIcon $inactive={!row.original.aktivni}>
              <Shield />
            </RoleIcon>
            <div>{row.original.nazev_role}</div>
          </RoleName>
        ),
      },
      {
        accessorKey: 'popis',
        header: 'Popis',
        size: undefined,
        minSize: 200,
        cell: ({ row }) => (
          <div style={{ 
            textAlign: 'left',
            color: row.original.popis ? '#374151' : '#9ca3af',
            fontStyle: row.original.popis ? 'normal' : 'italic'
          }}>
            {row.original.popis || '—'}
          </div>
        ),
      },
      {
        id: 'pocet_prav',
        accessorKey: 'statistiky.pocet_prav',
        header: 'Počet práv',
        size: 100,
        minSize: 100,
        maxSize: 100,
        cell: ({ row }) => (
          <StatBadge $type="rights">
            {row.original.statistiky?.pocet_prav || 0}
          </StatBadge>
        ),
      },
      {
        id: 'pocet_uzivatelu',
        accessorKey: 'statistiky.pocet_uzivatelu',
        header: () => (
          <div style={{ lineHeight: '1.2' }}>
            Počet<br />uživatelů
          </div>
        ),
        size: 100,
        minSize: 100,
        maxSize: 100,
        cell: ({ row }) => (
          <StatBadge $type="users">
            {row.original.statistiky?.pocet_uzivatelu || 0}
          </StatBadge>
        ),
      },
      {
        accessorKey: 'aktivni',
        header: 'Aktivní',
        size: 80,
        minSize: 80,
        maxSize: 80,
        cell: ({ row }) => (
          <div style={{
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            fontSize: '18px'
          }}
          title={row.original.aktivni ? 'Aktivní' : 'Neaktivní'}
          >
            <FontAwesomeIcon
              icon={row.original.aktivni ? faCheckCircle : faTimesCircle}
              style={{ color: row.original.aktivni ? '#16a34a' : '#dc2626' }}
            />
          </div>
        ),
      },
      {
        id: 'actions',
        size: 110,
        minSize: 110,
        maxSize: 110,
        header: () => (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '16px'
          }}>
            <FontAwesomeIcon
              icon={faBolt}
              style={{ color: '#eab308' }}
            />
          </div>
        ),
        cell: ({ row }) => (
          <ActionButtons>
            <IconButton
              $variant="expand"
              onClick={() => row.toggleExpanded()}
              title={row.getIsExpanded() ? 'Skrýt detaily' : 'Zobrazit detaily'}
            >
              <FontAwesomeIcon icon={row.getIsExpanded() ? faChevronUp : faChevronDown} />
            </IconButton>
            {canEdit && (
              <>
                <IconButton
                  $variant="rights"
                  onClick={() => handleManagePrava(row.original)}
                  title="Spravovat práva"
                  style={{ color: '#8b5cf6' }}
                >
                  <Key size={16} />
                </IconButton>
                <IconButton
                  $variant="copy"
                  onClick={() => handleCopyPrava(row.original)}
                  title="Kopírovat práva do jiné role"
                  style={{ color: '#3b82f6' }}
                >
                  <FontAwesomeIcon icon={faCopy} />
                </IconButton>
                <IconButton
                  $variant="edit"
                  onClick={() => handleEdit(row.original)}
                  title="Upravit roli"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </IconButton>
                <IconButton
                  $variant="delete"
                  onClick={() => handleDeleteClick(row.original)}
                  title="Smazat roli"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </IconButton>
              </>
            )}
          </ActionButtons>
        ),
      },
    ],
    []
  );

  // Custom global filter funkce - hledá i v podřádcích (právech)
  const customGlobalFilterFn = (row, columnId, filterValue) => {
    const searchLower = filterValue.toLowerCase();

    // Hlavní řádek - role
    const roleName = (row.original.nazev_role || '').toLowerCase();
    const roleDesc = (row.original.popis || '').toLowerCase();
    const userCount = (row.original.pocet_uzivatelu || '').toString();

    if (roleName.includes(searchLower) || roleDesc.includes(searchLower) || userCount.includes(searchLower)) {
      return true;
    }

    // Podřádky - práva
    if (row.original.permissions && Array.isArray(row.original.permissions)) {
      return row.original.permissions.some(perm => {
        const permName = (perm.nazev_prava || '').toLowerCase();
        const permCode = (perm.kod_prava || '').toLowerCase();
        const permDesc = (perm.popis_prava || '').toLowerCase();
        return permName.includes(searchLower) || permCode.includes(searchLower) || permDesc.includes(searchLower);
      });
    }

    return false;
  };

  // Filtrovaná data podle columnFilters
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter(item => {
      // Aktivní filtr
      if (aktivniFilter === 'aktivni' && !item.aktivni) return false;
      if (aktivniFilter === 'neaktivni' && item.aktivni) return false;

      // Column filter - nazev_role
      if (columnFilters.nazev_role &&
          !(item.nazev_role || '').toLowerCase().includes(columnFilters.nazev_role.toLowerCase())) {
        return false;
      }

      // Column filter - popis
      if (columnFilters.popis &&
          !(item.popis || '').toLowerCase().includes(columnFilters.popis.toLowerCase())) {
        return false;
      }

      // Column filter - pocet_prav
      if (columnFilters.pocet_prav &&
          !(item.statistiky?.pocet_prav || 0).toString().includes(columnFilters.pocet_prav)) {
        return false;
      }

      // Column filter - pocet_uzivatelu
      if (columnFilters.pocet_uzivatelu &&
          !(item.statistiky?.pocet_uzivatelu || 0).toString().includes(columnFilters.pocet_uzivatelu)) {
        return false;
      }

      return true;
    });
  }, [data, columnFilters, aktivniFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    state: {
      globalFilter,
      pagination: { pageSize, pageIndex },
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: customGlobalFilterFn,
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function'
        ? updater({ pageSize, pageIndex })
        : updater;
      setPageSize(newState.pageSize);
      setPageIndex(newState.pageIndex);
    },
  });

  const renderExpandedRow = (row) => {
    const role = row.original;

    return (
      <ExpandedRow>
        <ExpandedCell colSpan={columns.length}>
          <ExpandedContent>
            {/* Práva role */}
            <Section>
              <SectionHeader>
                <FontAwesomeIcon icon={faGlobe} />
                <h4>Práva role (role má {role.statistiky?.pocet_uzivatelu || 0} {role.statistiky?.pocet_uzivatelu === 1 ? 'uživatele' : 'uživatelů'})</h4>
              </SectionHeader>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '-0.5rem',
                marginBottom: '1rem',
                fontStyle: 'italic'
              }}>
                💡 Jednotlivá práva mohou mít více uživatelů díky personalizovaným přiřazením
              </div>

              {role.prava_globalni && role.prava_globalni.length > 0 ? (
                <PermissionsGrid>
                  {role.prava_globalni.map(pravo => (
                    <PermissionCard key={pravo.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <PermissionCode>{pravo.kod_prava}</PermissionCode>
                        {pravo.pocet_uzivatelu !== undefined && (
                          <UserCountBadge
                            title={`Celkem ${pravo.pocet_uzivatelu} ${pravo.pocet_uzivatelu === 1 ? 'uživatel má' : 'uživatelů má'} toto právo (${role.statistiky?.pocet_uzivatelu || 0} z role + personalizovaná přiřazení)`}
                          >
                            <Users size={12} />
                            {pravo.pocet_uzivatelu}
                          </UserCountBadge>
                        )}
                      </div>
                      <PermissionDesc>{pravo.popis || '-'}</PermissionDesc>
                      <div style={{ marginTop: '0.5rem' }}>
                        <StatusBadge $active={pravo.vazba_aktivni && pravo.pravo_aktivni}>
                          {pravo.vazba_aktivni && pravo.pravo_aktivni ? 'Aktivní' : 'Neaktivní'}
                        </StatusBadge>
                      </div>
                    </PermissionCard>
                  ))}
                </PermissionsGrid>
              ) : (
                <EmptyState style={{ padding: '2rem' }}>
                  <p>Žádná práva nejsou přiřazena</p>
                </EmptyState>
              )}
            </Section>
          </ExpandedContent>
        </ExpandedCell>
      </ExpandedRow>
    );
  };

  return (
    <Container>
      <ActionBar>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Hledat v rolích, právech nebo uživatelích..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          {globalFilter && (
            <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canEdit && (
            <ActionButton $variant="primary" onClick={handleAddNew}>
              <FontAwesomeIcon icon={faPlus} />
              Nová role
            </ActionButton>
          )}
          
          {isSuperAdmin && (
            <ActionButton 
              $variant="secondary" 
              onClick={handleCleanupDuplicates}
              title="Vyčistit duplicitní přiřazení práv (POUZE SUPERADMIN)"
              style={{ 
                background: '#f59e0b',
                color: 'white'
              }}
            >
              <FontAwesomeIcon icon={faBroom} />
              Vyčistit duplicity
            </ActionButton>
          )}
        </div>
      </ActionBar>

      <TableWrapper>
        <TableContainer>
          {loading ? (
            <EmptyState>
              <FontAwesomeIcon icon={faSyncAlt} spin style={{ width: '48px', height: '48px' }} />
              <h3>Načítám role...</h3>
            </EmptyState>
          ) : (
            <StyledTable>
              <Thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Th
                        key={header.id}
                        $sortable={header.column.getCanSort()}
                        $width={header.column.columnDef.size}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted()] ?? null}
                      </Th>
                    ))}
                  </tr>
                ))}

                {/* Druhý řádek - column filtry */}
                <FilterRow>
                  {table.getHeaderGroups()[0].headers.map((header) => (
                    <FilterCell 
                      key={`filter-${header.id}`}
                      $width={header.column.columnDef.size}
                    >
                      {header.id === 'nazev_role' ? (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Hledat název role..."
                            value={columnFilters.nazev_role || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { nazev_role, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, nazev_role: value };
                              });
                            }}
                          />
                          {columnFilters.nazev_role && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { nazev_role, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      ) : header.id === 'popis' ? (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Hledat popis..."
                            value={columnFilters.popis || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { popis, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, popis: value };
                              });
                            }}
                          />
                          {columnFilters.popis && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { popis, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      ) : header.id === 'pocet_prav' ? (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="number"
                            placeholder="Počet..."
                            value={columnFilters.pocet_prav || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { pocet_prav, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, pocet_prav: value };
                              });
                            }}
                          />
                          {columnFilters.pocet_prav && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { pocet_prav, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      ) : header.id === 'pocet_uzivatelu' ? (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="number"
                            placeholder="Počet..."
                            value={columnFilters.pocet_uzivatelu || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { pocet_uzivatelu, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, pocet_uzivatelu: value };
                              });
                            }}
                          />
                          {columnFilters.pocet_uzivatelu && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { pocet_uzivatelu, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      ) : header.id === 'aktivni' ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '32px' }}>
                          <IconFilterButton
                            onClick={() => {
                              if (aktivniFilter === 'all') {
                                setAktivniFilter('aktivni');
                              } else if (aktivniFilter === 'aktivni') {
                                setAktivniFilter('neaktivni');
                              } else {
                                setAktivniFilter('all');
                              }
                            }}
                            title={
                              aktivniFilter === 'all' ? 'Zobrazeny všechny (klikněte pro filtr aktivních)' :
                              aktivniFilter === 'aktivni' ? 'Zobrazeny pouze aktivní (klikněte pro filtr neaktivních)' :
                              'Zobrazeny pouze neaktivní (klikněte pro zobrazení všech)'
                            }
                          >
                            {aktivniFilter === 'all' ? (
                              <div style={{ position: 'relative', width: '20px', height: '20px' }}>
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
                                    color: '#16a34a'
                                  }}
                                />
                                <FontAwesomeIcon
                                  icon={faTimesCircle}
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
                                    color: '#dc2626'
                                  }}
                                />
                              </div>
                            ) : aktivniFilter === 'aktivni' ? (
                              <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#16a34a' }} />
                            ) : (
                              <FontAwesomeIcon icon={faTimesCircle} style={{ color: '#dc2626' }} />
                            )}
                          </IconFilterButton>
                        </div>
                      ) : header.id === 'actions' ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                          <IconFilterButton
                            onClick={() => {
                              setColumnFilters({});
                              setAktivniFilter('all');
                            }}
                            title="Vymazat všechny filtry"
                            disabled={Object.keys(columnFilters).length === 0 && aktivniFilter === 'all'}
                          >
                            <FontAwesomeIcon icon={faEraser} style={{ fontSize: '14px' }} />
                          </IconFilterButton>
                        </div>
                      ) : null}
                    </FilterCell>
                  ))}
                </FilterRow>
              </Thead>
              <Tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <Td colSpan={columns.length}>
                      <EmptyState>
                        <Shield size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                        <h3>Žádné role</h3>
                        <p>{globalFilter ? 'Zkuste změnit vyhledávání' : 'Nejsou k dispozici žádné role'}</p>
                      </EmptyState>
                    </Td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => {
                    const isInactive = !row.original.aktivni;
                    const isEven = index % 2 === 0;

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          style={{
                            background: isInactive ? '#f8f9fa' : (isEven ? '#f8fafc' : 'white'),
                            opacity: isInactive ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isInactive ? '#e9ecef' : '#f0f9ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isInactive ? '#f8f9fa' : (isEven ? '#f8fafc' : 'white');
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <Td 
                              key={cell.id}
                              $width={cell.column.columnDef.size}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Td>
                          ))}
                        </tr>
                        {row.getIsExpanded() && renderExpandedRow(row)}
                      </React.Fragment>
                    );
                  })
                )}
              </Tbody>
            </StyledTable>
          )}
        </TableContainer>

        {!loading && table.getPageCount() > 0 && (
          <Pagination>
            <PageInfo>
              Zobrazeno {Math.min(
                pageIndex * pageSize + 1,
                table.getFilteredRowModel().rows.length
              )} - {Math.min(
                (pageIndex + 1) * pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              z {table.getFilteredRowModel().rows.length} rolí
            </PageInfo>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>Zobrazit:</span>
              <PageSizeSelect
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  setPageIndex(0);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </PageSizeSelect>

              <PaginationButton
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0}
              >
                ««
              </PaginationButton>
              <PaginationButton
                onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
                disabled={pageIndex === 0}
              >
                ‹
              </PaginationButton>

              <span style={{ margin: '0 0.5rem' }}>
                Stránka {pageIndex + 1} z {Math.max(1, table.getPageCount())}
              </span>

              <PaginationButton
                onClick={() => setPageIndex(prev => Math.min(table.getPageCount() - 1, prev + 1))}
                disabled={pageIndex >= table.getPageCount() - 1}
              >
                ›
              </PaginationButton>
              <PaginationButton
                onClick={() => setPageIndex(table.getPageCount() - 1)}
                disabled={pageIndex >= table.getPageCount() - 1}
              >
                »»
              </PaginationButton>
            </div>
          </Pagination>
        )}
      </TableWrapper>

      {/* Dialog pro vytvoření/úpravu role */}
      <UniversalDictionaryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        editData={editingItem}
        title={dialogMode === 'create' ? 'Vytvořit novou roli' : 'Upravit roli'}
        icon={Shield}
        fields={[
          { name: 'kod_role', label: 'Kód role', type: 'text', required: false, placeholder: 'Nevyplněno = automaticky z názvu' },
          { name: 'nazev_role', label: 'Název role', type: 'text', required: true },
          { name: 'popis', label: 'Popis', type: 'textarea', required: false },
          { name: 'aktivni', label: 'Aktivní', type: 'checkbox', required: false, default: true }
        ]}
      />

      {/* Potvrzovací dialog pro smazání */}
      <DictionaryConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Smazat roli"
        message={`Opravdu chcete smazat roli "${deletingItem?.nazev_role}"?`}
      />

      {/* Dialog pro správu práv role */}
      {isPravaDialogOpen && selectedRole && (
        <PravaManagementDialog
          role={selectedRole}
          availablePrava={availablePrava}
          onSave={handleSavePravaChanges}
          onClose={() => setIsPravaDialogOpen(false)}
        />
      )}

      {/* Dialog pro kopírování práv mezi rolemi */}
      {isCopyPravaDialogOpen && copySourceRole && (
        <CopyPravaDialog
          sourceRole={copySourceRole}
          allRoles={data}
          onCopy={handleCopyPravaExecute}
          onClose={() => {
            setIsCopyPravaDialogOpen(false);
            setCopySourceRole(null);
          }}
        />
      )}
    </Container>
  );
};

export default RoleTab;
