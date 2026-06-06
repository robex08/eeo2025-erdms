import React, { useEffect, useState, useMemo, useContext, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { ToastContext } from '../context/ToastContext';
import { fetchAllUsers, fetchUserDetail, getErrorCodeCZ, fetchActiveUsers, partialUpdateUser, deleteUser, deactivateUser } from '../services/api2auth';
import { getOrdersCountByUser } from '../services/api25orders';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faBuilding, faShield, faToggleOn, faToggleOff,
  faKey, faEdit, faTrash, faPlus, faMinus, faSyncAlt,
  faSearch, faFilter, faTimes, faFileExport, faUserCheck, faUserSlash,
  faIdCard, faClock, faCheckCircle, faTimesCircle,
  faChevronLeft, faChevronRight, faChevronDown, faChevronUp, faEraser, faDashboard, faUserCog, faPalette,
  faShoppingCart, faQuestionCircle, faBolt, faMapMarkerAlt, faBriefcase, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { prettyDate } from '../utils/format';
import ConfirmDialog from '../components/ConfirmDialog';
import ResetPasswordModal from '../components/ResetPasswordModal';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';
import UserManagementModal from '../components/userManagement/UserManagementModal';
import UserContextMenu from '../components/UserContextMenu';
import ModernHelper from '../components/ModernHelper';
import { SmartTooltip } from '../styles/SmartTooltip';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Container = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;

  @keyframes pulse {
    0%, 100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
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

const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;

const TitleLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const RefreshButton = styled.button`
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

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  background: ${props => props.$primary ? '#3b82f6' : 'white'};
  color: ${props => props.$primary ? 'white' : '#3b82f6'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? '#2563eb' : '#eff6ff'};
    border-color: ${props => props.$primary ? '#2563eb' : '#2563eb'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

// Dashboard Panel
const DashboardPanel = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 2.25fr 2.25fr 2.25fr 2.25fr;
  gap: 1.5rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const TallStatCard = styled.div`
  grid-column: 1;
  grid-row: 1 / 3;
  background: linear-gradient(145deg, #ffffff, #f9fafb);
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid ${props => props.$color || '#16a34a'};
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &:hover {
    transform: translateY(-1px);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.06);
  }

  @media (max-width: 1200px) {
    grid-column: span 3;
  }

  @media (max-width: 768px) {
    grid-column: span 1;
    grid-row: span 1;
    min-height: 200px;
  }
`;

const SmallStatCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid ${props => props.$color || '#3b82f6'};
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'translateY(-1px)'};
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.06);
    ${props => props.$clickable && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}25, ${props.$color || '#3b82f6'}15);
    `}
  }

  ${props => props.$isActive && `
    border-left-width: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40;
  `}

  @media (max-width: 1200px) {
    grid-column: span 3;
  }

  @media (max-width: 768px) {
    grid-column: span 1;
    min-height: 100px;
  }
`;

const MediumStatCard = styled.div`
  grid-row: 2;
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid ${props => props.$color || '#3b82f6'};
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'translateY(-1px)'};
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.06);
    ${props => props.$clickable && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}25, ${props.$color || '#3b82f6'}15);
    `}
  }

  ${props => props.$isActive && `
    border-left-width: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40;
  `}

  @media (max-width: 1200px) {
    grid-column: span 6;
  }

  @media (max-width: 768px) {
    grid-column: span 1;
    min-height: 100px;
  }
`;

const StatCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid ${props => props.$color || '#3b82f6'};
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'translateY(-1px)'};
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.06);
    ${props => props.$clickable && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}25, ${props.$color || '#3b82f6'}15);
    `}
  }

  ${props => props.$isActive && `
    border-left-width: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40;
  `}
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const StatIcon = styled.div`
  color: ${props => props.$color || '#64748b'};
  font-size: 1.25rem;
  opacity: 0.7;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  text-align: left;
  line-height: 1.4;
`;

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  text-align: left;
`;

// Filters Panel
const FiltersPanel = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const FiltersHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const FiltersTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #3b82f6;
  font-size: 1.25rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #eff6ff;
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterInputWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg:first-of-type {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
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
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;

  &:hover {
    color: #6b7280;
  }

  > svg {
    width: 14px !important;
    height: 14px !important;
  }
`;

const FilterInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.75rem 2.5rem 0.75rem 2.5rem' : '0.75rem'};
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

// Wrapper pro select s ikonou
const FilterSelectWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.75rem 1.75rem 0.75rem 2.5rem' : '0.75rem 1.75rem 0.75rem 0.75rem'};
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  color: #1f2937;
  font-weight: 500;
  transition: all 0.2s ease;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #3b82f6;
  }

  /* Custom dropdown arrow */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;

  /* Styling pro placeholder option */
  option[value=""] {
    color: #9ca3af;
    font-weight: 400;
  }

  option {
    color: #1f2937;
    font-weight: 500;

  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;
`;

const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid #dc2626;
  border-radius: 8px;
  background: white;
  color: #dc2626;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #fef2f2;
    transform: translateY(-1px);
  }
`;

// Table Styles
// 📏 Wrapper pro tabulku s shadow indikátory na krajích
const TableScrollWrapper = styled.div`
  position: relative;
  width: 100%;

  /* Shadow indikátory na krajích */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    pointer-events: none;
    z-index: 2;
    transition: opacity 0.3s ease;
  }

  /* Levý shadow */
  &::before {
    left: 0;
    background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);
    opacity: ${props => props.$showLeftShadow ? 1 : 0};
  }

  /* Pravý shadow */
  &::after {
    right: 0;
    background: linear-gradient(to left, rgba(0,0,0,0.1), transparent);
    opacity: ${props => props.$showRightShadow ? 1 : 0};
  }
`;

const TableContainer = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow-x: auto;
  overflow-y: visible;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  scroll-behavior: smooth;

  /* Skrytý scrollbar - máme šipky pro navigaci */
  &::-webkit-scrollbar {
    display: none;
  }

  /* Firefox - skrytý scrollbar */
  scrollbar-width: none;
`;

// Scroll šipka - levá - FIXED position
const ScrollArrowLeft = styled.button`
  position: fixed;
  left: 50px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9999;

  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  background: ${props => {
    // Plná bílá JEN když je hover přímo NAD ŠIPKOU
    if (props.$arrowHovered) {
      return 'rgba(255, 255, 255, 0.98)';
    }
    return 'rgba(255, 255, 255, 0.25)'; // 75% průhledná (zobrazuje se když je hover nad tabulkou)
  }};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: all 0.3s ease;

  /* Zobrazit když: 1) je potřeba scrollovat A 2) je hover nad tabulkou NEBO nad šipkou */
  opacity: ${props => (props.$visible && (props.$tableHovered || props.$arrowHovered)) ? 1 : 0};
  pointer-events: ${props => (props.$visible && (props.$tableHovered || props.$arrowHovered)) ? 'auto' : 'none'};
  transform: translateY(-50%); /* Vždy stejná velikost, žádný scale */

  &:hover:not(:disabled) {
    background: rgba(248, 250, 252, 0.98);
    border-color: #3b82f6;
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(-50%) scale(1.05);
  }

  &:disabled {
    opacity: 0;
    pointer-events: none;
  }

  svg {
    width: 22px;
    height: 22px;
    color: #3b82f6;
  }
`;

// Scroll šipka - pravá - FIXED position
const ScrollArrowRight = styled(ScrollArrowLeft)`
  left: auto;
  right: 50px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableRow = styled.tr`
  background: ${props => {
    // Pokud je zapnuté zvýrazňování podle statusu
    if (props.$showHighlighting) {
      if (props.$isActive === false) {
        return '#fef2f2'; // Světle červená pro neaktivní
      }
      return '#f0fdf4'; // Světle zelená pro aktivní
    }
    // Standardní střídání řádků
    return props.$isEven ? '#f8fafc' : 'white';
  }};

  transition: all 0.2s ease;

  &:hover {
    background: ${props => {
      if (props.$showHighlighting && props.$isActive === false) {
        return '#fee2e2'; // Tmavší červená při hoveru pro neaktivní
      }
      if (props.$showHighlighting && props.$isActive === true) {
        return '#dcfce7'; // Tmavší zelená při hoveru pro aktivní
      }
      return 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
    }} !important;
  }
`;

const TableHeader = styled.th`
  padding: 1rem 0.75rem;
  text-align: center;
  font-weight: 600;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  user-select: none;
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 0.875rem;
  letter-spacing: 0.025em;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 0.875rem;
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #3b82f6;
  font-size: 1.25rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #eff6ff;
  }
`;

const ExpandedContent = styled.div`
  padding: 1.5rem;
  background: #f9fafb;
  border-top: 2px solid #3b82f6;
  border-bottom: 1px solid #d1d5db;
`;

const ExpandedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
`;

const InfoCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  border-left: 4px solid #3b82f6;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);

  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
`;

const InfoCardTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.45rem 0;
  border-bottom: 1px dashed #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #64748b;
  flex-shrink: 0;
  white-space: nowrap;
`;

const InfoValue = styled.span`
  color: #1f2937;
  text-align: right;
  word-wrap: break-word;
  overflow-wrap: break-word;
  flex: 1;
  line-height: 1.5;
`;

const ActionMenu = styled.div`
  display: flex;
  gap: 0.12rem;
  justify-content: center;
  align-items: center;
`;

const ActionMenuButton = styled.button`
  padding: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #64748b;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  &.toggle-active:hover {
    color: #16a34a;
    background: #f0fdf4;
  }

  &.toggle-inactive:hover {
    color: #dc2626;
    background: #fef2f2;
  }

  &.reset:hover {
    color: #f59e0b;
    background: #fffbeb;
  }

  &.edit:hover {
    color: #3b82f6;
    background: #eff6ff;
  }

  &.delete:hover {
    color: #dc2626;
    background: #fef2f2;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;

  ${props => props.$active ? `
    background: #dcfce7;
    color: #166534;
    border: 1px solid #86efac;
  ` : `
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  `}
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
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
  color: #374151;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #3b82f6;
    color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
  color: #374151;
  font-weight: 500;
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
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: #f9fafb;
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

const FilterActionButton = styled.button`
  background: white;
  border: 1px solid #d1d5db;
  color: #6b7280;
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;

  &:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
    color: #3b82f6;
  }

  &.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
`;

const IconFilterButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  font-weight: 600;
  margin-top: 2rem;
  padding: 1rem;
  background: #fef2f2;
  border-left: 4px solid #dc2626;
  border-radius: 8px;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 250, 252, 0.95);
  backdrop-filter: blur(${props => props.$visible ? '8px' : '0px'});
  -webkit-backdrop-filter: blur(${props => props.$visible ? '8px' : '0px'});
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.5s ease-in-out, backdrop-filter 0.6s ease-in-out;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const LoadingSpinner = styled.div`
  width: 64px;
  height: 64px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
  transform: scale(${props => props.$visible ? 1 : 0.8});
  transition: transform 0.5s ease-in-out;

  @keyframes spin {
    0% { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(360deg) scale(1); }
  }
`;

const LoadingMessage = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
  margin-bottom: 0.5rem;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.1s, opacity 0.5s ease-in-out 0.1s;
`;

const LoadingSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.15s, opacity 0.5s ease-in-out 0.15s;
`;

const PageContent = styled.div`
  filter: blur(${props => props.$blurred ? '3px' : '0px'});
  transition: filter 0.6s ease-in-out;
  pointer-events: ${props => props.$blurred ? 'none' : 'auto'};
`;

// Debug Panel (stejné jako Orders25List)
const DebugPanel = styled.div`
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border: 2px solid #0ea5e9;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: white;
  font-family: 'Courier New', monospace;
  box-shadow: 0 8px 32px rgba(14, 165, 233, 0.3);
`;

const DebugHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(14, 165, 233, 0.3);
`;

const DebugTitle = styled.h3`
  margin: 0;
  color: #0ea5e9;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DebugContent = styled.div`
  max-height: 400px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(14, 165, 233, 0.2);
`;

const DebugSection = styled.div`
  margin-bottom: 1rem;
  &:last-child { margin-bottom: 0; }
`;

const DebugLabel = styled.div`
  color: #0ea5e9;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DebugValue = styled.pre`
  margin: 0;
  color: #e2e8f0;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #0ea5e9;
`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Users = () => {
  const { token, username, userDetail, hasPermission } = useContext(AuthContext);
  const { start: startGlobalProgress, setProgress: setGlobalProgress, done: doneGlobalProgress, reset: resetGlobalProgress } = useContext(ProgressContext);
  const { showToast } = useContext(ToastContext) || {};

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const [globalFilter, setGlobalFilter] = useState(() => {
    return getUserStorage('users_globalFilter', '');
  });
  const [departmentFilter, setDepartmentFilter] = useState(() => {
    return getUserStorage('users_departmentFilter', '');
  });
  const [groupFilter, setGroupFilter] = useState(() => {
    return getUserStorage('users_groupFilter', '');
  });
  const [locationFilter, setLocationFilter] = useState(() => {
    return getUserStorage('users_locationFilter', '');
  });
  const [positionFilter, setPositionFilter] = useState(() => {
    return getUserStorage('users_positionFilter', '');
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return getUserStorage('users_statusFilter', 'all'); // 'all', 'active', 'inactive'
  });
  const [forcePasswordChangeFilter, setForcePasswordChangeFilter] = useState(() => {
    return getUserStorage('users_forcePasswordChangeFilter', 'all'); // 'all', 'forced', 'normal'
  });
  const [showFilters, setShowFilters] = useState(() => {
    return getUserStorage('users_showFilters', false); // Rozšířený filtr defaultně skrytý
  });

  // Stav pro zobrazení/skrytí rozšířeného filtru (pro dodatečné filtry Lokalita, Pozice, Úsek, Role)
  const [showExpandedFilters, setShowExpandedFilters] = useState(() => {
    return getUserStorage('users_showExpandedFilters', false);
  });

  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('users_columnFilters', {});
  });
  const [showRowHighlighting, setShowRowHighlighting] = useState(() => {
    return getUserStorage('users_showRowHighlighting', true);
  });

  const [showDashboard, setShowDashboard] = useState(() => {
    return getUserStorage('users_showDashboard', true);
  });

  // Table pagination - load from user-specific localStorage
  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('users_pageSize', 25);
  });

  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    return getUserStorage('users_pageIndex', 0);
  });

  // Table sorting - load from user-specific localStorage
  const [sorting, setSorting] = useState(() => {
    return getUserStorage('users_sorting', []);
  });

  const [expandedRows, setExpandedRows] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [rightsSearchTerm, setRightsSearchTerm] = useState('');

  // User Management Modal state
  const [userModalState, setUserModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    userData: null
  });
  const [ordersCount, setOrdersCount] = useState(() => {
    // Načíst z cache při startu
    const cached = getUserStorage('users_ordersCountCache', null);
    if (cached && cached.timestamp) {
      const age = Date.now() - cached.timestamp;
      const maxAge = 10 * 60 * 1000; // 10 minut
      if (age < maxAge) {
        return cached.data || {};
      }
    }
    return {};
  });
  const [isLoadingOrdersCounts, setIsLoadingOrdersCounts] = useState(false);
  const [ordersCountLoadTime, setOrdersCountLoadTime] = useState(() => {
    // Načíst čas z cache
    const cached = getUserStorage('users_ordersCountCache', null);
    return cached?.loadTime || null;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isForcePasswordChangeModalOpen, setIsForcePasswordChangeModalOpen] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogAction, setDialogAction] = useState(null);
  const [deleteType, setDeleteType] = useState('soft'); // 'soft' nebo 'hard'
  const [activeUsers, setActiveUsers] = useState([]);

  // Debug panel - user-specific
  const [showDebug, setShowDebug] = useState(() => {
    return getUserStorage('users_showDebug', false);
  });
  const [rawApiData, setRawApiData] = useState(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // 🎯 Scroll state management pro horizontální scroll šipky
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const [isTableHovered, setIsTableHovered] = useState(false);
  const [isArrowHovered, setIsArrowHovered] = useState(false);

  // Force refresh counter - změna vynutí re-fetch
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [silentRefresh, setSilentRefresh] = useState(false); // 🔇 Flag pro tiché načtení bez progress baru
  const [isSilentLoading, setIsSilentLoading] = useState(false); // 🔇 Potlačí loading gate/overlay při tichém refreshi

  // 🎯 Callback refs pro scroll monitoring
  const tableContainerRef = useRef(null);
  const tableWrapperRef = useRef(null);

  const setTableWrapperRef = useCallback((node) => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.removeEventListener('mouseenter', handleTableMouseEnter);
      tableWrapperRef.current.removeEventListener('mouseleave', handleTableMouseLeave);
    }

    tableWrapperRef.current = node;

    if (node) {
      node.addEventListener('mouseenter', handleTableMouseEnter);
      node.addEventListener('mouseleave', handleTableMouseLeave);
    }
  }, []);

  const setTableContainerRef = useCallback((node) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    }

    tableContainerRef.current = node;

    if (node) {
      node.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);

      // Initial check
      setTimeout(() => checkScrollPosition(), 100);
    }
  }, []);

  const checkScrollPosition = useCallback(() => {
    if (!tableContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
    const tolerance = 5; // Šipky tolerance
    const shadowTolerance = 1; // Shadow tolerance

    // Šipky: tolerance 5px
    setShowLeftArrow(scrollLeft > tolerance);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - tolerance);

    // Shadows: tolerance 1px (zobrazit téměř okamžitě)
    setShowLeftShadow(scrollLeft > shadowTolerance);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - shadowTolerance);
  }, []);

  const handleTableMouseEnter = useCallback(() => {
    setIsTableHovered(true);
  }, []);

  const handleTableMouseLeave = useCallback(() => {
    setIsTableHovered(false);
    // ⚠️ NEMAZAT isArrowHovered zde! Arrow má svůj vlastní hover state.
  }, []);

  const handleScrollLeft = useCallback(() => {
    if (tableContainerRef.current) {
      const scrollAmount = tableContainerRef.current.clientWidth * 0.8;
      tableContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const handleScrollRight = useCallback(() => {
    if (tableContainerRef.current) {
      const scrollAmount = tableContainerRef.current.clientWidth * 0.8;
      tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const fetchUsers = useCallback(async (silent = false) => {
    try {
      setError(null);
      if (silent) {
        setIsSilentLoading(true);
      } else {
        setLoading(true);
      }

      // 🔇 Pokud je silent=true, NEVOLAT startGlobalProgress
      if (!silent) {
        startGlobalProgress();
      }

      // Přidáme timestamp do requestu, aby se vyhnul browser cache
      // Pro modul Users načítáme VŠECHNY uživatele (aktivní i neaktivní)
      const data = await fetchAllUsers({
        token,
        username,
        _cacheBust: Date.now(), // Force bypass any HTTP cache
        show_inactive: true // Načíst i neaktivní uživatele (číselník)
      });

      // Save raw API data for debug modal
      setRawApiData(data);

      // Users loaded successfully

      if (!silent) {
        setGlobalProgress(60);
      }

      if (!Array.isArray(data)) {
        throw new Error('API nevrátilo pole uživatelů');
      }

      // ✅ Debug: Zkontrolovat duplikáty z API
      const idCounts = {};
      data.forEach(u => {
        const id = u.id || u.user_id;
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
      if (duplicates.length > 0) {
        console.warn('⚠️ DUPLICITNÍ UŽIVATELÉ Z API:', duplicates);
        console.warn('📋 Detail duplicitních uživatelů:', 
          duplicates.map(([id]) => data.filter(u => (u.id || u.user_id) == id))
        );
      }

      const processedData = data.map((user) => ({
        id: user.id || user.user_id,
        username: user.username || user.prihlas_jmeno || 'N/A',
        surname: user.prijmeni || user.surname || 'N/A',
        name: user.jmeno || user.name || 'N/A',
        titul_pred: user.titul_pred || '',
        titul_za: user.titul_za || '',
        fullName: [
          user.titul_pred,
          user.prijmeni || user.surname,
          user.jmeno || user.name,
          user.titul_za
        ].filter(Boolean).join(' ') || 'N/A',
        email: user.email || 'N/A',
        location: user.lokalita_nazev?.trim() || user.lokalita?.trim() || user.location?.trim() || '',
        department: user.usek_zkr?.trim() || user.usek_nazev?.trim() || user.department?.trim() || user.oddeleni?.trim() || '',
        position: (
          user.nazev_pozice?.trim() ||
          user.pozice_nazev?.trim() ||
          (typeof user.pozice === 'object' && user.pozice?.nazev_pozice?.trim()) ||
          (typeof user.pozice === 'object' && user.pozice?.nazev?.trim()) ||
          (typeof user.pozice === 'string' && user.pozice.trim()) ||
          user.funkce?.trim() ||
          user.position?.trim() ||
          user.title?.trim() ||
          ''
        ),
        phone: user.phone || user.telefon || 'N/A',
        active: user.aktivni === 1 || user.aktivni === '1' || user.aktivni === true || user.active === 'a' || user.active === true,
        vynucena_zmena_hesla: user.vynucena_zmena_hesla === 1 || user.vynucena_zmena_hesla === '1' || user.vynucena_zmena_hesla === true ? 1 : 0,
        roles: user.roles || [],
        direct_rights: user.direct_rights || [],
        group_name: user.roles && user.roles.length > 0
          ? user.roles
              .map(r => r.nazev_role || r.nazev)
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b, 'cs'))
              .join(', ')
          : (user.group_name || user.nazev_role || 'Bez role'),
        dt_activity: user.dt_activity || user.dt_posledni_aktivita || user.posl_aktivita || null,
        aktivita_metadata: user.aktivita_metadata || null,
      }));

      // Users processed successfully

      setUsers(processedData);

      if (!silent) {
        doneGlobalProgress();
      }

      // Toast notification removed - no need to notify on successful list load
    } catch (err) {
      setError('Nepodařilo se načíst uživatele. Zkuste to prosím znovu.');

      if (showToast) {
        showToast('Chyba při načítání uživatelů', { type: 'error' });
      }

      if (!silent) {
        try { doneGlobalProgress(); } catch(_) {}
        try {
          const code = getErrorCodeCZ(err) || '';
          if (code === 'chyba_serveru' || code === 'server_error') {
            setTimeout(() => { resetGlobalProgress && resetGlobalProgress(); }, 2200);
          }
        } catch(e) {}
      }
    } finally {
      if (!silent) {
        setTimeout(() => setLoading(false), 500);
      } else {
        setIsSilentLoading(false);
      }
    }
  }, [token, username, startGlobalProgress, setGlobalProgress, doneGlobalProgress, resetGlobalProgress, showToast, refreshTrigger]);

  useEffect(() => {
    if (token && username) {
      // 🔇 Použít silentRefresh flag pokud je nastaven
      fetchUsers(silentRefresh);
      // Reset flag po použití
      if (silentRefresh) {
        setSilentRefresh(false);
      }
    } else {
      setError('Chybí autentizační token nebo uživatelské jméno. Přihlaste se prosím znovu.');
      setLoading(false);
    }
  }, [token, username, fetchUsers, silentRefresh]);

  // Načítání aktivních uživatelů (pro dashboard)
  const fetchActiveUsersData = useCallback(async () => {
    if (!token || !username) return;
    try {
      const data = await fetchActiveUsers({ token, username });
      setActiveUsers(data || []);
    } catch (error) {
    }
  }, [token, username]);

  useEffect(() => {
    fetchActiveUsersData();
    // Refresh každých 30 sekund
    const interval = setInterval(fetchActiveUsersData, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveUsersData]);

  // Načítání email šablon
  useEffect(() => {
    const fetchEmailTemplates = async () => {
      if (!token || !username) return;
      
      try {
        // Používám relativní cestu aby fungovalo přes proxy (setupProxy.js)
        const response = await fetch('/api.eeo/notifications/templates', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            token,
            username,
            active_only: true
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok' && data.data) {
            setEmailTemplates(data.data);
          }
        }
      } catch (error) {
        console.error('Chyba při načítání šablon:', error);
      }
    };

    fetchEmailTemplates();
  }, [token, username]);

  // Načítání počtů objednávek pro uživatele - PARALELNÍ VERZE s CACHE
  const fetchOrdersCounts = useCallback(async (forceRefresh = false) => {
    if (!users.length || !token || !username) {
      return;
    }

    // Kontrola cache - pokud není force refresh
    if (!forceRefresh) {
      const cached = getUserStorage('users_ordersCountCache', null);
      if (cached && cached.timestamp && cached.data) {
        const age = Date.now() - cached.timestamp;
        const maxAge = 10 * 60 * 1000; // 10 minut

        if (age < maxAge) {
          setOrdersCount(cached.data);
          setOrdersCountLoadTime(cached.loadTime);
          return; // Použít cache, nechodit na DB
        }
      }
    }

    const startTime = performance.now(); // Start měření času
    setIsLoadingOrdersCounts(true);

    // Reset counts na loading state
    const loadingCounts = {};
    users.forEach(user => {
      if (user.id) loadingCounts[user.id] = undefined; // undefined znamená loading
    });
    setOrdersCount(loadingCounts);

    // Paralelní načítání s timeoutem
    const fetchPromises = users.map(async (user) => {
      if (!user.id) return { user, count: 0, error: 'No user ID' };

      try {
        // Timeout wrapper pro každý request
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000) // 10s timeout
        );

        const requestPromise = getOrdersCountByUser({
          token,
          username,
          user_id: user.id
        });

        const response = await Promise.race([requestPromise, timeoutPromise]);
        const orderCount = response.data?.total_orders_count || 0;

        // Okamžitě aktualizuj UI pro tento uživatele
        setOrdersCount(prev => ({
          ...prev,
          [user.id]: orderCount
        }));

        return { user, count: orderCount, error: null };

      } catch (err) {
        // Okamžitě aktualizuj UI s chybou
        setOrdersCount(prev => ({
          ...prev,
          [user.id]: 0
        }));

        return { user, count: 0, error: err.message };
      }
    });

    // Čekej na všechny requesty
    const results = await Promise.allSettled(fetchPromises);

    // Zpracuj výsledky
    let successCount = 0;
    let errorCount = 0;
    const finalCounts = {};

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { user, count, error } = result.value;
        finalCounts[user.id] = count;
        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        errorCount++;
        const user = users[index];
        if (user && user.id) {
          finalCounts[user.id] = 0;
        }
      }
    });

    // Finální nastavení pro jistotu
    setOrdersCount(finalCounts);
    setIsLoadingOrdersCounts(false);

    // Uložit čas načítání
    const endTime = performance.now();
    const loadTimeMs = Math.round(endTime - startTime);
    setOrdersCountLoadTime(loadTimeMs);

    // Uložit do cache
    setUserStorage('users_ordersCountCache', {
      data: finalCounts,
      timestamp: Date.now(),
      loadTime: loadTimeMs
    });

    // Orders count loaded and cached (debug removed for performance)
  }, [users, token, username]);

  // Načíst počty objednávek když se načtou uživatelé - použije cache pokud je validní
  useEffect(() => {
    if (users.length > 0 && token && username) {
      fetchOrdersCounts(false); // false = použít cache pokud je validní
    }
  }, [users.length, token, username]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.active).length;
    const inactive = total - active;
    const forcePasswordChange = users.filter(u => u.vynucena_zmena_hesla === 1).length;

    const departments = {};
    users.forEach(u => {
      const dept = u.department || 'Bez úseku';
      departments[dept] = (departments[dept] || 0) + 1;
    });

    const groups = {};
    users.forEach(u => {
      const group = u.group_name || 'Bez skupiny';
      groups[group] = (groups[group] || 0) + 1;
    });

    return { total, active, inactive, forcePasswordChange, departments, groups };
  }, [users]);

  // Utility function pro normalizaci textu (odstranění diakritiky a převod na malá písmena)
  const normalizeForSearch = useCallback((text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Odstraní diakritiku
  }, []);

  const filteredData = useMemo(() => {
    return users.filter((user) => {
      // Status filtr (všichni/aktivní/neaktivní) - MUSÍ BÝT PRVNÍ!
      if (statusFilter === 'active' && !user.active) return false;
      if (statusFilter === 'inactive' && user.active) return false;

      // Filtr vynucené změny hesla
      if (forcePasswordChangeFilter === 'forced' && user.vynucena_zmena_hesla !== 1) return false;
      if (forcePasswordChangeFilter === 'normal' && user.vynucena_zmena_hesla === 1) return false;

      // Global filter (Fultext) - bez diakritiky
      if (globalFilter) {
        const searchNormalized = normalizeForSearch(globalFilter);
        const matchGlobal =
          normalizeForSearch(user.username).includes(searchNormalized) ||
          normalizeForSearch(user.fullName).includes(searchNormalized) ||
          normalizeForSearch(user.email).includes(searchNormalized) ||
          normalizeForSearch(user.location).includes(searchNormalized) ||
          normalizeForSearch(user.department).includes(searchNormalized) ||
          normalizeForSearch(user.position).includes(searchNormalized) ||
          normalizeForSearch(user.group_name).includes(searchNormalized);

        if (!matchGlobal) return false;
      }

      // Panel filters (rozšířený filtr)
      if (departmentFilter && user.department !== departmentFilter) return false;
      if (groupFilter && user.group_name !== groupFilter) return false;
      if (locationFilter && user.location !== locationFilter) return false;
      if (positionFilter && user.position !== positionFilter) return false;

      // Column filters - bez diakritiky
      if (columnFilters.username && !normalizeForSearch(user.username).includes(normalizeForSearch(columnFilters.username))) return false;
      if (columnFilters.fullName && !normalizeForSearch(user.fullName).includes(normalizeForSearch(columnFilters.fullName))) return false;
      if (columnFilters.email && !normalizeForSearch(user.email).includes(normalizeForSearch(columnFilters.email))) return false;
      if (columnFilters.phone && !normalizeForSearch(user.phone || user.telefon).includes(normalizeForSearch(columnFilters.phone))) return false;
      if (columnFilters.location && !normalizeForSearch(user.location).includes(normalizeForSearch(columnFilters.location))) return false;
      if (columnFilters.department && !normalizeForSearch(user.department).includes(normalizeForSearch(columnFilters.department))) return false;
      if (columnFilters.position && !normalizeForSearch(user.position).includes(normalizeForSearch(columnFilters.position))) return false;
      if (columnFilters.group_name && !normalizeForSearch(user.group_name).includes(normalizeForSearch(columnFilters.group_name))) return false;

      // Filtrování Práva
      if (columnFilters.rights_count) {
        const searchTerm = columnFilters.rights_count.toLowerCase();

        // Spočítat počet práv
        const allRightsMap = new Map();
        if (user.roles) {
          user.roles.forEach(role => {
            if (role.rights) {
              role.rights.forEach(right => {
                const kod = right.kod_prava || right.nazev;
                if (kod) allRightsMap.set(kod, true);
              });
            }
          });
        }
        if (user.direct_rights) {
          user.direct_rights.forEach(right => {
            const kod = right.kod_prava || right.nazev;
            if (kod) allRightsMap.set(kod, true);
          });
        }
        const rightsCount = allRightsMap.size;

        if (!String(rightsCount).includes(searchTerm)) return false;
      }

      // Filtrování Objednávky
      if (columnFilters.orders_count) {
        const searchTerm = columnFilters.orders_count.toLowerCase();
        const ordersCountVal = ordersCount[user.id] || 0;

        if (!String(ordersCountVal).includes(searchTerm)) return false;
      }

      return true;
    });
  }, [users, globalFilter, statusFilter, forcePasswordChangeFilter, departmentFilter, groupFilter, locationFilter, positionFilter, columnFilters, normalizeForSearch]);

  const columns = useMemo(() => [
    {
      id: 'expander',
      header: '',
      size: 50,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ExpandButton
            onClick={() => {
              setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }));
            }}
          >
            <FontAwesomeIcon icon={expandedRows[row.id] ? faMinus : faPlus} />
          </ExpandButton>
        </div>
      ),
    },
    {
      accessorKey: 'username',
      header: 'Username',
      size: 180,
      maxSize: 180,
      cell: ({ row }) => (
        <div style={{ fontWeight: 600, color: '#1e293b' }}>
          {row.original.username}
          <span style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            marginLeft: '0.5rem',
            fontWeight: 400,
            verticalAlign: 'super'
          }}>
            #{row.original.id}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'fullName',
      header: 'Jméno',
      size: 160,
      maxSize: 160,
      cell: (info) => <div style={{ fontWeight: 500 }}>{info.getValue()}</div>,
    },
    {
      accessorKey: 'email',
      header: 'E-mail',
      cell: (info) => {
        const val = info.getValue();
        if (!val || val === 'N/A') return <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</div>;
        return (
          <a
            href={`mailto:${val}`}
            onClick={e => e.stopPropagation()}
            style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.85rem' }}
            title={`Odeslat e-mail: ${val}`}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            {val}
          </a>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Telefon',
      cell: (info) => {
        const val = info.getValue();
        if (!val || val === 'N/A') return <div style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>—</div>;
        return (
          <a
            href={`tel:${val.replace(/\s/g, '')}`}
            onClick={e => e.stopPropagation()}
            style={{ color: '#0891b2', textDecoration: 'none', fontSize: '0.85rem', display: 'block', textAlign: 'center' }}
            title={`Volat: ${val}`}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            {val}
          </a>
        );
      },
    },
    {
      accessorKey: 'location',
      header: 'Lokalita',
      cell: (info) => {
        const value = info.getValue();
        return (
          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: value ? 'inherit' : '#9ca3af', fontStyle: value ? 'normal' : 'italic' }}>
            {value || '—'}
          </div>
        );
      },
    },
    {
      accessorKey: 'department',
      header: 'Úsek',
      cell: (info) => {
        const value = info.getValue();
        return (
          <div style={{ textAlign: 'center', color: value ? 'inherit' : '#9ca3af', fontStyle: value ? 'normal' : 'italic' }}>
            {value || '—'}
          </div>
        );
      },
    },
    {
      accessorKey: 'position',
      header: 'Pozice',
      cell: (info) => {
        const value = info.getValue();
        return (
          <div style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: value ? 'inherit' : '#9ca3af', fontStyle: value ? 'normal' : 'italic' }}>
            {value || '—'}
          </div>
        );
      },
    },
    {
      accessorKey: 'group_name',
      header: 'Role',
      cell: (info) => <div style={{ textAlign: 'left', fontWeight: 500, paddingLeft: '1rem' }}>{info.getValue()}</div>,
    },
    {
      id: 'rights_count',
      header: 'Práva',
      cell: ({ row }) => {
        // Spočítat všechna unikátní práva uživatele
        const allRightsMap = new Map();

        // Přidat práva z rolí
        if (row.original.roles && Array.isArray(row.original.roles)) {
          row.original.roles.forEach(role => {
            if (role.rights && Array.isArray(role.rights)) {
              role.rights.forEach(right => {
                const kod = right.kod_prava || right.nazev || right.name || right.code;
                if (kod) {
                  allRightsMap.set(kod, true);
                }
              });
            }
          });
        }

        // Přidat přímá práva
        if (row.original.direct_rights && Array.isArray(row.original.direct_rights)) {
          row.original.direct_rights.forEach(right => {
            const kod = right.kod_prava || right.nazev || right.name || right.code;
            if (kod) {
              allRightsMap.set(kod, true);
            }
          });
        }

        const totalRights = allRightsMap.size;

        return (
          <div style={{
            textAlign: 'center',
            fontWeight: 600,
            color: totalRights > 0 ? '#16a34a' : '#94a3b8',
            fontSize: '0.875rem'
          }}>
            {totalRights > 0 ? totalRights : '0'}
          </div>
        );
      },
    },
    {
      id: 'orders_count',
      header: 'Objednávky',
      accessorFn: (row) => ordersCount[row.id] || 0,
      cell: ({ row }) => {
        const userOrdersCount = ordersCount[row.original.id];
        const isLoading = userOrdersCount === undefined;

        return (
          <div
            style={{
              textAlign: 'center',
              fontWeight: 600,
              color: isLoading ? '#94a3b8' : (userOrdersCount > 0 ? '#3b82f6' : '#94a3b8'),
              fontSize: '0.875rem',
              position: 'relative'
            }}
            title={isLoading ? 'Načítám počet objednávek...' : `Počet objednávek: ${userOrdersCount}`}
          >
            {isLoading ? (
              <span style={{
                animation: 'pulse 0.8s ease-in-out infinite',
                opacity: 0.7,
                fontSize: '0.7rem'
              }}>
                ⟳
              </span>
            ) : (
              <span style={{
                fontWeight: userOrdersCount > 0 ? 700 : 400,
                color: userOrdersCount > 0 ? '#3b82f6' : '#94a3b8'
              }}>
                {userOrdersCount}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'vynucena_zmena_hesla',
      header: 'Vynucení',
      size: 80,
      maxSize: 80,
      cell: ({ row }) => {
        const isForced = row.original.vynucena_zmena_hesla === 1;
        return (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '4px'
            }}
            title={isForced ? 'Uživatel musí změnit heslo při příštím přihlášení' : 'Normální přihlašování'}
            onClick={() => handleToggleForcePasswordChange(row.original)}
          >
            <FontAwesomeIcon
              icon={isForced ? faExclamationTriangle : faQuestionCircle}
              style={{ 
                color: isForced ? '#f59e0b' : '#94a3b8',
                transition: 'color 0.2s ease'
              }}
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'active',
      header: 'Status',
      size: 80,
      maxSize: 80,
      cell: ({ row }) => (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}
          title={row.original.active ? 'Aktivní' : 'Neaktivní'}
        >
          <FontAwesomeIcon
            icon={row.original.active ? faCheckCircle : faTimesCircle}
            style={{ color: row.original.active ? '#16a34a' : '#dc2626' }}
          />
        </div>
      ),
    },
    {
      id: 'actions',
      size: 160, // 4 ikony × 2rem (32px) + 3 mezery × 0.12rem (~2px) + padding = ~160px (více ikon než DocxSablony)
      maxSize: 160,
      header: () => (
        <div style={{
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        }}>
          <FontAwesomeIcon
            icon={faBolt}
            style={{
              color: '#eab308',
              fontSize: '16px'
            }}
          />
        </div>
      ),
      cell: ({ row }) => {
        // Kontrola zda se jedná o aktuálně přihlášeného uživatele
        const isCurrentUser = row.original.username === username;
        const canHardDelete = hasPermission && hasPermission('USER_DELETE');

        // Tooltip pro tlačítko smazat
        const getDeleteTooltip = () => {
          if (isCurrentUser) return 'Nemůžete smazat sám sebe';
          if (canHardDelete) return 'Trvale smazat uživatele z databáze';
          return 'Deaktivovat uživatele (nemáte právo USER_DELETE)';
        };

        return (
          <ActionMenu>
            <ActionMenuButton
              className={row.original.active ? 'toggle-active' : 'toggle-inactive'}
              title={isCurrentUser ? 'Nemůžete deaktivovat sám sebe' : (row.original.active ? 'Deaktivovat uživatele' : 'Aktivovat uživatele')}
              onClick={isCurrentUser ? undefined : () => handleToggleStatus(row.original)}
              disabled={isCurrentUser}
              style={{
                opacity: isCurrentUser ? 0.4 : 1,
                cursor: isCurrentUser ? 'not-allowed' : 'pointer'
              }}
            >
              <FontAwesomeIcon icon={row.original.active ? faToggleOn : faToggleOff} />
            </ActionMenuButton>
            <ActionMenuButton
              className="reset"
              title="Resetovat heslo"
              onClick={() => handleResetPassword(row.original)}
            >
              <FontAwesomeIcon icon={faKey} />
            </ActionMenuButton>
            <ActionMenuButton
              className="edit"
              title="Upravit uživatele"
              onClick={() => handleEditUser(row.original)}
            >
              <FontAwesomeIcon icon={faEdit} />
            </ActionMenuButton>
            <ActionMenuButton
              className="delete"
              title={getDeleteTooltip()}
              onClick={isCurrentUser ? undefined : () => handleDeleteUser(row.original)}
              disabled={isCurrentUser}
              style={{
                opacity: isCurrentUser ? 0.4 : 1,
                cursor: isCurrentUser ? 'not-allowed' : 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
            </ActionMenuButton>
          </ActionMenu>
        );
      },
    },
  ], [expandedRows, ordersCount, hasPermission]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getRowId: (row) => String(row.id), // ✅ Použít user.id jako unikátní klíč pro prevenci duplikátů
    state: {
      globalFilter,
      sorting,
      pagination: {
        pageSize: pageSize,
        pageIndex: currentPageIndex,
      },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableExpanding: true,
    getRowCanExpand: () => true,
    manualPagination: false,
  });

  // Update table page size and index when state changes (stejně jako v Orders25List)
  useEffect(() => {
    if (table) {
      table.setPageSize(pageSize);
      table.setPageIndex(currentPageIndex);
    }
  }, [pageSize, currentPageIndex, table]);

  // Save filters to localStorage when they change
  useEffect(() => {
    setUserStorage('users_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('users_departmentFilter', departmentFilter);
  }, [departmentFilter, user_id]);

  useEffect(() => {
    setUserStorage('users_groupFilter', groupFilter);
  }, [groupFilter, user_id]);

  useEffect(() => {
    setUserStorage('users_locationFilter', locationFilter);
  }, [locationFilter, user_id]);

  useEffect(() => {
    setUserStorage('users_positionFilter', positionFilter);
  }, [positionFilter, user_id]);

  useEffect(() => {
    setUserStorage('users_statusFilter', statusFilter);
  }, [statusFilter, user_id]);

  useEffect(() => {
    setUserStorage('users_forcePasswordChangeFilter', forcePasswordChangeFilter);
  }, [forcePasswordChangeFilter, user_id]);

  useEffect(() => {
    setUserStorage('users_showFilters', showFilters);
  }, [showFilters, user_id]);

  useEffect(() => {
    setUserStorage('users_showExpandedFilters', showExpandedFilters);
  }, [showExpandedFilters, user_id]);

  useEffect(() => {
    setUserStorage('users_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('users_showRowHighlighting', showRowHighlighting);
  }, [showRowHighlighting, user_id]);

  useEffect(() => {
    setUserStorage('users_showDashboard', showDashboard);
  }, [showDashboard, user_id]);

  useEffect(() => {
    setUserStorage('users_showDebug', showDebug);
  }, [showDebug, user_id]);

  // Save sorting to localStorage when it changes
  useEffect(() => {
    setUserStorage('users_sorting', sorting);
  }, [sorting]);

  // Reset to first page if current page is out of bounds
  useEffect(() => {
    if (table && table.getPageCount() > 0) {
      const maxPageIndex = table.getPageCount() - 1;
      if (currentPageIndex > maxPageIndex) {
        setCurrentPageIndex(0);
        setUserStorage('users_pageIndex', 0);
        table.setPageIndex(0);
      }
    }
  }, [currentPageIndex, table]);

  // Pagination navigation helpers (stejně jako v Orders25List)
  const goToFirstPage = () => {
    setCurrentPageIndex(0);
    setUserStorage('users_pageIndex', 0);
    table.setPageIndex(0);
  };

  const goToPreviousPage = () => {
    const newIndex = Math.max(0, currentPageIndex - 1);
    setCurrentPageIndex(newIndex);
    setUserStorage('users_pageIndex', newIndex);
    table.setPageIndex(newIndex);
  };

  const goToNextPage = () => {
    const maxIndex = table.getPageCount() - 1;
    const newIndex = Math.min(maxIndex, currentPageIndex + 1);
    setCurrentPageIndex(newIndex);
    setUserStorage('users_pageIndex', newIndex);
    table.setPageIndex(newIndex);
  };

  const goToLastPage = () => {
    const maxIndex = table.getPageCount() - 1;
    setCurrentPageIndex(maxIndex);
    setUserStorage('users_pageIndex', maxIndex);
    table.setPageIndex(maxIndex);
  };

  const handleToggleStatus = (user) => {
    // Kontrola zda se nejedná o aktuálně přihlášeného uživatele
    if (user.username === username) {
      if (showToast) showToast('Nemůžete deaktivovat sám sebe', { type: 'warning' });
      return;
    }
    setSelectedUser(user);
    setDialogAction('toggle');
    setIsDialogOpen(true);
  };

  const handleToggleForcePasswordChange = async (user) => {
    // Otevřít modal s možnostmi
    setSelectedUser(user);
    setIsForcePasswordChangeModalOpen(true);
  };

  const handleForcePasswordChangeConfirm = async (options) => {
    const user = selectedUser;
    if (!user) return;

    const currentValue = user.vynucena_zmena_hesla === 1;
    const isForcing = !currentValue;

    try {
      startGlobalProgress();
      setGlobalProgress(20);

      // Pokud je volba "remove-force", jen odstraníme vynucení
      if (options.option === 'remove-force') {
        const result = await partialUpdateUser({
          token,
          username,
          id: user.id,
          vynucena_zmena_hesla: 0
        });

        setGlobalProgress(70);

        // Update local data
        const updatedUsers = users.map(u => 
          u.id === user.id 
            ? { ...u, vynucena_zmena_hesla: 0 }
            : u
        );
        setUsers(updatedUsers);

        setGlobalProgress(100);
        doneGlobalProgress();
        setIsForcePasswordChangeModalOpen(false);

        if (showToast) {
          showToast(`✓ Vynucení změny hesla bylo zrušeno pro ${user.fullName || user.username}`, { type: 'success' });
        }
        return;
      }

      // Vynucení změny hesla
      const result = await partialUpdateUser({
        token,
        username,
        id: user.id,
        vynucena_zmena_hesla: 1
      });

      setGlobalProgress(40);

      // Pokud má být zaslán email s novým heslem
      let emailResult = null;
      if (options.option === 'with-email' && options.templateId) {
        try {
          const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
          const response = await fetch(`${API_BASE_URL}users/generate-temp-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
              username,
              user_ids: [user.id],
              template_id: options.templateId,
            }),
          });

          setGlobalProgress(70);

          emailResult = await response.json();
          
          if (emailResult.status !== 'ok') {
            throw new Error(emailResult.err || 'Nepodařilo se odeslat email s novým heslem');
          }

          if (showToast) {
            const results = emailResult.results || [];
            const userResult = results.find(r => r.user_id === user.id);
            if (userResult && userResult.success) {
              showToast(`✓ Nové heslo bylo vygenerováno a odesláno na ${user.email}`, { type: 'success' });
              // Refresh seznamu uživatelů (mohli jsme aktivovat neaktivního uživatele)
              await fetchUsers();
            } else {
              const errorMsg = userResult?.error || 'Email se nepodařilo odeslat';
              showToast(`⚠️ Heslo bylo vygenerováno, ale ${errorMsg}`, { type: 'warning' });
            }
          }
        } catch (emailError) {
          if (showToast) {
            showToast(`⚠️ Vynucení bylo nastaveno, ale email se nepodařilo odeslat: ${emailError.message}`, { type: 'warning' });
          }
        }
      }

      // Update local data - pokud nebyl reload (při chybě emailu)
      if (options.option !== 'with-email' || !emailResult?.results?.find(r => r.user_id === user.id && r.success)) {
        const updatedUsers = users.map(u => 
          u.id === user.id 
            ? { ...u, vynucena_zmena_hesla: 1 }
            : u
        );
        setUsers(updatedUsers);
      }

      setGlobalProgress(100);
      doneGlobalProgress();
      setIsForcePasswordChangeModalOpen(false);

      if (showToast && options.option === 'without-email') {
        showToast(`✓ Vynucení změny hesla bylo nastaveno pro ${user.fullName || user.username}`, { type: 'success' });
      }

    } catch (error) {
      doneGlobalProgress();
      setIsForcePasswordChangeModalOpen(false);

      const errorMessage = error.message || 'Chyba při změně nastavení hesla';
      if (showToast) {
        showToast(`✗ ${errorMessage}`, { type: 'error' });
      }
    }
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPasswordConfirm = async (newPassword) => {
    if (!selectedUser) return;

    try {
      startGlobalProgress();
      setGlobalProgress(30);

      // Volání API pro reset hesla
      const result = await partialUpdateUser({
        token,
        username,
        id: selectedUser.id,
        password: newPassword
      });

      setGlobalProgress(70);

      // Refresh user list to show any updates
      await fetchUsers();

      setGlobalProgress(100);
      doneGlobalProgress();

      if (showToast) {
        const fullName = selectedUser.fullName || selectedUser.username;
        showToast(`✓ Heslo uživatele ${fullName} bylo úspěšně změněno`, { type: 'success' });
      }

      setIsResetPasswordModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      doneGlobalProgress();

      const errorMessage = error.message || 'Chyba při změně hesla';
      if (showToast) {
        showToast(`✗ ${errorMessage}`, { type: 'error' });
      }
    }
  };

  const handleEditUser = async (user) => {
    try {
      // POKUS 1: Zkusíme načíst z API
      let userDetail = null;
      try {
        userDetail = await fetchUserDetail({
          token,
          username,
          id: user.id
        });
      } catch (apiError) {
        // API detail selhal, použije se fallback data
        console.error('❌ handleEditUser - API error:', apiError);
      }

      // POKUS 2: Pokud API nevrátilo ID pole, najdi uživatele v rawApiData
      if (!userDetail || (!userDetail.usek_id && !userDetail.usek?.id)) {
        const rawUser = rawApiData?.find(u => (u.id || u.user_id) === user.id);

        if (rawUser) {
          userDetail = {
            ...userDetail,
            ...rawUser,
            // Zajisti správné mapování
            id: rawUser.id || rawUser.user_id,
            username: rawUser.username || rawUser.prihlas_jmeno,
            jmeno: rawUser.jmeno || rawUser.name,
            prijmeni: rawUser.prijmeni || rawUser.surname,
          };
        }
      }

      setUserModalState({
        isOpen: true,
        mode: 'edit',
        userData: userDetail
      });
    } catch (error) {
      if (showToast) {
        showToast('Chyba při načítání detailu uživatele', { type: 'error' });
      }
    }
  };

  const handleAddUser = () => {
    setUserModalState({
      isOpen: true,
      mode: 'create',
      userData: null
    });
  };

  const handleCloseUserModal = () => {
    setUserModalState({
      isOpen: false,
      mode: 'create',
      userData: null
    });
  };

  const handleUserModalSuccess = () => {
    // 🎯 Tiché načtení na pozadí místo reload stránky se splash screen
    // NEVYČIŠŤOVAT users[], aby uživatel viděl aktuální stav
    // Jen spustit fetch na pozadí - bez loader animací

    // 🔇 Přímé tiché načtení bez spouštění loading gate
    fetchUsers(true);

    // Pokud máme načítání počtů objednávek, obnovíme i je
    if (typeof fetchOrdersCounts === 'function') {
      // Malý delay před načtením countů, aby se DB stihla aktualizovat
      setTimeout(() => {
        fetchOrdersCounts(true); // force refresh
      }, 500);
    }

  };

  const handleDeleteUser = (user) => {
    // Kontrola zda se nejedná o aktuálně přihlášeného uživatele
    if (user.username === username) {
      if (showToast) showToast('Nemůžete smazat sám sebe', { type: 'warning' });
      return;
    }
    setSelectedUser(user);
    setDialogAction('delete');
    setDeleteType('soft'); // Reset na soft delete
    setIsDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedUser) return;

    try {
      startGlobalProgress();
      setGlobalProgress(30);

      switch (dialogAction) {
        case 'delete': {
          // Kontrola práv - pokud má USER_DELETE a vybral hard delete, skutečně smazat
          const canHardDelete = hasPermission && hasPermission('USER_DELETE');
          const fullName = selectedUser.fullName || selectedUser.username;
          const isHardDelete = deleteType === 'hard' && canHardDelete;

          if (isHardDelete) {
            // Hard delete - trvalé smazání
            await deleteUser({
              token,
              username,
              id: selectedUser.id
            });

            setGlobalProgress(100);
            doneGlobalProgress();

            if (showToast) {
              showToast(`✓ Uživatel ${fullName} byl trvale smazán z databáze`, { type: 'success' });
            }
          } else {
            // Soft delete - pouze deaktivace
            await deactivateUser({
              token,
              username,
              id: selectedUser.id
            });

            setGlobalProgress(100);
            doneGlobalProgress();

            if (showToast) {
              showToast(`✓ Uživatel ${fullName} byl deaktivován`, { type: 'success' });
            }
          }

          // Force refresh seznamu uživatelů z databáze
          setUsers([]); // Vyčisti aktuální seznam
          setLoading(true);
          setRefreshTrigger(prev => prev + 1); // Trigger force refresh

          // Refresh počtů objednávek
          if (typeof fetchOrdersCounts === 'function') {
            setTimeout(() => fetchOrdersCounts(true), 500);
          }
          break;
        }

        case 'toggle': {
          // Toggle aktivního stavu
          const newActiveState = selectedUser.active ? 0 : 1;
          const fullName = selectedUser.fullName || selectedUser.username;

          await partialUpdateUser({
            token,
            username,
            id: selectedUser.id,
            aktivni: newActiveState
          });

          setGlobalProgress(100);
          doneGlobalProgress();

          if (showToast) {
            showToast(
              newActiveState === 1
                ? `✓ Uživatel ${fullName} byl aktivován`
                : `✓ Uživatel ${fullName} byl deaktivován`,
              { type: 'success' }
            );
          }

          // Force refresh seznamu uživatelů z databáze
          setUsers([]); // Vyčisti aktuální seznam
          setLoading(true);
          setRefreshTrigger(prev => prev + 1); // Trigger force refresh

          // Refresh počtů objednávek
          if (typeof fetchOrdersCounts === 'function') {
            setTimeout(() => fetchOrdersCounts(true), 500);
          }
          break;
        }

        default:
          doneGlobalProgress();
          break;
      }

      setIsDialogOpen(false);
      setSelectedUser(null);
      setDialogAction(null);

    } catch (error) {
      doneGlobalProgress();

      const errorMessage = error.message || 'Chyba při provádění operace';
      if (showToast) {
        showToast(`✗ ${errorMessage}`, { type: 'error' });
      }

      // Zavřít dialog i při chybě
      setIsDialogOpen(false);
      setSelectedUser(null);
      setDialogAction(null);
    }
  };

  const handleCancelAction = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    setDialogAction(null);
  };

  // Context Menu handlers
  const handleUserContextMenu = useCallback((e, user, cellData = null) => {
    e.preventDefault();

    // Zjisti na jakou buňku se kliklo
    let selectedData = null;
    const target = e.target;

    if (cellData) {
      selectedData = cellData;
    } else if (target && target.closest('td')) {
      // Najdi text obsahu buňky
      const cellElement = target.closest('td');
      selectedData = {
        value: cellElement.textContent?.trim() || '',
        element: cellElement
      };
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      user: user,
      selectedData: selectedData
    });
  }, []);

  const handleContextMenuEdit = useCallback(() => {
    if (contextMenu?.user) {
      handleEditUser(contextMenu.user);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleContextMenuDelete = useCallback(() => {
    if (contextMenu?.user) {
      handleDeleteUser(contextMenu.user);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleContextMenuToggleActive = useCallback(() => {
    if (contextMenu?.user) {
      setSelectedUser(contextMenu.user);
      setDialogAction('toggle');
      setIsDialogOpen(true);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const getDialogMessage = () => {
    if (!selectedUser) return '';
    const userName = `${selectedUser.name} ${selectedUser.surname} (${selectedUser.username})`;
    const canHardDelete = hasPermission && hasPermission('USER_DELETE');

    switch (dialogAction) {
      case 'delete':
        // Pro adminy s právem USER_DELETE zobrazíme volbu typu mazání
        if (canHardDelete) {
          return (
            <div>
              <p style={{ marginBottom: '1.5rem' }}>
                Opravdu chcete odstranit uživatele <strong>{userName}</strong>?
              </p>
              
              <div style={{
                background: '#f8fafc',
                border: '2px solid #cbd5e1',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569', fontSize: '1rem' }}>
                  🔧 Vyberte typ odstranění:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    border: `2px solid ${deleteType === 'soft' ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    background: deleteType === 'soft' ? '#eff6ff' : 'white',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="deleteType"
                      value="soft"
                      checked={deleteType === 'soft'}
                      onChange={(e) => setDeleteType(e.target.value)}
                      style={{ marginTop: '0.25rem', accentColor: '#3b82f6', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                        Deaktivace (SOFT DELETE)
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        Uživatel bude deaktivován. Data zůstanou zachována, lze později obnovit.
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    border: `2px solid ${deleteType === 'hard' ? '#dc2626' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    background: deleteType === 'hard' ? '#fef2f2' : 'white',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="deleteType"
                      value="hard"
                      checked={deleteType === 'hard'}
                      onChange={(e) => setDeleteType(e.target.value)}
                      style={{ marginTop: '0.25rem', accentColor: '#dc2626', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '0.25rem' }}>
                        ⚠️ Trvalé smazání (HARD DELETE)
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                        <strong>NEVRATNÉ!</strong> Uživatel bude trvale smazán z databáze včetně všech vazeb.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          );
        } else {
          return `Opravdu chcete deaktivovat uživatele?\n\n${userName}\n\nNemáte oprávnění USER_DELETE, proto bude uživatel pouze deaktivován (soft delete). Jeho data zůstanou zachována, ale nebude se moci přihlásit do systému.`;
        }
      case 'toggle':
        return selectedUser.active
          ? `Opravdu chcete deaktivovat uživatele?\n\n${userName}\n\nUživatel se nebude moci přihlásit do systému, ale jeho data zůstanou zachována.`
          : `Opravdu chcete aktivovat uživatele?\n\n${userName}\n\nUživatel získá znovu přístup do systému s původními právy.`;
      default:
        return '';
    }
  };

  const getDialogConfirmText = () => {
    const canHardDelete = hasPermission && hasPermission('USER_DELETE');

    switch (dialogAction) {
      case 'delete':
        if (!canHardDelete) return 'Deaktivovat';
        return deleteType === 'hard' ? '⚠️ Smazat trvale' : 'Deaktivovat';
      case 'toggle':
        return selectedUser?.active ? 'Deaktivovat' : 'Aktivovat';
      default:
        return 'Potvrdit';
    }
  };

  const getDialogVariant = () => {
    const canHardDelete = hasPermission && hasPermission('USER_DELETE');

    switch (dialogAction) {
      case 'delete':
        if (!canHardDelete) return 'warning';
        return deleteType === 'hard' ? 'danger' : 'warning';
      case 'toggle':
        return selectedUser?.active ? 'warning' : 'primary';
      default:
        return 'primary';
    }
  };

  const getDialogIcon = () => {
    const canHardDelete = hasPermission && hasPermission('USER_DELETE');

    switch (dialogAction) {
      case 'delete':
        if (!canHardDelete) return faExclamationTriangle;
        return deleteType === 'hard' ? faTrash : faExclamationTriangle;
      case 'toggle':
        return selectedUser?.active ? faUserSlash : faUserCheck;
      default:
        return faQuestionCircle;
    }
  };

  const handleStatusFilterClick = () => {
    setStatusFilter(prev => {
      if (prev === 'all') return 'active';
      if (prev === 'active') return 'inactive';
      return 'all';
    });
  };

  const handleForcePasswordChangeFilterClick = () => {
    setForcePasswordChangeFilter(prev => {
      if (prev === 'all') return 'forced';
      if (prev === 'forced') return 'normal';
      return 'all';
    });
  };

  const handleClearFilters = () => {
    setGlobalFilter('');
    setDepartmentFilter('');
    setGroupFilter('');
    setLocationFilter('');
    setPositionFilter('');
    setStatusFilter('all'); // Reset na defaultní hodnotu
    setForcePasswordChangeFilter('all'); // Reset na defaultní hodnotu
    setColumnFilters({}); // Vymazat i column filtry v tabulce
    // localStorage will be updated automatically via useEffect hooks
  };

  const clearColumnFilters = () => {
    setColumnFilters({});
    setStatusFilter('all'); // Reset ikonového filtru "Aktivní"
    setForcePasswordChangeFilter('all'); // Reset ikonového filtru "Vynucení změny hesla"
    // localStorage will be updated automatically via useEffect hooks
  };

  // Handler pro toggle rozšířeného filtru
  const handleToggleFilters = () => {
    const newShowFilters = !showFilters;
    setShowFilters(newShowFilters);
    setUserStorage('users_showFilters', newShowFilters);
  };

  // Handler pro toggle rozšířených filtrů (Lokalita, Pozice, Úsek, Role)
  const handleToggleExpandedFilters = () => {
    const newShowExpandedFilters = !showExpandedFilters;
    setShowExpandedFilters(newShowExpandedFilters);
    setUserStorage('users_showExpandedFilters', newShowExpandedFilters);
  };

  const toggleAllRows = () => {
    const anyExpanded = Object.values(expandedRows).some(val => val);
    if (anyExpanded) {
      setExpandedRows({});
    } else {
      const allExpanded = {};
      filteredData.forEach((_, index) => {
        allExpanded[index] = true;
      });
      setExpandedRows(allExpanded);
    }
  };

  const toggleRowHighlighting = () => {
    setShowRowHighlighting(!showRowHighlighting);
  };

  const handleRefreshOrdersCount = () => {
    if (showToast) {
      showToast('Aktualizuji počty objednávek z databáze...', { type: 'info' });
    }
    fetchOrdersCounts(true); // Force refresh z DB
  };

  const handleToggleDashboard = () => {
    const newShowDashboard = !showDashboard;
    setShowDashboard(newShowDashboard);
    setUserStorage('users_showDashboard', newShowDashboard);
  };

  const handleShowFilters = () => {
    setShowFilters(true);
    setUserStorage('users_showFilters', true);
  };

  const handleExport = () => {
    if (showToast) showToast('Export uživatelů bude dostupný brzy', { type: 'info' });
  };

  const handleToggleDebug = () => {
    const newShowDebug = !showDebug;
    setShowDebug(newShowDebug);
    setUserStorage('users_showDebug', newShowDebug);
  };

  const uniqueDepartments = useMemo(() => [...new Set(users.map(u => u.department))].sort(), [users]);
  const uniqueGroups = useMemo(() => [...new Set(users.map(u => u.group_name))].sort(), [users]);
  const uniqueLocations = useMemo(() => [...new Set(users.map(u => u.location))].sort(), [users]);
  const uniquePositions = useMemo(() => [...new Set(users.map(u => u.position))].sort(), [users]);

  const renderPagination = () => {
    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;
    if (pageCount <= 1) return null;

    const pages = [];
    pages.push(<PageButton key={0} onClick={() => table.setPageIndex(0)} className={currentPage === 0 ? 'active' : ''}>1</PageButton>);

    if (currentPage > 2) pages.push(<span key="ellipsis1" style={{ padding: '0 0.5rem', color: '#9ca3af' }}>...</span>);

    for (let i = Math.max(1, currentPage - 1); i <= Math.min(pageCount - 2, currentPage + 1); i++) {
      pages.push(<PageButton key={i} onClick={() => table.setPageIndex(i)} className={currentPage === i ? 'active' : ''}>{i + 1}</PageButton>);
    }

    if (currentPage < pageCount - 3) pages.push(<span key="ellipsis2" style={{ padding: '0 0.5rem', color: '#9ca3af' }}>...</span>);

    if (pageCount > 1) {
      pages.push(<PageButton key={pageCount - 1} onClick={() => table.setPageIndex(pageCount - 1)} className={currentPage === pageCount - 1 ? 'active' : ''}>{pageCount}</PageButton>);
    }

    return pages;
  };

  if (loading && users.length === 0 && !isSilentLoading) {
    return (
      <LoadingOverlay $visible={true}>
        <LoadingSpinner $visible={true} />
        <LoadingMessage $visible={true}>Načítám uživatele...</LoadingMessage>
        <LoadingSubtext $visible={true}>Prosím čekejte</LoadingSubtext>
      </LoadingOverlay>
    );
  }

  if (error && users.length === 0) {
    return <Container><ErrorMessage>{error}</ErrorMessage></Container>;
  }

  return (
    <>
    <Container>
      <LoadingOverlay $visible={loading && !isSilentLoading}>
        <LoadingSpinner $visible={loading && !isSilentLoading} />
        <LoadingMessage $visible={loading && !isSilentLoading}>Aktualizuji data...</LoadingMessage>
        <LoadingSubtext $visible={loading && !isSilentLoading}>Prosím čekejte</LoadingSubtext>
      </LoadingOverlay>

      <PageContent $blurred={loading && !isSilentLoading}>

      <TitlePanel>
        <TitleLeft>
          <SmartTooltip text="Obnovit seznam uživatelů z databáze (force reload)" icon="warning" preferredPosition="bottom">
            <RefreshButton onClick={fetchUsers}>
              <FontAwesomeIcon icon={faSyncAlt} />
            </RefreshButton>
          </SmartTooltip>
        </TitleLeft>
        <PageTitle>
          Správa uživatelů
          <FontAwesomeIcon icon={faUsers} />
        </PageTitle>
      </TitlePanel>

      <ActionBar>
        {!showDashboard && (
          <SmartTooltip text="Zobrazit přehledový dashboard" icon="info" preferredPosition="bottom">
            <ActionButton onClick={handleToggleDashboard}>
              <FontAwesomeIcon icon={faDashboard} />
              Dashboard
            </ActionButton>
          </SmartTooltip>
        )}

        {!showFilters && (
          <SmartTooltip text="Zobrazit pokročilé filtry" icon="info" preferredPosition="bottom">
            <ActionButton onClick={handleShowFilters}>
              <FontAwesomeIcon icon={faFilter} />
              Filtr
            </ActionButton>
          </SmartTooltip>
        )}

        <SmartTooltip text="Export seznamu uživatelů do CSV" icon="success" preferredPosition="bottom">
          <ActionButton onClick={handleExport}>
            <FontAwesomeIcon icon={faFileExport} />
            Export
          </ActionButton>
        </SmartTooltip>

        <SmartTooltip text="Vytvořit nového uživatele" icon="success" preferredPosition="bottom">
          <ActionButton $primary onClick={handleAddUser}>
            <FontAwesomeIcon icon={faPlus} />
            Přidat uživatele
          </ActionButton>
        </SmartTooltip>
      </ActionBar>

      {/* Debug Panel - přístupný z DEBUG menu v menubar */}
      {showDebug && rawApiData && (
        <DebugPanel>
          <DebugHeader>
            <DebugTitle>
              <FontAwesomeIcon icon={faEraser} />
              🔍 DEBUG - Surová data z API (users/list)
            </DebugTitle>
            <ActionButton onClick={handleToggleDebug}>
              <FontAwesomeIcon icon={faTimes} />
              Skrýt debug
            </ActionButton>
          </DebugHeader>
          <DebugContent>
            <DebugSection>
              <DebugLabel>📊 Základní info:</DebugLabel>
              <DebugValue>{`Počet uživatelů: ${rawApiData.length}
Uživatelé s ID: ${rawApiData.map(u => `${u.id || u.user_id} (${u.username || u.prihlas_jmeno})`).join(', ')}`}</DebugValue>
            </DebugSection>

            <DebugSection>
              <DebugLabel>🛒 Počty objednávek:</DebugLabel>
              <DebugValue>{`Načteno počtů: ${Object.keys(ordersCount).length}
${Object.entries(ordersCount).map(([userId, count]) => {
                const user = users.find(u => u.id === parseInt(userId));
                return `  - User ${userId} (${user?.username || 'Neznámý'}): ${count === undefined ? 'načítá...' : count}`;
              }).join('\n')}

Stav ordersCount:
${JSON.stringify(ordersCount, null, 2)}`}</DebugValue>
            </DebugSection>

            {rawApiData[0] && (
              <DebugSection>
                <DebugLabel>📝 První uživatel (struktura):</DebugLabel>
                <DebugValue>{JSON.stringify(rawApiData[0], null, 2)}</DebugValue>
              </DebugSection>
            )}

            <DebugSection>
              <DebugLabel>🗂️ Všechna data (JSON):</DebugLabel>
              <DebugValue>{JSON.stringify(rawApiData, null, 2)}</DebugValue>
            </DebugSection>
          </DebugContent>
        </DebugPanel>
      )}

      {showDashboard && (
        <DashboardPanel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FontAwesomeIcon icon={faDashboard} style={{ color: '#3b82f6' }} />
              Dashboard uživatelů
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <SmartTooltip text="Skrýt dashboard a zobrazit pouze tabulku uživatelů" icon="info" preferredPosition="bottom">
                <ActionButton onClick={handleToggleDashboard}>
                  <FontAwesomeIcon icon={faTimes} />
                  Skrýt
                </ActionButton>
              </SmartTooltip>
            </div>
          </div>
          <DashboardGrid>
            {/* Vysoká dlazdice s aktivními uživateli - PRVNÍ */}
            <TallStatCard $color="#16a34a">
              <StatHeader style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <StatLabel style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a', margin: 0 }}>
                  <FontAwesomeIcon icon={faUserCheck} style={{ marginRight: '0.5rem' }} />
                  Aktivní uživatelé ({activeUsers.length})
                </StatLabel>
                <button
                  onClick={fetchActiveUsersData}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#16a34a',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(22, 163, 74, 0.1)';
                    e.currentTarget.style.transform = 'rotate(180deg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.transform = 'rotate(0deg)';
                  }}
                  title="Obnovit seznam"
                >
                  <FontAwesomeIcon icon={faSyncAlt} size="sm" />
                </button>
              </StatHeader>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                paddingRight: '0.25rem'
              }}>
                {activeUsers.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    color: '#9ca3af',
                    fontSize: '0.875rem'
                  }}>
                    Žádní aktivní uživatelé
                  </div>
                ) : (
                  activeUsers.slice(0, 8).map((user, index) => {
                    const now = new Date();
                    const activityTime = new Date(user.dt_posledni_aktivita);
                    const diffSec = Math.floor((now - activityTime) / 1000);
                    const diffMin = Math.floor(diffSec / 60);
                    const status = diffSec < 270 ? 'active' : diffSec < 300 ? 'warning' : 'inactive';

                    // Formátovat čas
                    let timeText = '';
                    if (diffSec < 60) {
                      timeText = `${diffSec}s`;
                    } else {
                      timeText = `${diffMin}m`;
                    }

                    // Formátovat datum a čas v CZ formátu
                    const dateTimeText = prettyDate(activityTime);

                    // Parse aktivita_metadata
                    let metadata = null;
                    try {
                      if (user.aktivita_metadata) {
                        metadata = typeof user.aktivita_metadata === 'string' 
                          ? JSON.parse(user.aktivita_metadata)
                          : user.aktivita_metadata;
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }

                    return (
                      <div key={index} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        transition: 'background 0.2s',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: status === 'active' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444'
                          }} />
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#1f2937',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1
                          }}>
                            {user.cele_jmeno}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: 400,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            minWidth: '150px',
                            textAlign: 'right'
                          }}>
                            {dateTimeText}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: 400,
                            flexShrink: 0,
                            minWidth: '40px',
                            textAlign: 'right'
                          }}>
                            {timeText}
                          </div>
                        </div>
                        {metadata && (metadata.last_module || metadata.last_ip) && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            paddingLeft: '1.25rem',
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {metadata.last_module && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                📍 {metadata.last_module}
                              </span>
                            )}
                            {metadata.last_ip && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                🌐 {metadata.last_ip}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </TallStatCard>

            {/* Malé statistické dlazdice - VEDLE */}
            <SmallStatCard
              $color="#3b82f6"
              $clickable
              $isActive={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              title="Klikněte pro zobrazení všech uživatelů"
            >
              <StatHeader>
                <StatValue>{stats.total}</StatValue>
                <StatIcon $color="#3b82f6"><FontAwesomeIcon icon={faUsers} /></StatIcon>
              </StatHeader>
              <StatLabel>Celkem uživatelů v systému</StatLabel>
            </SmallStatCard>

            <SmallStatCard
              $color="#16a34a"
              $clickable
              $isActive={statusFilter === 'active'}
              onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
              title="Klikněte pro filtrování pouze aktivních uživatelů"
            >
              <StatHeader>
                <StatValue>{stats.active}</StatValue>
                <StatIcon $color="#16a34a"><FontAwesomeIcon icon={faUserCheck} /></StatIcon>
              </StatHeader>
              <StatLabel>Aktivní uživatelé</StatLabel>
            </SmallStatCard>

            <SmallStatCard
              $color="#dc2626"
              $clickable
              $isActive={statusFilter === 'inactive'}
              onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
              title="Klikněte pro filtrování pouze neaktivních uživatelů"
            >
              <StatHeader>
                <StatValue>{stats.inactive}</StatValue>
                <StatIcon $color="#dc2626"><FontAwesomeIcon icon={faUserSlash} /></StatIcon>
              </StatHeader>
              <StatLabel>Neaktivní uživatelé</StatLabel>
            </SmallStatCard>

            <SmallStatCard
              $color="#f59e0b"
              $clickable
              $isActive={forcePasswordChangeFilter === 'forced'}
              onClick={() => setForcePasswordChangeFilter(forcePasswordChangeFilter === 'forced' ? 'all' : 'forced')}
              title="Klikněte pro filtrování uživatelů s vynucenou změnou hesla"
            >
              <StatHeader>
                <StatValue>{stats.forcePasswordChange}</StatValue>
                <StatIcon $color="#f59e0b"><FontAwesomeIcon icon={faExclamationTriangle} /></StatIcon>
              </StatHeader>
              <StatLabel>Vynucená změna hesla</StatLabel>
            </SmallStatCard>

            <MediumStatCard $color="#8b5cf6">
              <StatHeader>
                <StatValue>{Object.keys(stats.departments).length}</StatValue>
                <StatIcon $color="#8b5cf6"><FontAwesomeIcon icon={faBuilding} /></StatIcon>
              </StatHeader>
              <StatLabel>Počet úseků</StatLabel>
            </MediumStatCard>

            <MediumStatCard $color="#10b981">
              <StatHeader>
                <StatValue>{Object.keys(stats.groups).length}</StatValue>
                <StatIcon $color="#10b981"><FontAwesomeIcon icon={faShield} /></StatIcon>
              </StatHeader>
              <StatLabel>Počet skupin/rolí</StatLabel>
            </MediumStatCard>

            <MediumStatCard $color="#ec4899">
              <StatHeader>
                <StatValue>
                  {Object.keys(ordersCount).length > 0 ?
                    Object.values(ordersCount).filter(count => count > 0).length :
                    '...'
                  }
                </StatValue>
                <StatIcon $color="#ec4899"><FontAwesomeIcon icon={faUserCheck} /></StatIcon>
              </StatHeader>
              <StatLabel>Uživatelů s objednávkami</StatLabel>
            </MediumStatCard>
          </DashboardGrid>
        </DashboardPanel>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <FiltersPanel>
          <FiltersHeader>
            <FiltersTitle>
              <FontAwesomeIcon icon={faFilter} />
              Filtry a vyhledávání
            </FiltersTitle>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <SmartTooltip text="Vymazat všechny filtry a zobrazit všechny uživatele" icon="warning" preferredPosition="bottom">
                <ClearFiltersButton onClick={handleClearFilters}>
                  <FontAwesomeIcon icon={faEraser} />
                  Zrušit filtr
                </ClearFiltersButton>
              </SmartTooltip>
              <SmartTooltip
                text={showExpandedFilters
                  ? 'Skrýt rozšířené filtry (zobrazit pouze základní vyhledávání)'
                  : 'Zobrazit rozšířené filtry (role, organizace, stav...)'}
                icon="info"
                preferredPosition="bottom"
              >
                <ActionButton onClick={handleToggleExpandedFilters}>
                  <FontAwesomeIcon icon={showExpandedFilters ? faChevronUp : faChevronDown} />
                  {showExpandedFilters ? 'Skrýt filtr' : 'Rozšířený filtr'}
                </ActionButton>
              </SmartTooltip>
              <SmartTooltip text="Skrýt celý panel filtrů a vyhledávání" icon="info" preferredPosition="bottom">
                <ActionButton onClick={() => setShowFilters(false)}>
                  <FontAwesomeIcon icon={faTimes} />
                  Skrýt
                </ActionButton>
              </SmartTooltip>
            </div>
          </FiltersHeader>

          {/* Fultext vyhledávání - celá šířka */}
          <FilterGroup style={{ gridColumn: '1 / -1' }}>
            <FilterLabel>
              <FontAwesomeIcon icon={faSearch} />
              Fulltext vyhledávání
            </FilterLabel>
            <FilterInputWithIcon>
              <FontAwesomeIcon icon={faSearch} />
              <FilterInput
                type="text"
                placeholder="Hledat v uživatelském jménu, jméně, emailu, lokalitě, pozici, úseku, skupině..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                hasIcon
              />
              {globalFilter && (
                <ClearButton
                  onClick={() => setGlobalFilter('')}
                  title="Vymazat"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </ClearButton>
              )}
            </FilterInputWithIcon>
          </FilterGroup>

          {/* Rozšířené filtry - zobrazí se po kliknutí na "Rozšířený filtr" */}
          {showExpandedFilters && (
            <FiltersGrid style={{ marginTop: '1rem' }}>
              <FilterGroup>
                <FilterLabel><FontAwesomeIcon icon={faUserCog} />Status uživatele</FilterLabel>
                <FilterSelectWithIcon>
                  <FontAwesomeIcon icon={faUserCog} />
                  <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} hasIcon>
                    <option value="all">Všichni uživatelé</option>
                    <option value="active">Pouze aktivní</option>
                    <option value="inactive">Pouze neaktivní</option>
                  </FilterSelect>
                </FilterSelectWithIcon>
              </FilterGroup>

              <FilterGroup>
                <FilterLabel><FontAwesomeIcon icon={faMapMarkerAlt} />Lokalita</FilterLabel>
                <FilterSelectWithIcon>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  <FilterSelect value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} hasIcon>
                    <option value="">Všechny lokality</option>
                    {uniqueLocations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                  </FilterSelect>
                </FilterSelectWithIcon>
              </FilterGroup>

              <FilterGroup>
                <FilterLabel><FontAwesomeIcon icon={faBriefcase} />Pozice</FilterLabel>
                <FilterSelectWithIcon>
                  <FontAwesomeIcon icon={faBriefcase} />
                  <FilterSelect value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} hasIcon>
                    <option value="">Všechny pozice</option>
                    {uniquePositions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                  </FilterSelect>
                </FilterSelectWithIcon>
              </FilterGroup>

              <FilterGroup>
                <FilterLabel><FontAwesomeIcon icon={faBuilding} />Úsek</FilterLabel>
                <FilterSelectWithIcon>
                  <FontAwesomeIcon icon={faBuilding} />
                  <FilterSelect value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} hasIcon>
                    <option value="">Všechny úseky</option>
                    {uniqueDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </FilterSelect>
                </FilterSelectWithIcon>
              </FilterGroup>

              <FilterGroup>
                <FilterLabel><FontAwesomeIcon icon={faShield} />Role</FilterLabel>
                <FilterSelectWithIcon>
                  <FontAwesomeIcon icon={faShield} />
                  <FilterSelect value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} hasIcon>
                    <option value="">Všechny skupiny</option>
                    {uniqueGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                  </FilterSelect>
                </FilterSelectWithIcon>
              </FilterGroup>
            </FiltersGrid>
          )}
        </FiltersPanel>
      )}

      {/* 🎯 TableScrollWrapper s shadow indikátory */}
      <TableScrollWrapper
        ref={setTableWrapperRef}
        $showLeftShadow={showLeftShadow}
        $showRightShadow={showRightShadow}
      >
        <TableContainer ref={setTableContainerRef}>
          <Table>
          <TableHead>
            {/* První řádek - názvy sloupců */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeader
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      ...(header.id === 'expander' ? { width: '50px', textAlign: 'center' } : {})
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && header.column.getIsSorted() && (
                        <FontAwesomeIcon
                          icon={
                            header.column.getIsSorted() === 'asc' ? faChevronUp :
                            faChevronDown
                          }
                        />
                      )}
                    </div>
                  </TableHeader>
                ))}
              </tr>
            ))}

            {/* Druhý řádek - filtry sloupců */}
            <tr>
              {table.getHeaderGroups()[0]?.headers.map(header => (
                <TableHeader key={`filter-${header.id}`} style={{
                  padding: '0.5rem',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #e5e7eb',
                  ...(header.id === 'expander' ? { width: '50px', textAlign: 'center' } : {})
                }}>
                  {header.id === 'expander' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '32px'
                    }}>
                      <FilterActionButton
                        onClick={toggleAllRows}
                        title={Object.values(expandedRows).some(val => val) ? "Sbalit všechny řádky" : "Rozbalit všechny řádky"}
                      >
                        <FontAwesomeIcon icon={Object.values(expandedRows).some(val => val) ? faMinus : faPlus} />
                      </FilterActionButton>
                    </div>
                  ) : header.id === 'actions' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '3px',
                      height: '32px'
                    }}>
                      <FilterActionButton
                        onClick={clearColumnFilters}
                        title="Zrušit filtry sloupců"
                      >
                        <FontAwesomeIcon icon={faEraser} />
                      </FilterActionButton>
                      <FilterActionButton
                        onClick={handleRefreshOrdersCount}
                        title={
                          isLoadingOrdersCounts
                            ? "Načítám počty objednávek..."
                            : ordersCountLoadTime
                              ? `Aktualizovat počty objednávek (poslední načtení: ${(ordersCountLoadTime / 1000).toFixed(2)}s)`
                              : "Aktualizovat počty objednávek"
                        }
                        disabled={isLoadingOrdersCounts}
                        style={{
                          position: 'relative',
                          background: isLoadingOrdersCounts ? '#94a3b8' : '#16a34a',
                          color: 'white',
                          borderColor: isLoadingOrdersCounts ? '#94a3b8' : '#16a34a',
                          opacity: isLoadingOrdersCounts ? 0.7 : 1
                        }}
                      >
                        <FontAwesomeIcon icon={isLoadingOrdersCounts ? faSyncAlt : faShoppingCart} />
                      </FilterActionButton>
                      <FilterActionButton
                        onClick={toggleRowHighlighting}
                        title={showRowHighlighting ? "Vypnout podbarvení řádků podle statusu" : "Zapnout podbarvení řádků podle statusu"}
                        className={showRowHighlighting ? 'active' : ''}
                      >
                        <FontAwesomeIcon icon={faPalette} />
                      </FilterActionButton>
                    </div>
                  ) : header.id === 'active' ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <IconFilterButton
                        onClick={handleStatusFilterClick}
                        title={
                          statusFilter === 'all' ? 'Zobrazit vše' :
                          statusFilter === 'active' ? 'Jen aktivní' :
                          'Jen neaktivní'
                        }
                      >
                        {statusFilter === 'all' && (
                          <svg viewBox="0 0 512 512" style={{ width: '20px', height: '20px' }}>
                            <defs>
                              <clipPath id="clip-left-status">
                                <rect x="0" y="0" width="256" height="512"/>
                              </clipPath>
                              <clipPath id="clip-right-status">
                                <rect x="256" y="0" width="256" height="512"/>
                              </clipPath>
                            </defs>
                            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"
                                  fill="#22c55e" clipPath="url(#clip-left-status)"/>
                            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"
                                  fill="#ef4444" clipPath="url(#clip-right-status)"/>
                          </svg>
                        )}
                        {statusFilter === 'active' && (
                          <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#22c55e', fontSize: '20px' }}/>
                        )}
                        {statusFilter === 'inactive' && (
                          <FontAwesomeIcon icon={faTimesCircle} style={{ color: '#ef4444', fontSize: '20px' }}/>
                        )}
                      </IconFilterButton>
                    </div>
                  ) : header.column.columnDef.accessorKey === 'vynucena_zmena_hesla' ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <IconFilterButton
                        onClick={handleForcePasswordChangeFilterClick}
                        title={
                          forcePasswordChangeFilter === 'all' ? 'Zobrazit vše' :
                          forcePasswordChangeFilter === 'forced' ? 'Jen s vynucenou změnou' :
                          'Jen bez vynucené změny'
                        }
                      >
                        {forcePasswordChangeFilter === 'all' && (
                          <svg viewBox="0 0 512 512" style={{ width: '20px', height: '20px' }}>
                            <defs>
                              <clipPath id="clip-left-force">
                                <rect x="0" y="0" width="256" height="512"/>
                              </clipPath>
                              <clipPath id="clip-right-force">
                                <rect x="256" y="0" width="256" height="512"/>
                              </clipPath>
                            </defs>
                            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"
                                  fill="#f59e0b" clipPath="url(#clip-left-force)"/>
                            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"
                                  fill="#94a3b8" clipPath="url(#clip-right-force)"/>
                          </svg>
                        )}
                        {forcePasswordChangeFilter === 'forced' && (
                          <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#f59e0b', fontSize: '20px' }}/>
                        )}
                        {forcePasswordChangeFilter === 'normal' && (
                          <FontAwesomeIcon icon={faQuestionCircle} style={{ color: '#94a3b8', fontSize: '20px' }}/>
                        )}
                      </IconFilterButton>
                    </div>
                  ) : (
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder={`Hledat ${header.column.columnDef.header}...`}
                        value={columnFilters[header.column.columnDef.accessorKey || header.column.columnDef.id] || ''}
                        onChange={(e) => {
                          const columnKey = header.column.columnDef.accessorKey || header.column.columnDef.id;
                          const newFilters = { ...columnFilters };
                          newFilters[columnKey] = e.target.value;
                          setColumnFilters(newFilters);
                        }}
                      />
                      {columnFilters[header.column.columnDef.accessorKey || header.column.columnDef.id] && (
                        <ColumnClearButton
                          onClick={() => {
                            const columnKey = header.column.columnDef.accessorKey || header.column.columnDef.id;
                            const newFilters = { ...columnFilters };
                            delete newFilters[columnKey];
                            setColumnFilters(newFilters);
                          }}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  )}
                </TableHeader>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <React.Fragment key={row.id}>
                <TableRow
                  $isEven={index % 2 === 0}
                  $isActive={row.original.active}
                  $showHighlighting={showRowHighlighting}
                  onContextMenu={(e) => handleUserContextMenu(e, row.original)}
                  onDoubleClick={() => handleEditUser(row.original)}
                  style={{ cursor: 'context-menu' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={cell.column.id === 'expander' ? { width: '50px', textAlign: 'center', padding: '0.5rem' } : {}}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>

                {expandedRows[row.id] && (() => {
                  return (
                  <tr>
                    <td colSpan={columns.length} style={{ padding: 0 }}>
                      <ExpandedContent>
                        <ExpandedGrid>
                          <InfoCard>
                            <InfoCardTitle><FontAwesomeIcon icon={faIdCard} />Základní informace</InfoCardTitle>
                            <InfoRow><InfoLabel>ID:</InfoLabel><InfoValue>{row.original.id}</InfoValue></InfoRow>
                            <InfoRow><InfoLabel>Uživatelské jméno:</InfoLabel><InfoValue>{row.original.username}</InfoValue></InfoRow>
                            <InfoRow><InfoLabel>Celé jméno:</InfoLabel><InfoValue>{row.original.fullName}</InfoValue></InfoRow>
                            <InfoRow><InfoLabel>Email:</InfoLabel><InfoValue>{row.original.email}</InfoValue></InfoRow>
                          </InfoCard>

                          <InfoCard>
                            <InfoCardTitle><FontAwesomeIcon icon={faBuilding} />Organizační zařazení</InfoCardTitle>
                            <InfoRow><InfoLabel>Úsek:</InfoLabel><InfoValue>{row.original.department}</InfoValue></InfoRow>
                            <InfoRow><InfoLabel>Lokalita:</InfoLabel><InfoValue>{row.original.location}</InfoValue></InfoRow>
                            <InfoRow><InfoLabel>Telefon:</InfoLabel><InfoValue>{row.original.phone}</InfoValue></InfoRow>
                          </InfoCard>

                          <InfoCard>
                            <InfoCardTitle><FontAwesomeIcon icon={faClock} />Aktivita</InfoCardTitle>
                            <InfoRow>
                              <InfoLabel>Status:</InfoLabel>
                              <InfoValue>
                                <StatusBadge $active={row.original.active}>
                                  <FontAwesomeIcon icon={row.original.active ? faCheckCircle : faTimesCircle} />
                                  {row.original.active ? 'Aktivní' : 'Neaktivní'}
                                </StatusBadge>
                              </InfoValue>
                            </InfoRow>
                            <InfoRow>
                              <InfoLabel>Poslední aktivita:</InfoLabel>
                              <InfoValue>{row.original.dt_activity ? prettyDate(row.original.dt_activity) : 'Nikdy'}</InfoValue>
                            </InfoRow>
                            {(() => {
                              try {
                                const metadata = row.original.aktivita_metadata
                                  ? (typeof row.original.aktivita_metadata === 'string'
                                      ? JSON.parse(row.original.aktivita_metadata)
                                      : row.original.aktivita_metadata)
                                  : null;
                                
                                // Support both old format (last_ip) and new format (last_public_ip, last_local_ip)
                                const publicIp = metadata?.last_public_ip || metadata?.last_ip;
                                const localIp = metadata?.last_local_ip;
                                
                                if (metadata && (metadata.last_module || publicIp || localIp)) {
                                  return (
                                    <>
                                      {metadata.last_module && (
                                        <InfoRow>
                                          <InfoLabel>Modul:</InfoLabel>
                                          <InfoValue style={{ fontWeight: 500 }}>{metadata.last_module}</InfoValue>
                                        </InfoRow>
                                      )}
                                      {publicIp && (
                                        <InfoRow>
                                          <InfoLabel>Veřejná IP:</InfoLabel>
                                          <InfoValue style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{publicIp}</InfoValue>
                                        </InfoRow>
                                      )}
                                      {localIp && (
                                        <InfoRow>
                                          <InfoLabel>Lokální IP:</InfoLabel>
                                          <InfoValue style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{localIp}</InfoValue>
                                        </InfoRow>
                                      )}
                                    </>
                                  );
                                }
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </InfoCard>

                          {/* Role a práva - NOVÁ VERZE S UNIKÁTNÍMI PRÁVY */}
                          {((row.original.roles && row.original.roles.length > 0) || (row.original.direct_rights && row.original.direct_rights.length > 0)) && (() => {
                            // Připravit seznam rolí - SEŘAZENÝ ABECEDNĚ
                            const rolesList = row.original.roles && Array.isArray(row.original.roles)
                              ? [...row.original.roles].sort((a, b) => {
                                  const nameA = (a.nazev_role || a.nazev || '').toLowerCase();
                                  const nameB = (b.nazev_role || b.nazev || '').toLowerCase();
                                  return nameA.localeCompare(nameB, 'cs');
                                })
                              : [];

                            // Sestavit unikátní seznam všech práv
                            const allRightsMap = new Map(); // key: kod_prava, value: { right: object, roleIndexes: [] }

                            // Přidat práva z rolí
                            rolesList.forEach((role, roleIdx) => {
                              if (role.rights && Array.isArray(role.rights)) {
                                role.rights.forEach(right => {
                                  const kod = right.kod_prava || right.nazev || right.name || right.code;
                                  if (kod) {
                                    if (!allRightsMap.has(kod)) {
                                      allRightsMap.set(kod, { right: right, roleIndexes: [] });
                                    }
                                    allRightsMap.get(kod).roleIndexes.push(roleIdx + 1); // číslování od 1
                                  }
                                });
                              }
                            });

                            // Přidat přímá práva (bez role index)
                            if (row.original.direct_rights && Array.isArray(row.original.direct_rights)) {
                              row.original.direct_rights.forEach(right => {
                                const kod = right.kod_prava || right.nazev || right.name || right.code;
                                if (kod) {
                                  if (!allRightsMap.has(kod)) {
                                    allRightsMap.set(kod, { right: right, roleIndexes: [] });
                                  }
                                  // Pro přímá práva nepřidáváme roleIndex
                                }
                              });
                            }

                            // Převést na pole pro zobrazení - SEŘAZENÉ ABECEDNĚ PODLE KÓDU
                            const uniqueRights = Array.from(allRightsMap.entries())
                              .map(([kod, data]) => ({
                                kod,
                                right: data.right,
                                roleIndexes: [...new Set(data.roleIndexes)].sort() // unique a seřazené
                              }))
                              .sort((a, b) => a.kod.localeCompare(b.kod, 'cs'));

                            return (
                              <InfoCard style={{ gridColumn: '1 / -1' }}>
                                <InfoCardTitle><FontAwesomeIcon icon={faShield} />Role a práva</InfoCardTitle>

                                {/* 1. SEZNAM ROLÍ */}
                                {rolesList.length > 0 && (
                                  <div style={{
                                    marginBottom: '1.5rem',
                                    padding: '0.75rem',
                                    background: '#f0f9ff',
                                    borderRadius: '6px',
                                    border: '1px solid #bae6fd'
                                  }}>
                                    <div style={{
                                      fontSize: '0.875rem',
                                      fontWeight: 600,
                                      color: '#0c4a6e',
                                      marginBottom: '0.75rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}>
                                      <FontAwesomeIcon icon={faShield} style={{ color: '#0284c7' }} />
                                      Role uživatele ({rolesList.length}):
                                    </div>

                                    {rolesList.map((role, roleIdx) => (
                                      <div key={`role-${roleIdx}`} style={{
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        fontSize: '0.875rem'
                                      }}>
                                        {/* Číslo role */}
                                        <div style={{
                                          background: '#0284c7',
                                          color: 'white',
                                          borderRadius: '50%',
                                          width: '20px',
                                          height: '20px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.75rem',
                                          fontWeight: 'bold',
                                          flexShrink: 0,
                                          marginRight: '0.75rem'
                                        }}>
                                          {roleIdx + 1}
                                        </div>

                                        {/* Název role a popis - jako tabulka */}
                                        <div style={{ flex: 1, display: 'flex' }}>
                                          <div style={{
                                            fontWeight: 600,
                                            color: '#0c4a6e',
                                            minWidth: '150px',
                                            marginRight: '1.5rem'
                                          }}>
                                            {role.nazev_role || role.nazev || role.name || 'Bez názvu'}
                                          </div>
                                          {(role.Popis || role.popis) && (
                                            <div style={{
                                              color: '#64748b',
                                              fontStyle: 'italic',
                                              flex: 1
                                            }}>
                                              {role.Popis || role.popis}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* 2. UNIKÁTNÍ PRÁVA PODLE SEKCÍ */}
                                {uniqueRights.length > 0 && (() => {
                                  // Překladový slovník pro názvy sekcí
                                  const sectionTranslations = {
                                    'ORDER': 'Objednávky',
                                    'USER': 'Uživatelé',
                                    'CONTACT': 'Kontakty',
                                    'REPORT': 'Reporty',
                                    'ADMIN': 'Administrace',
                                    'SYSTEM': 'Systém',
                                    'EXPORT': 'Export',
                                    'IMPORT': 'Import',
                                    'SETTINGS': 'Nastavení',
                                    'BACKUP': 'Zálohy',
                                    'LOG': 'Logy',
                                    'NOTIFICATION': 'Notifikace',
                                    'OSTATNÍ': 'Ostatní'
                                  };

                                  // Seskupit práva podle prefixu (ORDER_, USER_, atd.)
                                  const rightsBySection = {};
                                  uniqueRights.forEach(item => {
                                    const kod = item.kod;
                                    const prefix = kod.includes('_') ? kod.split('_')[0] : 'OSTATNÍ';
                                    if (!rightsBySection[prefix]) {
                                      rightsBySection[prefix] = [];
                                    }
                                    rightsBySection[prefix].push(item);
                                  });

                                  // Seřadit sekce abecedně, ale OSTATNÍ na konec
                                  const sortedSections = Object.keys(rightsBySection).sort((a, b) => {
                                    if (a === 'OSTATNÍ') return 1;
                                    if (b === 'OSTATNÍ') return -1;
                                    return a.localeCompare(b);
                                  });

                                  return (
                                    <div style={{
                                      padding: '0.75rem',
                                      background: '#f8fafc',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1'
                                    }}>
                                      <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: '#1e293b',
                                        marginBottom: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '1rem'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <FontAwesomeIcon icon={faKey} style={{ color: '#059669' }} />
                                          Všechna práva ({uniqueRights.length}) podle sekcí:
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          {/* Vyhledávací pole pro práva */}
                                          <div style={{ position: 'relative' }}>
                                            <FontAwesomeIcon
                                              icon={faSearch}
                                              style={{
                                                position: 'absolute',
                                                left: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#9ca3af',
                                                fontSize: '0.75rem'
                                              }}
                                            />
                                            <input
                                              type="text"
                                              placeholder="Najít právo..."
                                              value={rightsSearchTerm || ''}
                                              onChange={(e) => {
                                                const searchTerm = e.target.value;
                                                setRightsSearchTerm(searchTerm);

                                                // Auto-rozvinutí sekcí s nalezernými právy
                                                if (searchTerm.trim()) {
                                                  const newCollapsed = {};
                                                  sortedSections.forEach(sectionName => {
                                                    const sectionRights = rightsBySection[sectionName];
                                                    const hasMatch = sectionRights.some(item =>
                                                      item.kod.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                      (item.right.popis && item.right.popis.toLowerCase().includes(searchTerm.toLowerCase()))
                                                    );
                                                    // Rozviň sekci pokud obsahuje výsledek
                                                    if (hasMatch) {
                                                      newCollapsed[sectionName] = false;
                                                    }
                                                  });
                                                  setCollapsedSections(prev => ({ ...prev, ...newCollapsed }));
                                                }
                                              }}
                                              style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem 0.25rem 1.75rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                background: 'white',
                                                width: '140px',
                                                transition: 'all 0.2s'
                                              }}
                                              onFocus={(e) => {
                                                e.target.style.borderColor = '#3b82f6';
                                                e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
                                              }}
                                              onBlur={(e) => {
                                                e.target.style.borderColor = '#d1d5db';
                                                e.target.style.boxShadow = 'none';
                                              }}
                                            />
                                          </div>

                                          {/* Collapse/Expand všechno tlačítko */}
                                          <button
                                            onClick={() => {
                                              const allCollapsed = sortedSections.every(section => collapsedSections[section]);
                                              const newState = {};
                                              sortedSections.forEach(section => {
                                                newState[section] = !allCollapsed;
                                              });
                                              setCollapsedSections(newState);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.25rem',
                                              padding: '0.25rem 0.5rem',
                                              fontSize: '0.75rem',
                                              fontWeight: 500,
                                              color: '#6b7280',
                                              background: 'white',
                                              border: '1px solid #d1d5db',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.target.style.background = '#f3f4f6';
                                              e.target.style.borderColor = '#9ca3af';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.background = 'white';
                                              e.target.style.borderColor = '#d1d5db';
                                            }}
                                            title={sortedSections.every(section => collapsedSections[section]) ? 'Rozvinout všechny sekce' : 'Sbalit všechny sekce'}
                                          >
                                            <FontAwesomeIcon
                                              icon={sortedSections.every(section => collapsedSections[section]) ? faPlus : faMinus}
                                              style={{ fontSize: '0.7rem' }}
                                            />
                                            {sortedSections.every(section => collapsedSections[section]) ? 'Vše' : 'Sbalit'}
                                          </button>
                                        </div>
                                      </div>

                                        {sortedSections.map(sectionName => {
                                        const sectionRights = rightsBySection[sectionName];
                                        // Seřadit práva v sekci podle abecedy
                                        const sortedSectionRights = [...sectionRights].sort((a, b) => a.kod.localeCompare(b.kod));

                                        const filteredSectionRights = rightsSearchTerm ?
                                          sortedSectionRights.filter(item => {
                                            const searchLower = rightsSearchTerm.toLowerCase();
                                            return item.kod.toLowerCase().includes(searchLower) ||
                                                   (item.right.popis && item.right.popis.toLowerCase().includes(searchLower));
                                          }) : sortedSectionRights;
                                        const isCollapsed = collapsedSections[sectionName];

                                        // Pokud při vyhledávání sekce neobsahuje výsledky, nezobrazí se
                                        if (rightsSearchTerm && filteredSectionRights.length === 0) {
                                          return null;
                                        }                                        return (
                                          <div key={sectionName} style={{ marginBottom: '1rem' }}>
                                            {/* Header sekce - klikací */}
                                            <div
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.5rem 0.75rem',
                                                background: '#e2e8f0',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                marginBottom: isCollapsed ? '0' : '0.5rem',
                                                transition: 'all 0.2s'
                                              }}
                                              onClick={() => {
                                                setCollapsedSections(prev => ({
                                                  ...prev,
                                                  [sectionName]: !prev[sectionName]
                                                }));
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#cbd5e1';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#e2e8f0';
                                              }}
                                            >
                                              <FontAwesomeIcon
                                                icon={isCollapsed ? faChevronRight : faChevronDown}
                                                style={{
                                                  color: '#64748b',
                                                  fontSize: '0.75rem',
                                                  transition: 'transform 0.2s'
                                                }}
                                              />
                                              <span style={{
                                                fontWeight: 600,
                                                color: '#475569',
                                                fontSize: '0.875rem'
                                              }}>
                                                {sectionTranslations[sectionName] || sectionName} ({rightsSearchTerm ? filteredSectionRights.length : sortedSectionRights.length}
                                                {rightsSearchTerm && filteredSectionRights.length !== sortedSectionRights.length && (
                                                  <span style={{ color: '#64748b', fontWeight: 400 }}> z {sortedSectionRights.length}</span>
                                                )})
                                              </span>
                                            </div>

                                            {/* Obsah sekce - skládací */}
                                            {!isCollapsed && (
                                              <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem',
                                                paddingLeft: '1.5rem'
                                              }}>
                                                {filteredSectionRights.map((item, idx) => {
                                                  const buttonText = item.kod;
                                                  const tooltipText = item.right.popis || item.right.description || buttonText;

                                                  return (
                                                    <div
                                                      key={`${sectionName}-right-${idx}`}
                                                      title={tooltipText}
                                                      style={{
                                                        background: 'white',
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        border: '1px solid #059669',
                                                        color: '#065f46',
                                                        fontWeight: 500,
                                                        cursor: 'help',
                                                        transition: 'all 0.2s',
                                                        boxShadow: '0 1px 2px rgba(5, 150, 105, 0.1)',
                                                        position: 'relative',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'flex-start',
                                                        minWidth: '120px'
                                                      }}
                                                      onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#d1fae5';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.2)';
                                                      }}
                                                      onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(5, 150, 105, 0.1)';
                                                      }}
                                                    >
                                                      {/* Hlavní řádek s kódem práva a role indexy */}
                                                      <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        width: '100%',
                                                        marginBottom: tooltipText !== buttonText ? '2px' : '0'
                                                      }}>
                                                        <span>{buttonText}</span>
                                                        {/* Role indexy jako horní index */}
                                                        {item.roleIndexes.length > 0 && (
                                                          <sup style={{
                                                            fontSize: '0.6rem',
                                                            color: '#0284c7',
                                                            fontWeight: 'bold',
                                                            marginLeft: '2px'
                                                          }}>
                                                            {item.roleIndexes.join(',')}
                                                          </sup>
                                                        )}
                                                      </div>

                                                      {/* Popis pod hlavním textem - pouze pokud se liší od kódu */}
                                                      {tooltipText !== buttonText && (
                                                        <div style={{
                                                          fontSize: '0.65rem',
                                                          color: '#6b7280',
                                                          fontWeight: 400,
                                                          lineHeight: 1.2,
                                                          textAlign: 'left',
                                                          maxWidth: '100%',
                                                          wordBreak: 'break-word'
                                                        }}>
                                                          {tooltipText}
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
                                  );
                                })()}

                                {/* Pokud uživatel nemá žádné role ani přímá práva */}
                                {uniqueRights.length === 0 && (
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                    fontStyle: 'italic',
                                    padding: '1rem',
                                    textAlign: 'center'
                                  }}>
                                    Tento uživatel nemá přiřazené žádné role ani práva
                                  </div>
                                )}
                              </InfoCard>
                            );
                          })()}
                        </ExpandedGrid>
                      </ExpandedContent>
                    </td>
                  </tr>
                  );
                })()}
              </React.Fragment>
            ))}
          </tbody>
        </Table>

        {/* Pagination - stejně jako v Orders25List */}
        <PaginationContainer>
          <PaginationInfo>
            Zobrazeno {table.getRowModel().rows.length} z {filteredData.length} uživatelů
            {filteredData.length !== users.length && (
              <span> (filtrováno z {users.length})</span>
            )}
          </PaginationInfo>

          <PaginationControls>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
              Zobrazit:
            </span>
            <PageSizeSelect
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                setPageSize(newSize);
                setUserStorage('users_pageSize', newSize);
                table.setPageSize(newSize);
                // Resetuj na první stránku při změně velikosti stránky
                setCurrentPageIndex(0);
                setUserStorage('users_pageIndex', 0);
                table.setPageIndex(0);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </PageSizeSelect>

            <PageButton
              onClick={goToFirstPage}
              disabled={!table.getCanPreviousPage()}
            >
              ««
            </PageButton>
            <PageButton
              onClick={goToPreviousPage}
              disabled={!table.getCanPreviousPage()}
            >
              ‹
            </PageButton>

            <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
              Stránka {table.getState().pagination.pageIndex + 1} z {table.getPageCount()}
            </span>

            <PageButton
              onClick={goToNextPage}
              disabled={!table.getCanNextPage()}
            >
              ›
            </PageButton>
            <PageButton
              onClick={goToLastPage}
              disabled={!table.getCanNextPage()}
            >
              »»
            </PageButton>
          </PaginationControls>
        </PaginationContainer>
      </TableContainer>
      </TableScrollWrapper>

      {/* 🎯 React Portal pro scroll šipky (MIMO scroll context) */}
      {createPortal(
        <>
          <ScrollArrowLeft
            onClick={handleScrollLeft}
            onMouseEnter={() => setIsArrowHovered(true)}
            onMouseLeave={() => setIsArrowHovered(false)}
            $visible={showLeftArrow}
            $tableHovered={isTableHovered}
            $arrowHovered={isArrowHovered}
            aria-label="Posunout vlevo"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </ScrollArrowLeft>

          <ScrollArrowRight
            onClick={handleScrollRight}
            onMouseEnter={() => setIsArrowHovered(true)}
            onMouseLeave={() => setIsArrowHovered(false)}
            $visible={showRightArrow}
            $tableHovered={isTableHovered}
            $arrowHovered={isArrowHovered}
            aria-label="Posunout vpravo"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </ScrollArrowRight>
        </>,
        document.body
      )}

      <ConfirmDialog
        isOpen={isDialogOpen}
        title={
          dialogAction === 'delete'
            ? (hasPermission && hasPermission('USER_DELETE') ? 'Smazání uživatele' : 'Deaktivace uživatele')
            : dialogAction === 'toggle'
            ? (selectedUser?.active ? 'Deaktivace uživatele' : 'Aktivace uživatele')
            : 'Potvrzení akce'
        }
        icon={getDialogIcon()}
        variant={getDialogVariant()}
        onConfirm={handleConfirmAction}
        onClose={handleCancelAction}
      >
        {getDialogMessage()}
      </ConfirmDialog>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleResetPasswordConfirm}
        userData={selectedUser}
      />

      {/* Force Password Change Modal */}
      <ForcePasswordChangeModal
        isOpen={isForcePasswordChangeModalOpen}
        onClose={() => {
          setIsForcePasswordChangeModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleForcePasswordChangeConfirm}
        userData={selectedUser}
        templates={emailTemplates}
      />

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={userModalState.isOpen}
        onClose={handleCloseUserModal}
        mode={userModalState.mode}
        userData={userModalState.userData}
        onSuccess={handleUserModalSuccess}
        addToast={showToast}
      />

      {/* User Context Menu */}
      {contextMenu && (
        <UserContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          user={contextMenu.user}
          selectedData={contextMenu.selectedData}
          onClose={() => setContextMenu(null)}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onToggleActive={handleContextMenuToggleActive}
          canEdit={true}
          canDelete={hasPermission && hasPermission('USER_DELETE')}
        />
      )}

      </PageContent>
    </Container>

    {/* Moderní Sponka helper - kontextová nápověda pro správu uživatelů */}
    {hasPermission('HELPER_VIEW') && <ModernHelper pageContext="users" />}
    </>
  );
};

export default Users;

