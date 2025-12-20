import React, { useState, useEffect, useContext, useCallback } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';
import { CustomSelect } from './CustomSelect';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, XCircle, Coins, Calendar, User, Building2, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: ${props => props.$collapsed ? '1.5rem' : '2rem'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 2rem;
  transition: padding 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.$collapsed ? '0' : '2rem'};
  padding-bottom: ${props => props.$collapsed ? '0' : '1.5rem'};
  border-bottom: ${props => props.$collapsed ? 'none' : '2px solid #e5e7eb'};
  transition: all 0.3s ease;
`;

const Title = styled.h2`
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #3b82f6;
  }
`;

const CollapseButton = styled.button`
  background: transparent;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;
  border-radius: 6px;
  
  &:hover {
    background: #f3f4f6;
    color: #3b82f6;
  }
  
  svg {
    transition: transform 0.3s ease;
  }
`;

const CollapsibleContent = styled.div`
  max-height: ${props => props.$collapsed ? '0' : '10000px'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  opacity: ${props => props.$collapsed ? '0' : '1'};
  transition: max-height 0.3s ease, opacity 0.2s ease;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$primary && `
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }
  `}
  
  ${props => props.$secondary && `
    background: white;
    color: #3b82f6;
    border: 2px solid #3b82f6;
    
    &:hover:not(:disabled) {
      background: #eff6ff;
      border-color: #2563eb;
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    ${props => props.$loading && css`
      animation: ${spinAnimation} 1s linear infinite;
    `}
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: ${props => props.$gradient || 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'};
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const StatIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: ${props => props.$bg || 'white'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color || '#3b82f6'};
  box-shadow: 0 4px 12px ${props => props.$shadow || 'rgba(59, 130, 246, 0.2)'};
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.$light ? 'rgba(255, 255, 255, 0.9)' : '#6b7280'};
  margin-bottom: 0.25rem;
  font-weight: 500;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.$light ? 'white' : '#1f2937'};
  line-height: 1.2;
`;

const FilterBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: start;
`;

const FilterWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  width: 100%;
  
  svg {
    color: #6b7280;
  }
`;

const FilterLabelLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterClearButton = styled.button`
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  color: #9ca3af;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
  border-radius: 4px;
  opacity: ${props => props.$visible ? 1 : 0};
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 1.75rem 0.75rem 0.75rem;
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
  flex: 1;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #3b82f6;
  }

  /* Custom dropdown arrow - stejná jako v OrderForm25 */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;

  /* Styling pro placeholder option */
  option[value="all"] {
    color: #6b7280;
    font-weight: 500;
  }

  option {
    color: #1f2937;
    font-weight: 500;
    padding: 0.5rem;
  }
`;

const CashbookYearSelect = styled.select`
  padding: 0.6rem 1rem;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  background: white;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  
  &:hover {
    border-color: #d97706;
    background: #fffbeb;
  }
  
  &:focus {
    outline: none;
    border-color: #d97706;
    background: #fffbeb;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
  }
  
  option {
    background: white;
    color: #1f2937;
    padding: 0.5rem;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: white;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  
  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e5e7eb;
    white-space: nowrap;
    
    &:first-of-type {
      border-top-left-radius: 12px;
    }
    
    &:last-of-type {
      border-top-right-radius: 12px;
    }
  }
`;

const Tbody = styled.tbody`
  tr {
    transition: background 0.2s ease;
    
    &:hover {
      background: #f9fafb;
    }
    
    &:last-child td {
      border-bottom: none;
    }
  }
  
  td {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.95rem;
    color: #374151;
  }
`;

const Tfoot = styled.tfoot`
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  font-weight: 700;
  
  td {
    padding: 1rem;
    border-top: 3px solid #3b82f6;
    font-size: 1rem;
    color: #1f2937;
  }
  
  tr:first-of-type td:first-of-type {
    border-bottom-left-radius: 12px;
  }
  
  tr:first-of-type td:last-of-type {
    border-bottom-right-radius: 12px;
  }
`;

const LPCode = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.5px;
`;

const Category = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const Amount = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: ${props => props.$color || '#1f2937'};
  text-align: right;
`;

// TŘI TYPY ČERPÁNÍ - Vizuální hierarchie
const ThreeTypeAmount = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

// Hlavní částka (čerpáno/fakturované) - VELKÝ FONT
const MainAmount = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.$color || '#1f2937'};
  white-space: nowrap;
  text-align: right;
`;

// Vedlejší částky (požadováno, plánováno) - MALÝ FONT
const SubAmounts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.72rem;
  color: #6b7280;
  font-weight: 500;
  text-align: right;
`;

const SubAmount = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: flex-end;
  
  &::before {
    content: '→';
    color: #9ca3af;
    font-size: 0.7rem;
  }
`;

// Pro osobní čerpání - tři typy v tabulce
const ThreeTypeAmountContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: right;
`;

const ThreeTypeAmountRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const ThreeTypeLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 500;
  min-width: 90px;
`;

const ThreeTypeValue = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  text-align: right;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 24px;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.$percent >= 100) return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    if (props.$percent >= 80) return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
  }};
  width: ${props => Math.min(props.$percent, 100)}%;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  
  ${props => {
    if (props.$status === 'ok') return `
      background: #d1fae5;
      color: #065f46;
    `;
    if (props.$status === 'info') return `
      background: #dbeafe;
      color: #1e40af;
    `;
    if (props.$status === 'warning') return `
      background: #fed7aa;
      color: #92400e;
    `;
    return `
      background: #fee2e2;
      color: #991b1b;
    `;
  }}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
  
  svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 1.25rem;
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const SpinningIcon = styled.div`
  svg {
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  
  svg {
    flex-shrink: 0;
    color: #3b82f6;
    margin-top: 0.125rem;
  }
  
  div {
    flex: 1;
    
    h4 {
      margin: 0 0 0.5rem 0;
      color: #1e40af;
      font-size: 1rem;
      font-weight: 600;
    }
    
    p {
      margin: 0;
      color: #1e40af;
      font-size: 0.9rem;
      line-height: 1.6;
    }
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  
  svg {
    color: #9ca3af;
  }
`;

const CollapsibleSection = styled.div`
  margin-bottom: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 2px solid transparent;
`;

const SectionHeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  
  h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.1rem;
    color: #1f2937;
    font-weight: 600;
    
    svg {
      color: #3b82f6;
    }
  }
`;

const SectionCollapseButton = styled.button`
  background: transparent;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;
  border-radius: 6px;
  
  &:hover {
    background: #f3f4f6;
    color: #3b82f6;
  }
  
  svg {
    transition: transform 0.3s ease;
  }
`;

const SectionContent = styled.div`
  max-height: ${props => props.$collapsed ? '0' : '5000px'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  padding: ${props => props.$collapsed ? '0 1.25rem' : '1.5rem 1.25rem'};
`;

// ===== PROGRESS BAR komponenty (v3.0 - TŘI TYPY ČERPÁNÍ) =====

const LPProgressContainer = styled.div`
  margin: 0.75rem 0;
`;

const LPProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const LPProgressLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 600;
  color: ${props => props.$color || '#374151'};
`;

const LPProgressPercent = styled.span`
  font-weight: 700;
  color: ${props => props.$color || '#374151'};
`;

const LPProgressBarContainer = styled.div`
  position: relative;
  height: 24px;
  background: #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
`;

const LPProgressBarFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => Math.min(props.$percent || 0, 100)}%;
  background: ${props => props.$color || '#3b82f6'};
  transition: width 0.5s ease, background 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
`;

const LPProgressBarOverflow = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  padding: 0 0.5rem;
  display: flex;
  align-items: center;
  background: #dc3545;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 0 8px 8px 0;
`;

const LPProgressFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const LPProgressAmount = styled.span`
  font-weight: 600;
  color: ${props => props.$color || '#374151'};
`;

const LPProgressLimit = styled.span`
  color: #9ca3af;
`;

// Tooltip komponenty
const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover > div {
    opacity: 1;
    visibility: visible;
  }
`;

const TooltipContent = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 1rem;
  background: #1f2937;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 280px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  z-index: 1000;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #1f2937;
  }
`;

const TooltipTitle = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.2);
`;

const TooltipTable = styled.table`
  width: 100%;
  font-size: 0.875rem;
  
  tr {
    &:not(:last-child) td {
      padding-bottom: 0.375rem;
    }
    
    &.divider td {
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
  }
  
  td {
    padding: 0.25rem 0;
    
    &:first-child {
      color: #d1d5db;
      padding-right: 1rem;
    }
    
    &:last-child {
      text-align: right;
      font-weight: 600;
      
      &.negative {
        color: #fca5a5;
      }
      
      &.positive {
        color: #86efac;
      }
    }
  }
`;

const TooltipFooter = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.2);
  font-size: 0.8rem;
  color: #d1d5db;
`;

// ===== HELPER FUNKCE podle v3.0 dokumentace =====

/**
 * Barevné kódování podle čerpání LP
 * @param {Object} lp - LP objekt
 * @returns {Object} - { color, label, icon, bgColor }
 */
const getLPColor = (lp) => {
  const percent = lp.procento_skutecne || 0;
  
  if (lp.je_prekroceno_skutecne || lp.je_prekroceno) {
    return {
      color: '#dc3545',      // červená
      bgColor: '#fee2e2',
      label: 'Překročeno',
      icon: '⚠️'
    };
  }
  
  if (percent >= 90) {
    return {
      color: '#fd7e14',      // oranžová
      bgColor: '#fed7aa',
      label: 'Kritické',
      icon: '🔴'
    };
  }
  
  if (percent >= 75) {
    return {
      color: '#ffc107',      // žlutá
      bgColor: '#fef3c7',
      label: 'Vysoké',
      icon: '🟡'
    };
  }
  
  if (percent >= 50) {
    return {
      color: '#17a2b8',      // modrá
      bgColor: '#dbeafe',
      label: 'Střední',
      icon: '🔵'
    };
  }
  
  return {
    color: '#28a745',        // zelená
    bgColor: '#d1fae5',
    label: 'V pořádku',
    icon: '🟢'
  };
};

/**
 * Komponenta pro správu limitovaných příslibů v3.0
 * - ADMIN: všechna LP v systému
 * - APPROVE: LP úseku + osobní čerpání
 * - LP Manager: spravovaná LP
 * - Basic User: pouze osobní čerpání
 */
const LimitovanePrislibyManager = () => {
  const { user, token, username, userDetail, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  // State pro data
  const [lpData, setLpData] = useState([]);
  const [myUsageData, setMyUsageData] = useState(null); // Pro /moje-cerpani endpoint (objednávky)
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // State pro filtry - MULTI-SELECT podporuje pole hodnot
  const [filterUsek, setFilterUsek] = useState([]);
  const [filterUser, setFilterUser] = useState([]);
  const [filterKategorie, setFilterKategorie] = useState([]);
  
  // CustomSelect states (pro vyhledávání a dropdown)
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState({});
  
  // State pro collapsed sekce (s localStorage)
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try {
      const saved = localStorage.getItem(`lp_collapsed_sections_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const [isMainCollapsed, setIsMainCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(`lp_main_collapsed_${user?.id || 'default'}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });
  
  // State pro confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // ===== MAPOVÁNÍ LP KATEGORIÍ S POPISY =====
  const LP_CATEGORY_NAMES = {
    'LPE': 'Energie',
    'LPIA': 'IT aplikace',
    'LPIT': 'IT technologie',
    'LPL': 'Licence',
    'LPMK': 'Marketing',
    'LPN': 'Nájem',
    'LPP': 'Poradenství',
    'LPPT': 'Protipožární technika',
    'LPR': 'Revize',
    'LPSO': 'Stavební objekty',
    'LPT': 'Technika',
    'LPZDR': 'Zdravotnické prostředky',
    'LPZOS': 'Zdravotní služby',
    'LPÚČ': 'Účetnictví'
  };
  
  // ===== DETEKCE ROLÍ podle nové dokumentace v3.0 =====
  
  // ADMIN / SUPERADMIN - vidí VŠE
  const isAdmin = userDetail?.roles?.some(role => 
    role.kod_role === 'ADMINISTRATOR' || role.kod_role === 'SUPERADMIN'
  );
  
  // APPROVE (Schvalovatel) - vidí svůj úsek + své objednávky
  const isApprove = hasPermission && hasPermission('ORDER_APPROVAL');
  
  // Správce LP (je_spravce_lp) - vidí LP které spravuje
  const isLPManager = user?.je_spravce_lp === true || user?.je_spravce_lp === 1;
  
  // Kontrola oprávnění pro správu LP (inicializace, přepočet)
  const canManageLP = hasPermission && (
    hasPermission('LP_MANAGE') || 
    hasPermission('ADMIN') ||
    isAdmin
  );
  
  // Všichni uživatelé (i bez ORDER_APPROVAL) vidí LP svého úseku
  // Endpoint /moje-cerpani se nepoužívá pro základní view
  
  // User info
  const userUsekId = user?.usek_id || userDetail?.usek_id;
  const userId = user?.id;
  
  // ===== NAČTENÍ DAT podle role (v3.0) =====
  const loadLPData = useCallback(async () => {
    setLoading(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/';
      const currentYear = new Date().getFullYear();
      
      let endpoint = `${API_BASE_URL}limitovane-prisliby/stav`;
      let payload = {
        rok: currentYear,
        username: username,
        token: token
      };
      
      // Podle dokumentace - výběr endpointu a payloadu podle role:
      
      if (isAdmin) {
        // ===== ADMIN: Všechna LP v systému =====
        payload.isAdmin = true;
        
      } else if (isLPManager && userId) {
        // ===== Správce LP: LP které spravuje =====
        payload.user_id = userId;
        
      } else if (userUsekId) {
        // ===== VŠICHNI OSTATNÍ: LP celého úseku =====
        // Platí pro: APPROVE, běžné uživatele, kohokoli s usek_id
        payload.usek_id = userUsekId;
        
      } else {
        // ===== Fallback: Pokud chybí usek_id =====
        console.warn('LP Mode: Chybí usek_id, nelze načíst LP úseku');
        throw new Error('Nelze načíst LP - chybí přiřazení k úseku');
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error('LP API Error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      // 🔍 DEBUG: Co vrací BE
      console.log('🔍 LP API Response:', {
        endpoint: endpoint,
        payload: payload,
        status: result.status,
        dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
        dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
        fullResult: result
      });
      
      // Kontrola status z API
      if (result.status === 'error') {
        console.error('LP API returned error:', result.message);
        throw new Error(result.message || 'Chyba při načítání LP');
      }
      
      // ===== ZPRACOVÁNÍ DAT podle endpointu =====
      let lpList = [];
      let myUsageData = null; // Pro /moje-cerpani endpoint
      
      if (endpoint.includes('moje-cerpani')) {
        // ===== ENDPOINT: /moje-cerpani =====
        // Response: { status: "ok", data: { lp_cerpani: [...], objednavky: [...] }, meta: {...} }
        
        if (result.data?.lp_cerpani) {
          lpList = result.data.lp_cerpani;
          
          myUsageData = {
            lp_cerpani: result.data.lp_cerpani,
            objednavky: result.data.objednavky || []
          };
        }
        
      } else {
        // ===== ENDPOINT: /stav =====
        // Response: { status: "ok", data: [...LP items...], meta: {...} }
        lpList = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
      }
      
      // ===== MAPOVÁNÍ BE → FE (v3.0 - TŘI TYPY ČERPÁNÍ) =====
      const mappedData = lpList.map(lp => {
        // Detekce zdroje dat podle struktury
        const isMojeCerpani = endpoint.includes('moje-cerpani');
        
        // Limit (celkovy_limit je vždy na top level)
        const vyseKryti = parseFloat(lp.celkovy_limit || lp.vyse_financniho_kryti || 0);
        
        // VAROVÁNÍ: Pokud limit chybí, vypsat warning
        if (vyseKryti === 0 && isMojeCerpani) {
          console.warn('LP', lp.cislo_lp, 'má nulový celkovy_limit! Data:', lp);
        }
        
        // ===== TŘI TYPY ČERPÁNÍ podle v3.0 =====
        // Pro /moje-cerpani: moje_rezervovano, moje_predpoklad, moje_skutecne
        // Pro /stav: rezervovano, predpokladane_cerpani, skutecne_cerpano
        const rezervovano = parseFloat(lp.moje_rezervovano || lp.rezervovano || 0);
        const predpokladaneCerpani = parseFloat(lp.moje_predpoklad || lp.predpokladane_cerpani || 0);
        const skutecneCerpano = parseFloat(lp.moje_skutecne || lp.skutecne_cerpano || 0);
        const cerpanoPokladna = parseFloat(lp.cerpano_pokladna || 0);
        
        // ===== ZŮSTATKY podle typu =====
        // DŮLEŽITÉ: Pro /moje-cerpani BE vrací procenta vůči celkovému limitu,
        // ale nezapočítává "zbývá" (to musíme počítat my)
        // Pro /stav BE vrací kompletní "zbyva_*" hodnoty
        let zbyvaRezervace, zbyvaPredpoklad, zbyvaSkutecne;
        
        if (isMojeCerpani) {
          // Pro moje-cerpani: zbývá = celkový limit - moje čerpání
          // (uživatel vidí co zbývá z CELÉHO limitu, ne jen z jeho podílu)
          zbyvaRezervace = vyseKryti - rezervovano;
          zbyvaPredpoklad = vyseKryti - predpokladaneCerpani;
          zbyvaSkutecne = vyseKryti - skutecneCerpano;
        } else {
          // Pro /stav: použít hodnoty z BE nebo dopočítat
          zbyvaRezervace = parseFloat(lp.zbyva_rezervace || (vyseKryti - rezervovano));
          zbyvaPredpoklad = parseFloat(lp.zbyva_predpoklad || (vyseKryti - predpokladaneCerpani));
          zbyvaSkutecne = parseFloat(lp.zbyva_skutecne || (vyseKryti - skutecneCerpano));
        }
        
        // ===== PROCENTA podle typu =====
        // Pro /moje-cerpani: procento_rezervace, procento_predpoklad, procento_skutecne
        // Pro /stav: procento_rezervace, procento_predpoklad, procento_skutecne
        const procentoRezervace = parseFloat(lp.procento_rezervace || (vyseKryti > 0 ? (rezervovano / vyseKryti * 100) : 0));
        const procentoPredpoklad = parseFloat(lp.procento_predpoklad || (vyseKryti > 0 ? (predpokladaneCerpani / vyseKryti * 100) : 0));
        const procentoSkutecne = parseFloat(lp.procento_skutecne || (vyseKryti > 0 ? (skutecneCerpano / vyseKryti * 100) : 0));
        
        return {
          id: lp.id,
          cislo_lp: lp.cislo_lp,
          kategorie: lp.kategorie,
          nazev_uctu: lp.nazev_uctu || '',  // BE vrací nazev_uctu
          cislo_uctu: lp.cislo_uctu || '',  // BE vrací cislo_uctu
          vyse_financniho_kryti: vyseKryti,
          
          // TŘI TYPY ČERPÁNÍ - skutečná data z BE
          rezervovano: rezervovano,
          predpokladane_cerpani: predpokladaneCerpani,
          skutecne_cerpano: skutecneCerpano,
          cerpano_pokladna: cerpanoPokladna,
          
          // ZŮSTATKY podle typu - používáme správné názvy z API
          zbyva_rezervace: zbyvaRezervace,
          zbyva_predpoklad: zbyvaPredpoklad,
          zbyva_skutecne: zbyvaSkutecne,
          
          // PROCENTA podle typu
          procento_rezervovano: procentoRezervace,
          procento_predpokladane: procentoPredpoklad,
          procento_skutecne: procentoSkutecne,
          
          // Zpětná kompatibilita (hlavní hodnoty = skutečné)
          aktualne_cerpano: skutecneCerpano,
          zbyva: zbyvaSkutecne,
          procento_cerpani: procentoSkutecne,
          
          // ===== STATUS FLAGS =====
          je_prekroceno: (lp.je_prekroceno_skutecne === true || lp.je_prekroceno_skutecne === 1 || skutecneCerpano > vyseKryti),
          je_prekroceno_skutecne: (lp.je_prekroceno_skutecne === true || lp.je_prekroceno_skutecne === 1),
          ma_navyseni: (lp.ma_navyseni === true || lp.ma_navyseni === 1),
          pocet_zaznamu: parseInt(lp.pocet_zaznamu || 1),
          
          // ===== METADATA =====
          // BE vrací spravce jako objekt {prijmeni, jmeno} v /stav
          // Pro /moje-cerpani není správce
          spravce: lp.spravce ? `${lp.spravce.prijmeni || ''} ${lp.spravce.jmeno || ''}`.trim() : '',
          usek_nazev: lp.usek_nazev || lp.usek || '',
          usek_id: parseInt(lp.usek_id || 0),
          user_id: parseInt(lp.user_id || userId || 0), // Pro moje-cerpani použít aktuálního usera
          rok: parseInt(lp.rok || new Date().getFullYear()),
          posledni_prepocet: lp.posledni_prepocet || lp.dt_aktualizace,
          
          // ===== PRO /moje-cerpani: počet objednávek =====
          pocet_objednavek: parseInt(lp.pocet_objednavek || 0)
        };
      });
      
      // ===== ULOŽENÍ DAT =====
      setLpData(mappedData);
      
      // Pro /moje-cerpani uložit také usage data (objednávky)
      if (myUsageData) {
        setMyUsageData(myUsageData);
      } else {
        setMyUsageData(null);
      }
      
      setLastUpdate(new Date());
      setLoading(false);
      
      // ===== PRO BĚŽNÉ UŽIVATELE: Načíst osobní čerpání a sloučit s globálním stavem =====
      if (!isAdmin && !isLPManager && userId && userUsekId) {
        try {
          
          // KROK 1: Načíst GLOBÁLNÍ stav všech LP (pro celkový_limit a celkové čerpání)
          const globalStateEndpoint = `${API_BASE_URL}limitovane-prisliby/stav`;
          const globalStatePayload = {
            rok: currentYear,
            username: username,
            token: token,
            isAdmin: true  // Načíst všechna LP pro sloučení
          };
          
          const globalStateResponse = await fetch(globalStateEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(globalStatePayload)
          });
          
          const globalStateText = await globalStateResponse.text();
          const globalStateResult = JSON.parse(globalStateText);
          
          // KROK 2: Načíst MOJE čerpání
          const myUsageEndpoint = `${API_BASE_URL}limitovane-prisliby/moje-cerpani`;
          const myUsagePayload = {
            rok: currentYear,
            username: username,
            token: token,
            user_id: userId
          };
          
          const myUsageResponse = await fetch(myUsageEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(myUsagePayload)
          });
          
          const myUsageText = await myUsageResponse.text();
          const myUsageResult = JSON.parse(myUsageText);
          
          // KROK 3: SLOUČIT data podle cislo_lp
          if (myUsageResponse.ok && myUsageResult.status === 'ok' && myUsageResult.data?.lp_cerpani) {
            const mergedLPData = myUsageResult.data.lp_cerpani.map((mojeLp, idx) => {
              // Najít globální stav tohoto LP
              const globalLp = globalStateResult.data?.find(lp => lp.cislo_lp === mojeLp.cislo_lp);
              
              return {
                id: globalLp?.id || `my-${idx}`,
                cislo_lp: mojeLp.cislo_lp,
                kategorie: mojeLp.kategorie || globalLp?.kategorie || '',
                nazev_uctu: mojeLp.nazev_uctu || globalLp?.nazev_uctu || '',
                cislo_uctu: mojeLp.cislo_uctu || globalLp?.cislo_uctu || '',
                
                // Z globálního stavu (pro VŠECHNY uživatele) - s původním názvem
                celkovy_limit: parseFloat(globalLp?.celkovy_limit || 0),
                vyse_financniho_kryti: parseFloat(globalLp?.celkovy_limit || 0),
                celkem_skutecne: parseFloat(globalLp?.skutecne_cerpano || 0),
                celkem_zbyva: parseFloat(globalLp?.zbyva_skutecne || 0),
                procento_celkem: parseFloat(globalLp?.procento_skutecne || 0),
                je_prekroceno: globalLp?.je_prekroceno_skutecne || false,
                
                // Z mého čerpání (jen tento user) - zachovat původní názvy!
                moje_rezervovano: parseFloat(mojeLp.moje_rezervovano || 0),
                moje_predpoklad: parseFloat(mojeLp.moje_predpoklad || 0),
                moje_skutecne: parseFloat(mojeLp.moje_skutecne || 0),
                
                // Pro kompatibilitu s renderMyPersonalLP
                rezervovano: parseFloat(mojeLp.moje_rezervovano || 0),
                predpokladane_cerpani: parseFloat(mojeLp.moje_predpoklad || 0),
                skutecne_cerpano: parseFloat(mojeLp.moje_skutecne || 0),
                zbyva_skutecne: parseFloat(globalLp?.celkovy_limit || 0) - parseFloat(mojeLp.moje_skutecne || 0),
                procento_skutecne: parseFloat(mojeLp.procento_skutecne || 0),
                pocet_objednavek: parseInt(mojeLp.pocet_objednavek || 0),
                
                // Metadata
                usek_nazev: mojeLp.usek_nazev || globalLp?.usek_nazev || '',
                usek_id: parseInt(mojeLp.usek_id || globalLp?.usek_id || 0),
                user_id: parseInt(globalLp?.user_id || 0),
                spravce: globalLp?.spravce ? `${globalLp.spravce.prijmeni || ''} ${globalLp.spravce.jmeno || ''}`.trim() : ''
              };
            });
            
            setMyUsageData({
              lp_cerpani: mergedLPData,
              objednavky: myUsageResult.data.objednavky || []
            });
          } else {
            console.error('/moje-cerpani Error:', myUsageResponse.status, myUsageText);
          }
        } catch (error) {
          console.error('Chyba při načítání a slučování osobního čerpání:', error);
        }
      }
      
    } catch (error) {
      console.error('Chyba při načítání LP:', error);
      showToast(`Chyba při načítání limitovaných příslibů: ${error.message}`, 'error');
      setLpData([]);
      setLoading(false);
    }
  }, [token, username, userId, userDetail, isAdmin, isApprove, isLPManager, userUsekId, showToast]);
  
  // Načtení dat při změně závislostí
  useEffect(() => {
    if (token && username && userDetail) {
      loadLPData();
    }
  }, [loadLPData, token, username, userDetail]);
  
  const handleInitializace = async () => {
    // Zobrazit confirm dialog místo window.confirm
    setConfirmDialog({
      isOpen: true,
      title: 'Inicializace čerpání LP - KRITICKÁ OPERACE',
      message: (
        <div>
          <p style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '1.05rem' }}>
            Opravdu chcete spustit inicializaci čerpání limitovaných příslibů?
          </p>
          <div style={{ 
            background: '#fef2f2', 
            border: '2px solid #dc2626', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1rem' 
          }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontWeight: '600' }}>
              ⚠️ VAROVÁNÍ - Tato operace:
            </p>
            <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#991b1b' }}>
              <li>Smaže VŠECHNY existující záznamy čerpání pro rok 2025</li>
              <li>Přepočítá všechna LP od začátku</li>
              <li>Může trvat 15-30 sekund</li>
              <li>Je určena POUZE pro ADMINISTRÁTORY</li>
            </ul>
          </div>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '0.9rem' }}>
            Použijte tuto funkci pouze pokud:
          </p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
            <li>Přecházíte na nový rok</li>
            <li>Opravujete závažnou chybu v datech</li>
            <li>Máte pokyn od vedení</li>
          </ul>
        </div>
      ),
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        await performInitializace();
      }
    });
  };
  
  const performInitializace = async () => {
    setInitializing(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/';
      const currentYear = new Date().getFullYear();
      
      const response = await fetch(`${API_BASE_URL}limitovane-prisliby/inicializace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: username,
          token: token,
          rok: currentYear,
          isAdmin: isAdmin
        })
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Nedostatečná oprávnění - pouze ADMIN');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message || 'Chyba při inicializaci');
      }
      
      const stats = result.data?.statistika || {};
      const updated = result.data?.updated || 0;
      
      showToast(`Inicializace úspěšně dokončena! Přepočítáno: ${updated} LP. Celkem skutečně: ${formatAmount(stats.celkem_skutecne || 0)}`, 'success');
      
      // Načteme aktualizovaná data
      await loadLPData();
      setInitializing(false);
      
    } catch (error) {
      console.error('Chyba při inicializaci:', error);
      showToast(`Chyba při inicializaci: ${error.message}`, 'error');
      setInitializing(false);
    }
  };
  
  const handlePrepocet = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/';
      const currentYear = new Date().getFullYear();
      
      const response = await fetch(`${API_BASE_URL}limitovane-prisliby/prepocet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          username: username,
          rok: currentYear
          // cislo_lp: 'LPIT1' // volitelné - pokud chceme přepočítat jen jedno LP
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message || 'Chyba při přepočtu');
      }
      
      const updated = result.data?.updated || 0;
      showToast(`Přepočet dokončen. Aktualizováno: ${updated} LP`, 'success');
      
      // Načteme aktualizovaná data
      await loadLPData();
      
    } catch (error) {
      console.error('Chyba při přepočtu:', error);
      showToast(`Chyba při přepočtu: ${error.message}`, 'error');
      setLoading(false);
    }
  };
  
  // Filtrování dat - MULTI-SELECT logika
  const filteredData = lpData.filter(lp => {
    // Filtr úseku - pokud je pole prázdné, zobraz vše
    if (filterUsek.length > 0 && !filterUsek.includes(lp.usek_nazev)) return false;
    // Filtr správce - pokud je pole prázdné, zobraz vše
    if (filterUser.length > 0 && !filterUser.includes(lp.spravce)) return false;
    // Filtr kategorie - pokud je pole prázdné, zobraz vše
    if (filterKategorie.length > 0 && !filterKategorie.includes(lp.kategorie)) return false;
    return true;
  });
  
  // ===== DATA PRO RŮZNÉ ROLE =====
  // Všichni vidí LP úseku z /stav endpoint
  
  // Seskupení podle úseků pro adminy
  const groupedByUsek = {};
  if (isAdmin) {
    filteredData.forEach(lp => {
      const key = `${lp.usek_id}_${lp.usek_nazev}`;
      if (!groupedByUsek[key]) {
        groupedByUsek[key] = {
          usek_id: lp.usek_id,
          usek_nazev: lp.usek_nazev,
          items: []
        };
      }
      groupedByUsek[key].items.push(lp);
    });
  }
  
  // Statistiky - TŘI TYPY ČERPÁNÍ
  const stats = {
    celkem_lp: filteredData.length,
    celkovy_limit: filteredData.reduce((sum, lp) => sum + lp.vyse_financniho_kryti, 0),
    // TŘI TYPY:
    celkove_rezervovano: filteredData.reduce((sum, lp) => sum + (lp.rezervovano || 0), 0),
    celkove_predpokladane: filteredData.reduce((sum, lp) => sum + (lp.predpokladane_cerpani || 0), 0),
    celkove_skutecne: filteredData.reduce((sum, lp) => sum + (lp.skutecne_cerpano || 0), 0),
    // Čerpání z pokladny:
    celkove_pokladna: filteredData.reduce((sum, lp) => sum + (lp.cerpano_pokladna || 0), 0),
    // Zpětná kompatibilita:
    celkove_cerpano: filteredData.reduce((sum, lp) => sum + lp.aktualne_cerpano, 0),
    prekroceno: filteredData.filter(lp => lp.je_prekroceno).length
  };
  // Zbývá - tři typy (sčítat přímo z LP, backend už to počítá správně):
  stats.celkem_zbyva_rezervace = filteredData.reduce((sum, lp) => sum + (lp.zbyva_rezervace || 0), 0);
  stats.celkem_zbyva_predpoklad = filteredData.reduce((sum, lp) => sum + (lp.zbyva_predpoklad || 0), 0);
  stats.celkem_zbyva_skutecne = filteredData.reduce((sum, lp) => sum + (lp.zbyva_skutecne || 0), 0);
  stats.celkem_zbyva = stats.celkem_zbyva_skutecne; // Zpětná kompatibilita
  
  // Procenta - tři typy:
  stats.prumerne_procento_rezervovano = stats.celkovy_limit > 0 ? (stats.celkove_rezervovano / stats.celkovy_limit * 100) : 0;
  stats.prumerne_procento_predpokladane = stats.celkovy_limit > 0 ? (stats.celkove_predpokladane / stats.celkovy_limit * 100) : 0;
  stats.prumerne_procento_skutecne = stats.celkovy_limit > 0 ? (stats.celkove_skutecne / stats.celkovy_limit * 100) : 0;
  stats.prumerne_procento = stats.prumerne_procento_skutecne; // Zpětná kompatibilita
  
  // Formátování částky
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // ===== LP PROGRESS BAR s TŘI TYPY ČERPÁNÍ =====
  const renderLPProgressBar = (lp, showThreeTypes = true) => {
    const color = getLPColor(lp);
    
    return (
      <TooltipContainer>
        <LPProgressContainer>
          <LPProgressBarContainer>
            <LPProgressBarFill 
              $percent={lp.procento_skutecne} 
              $color={color.color}
            >
              {lp.procento_skutecne > 15 && `${lp.procento_skutecne.toFixed(0)}%`}
            </LPProgressBarFill>
            
            {lp.procento_skutecne > 100 && (
              <LPProgressBarOverflow>
                +{(lp.procento_skutecne - 100).toFixed(1)}%
              </LPProgressBarOverflow>
            )}
          </LPProgressBarContainer>
        </LPProgressContainer>
        
        {/* Tooltip s detaily */}
        <TooltipContent>
          <TooltipTitle>{lp.nazev_uctu || lp.cislo_lp}</TooltipTitle>
          <TooltipTable>
            <tbody>
              <tr>
                <td>Limit:</td>
                <td>{formatAmount(lp.vyse_financniho_kryti)}</td>
              </tr>
              {showThreeTypes && (
                <>
                  <tr>
                    <td>Rezervováno:</td>
                    <td>{formatAmount(lp.rezervovano)}</td>
                  </tr>
                  <tr>
                    <td>Předpoklad:</td>
                    <td>{formatAmount(lp.predpokladane_cerpani)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td>Skutečně:</td>
                <td><strong>{formatAmount(lp.skutecne_cerpano)}</strong></td>
              </tr>
              <tr className="divider">
                <td>Zbývá:</td>
                <td className={lp.zbyva_skutecne < 0 ? 'negative' : 'positive'}>
                  {formatAmount(lp.zbyva_skutecne)}
                </td>
              </tr>
            </tbody>
          </TooltipTable>
          
          {lp.spravce && (
            <TooltipFooter>
              Správce: {lp.spravce}
            </TooltipFooter>
          )}
        </TooltipContent>
      </TooltipContainer>
    );
  };
  
  // Toggle sekce (s ukládáním do localStorage)
  const toggleSection = (key) => {
    setCollapsedSections(prev => {
      const newState = {
        ...prev,
        [key]: !prev[key]
      };
      try {
        localStorage.setItem(`lp_collapsed_sections_${user?.id || 'default'}`, JSON.stringify(newState));
      } catch (e) {
        console.error('Chyba při ukládání collapsed state:', e);
      }
      return newState;
    });
  };
  
  // Tabulka osobního čerpání pro běžné uživatele (z /moje-cerpani)
  const renderMyPersonalLP = (data) => {
    if (!data || data.length === 0) {
      return (
        <InfoBox style={{ marginTop: '1.5rem' }}>
          <User size={20} />
          <div>
            <h4>Zatím nemáte žádné osobní čerpání</h4>
            <p>V tomto seznamu se zobrazí LP kódy, které jste osobně vyčerpal/a.</p>
          </div>
        </InfoBox>
      );
    }
    
    return (
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Coins size={20} />
          Moje využití LP ({data.length} kódů)
        </h3>
        <TableContainer>
          <Table>
            <Thead>
              <tr>
                <th>Kód LP</th>
                <th>Kategorie</th>
                <th>Název účtu</th>
                <th>Celkový limit</th>
                <th>Moje čerpání</th>
                <th>% z limitu</th>
                <th>Zbývá</th>
                <th>Objednávky</th>
              </tr>
            </Thead>
            <Tbody>
              {data.map((lp, idx) => {
                const rezervovano = parseFloat(lp.rezervovano || 0);
                const predpoklad = parseFloat(lp.predpokladane_cerpani || 0);
                const skutecne = parseFloat(lp.skutecne_cerpano || 0);
                const limit = parseFloat(lp.vyse_financniho_kryti || 0);
                const zbyva = limit - skutecne;
                const procento = limit > 0 ? (skutecne / limit * 100) : 0;
                
                return (
                  <tr key={lp.cislo_lp || idx}>
                    <td>
                      <LPCode>{lp.cislo_lp}</LPCode>
                    </td>
                    <td>
                      <Category>{lp.kategorie}</Category>
                    </td>
                    <td>{lp.nazev_uctu}</td>
                    <td>
                      <Amount $color="#6b7280">
                        {formatAmount(limit)}
                      </Amount>
                    </td>
                    <td>
                      <ThreeTypeAmountContainer>
                        <ThreeTypeAmountRow>
                          <ThreeTypeLabel style={{ color: '#f59e0b' }}>Rezervováno:</ThreeTypeLabel>
                          <ThreeTypeValue style={{ color: '#f59e0b' }}>{formatAmount(rezervovano)}</ThreeTypeValue>
                        </ThreeTypeAmountRow>
                        <ThreeTypeAmountRow>
                          <ThreeTypeLabel style={{ color: '#3b82f6' }}>Předpoklad:</ThreeTypeLabel>
                          <ThreeTypeValue style={{ color: '#3b82f6' }}>{formatAmount(predpoklad)}</ThreeTypeValue>
                        </ThreeTypeAmountRow>
                        <ThreeTypeAmountRow>
                          <ThreeTypeLabel style={{ color: '#10b981' }}>Skutečně:</ThreeTypeLabel>
                          <ThreeTypeValue style={{ color: '#10b981', fontWeight: '700' }}>{formatAmount(skutecne)}</ThreeTypeValue>
                        </ThreeTypeAmountRow>
                      </ThreeTypeAmountContainer>
                    </td>
                    <td style={{ minWidth: '180px' }}>
                      <ProgressBar>
                        <ProgressFill $percent={procento}>
                          {procento.toFixed(1)}%
                        </ProgressFill>
                      </ProgressBar>
                    </td>
                    <td>
                      <Amount $color={zbyva < 0 ? '#ef4444' : '#10b981'}>
                        {formatAmount(zbyva)}
                      </Amount>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {lp.pocet_objednavek || 0}×
                      </span>
                    </td>
                  </tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </div>
    );
  };
  
  // Render tabulky LP - TŘI TYPY ČERPÁNÍ (pro adminy a LP_MANAGE)
  const renderLPTable = (data, showUserColumn = false) => (
    <TableContainer>
      <Table>
        <Thead>
          <tr>
            <th>Kód LP</th>
            <th>Kategorie</th>
            <th>Účet</th>
            <th>Název účtu</th>
            {showUserColumn && <th>Příkazce operace</th>}
            <th>Limit</th>
            <th>Vyčerpáno (skutečně)</th>
            <th>Zbývá (skutečně)</th>
            <th>Čerpání</th>
            <th>Stav</th>
          </tr>
        </Thead>
        <Tbody>
          {data.map(lp => (
            <tr key={lp.id}>
              <td>
                <LPCode>{lp.cislo_lp}</LPCode>
              </td>
              <td>
                <Category>{lp.kategorie}</Category>
              </td>
              <td>{lp.cislo_uctu}</td>
              <td>{lp.nazev_uctu}</td>
              {showUserColumn && (
                <td>
                  <UserInfo>
                    <User size={14} />
                    {lp.spravce}
                  </UserInfo>
                </td>
              )}
              <td>
                <Amount>{formatAmount(lp.vyse_financniho_kryti)}</Amount>
              </td>
              <td>
                <ThreeTypeAmount>
                  <MainAmount $color="#3b82f6">
                    {formatAmount(lp.skutecne_cerpano)}
                  </MainAmount>
                  <SubAmounts>
                    <SubAmount>Požadováno: {formatAmount(lp.rezervovano)}</SubAmount>
                    <SubAmount>Plánováno: {formatAmount(lp.predpokladane_cerpani)}</SubAmount>
                    <SubAmount>Z pokladny: {formatAmount(lp.cerpano_pokladna || 0)}</SubAmount>
                  </SubAmounts>
                </ThreeTypeAmount>
              </td>
              <td>
                <ThreeTypeAmount>
                  <MainAmount $color={lp.zbyva_skutecne < 0 ? '#ef4444' : '#10b981'}>
                    {formatAmount(lp.zbyva_skutecne)}
                  </MainAmount>
                  <SubAmounts>
                    <SubAmount>Požadováno: {formatAmount(lp.zbyva_rezervace)}</SubAmount>
                    <SubAmount>Plánováno: {formatAmount(lp.zbyva_predpoklad)}</SubAmount>
                  </SubAmounts>
                </ThreeTypeAmount>
              </td>
              <td style={{ minWidth: '180px' }}>
                <ProgressBar>
                  <ProgressFill $percent={lp.procento_skutecne}>
                    {lp.procento_skutecne.toFixed(1)}%
                  </ProgressFill>
                </ProgressBar>
              </td>
              <td>
                <StatusBadge $status={
                  lp.procento_skutecne >= 100 ? 'danger' : 
                  lp.procento_skutecne >= 80 ? 'warning' : 
                  'ok'
                }>
                  {lp.procento_skutecne >= 100 ? (
                    <><XCircle size={14} /> Překročeno</>
                  ) : lp.procento_skutecne >= 80 ? (
                    <><AlertTriangle size={14} /> Varování</>
                  ) : (
                    <><CheckCircle size={14} /> OK</>
                  )}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </Tbody>
        <Tfoot>
          <tr>
            <td colSpan={showUserColumn ? 5 : 4} style={{ textAlign: 'right', fontSize: '1.1rem' }}>
              CELKEM:
            </td>
            <td>
              <Amount style={{ fontWeight: '700', fontSize: '1.05rem' }}>
                {formatAmount(data.reduce((sum, lp) => sum + (lp.vyse_financniho_kryti || 0), 0))}
              </Amount>
            </td>
            <td>
              <ThreeTypeAmount>
                <MainAmount $color="#3b82f6" style={{ fontWeight: '700' }}>
                  {formatAmount(data.reduce((sum, lp) => sum + (lp.skutecne_cerpano || 0), 0))}
                </MainAmount>
                <SubAmounts>
                  <SubAmount style={{ fontWeight: '600' }}>
                    Požadováno: {formatAmount(data.reduce((sum, lp) => sum + (lp.rezervovano || 0), 0))}
                  </SubAmount>
                  <SubAmount style={{ fontWeight: '600' }}>
                    Plánováno: {formatAmount(data.reduce((sum, lp) => sum + (lp.predpokladane_cerpani || 0), 0))}
                  </SubAmount>
                  <SubAmount style={{ fontWeight: '600' }}>
                    Z pokladny: {formatAmount(data.reduce((sum, lp) => sum + (lp.cerpano_pokladna || 0), 0))}
                  </SubAmount>
                </SubAmounts>
              </ThreeTypeAmount>
            </td>
            <td>
              <ThreeTypeAmount>
                <MainAmount 
                  $color={data.reduce((sum, lp) => sum + (lp.zbyva_skutecne || 0), 0) < 0 ? '#ef4444' : '#10b981'}
                  style={{ fontWeight: '700' }}
                >
                  {formatAmount(data.reduce((sum, lp) => sum + (lp.zbyva_skutecne || 0), 0))}
                </MainAmount>
                <SubAmounts>
                  <SubAmount style={{ fontWeight: '600' }}>
                    Požadováno: {formatAmount(data.reduce((sum, lp) => sum + (lp.zbyva_rezervace || 0), 0))}
                  </SubAmount>
                  <SubAmount style={{ fontWeight: '600' }}>
                    Plánováno: {formatAmount(data.reduce((sum, lp) => sum + (lp.zbyva_predpoklad || 0), 0))}
                  </SubAmount>
                </SubAmounts>
              </ThreeTypeAmount>
            </td>
            <td>
              <div style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.9rem' }}>
                {(() => {
                  const totalLimit = data.reduce((sum, lp) => sum + (lp.vyse_financniho_kryti || 0), 0);
                  const totalCerpano = data.reduce((sum, lp) => sum + (lp.skutecne_cerpano || 0), 0);
                  const percent = totalLimit > 0 ? (totalCerpano / totalLimit * 100) : 0;
                  return `Průměr: ${percent.toFixed(1)}%`;
                })()}
              </div>
            </td>
            <td></td>
          </tr>
        </Tfoot>
      </Table>
    </TableContainer>
  );
  
  // Získání unikátních hodnot pro filtry
  const usekMap = new Map();
  lpData.forEach(lp => {
    // Použít usek_nazev jako klíč, protože usek_id je často 0
    if (lp.usek_nazev) {
      usekMap.set(lp.usek_nazev, { 
        id: lp.usek_id || 0, 
        nazev: lp.usek_nazev 
      });
    }
  });
  const uniqueUseky = Array.from(usekMap.values());
  
  const userMap = new Map();
  lpData.forEach(lp => {
    // Použít jméno správce jako klíč, protože user_id je často stejné (např. 1)
    if (lp.spravce) {
      userMap.set(lp.spravce, { 
        id: lp.user_id || 0, 
        name: lp.spravce 
      });
    }
  });
  const uniqueUsers = Array.from(userMap.values());
  
  const uniqueKategorie = [...new Set(lpData.map(lp => lp.kategorie).filter(k => k))];
  
  return (
    <Container $collapsed={isMainCollapsed}>
      <Header $collapsed={isMainCollapsed}>
        <Title>
          <TrendingUp size={24} />
          Limitované přísliby - Čerpání
        </Title>
        <ButtonGroup>
          {!isMainCollapsed && (
            <>
              <Button $secondary onClick={handlePrepocet} disabled={loading} $loading={loading}>
                <RefreshCw size={18} />
                {loading ? 'Přepočítávám...' : 'Přepočítat'}
              </Button>
              {canManageLP && (
                <Button $primary onClick={handleInitializace} disabled={initializing} $loading={initializing}>
                  <RefreshCw size={18} />
                  {initializing ? 'Inicializuji...' : 'Inicializace'}
                </Button>
              )}
            </>
          )}
          <CollapseButton onClick={() => {
          const newState = !isMainCollapsed;
          setIsMainCollapsed(newState);
          try {
            localStorage.setItem(`lp_main_collapsed_${user?.id || 'default'}`, String(newState));
          } catch (e) {
            console.error('Chyba při ukládání collapsed state:', e);
          }
        }}>
            {isMainCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </CollapseButton>
        </ButtonGroup>
      </Header>
      
      <CollapsibleContent $collapsed={isMainCollapsed}>
      
      {lastUpdate && (
        <InfoBox>
          <Calendar size={20} />
          <div>
            <h4>Poslední aktualizace</h4>
            <p>Data byla naposledy aktualizována: {lastUpdate.toLocaleString('cs-CZ')}</p>
          </div>
        </InfoBox>
      )}
      
      {/* Statistiky - pro běžné uživatele (úsek) nebo adminy (celkové) */}
      <StatsGrid>
        {!isAdmin && !canManageLP ? (
          // Běžný uživatel / APPROVE - statistiky úseku (zjednodušené)
          <>
            <StatCard $gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)">
              <StatIcon $bg="white" $color="#3b82f6" $shadow="rgba(59, 130, 246, 0.3)">
                <Coins size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Celkový limit úseku</StatLabel>
                <StatValue $light>{formatAmount(stats.celkovy_limit)}</StatValue>
              </StatContent>
            </StatCard>
            
            <StatCard $gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)">
              <StatIcon $bg="white" $color="#10b981" $shadow="rgba(16, 185, 129, 0.3)">
                <TrendingUp size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Skutečně vyčerpáno (fakturace + pokladna)</StatLabel>
                <StatValue $light>{formatAmount(stats.celkove_skutecne)}</StatValue>
              </StatContent>
            </StatCard>
            
            <StatCard $gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)">
              <StatIcon $bg="white" $color="#f59e0b" $shadow="rgba(245, 158, 11, 0.3)">
                <CheckCircle size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Zbývá (dle čerpaného)</StatLabel>
                <StatValue $light>{formatAmount(stats.celkem_zbyva_skutecne)}</StatValue>
              </StatContent>
            </StatCard>
            
            <StatCard $gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)">
              <StatIcon $bg="white" $color="#8b5cf6" $shadow="rgba(139, 92, 246, 0.3)">
                <AlertTriangle size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Průměrné čerpání</StatLabel>
                <StatValue $light>{stats.prumerne_procento_skutecne.toFixed(1)}%</StatValue>
              </StatContent>
            </StatCard>
          </>
        ) : (
          // Admin a LP_MANAGE - detailní statistiky s TŘI TYPY ČERPÁNÍ
          <>
            <StatCard $gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)">
              <StatIcon $bg="white" $color="#3b82f6" $shadow="rgba(59, 130, 246, 0.3)">
                <Coins size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Celkový limit</StatLabel>
                <StatValue $light>{formatAmount(stats.celkovy_limit)}</StatValue>
              </StatContent>
            </StatCard>
            
            <StatCard $gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)">
              <StatIcon $bg="white" $color="#10b981" $shadow="rgba(16, 185, 129, 0.3)">
                <TrendingUp size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Skutečně vyčerpáno (fakturace + pokladna)</StatLabel>
                <StatValue $light style={{ marginBottom: '0.5rem' }}>{formatAmount(stats.celkove_skutecne)}</StatValue>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, lineHeight: 1.4 }}>
                  <div>→ Požadováno: {formatAmount(stats.celkove_rezervovano)}</div>
                  <div>→ Plánováno: {formatAmount(stats.celkove_predpokladane)}</div>
                  <div>→ Z pokladny: {formatAmount(stats.celkove_pokladna)}</div>
                </div>
              </StatContent>
            </StatCard>
            
            <StatCard $gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)">
              <StatIcon $bg="white" $color="#f59e0b" $shadow="rgba(245, 158, 11, 0.3)">
                <CheckCircle size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Zbývá (dle čerpaného)</StatLabel>
                <StatValue $light style={{ marginBottom: '0.5rem' }}>{formatAmount(stats.celkem_zbyva_skutecne)}</StatValue>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, lineHeight: 1.4 }}>
                  <div>→ Rezervováno: {formatAmount(stats.celkem_zbyva_rezervace)}</div>
                  <div>→ Předpoklad: {formatAmount(stats.celkem_zbyva_predpoklad)}</div>
                </div>
              </StatContent>
            </StatCard>
            
            <StatCard $gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)">
              <StatIcon $bg="white" $color="#8b5cf6" $shadow="rgba(139, 92, 246, 0.3)">
                <AlertTriangle size={28} />
              </StatIcon>
              <StatContent>
                <StatLabel $light>Průměrné čerpání (skutečné)</StatLabel>
                <StatValue $light style={{ marginBottom: '0.5rem' }}>{stats.prumerne_procento_skutecne.toFixed(1)}%</StatValue>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, lineHeight: 1.4 }}>
                  <div>→ Rezervováno: {stats.prumerne_procento_rezervovano.toFixed(1)}%</div>
                  <div>→ Předpoklad: {stats.prumerne_procento_predpokladane.toFixed(1)}%</div>
                </div>
              </StatContent>
            </StatCard>
          </>
        )}
      </StatsGrid>
      
      {/* Filtry - Custom multi-select s vyhledáváním */}
      {isAdmin && (
        <FilterBar>
          <FilterWrapper>
            <FilterLabel>
              <FilterLabelLeft>
                <Building2 size={16} />
                Úseky
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                $visible={filterUsek.length > 0}
                onClick={() => setFilterUsek([])}
                title="Vymazat filtr"
              >
                <X size={12} />
              </FilterClearButton>
            </FilterLabel>
            <CustomSelect
              field="filterUsek"
              value={filterUsek}
              onChange={(newValues) => setFilterUsek(Array.isArray(newValues) ? newValues : [])}
              options={uniqueUseky.map(usek => ({
                id: usek.nazev,
                nazev: usek.nazev
              }))}
              placeholder="Všechny úseky"
              multiple={true}
              selectStates={selectStates}
              setSelectStates={setSelectStates}
              searchStates={searchStates}
              setSearchStates={setSearchStates}
              touchedSelectFields={touchedSelectFields}
              setTouchedSelectFields={setTouchedSelectFields}
              toggleSelect={(field) => setSelectStates(prev => ({ ...prev, [field]: !prev[field] }))}
              filterOptions={(options, searchTerm) => {
                if (!searchTerm) return options;
                return options.filter(opt => 
                  opt.nazev?.toLowerCase().includes(searchTerm.toLowerCase())
                );
              }}
              getOptionLabel={(option) => option?.nazev || ''}
              enableSearch={uniqueUseky.length > 5}
            />
          </FilterWrapper>
          
          <FilterWrapper>
            <FilterLabel>
              <FilterLabelLeft>
                <User size={16} />
                Správci
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                $visible={filterUser.length > 0}
                onClick={() => setFilterUser([])}
                title="Vymazat filtr"
              >
                <X size={12} />
              </FilterClearButton>
            </FilterLabel>
            <CustomSelect
              field="filterUser"
              value={filterUser}
              onChange={(newValues) => setFilterUser(Array.isArray(newValues) ? newValues : [])}
              options={uniqueUsers.map(user => ({
                id: user.name,
                nazev: user.name
              }))}
              placeholder="Všichni správci"
              multiple={true}
              selectStates={selectStates}
              setSelectStates={setSelectStates}
              searchStates={searchStates}
              setSearchStates={setSearchStates}
              touchedSelectFields={touchedSelectFields}
              setTouchedSelectFields={setTouchedSelectFields}
              toggleSelect={(field) => setSelectStates(prev => ({ ...prev, [field]: !prev[field] }))}
              filterOptions={(options, searchTerm) => {
                if (!searchTerm) return options;
                return options.filter(opt => 
                  opt.nazev?.toLowerCase().includes(searchTerm.toLowerCase())
                );
              }}
              getOptionLabel={(option) => option?.nazev || ''}
              enableSearch={uniqueUsers.length > 5}
            />
          </FilterWrapper>
          
          <FilterWrapper>
            <FilterLabel>
              <FilterLabelLeft>
                <Filter size={16} />
                Kategorie
              </FilterLabelLeft>
              <FilterClearButton
                type="button"
                $visible={filterKategorie.length > 0}
                onClick={() => setFilterKategorie([])}
                title="Vymazat filtr"
              >
                <X size={12} />
              </FilterClearButton>
            </FilterLabel>
            <CustomSelect
              field="filterKategorie"
              value={filterKategorie}
              onChange={(newValues) => setFilterKategorie(Array.isArray(newValues) ? newValues : [])}
              options={uniqueKategorie.map(kat => ({
                id: kat,
                nazev: `${kat} - ${LP_CATEGORY_NAMES[kat] || kat}`
              }))}
              placeholder="Všechny kategorie"
              multiple={true}
              selectStates={selectStates}
              setSelectStates={setSelectStates}
              searchStates={searchStates}
              setSearchStates={setSearchStates}
              touchedSelectFields={touchedSelectFields}
              setTouchedSelectFields={setTouchedSelectFields}
              toggleSelect={(field) => setSelectStates(prev => ({ ...prev, [field]: !prev[field] }))}
              filterOptions={(options, searchTerm) => {
                if (!searchTerm) return options;
                return options.filter(opt => 
                  opt.nazev?.toLowerCase().includes(searchTerm.toLowerCase())
                );
              }}
              getOptionLabel={(option) => option?.nazev || ''}
              enableSearch={uniqueKategorie.length > 5}
            />
          </FilterWrapper>
        </FilterBar>
      )}
      
      {/* Tabulka LP */}
      {loading ? (
        <EmptyState>
          <SpinningIcon>
            <RefreshCw size={48} />
          </SpinningIcon>
          <h3>Načítám data...</h3>
        </EmptyState>
      ) : filteredData.length === 0 ? (
        <EmptyState>
          <AlertTriangle size={48} />
          <h3>Žádné limitované přísliby</h3>
          <p>Pro tento filtr nebyly nalezeny žádné záznamy</p>
        </EmptyState>
      ) : isAdmin ? (
        // ===== ADMIN VIEW: Všechna LP seskupená podle úseků =====
        Object.entries(groupedByUsek).map(([key, group]) => (
          <CollapsibleSection key={key}>
            <SectionHeader>
              <SectionHeaderContent>
                <h3>
                  <Building2 size={20} />
                  {group.usek_nazev} ({group.items.length})
                </h3>
              </SectionHeaderContent>
              <SectionCollapseButton onClick={() => toggleSection(key)}>
                {collapsedSections[key] ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </SectionCollapseButton>
            </SectionHeader>
            <SectionContent $collapsed={collapsedSections[key]}>
              {renderLPTable(group.items, true)}
            </SectionContent>
          </CollapsibleSection>
        ))
      ) : isLPManager ? (
        // ===== SPRÁVCE LP: LP které spravuje =====
        <>
          <InfoBox style={{ marginBottom: '1.5rem' }}>
            <User size={20} />
            <div>
              <h4>Vámi spravovaná LP</h4>
              <p>Zobrazeny jsou LP kódy, u kterých jste správcem.</p>
            </div>
          </InfoBox>
          {renderLPTable(filteredData, false)}
        </>
      ) : (
        // ===== OSTATNÍ UŽIVATELÉ: LP úseku =====
        <>
          <InfoBox style={{ marginBottom: '1.5rem' }}>
            <Building2 size={20} />
            <div>
              <h4>Limitované přísliby vašeho úseku</h4>
              <p>Zobrazeny jsou všechny LP kódy přiřazené k vašemu úseku ({user?.usek_nazev || userDetail?.usek_nazev || 'váš úsek'}). Statistiky vidíte v kartách výše.</p>
            </div>
          </InfoBox>
          {renderLPTable(filteredData, true)}
          
          {/* ===== DRUHÁ TABULKA: Moje osobní čerpání ===== */}
          {myUsageData && myUsageData.lp_cerpani && (() => {
            // Zobrazit všechna LP z myUsageData (včetně LP z vlastního úseku)
            const myLP = myUsageData.lp_cerpani;
            
            if (myLP.length === 0) {
              return null; // Žádná LP
            }
            
            // Mapovat data stejně jako v hlavní tabulce
            const mappedMyLP = myLP.map((lp, idx) => ({
              id: lp.id || `outside-${idx}`,
              cislo_lp: lp.cislo_lp,
              kategorie: lp.kategorie,
              nazev_uctu: lp.nazev_uctu || '',
              cislo_uctu: lp.cislo_uctu || '',
              vyse_financniho_kryti: parseFloat(lp.celkovy_limit || 0),
              rezervovano: parseFloat(lp.moje_rezervovano || 0),
              predpokladane_cerpani: parseFloat(lp.moje_predpoklad || 0),
              skutecne_cerpano: parseFloat(lp.moje_skutecne || 0),
              zbyva_skutecne: parseFloat(lp.celkovy_limit || 0) - parseFloat(lp.moje_skutecne || 0),
              procento_skutecne: parseFloat(lp.procento_skutecne || 0),
              spravce: '',
              usek_nazev: lp.usek_nazev || 'Jiný úsek',
              pocet_objednavek: parseInt(lp.pocet_objednavek || 0)
            }));
            
            return (
              <div style={{ marginTop: '3rem' }}>
                <InfoBox style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #3b82f6' }}>
                  <User size={20} />
                  <div>
                    <h4>Moje čerpání</h4>
                    <p>Zobrazeny jsou všechny LP kódy, které jste osobně vyčerpal/a ve svých objednávkách (včetně LP z vašeho úseku i z jiných úseků).</p>
                  </div>
                </InfoBox>
                
                {renderMyPersonalLP(mappedMyLP)}
              </div>
            );
          })()}
        </>
      )}
      </CollapsibleContent>
      
      {/* 🆕 PŘEHLED ČERPÁNÍ Z POKLADNY - samostatný blok mimo collapsible */}
      <CashbookLPSummary />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        icon={faExclamationTriangle}
        confirmText="Ano, spustit inicializaci"
        cancelText="Zrušit"
      />
    </Container>
  );
};

/**
 * 🏦 CASHBOOK LP SUMMARY - Přehled čerpání LP z pokladny
 * Zobrazuje agregované čerpání LP kódů z pokladny včetně multi-LP položek
 */
const CashbookLPSummary = () => {
  const { userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [loading, setLoading] = useState(false);
  const [lpSummary, setLpSummary] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [collapsed, setCollapsed] = useState(false);
  
  const loadLPSummary = useCallback(async () => {
    if (!userDetail?.id) return;
    
    setLoading(true);
    try {
      const cashbookAPI = (await import('../services/cashbookService')).default;
      const result = await cashbookAPI.getLPSummary(userDetail.id, selectedYear);
      
      if (result.status === 'ok') {
        setLpSummary(result.data.lp_summary || []);
      }
    } catch (error) {
      console.error('❌ Chyba při načítání LP summary:', error);
      showToast('Chyba při načítání přehledu LP z pokladny', 'error');
    } finally {
      setLoading(false);
    }
  }, [userDetail, selectedYear, showToast]);
  
  useEffect(() => {
    loadLPSummary();
  }, [loadLPSummary]);
  
  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '2px solid #f59e0b',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Coins size={20} color="#f59e0b" />
            <div>
              <h4 style={{ margin: 0, color: '#92400e', fontSize: '1.1rem' }}>Přehled čerpání z pokladny</h4>
              {!collapsed && <p style={{ margin: '0.25rem 0 0 0', color: '#78350f', fontSize: '0.875rem' }}>Agregace výdajů podle LP kódů včetně multi-LP položek</p>}
            </div>
          </div>
          <CollapseButton onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </CollapseButton>
        </div>
        
        {!collapsed && (
          <>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#78350f', fontWeight: '500' }}>
                <Calendar size={18} />
                Rok:
              </label>
              <CashbookYearSelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {[2025, 2024, 2023].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </CashbookYearSelect>
              <Button
                onClick={loadLPSummary}
                disabled={loading}
                style={{ marginLeft: 'auto' }}
              >
                <RefreshCw size={16} style={{ animation: loading ? `${spinAnimation} 1s linear infinite` : 'none' }} />
                Obnovit
              </Button>
            </div>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#78350f' }}>
                <RefreshCw size={24} style={{ animation: `${spinAnimation} 1s linear infinite` }} />
                <p>Načítám data...</p>
              </div>
            ) : !lpSummary || lpSummary.length === 0 ? (
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '2rem', 
                background: 'white', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '2px dashed #f59e0b'
              }}>
                <AlertTriangle size={32} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, color: '#92400e', fontSize: '1rem', fontWeight: '500' }}>
                  Pro rok {selectedYear} nejsou k dispozici žádná data z pokladny
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#78350f', fontSize: '0.875rem' }}>
                  Zkuste vybrat jiný rok nebo vytvořte první pokladní doklad s LP kódem
                </p>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#fef3c7', borderBottom: '2px solid #f59e0b' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#92400e', fontWeight: '600', minWidth: '140px' }}>LP kód</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', color: '#92400e', fontWeight: '600' }}>Čerpáno z pokladny</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', color: '#92400e', fontWeight: '600' }}>Počet dokladů</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', color: '#92400e', fontWeight: '600' }}>Celkový limit</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', color: '#92400e', fontWeight: '600' }}>% čerpání</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', color: '#92400e', fontWeight: '600' }}>Zbývá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lpSummary.map((lp, idx) => {
                      const isOverLimit = lp.prekroceni;
                      const percentColor = lp.procento_cerpani > 100 ? '#dc2626' : lp.procento_cerpani > 80 ? '#f59e0b' : '#10b981';
                      
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>{lp.lp_kod}</div>
                            {lp.nazev_uctu && (
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>{lp.nazev_uctu}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                            {lp.cerpano_pokladna.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280' }}>
                            {lp.pocet_dokladu} dokladů
                            {lp.pocet_polozek > lp.pocet_dokladu && (
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.25rem' }}>
                                ({lp.pocet_polozek} položek)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280' }}>
                            {lp.celkovy_limit ? lp.celkovy_limit.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč' : '-'}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {lp.procento_cerpani !== null ? (
                              <span style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                background: percentColor + '20',
                                color: percentColor,
                                fontWeight: '600',
                                fontSize: '0.875rem'
                              }}>
                                {isOverLimit && <AlertTriangle size={14} />}
                                {lp.procento_cerpani.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500', color: lp.zbyva < 0 ? '#dc2626' : '#10b981' }}>
                            {lp.zbyva !== null ? lp.zbyva.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč' : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#fef3c7', fontWeight: '700', borderTop: '2px solid #f59e0b' }}>
                      <td style={{ padding: '0.75rem', color: '#92400e' }}>CELKEM</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#92400e' }}>
                        {lpSummary.reduce((sum, lp) => sum + lp.cerpano_pokladna, 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#92400e' }}>
                        {lpSummary.reduce((sum, lp) => sum + lp.pocet_dokladu, 0)} dokladů
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                </table>
                
                <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#78350f', fontStyle: 'italic' }}>
                  💡 Zahrnuje všechny výdaje z pokladny včetně multi-LP položek (více LP kódů pod jedním dokladem)
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LimitovanePrislibyManager;
