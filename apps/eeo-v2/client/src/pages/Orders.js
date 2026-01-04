import React, { useEffect, useState, useMemo, useContext, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ProgressContext } from '../context/ProgressContext';
import { fetchOldOrders, fetchAllLps, getUserErrorMessage, getErrorCodeCZ } from '../services/api2auth'; // New API functions
// Use legacy API for attachments listing on Orders page (matches expected shape and no token needed)
import { fetchOrderAttachmentsOld } from '../services/api2auth';
import { importOldOrders25, importOldOrders25Streaming } from '../services/api25orders'; // Import service (classic + streaming)
import ImportOldOrdersModal from '../components/ImportOldOrdersModal'; // Import modal component
import ordersCacheService from '../services/ordersCacheService'; // 🚀 CACHE: Cache service pro staré objednávky
import { CustomSelect } from '../components/CustomSelect'; // Custom select s multi-výběrem
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'; // Ensure correct import
import ChartDataLabels from 'chartjs-plugin-datalabels'; // Ensure correct import
import { OrdersPageStyles } from './Orders.styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faChevronDown, faEdit, faCopy, faFileAlt, faTrash, faFileInvoice, faChartPie, faMoneyBillWave, faFileInvoiceDollar, faCashRegister, faGlobe, faCheckCircle, faTimesCircle, faPaperclip, faSyncAlt, faDownload, faSearch, faArrowRight, faDatabase, faBoltLightning, faCalendarAlt, faPlus, faMinus, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
// CSS moved to CSS-in-JS GlobalStyle
import OrderFormTabs from '../forms/OrderFormTabs'; // Updated path after moving to forms/
import Statistics from '../components/Statistics'; // Ensure correct import
import { AuthContext } from '../context/AuthContext'; // Ensure correct import
import { ToastContext } from '../context/ToastContext'; // Toast notifications
import { TooltipWrapper } from '../styles/GlobalTooltip';
import styled from '@emotion/styled';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels); // Ensure correct registration

// Year Filter Panel (prominent position above main header) - podle vzoru Orders25List
const YearFilterPanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  color: white;
`;

const PageDivider = styled.div`
  border-bottom: 3px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const YearFilterTitle = styled.h2`
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
`;

const YearFilterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const YearFilterLabel = styled.label`
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MonthFilterLabel = styled.label`
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
`;

const MonthDropdownContainer = styled.div`
  position: relative;
  width: auto;
  min-width: 240px;
  z-index: 10000;
`;

const YearDropdownContainer = styled.div`
  position: relative;
  width: auto;
  min-width: 150px;
  z-index: 10000;
`;

const YearDropdownButton = styled.button`
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }
`;

const YearDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: rgba(30, 64, 175, 0.98);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  max-height: 300px;
  overflow-y: auto;
  z-index: 10001;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 64, 175, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.8);
    border-radius: 4px;
  }
`;

const YearDropdownItem = styled.div`
  padding: 0.75rem 1rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &:first-of-type {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  &:last-of-type {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const MonthDropdownButton = styled.button`
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  width: 100%;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

const MonthDropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: #1e40af;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  max-height: 400px;
  overflow-y: auto;
  z-index: 10001;
  backdrop-filter: blur(8px);

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 12px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 64, 175, 0.3);
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(96, 165, 250, 0.9));
    border-radius: 6px;
    border: 2px solid rgba(30, 64, 175, 0.3);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(96, 165, 250, 1));
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.8) rgba(30, 64, 175, 0.3);
`;

const MonthDropdownItem = styled.div`
  padding: 0.75rem 1rem;
  color: white;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  font-size: 0.95rem;
  transition: background 0.15s ease;
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};

  ${props => props.separator && `
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    padding: 0.5rem 1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
  `}

  ${props => props.action && `
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  `}

  ${props => !props.disabled && !props.separator && `
    &:hover {
      background: #2563eb;
    }
  `}
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const HeaderActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  svg {
    font-size: 1rem;
  }
`;

// Loading overlay komponenty (stejné jako OrderForm25)
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
  border-top: 4px solid #f59e0b;
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
`;

const PageContent = styled.div`
  filter: blur(${props => props.$blurred ? '3px' : '0px'});
  transition: filter 0.6s ease-in-out;
  pointer-events: ${props => props.$blurred ? 'none' : 'auto'};
`;

// 🚀 CACHE: Status indicator komponenty
const CacheStatusIconWrapper = styled(TooltipWrapper)`
  margin-left: 0.75rem;
`;

const CacheStatusIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${props => props.fromCache
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  };
  color: white;
  font-size: 0.8rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: help;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }
`;

// Dashboard Panel podle Orders25List
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
  grid-template-columns: minmax(350px, 400px) repeat(auto-fit, minmax(180px, 220px));
  gap: clamp(0.8rem, 1.5vw, 1.65rem);
  margin-bottom: 1.5rem;
  align-items: start;
  justify-content: start;
  overflow-x: auto;

  @media (max-width: 1400px) {
    grid-template-columns: minmax(320px, 350px) repeat(auto-fit, minmax(160px, 200px));
    gap: clamp(0.7rem, 1.3vw, 1.4rem);
  }

  @media (max-width: 1200px) {
    grid-template-columns: minmax(300px, 330px) repeat(auto-fit, minmax(150px, 180px));
    gap: clamp(0.6rem, 1.2vw, 1.3rem);
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: clamp(0.8rem, 2vw, 1.2rem);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: clamp(0.8rem, 2vw, 1.15rem);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: clamp(0.6rem, 2vw, 0.9rem);
  }

  @media (min-width: 1600px) {
    grid-template-columns: minmax(400px, 450px) repeat(auto-fit, minmax(200px, 250px));
    gap: clamp(1.2rem, 1.8vw, 2rem);
  }
`;

const LargeStatCard = styled.div`
  background: linear-gradient(145deg, #ffffff, #f9fafb);
  border-radius: 16px;
  padding: clamp(1.25rem, 1.5vw, 1.75rem);
  border-left: 6px solid ${props => props.$color || '#3b82f6'};
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.06);

  transition: all 0.3s ease;
  grid-row: span 2;
  grid-column: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: fit-content;
  height: 100%;
  position: relative;
  width: 100%;
  box-sizing: border-box;

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.12),
      0 4px 8px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 1200px) {
    grid-row: span 1;
    grid-column: span 2;
    min-height: clamp(140px, 15vh, 180px);
  }

  @media (max-width: 900px) {
    grid-column: span 1;
    min-height: clamp(120px, 14vh, 160px);
    padding: clamp(1rem, 1.2vw, 1.5rem);
  }

  @media (max-width: 768px) {
    min-height: clamp(110px, 13vh, 150px);
  }

  @media (max-width: 600px) {
    min-height: clamp(100px, 12vh, 130px);
    padding: clamp(0.8rem, 1vw, 1.25rem);
  }
`;

const StatCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: clamp(0.8rem, 1vw, 1rem);
  border-left: 4px solid ${props => props.$color || '#3b82f6'};
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);

  transition: all 0.25s ease;
  min-height: clamp(90px, 10vh, 120px);
  min-width: clamp(160px, 18vw, 220px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  width: 100%;
  box-sizing: border-box;

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

  @media (max-width: 1400px) {
    min-height: clamp(85px, 9vh, 110px);
    min-width: clamp(150px, 16vw, 200px);
  }

  @media (max-width: 1200px) {
    min-height: clamp(80px, 8vh, 105px);
    min-width: clamp(140px, 15vw, 190px);
  }

  @media (max-width: 900px) {
    min-height: clamp(75px, 8vh, 100px);
    min-width: 100%;
  }

  @media (max-width: 768px) {
    min-height: clamp(70px, 7vh, 95px);
    padding: clamp(0.7rem, 0.8vw, 0.9rem);
  }

  @media (max-width: 600px) {
    min-height: clamp(65px, 6vh, 85px);
    padding: clamp(0.6rem, 0.7vw, 0.8rem);
  }
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
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
  color: #64748b;
  font-weight: 500;
  text-align: left;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 1200px) {
    white-space: normal;
    line-height: 1.3;
  }

  @media (max-width: 900px) {
    font-size: clamp(0.7rem, 1.1vw, 0.825rem);
  }

  @media (max-width: 768px) {
    font-size: clamp(0.65rem, 1vw, 0.8rem);
  }

  @media (max-width: 600px) {
    font-size: clamp(0.6rem, 0.9vw, 0.75rem);
  }
`;

const StatValue = styled.div`
  font-size: clamp(1.25rem, 2.5vw, 1.875rem);
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  text-align: left;

  @media (max-width: 1400px) {
    font-size: clamp(1.2rem, 2.3vw, 1.75rem);
  }

  @media (max-width: 1200px) {
    font-size: clamp(1.15rem, 2.2vw, 1.65rem);
  }

  @media (max-width: 900px) {
    font-size: clamp(1.1rem, 2.1vw, 1.6rem);
  }

  @media (max-width: 768px) {
    font-size: clamp(1rem, 2vw, 1.5rem);
  }

  @media (max-width: 600px) {
    font-size: clamp(0.95rem, 1.8vw, 1.3rem);
  }
`;

const LargeStatValue = styled.div`
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  line-height: 1.1;
  margin-bottom: 0.5rem;

  @media (max-width: 1400px) {
    font-size: clamp(1.15rem, 2.3vw, 1.6rem);
  }

  @media (max-width: 1200px) {
    font-size: clamp(1.3rem, 2.6vw, 2rem);
  }

  @media (max-width: 900px) {
    font-size: clamp(1.2rem, 2.4vw, 1.9rem);
  }

  @media (max-width: 768px) {
    font-size: clamp(1.1rem, 2.2vw, 1.8rem);
  }

  @media (max-width: 600px) {
    font-size: clamp(1rem, 2vw, 1.6rem);
  }
`;

const LargeStatLabel = styled.div`
  font-size: 1rem;
  color: #64748b;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;

  @media (max-width: 480px) {
    font-size: 0.875rem;
  }
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const SummaryItem = styled.div`
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid ${props => props.$color || '#d1d5db'};
  background: ${props => props.$bg || 'rgba(0, 0, 0, 0.02)'};
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.$color || '#6b7280'};
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryValue = styled.div`
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
`;

// ============================================================================
// TABLE COMPONENTS - s podporou horizontálního scrollování
// ============================================================================
// Wrapper pro tabulku s shadow indikátory
const TableScrollWrapper = styled.div`
  position: relative;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 1em;

  /* Shadow indikátory na okrajích když je možné scrollovat */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.3s ease;
  }

  /* Levý shadow - když není na začátku */
  &::before {
    left: 0;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.1), transparent);
    opacity: ${props => props.$showLeftShadow ? 1 : 0};
    border-radius: 8px 0 0 8px;
  }

  /* Pravý shadow - když není na konci */
  &::after {
    right: 0;
    background: linear-gradient(to left, rgba(0, 0, 0, 0.1), transparent);
    opacity: ${props => props.$showRightShadow ? 1 : 0};
    border-radius: 0 8px 8px 0;
  }
`;

const TableContainer = styled.div`
  /* Horizontální scrollování když se tabulka nevejde */
  overflow-x: auto;
  overflow-y: visible;
  position: relative;

  /* Smooth scrolling pro lepší UX */
  scroll-behavior: smooth;

  /* Skrytý scrollbar - máme šipky pro navigaci */
  &::-webkit-scrollbar {
    display: none;
  }

  /* Firefox - skrytý scrollbar */
  scrollbar-width: none;
`;

// Scroll šipka - levá - FIXED position (pohybuje se s vertikálním scrollem)
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
  background: ${props => props.$isEven ? '#f8fafc' : 'white'};
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
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

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #3b82f6;
  font-size: 1.25rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background: #eff6ff;
  }
`;

// Expanded Row Components - podle Orders25List
const ExpandedContent = styled.div`
  padding: 1.5rem;
  background: #f9fafb;
  border-top: 2px solid #e5e7eb;
  border-bottom: 2px solid #000000;
`;

const ExpandedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 1rem;

  @media (max-width: 1600px) {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
`;

const InfoCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  border-left: 4px solid #3b82f6;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);

  position: relative;
  transform: translateZ(0);
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.02) 100%);
    border-radius: 8px;
    pointer-events: none;
  }

  ${props => props.$fullWidth && `
    grid-column: 1 / -1;
  `}
`;

const InfoCardTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 0.45rem 0;
  border-bottom: 1px dashed #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #0a0a0a;
  flex-shrink: 0;
  white-space: nowrap;
  max-width: 45%;
`;

const InfoValue = styled.span`
  color: #0a0a0a;
  text-align: right;
  word-wrap: break-word;
  overflow-wrap: break-word;
  flex: 1;
  min-width: 0;
  line-height: 1.5;
`;

const Orders = () => {
  const { token, user, userDetail, hasPermission } = useContext(AuthContext); // Get the token, user, userDetail and hasPermission from AuthContext
  const username = user?.username; // Derive username from user object
  const { showToast } = useContext(ToastContext); // Toast notifications

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lpsData, setLpsData] = useState([]); // State to store LPS data

  // 🚀 CACHE: State pro tracking cache info
  const [lastLoadSource, setLastLoadSource] = useState(null); // 'cache' | 'database' | null
  const [lastLoadTime, setLastLoadTime] = useState(null);
  const [lastLoadDuration, setLastLoadDuration] = useState(null); // Jak dlouho trvalo načtení (ms)

  // State for checkbox selection
  const [selectedOrders, setSelectedOrders] = useState(new Set());

  // Helper functions for user-specific localStorage
  const user_id = userDetail?.user_id || user?.id; // Fallback na user.id pokud userDetail není k dispozici
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
      // Uložit do user-specific klíče
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));

      // Pro 'orders_dbSource' uložit TAKÉ do základního klíče pro Layout.js
      if (baseKey === 'orders_dbSource') {
        localStorage.setItem(baseKey, value); // Uložit bez JSON.stringify pro Layout
      }
    } catch (error) {
    }
  };

  // Retrieve initial states from user-specific localStorage or set defaults
  const [globalFilter, setGlobalFilter] = useState(() => getUserStorage('orders_globalFilter', ''));
  const [garantFilter, setGarantFilter] = useState(() => getUserStorage('orders_garantFilter', [])); // ZMĚNA: multiselect - pole
  const [druhFilter, setDruhFilter] = useState(() => getUserStorage('orders_druhFilter', [])); // ZMĚNA: multiselect - pole
  const [isCollapsed, setIsCollapsed] = useState(() => getUserStorage('orders_isCollapsed', false));
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(() => getUserStorage('orders_isStatsCollapsed', true));
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(() => getUserStorage('orders_isFilterCollapsed', false));

  // Table sorting - load from user-specific localStorage
  const [sorting, setSorting] = useState(() => getUserStorage('orders_sorting', [{ id: 'datum_p', desc: true }]));

  // Expanded rows state - zachování rozbalených řádků při refresh
  const [expanded, setExpanded] = useState({});

  const { setProgress: setGlobalProgress, start: startGlobalProgress, done: doneGlobalProgress, reset: resetGlobalProgress } = useContext(ProgressContext);
  const [isModalOpen, setIsModalOpen] = useState(false); // Ensure default is false
  const [selectedOrderId, setSelectedOrderId] = useState(null); // State to track the selected order ID
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); // State for import modal

  // States for button filters
  const [fakturaFilter, setFakturaFilter] = useState(false);
  const [pokladniDokFilter, setPokladniDokFilter] = useState(false);
  const [zverejnitFilter, setZverejnitFilter] = useState(false);

  const toggleFakturaFilter = () => setFakturaFilter((prev) => !prev);
  const togglePokladniDokFilter = () => setPokladniDokFilter((prev) => !prev);
  const toggleZverejnitFilter = () => setZverejnitFilter((prev) => !prev);

  // State management pro CustomSelect (multiselect)
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});

  // Get the current year
  const currentYear = new Date().getFullYear();

  // Retrieve initial year filter or set to the current year
  const [yearFilter, setYearFilter] = useState(() => getUserStorage('orders_yearFilter', currentYear.toString()));

  // Month filter - load from localStorage with user isolation or use "last-quarter" (poslední kvartál) jako výchozí
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return getUserStorage('orders_selectedMonth', 'last-quarter'); // all, last-month, last-quarter, last-half, nebo "1-3" (konkrétní měsíce)
  });

  // Show expanded month options
  const [showExpandedMonths, setShowExpandedMonths] = useState(() => {
    const saved = getUserStorage('orders_selectedMonth', 'last-quarter');
    // Pokud je uložená hodnota mimo základní 4, zobraz rozšířené možnosti
    return saved && !['all', 'last-month', 'last-quarter', 'last-half'].includes(saved);
  });

  // Table pagination - load from localStorage
  const [pageSize, setPageSize] = useState(() => {
    const saved = getUserStorage('orders_pageSize', null);
    return saved ? parseInt(saved, 10) : 25;
  });

  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    const saved = getUserStorage('orders_pageIndex', null);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Save pageSize to localStorage when it changes
  useEffect(() => {
    setUserStorage('orders_pageSize', pageSize.toString());
  }, [pageSize]);

  // Save currentPageIndex to localStorage when it changes
  useEffect(() => {
    setUserStorage('orders_pageIndex', currentPageIndex.toString());
  }, [currentPageIndex]);

  // Database source selection
  const [selectedDbSource, setSelectedDbSource] = useState(() =>
    getUserStorage('orders_dbSource', process.env.REACT_APP_DB_ORDER_KEY || 'objednavky0123')
  );

  // 📏 State a ref pro scroll šipky a shadow efekty
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const [isTableHovered, setIsTableHovered] = useState(false); // Hover nad CELOU tabulkou (wrapper)
  const [isArrowHovered, setIsArrowHovered] = useState(false); // Hover nad šipkou (aby nezmizelá když na ni najedeš)
  const tableContainerRef = useRef(null);
  const tableWrapperRef = useRef(null); // Pro wrapper s shadow efekty

  // Callback ref pro TableScrollWrapper - detekuje hover nad CELOU tabulkou
  const setTableWrapperRef = useCallback((node) => {
    tableWrapperRef.current = node;

    if (node) {
      const handleMouseEnter = () => {
        setIsTableHovered(true);
      };

      const handleMouseLeave = () => {
        setIsTableHovered(false);
        // NERESTUJI isArrowHovered - to ať si řídí šipka sama!
      };

      node.addEventListener('mouseenter', handleMouseEnter);
      node.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        node.removeEventListener('mouseenter', handleMouseEnter);
        node.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  // Callback ref pro TableContainer s automatickou detekcí scrollování
  const setTableContainerRef = useCallback((node) => {
    tableContainerRef.current = node;

    if (node) {
      // Funkce pro update šipek a shadowů
      const updateScrollIndicators = () => {
        const scrollLeft = node.scrollLeft;
        const maxScroll = node.scrollWidth - node.clientWidth;

        // Šipky - zobrazit když není na kraji (tolerance 5px)
        const leftVisible = scrollLeft > 5;
        const rightVisible = scrollLeft < maxScroll - 5;

        setShowLeftArrow(leftVisible);
        setShowRightArrow(rightVisible);

        // Shadow efekty - plynulejší (tolerance 1px)
        setShowLeftShadow(scrollLeft > 1);
        setShowRightShadow(scrollLeft < maxScroll - 1);
      };

      // Iniciální update po krátkém timeoutu (aby se tabulka stihla vyrenderovat)
      setTimeout(updateScrollIndicators, 100);

      // Event listenery
      const handleScroll = () => {
        updateScrollIndicators();
      };

      node.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', updateScrollIndicators);

      // Cleanup
      return () => {
        node.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', updateScrollIndicators);
      };
    }
  }, []);

  // 📏 Handler pro scroll šipky - scrolluj o šířku viewportu
  const handleScrollLeft = () => {
    const tableContainer = tableContainerRef.current;
    if (!tableContainer) return;

    // Scrolluj o 80% šířky containeru doleva
    const scrollAmount = tableContainer.clientWidth * 0.8;
    tableContainer.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScrollRight = () => {
    const tableContainer = tableContainerRef.current;
    if (!tableContainer) return;

    // Scrolluj o 80% šířky containeru doprava
    const scrollAmount = tableContainer.clientWidth * 0.8;
    tableContainer.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  // Propagate initial selectedDbSource to basic localStorage key for Layout.js
  useEffect(() => {
    try {
      localStorage.setItem('orders_dbSource', selectedDbSource);
    } catch (error) {
    }
  }, []); // Run only on mount

  // Available database sources from env
  const availableDbSources = useMemo(() => {
    const sources = process.env.REACT_APP_DB_AVAILABLE_SOURCES || 'objednavky,objednavky0103,objednavky0121,objednavky0123';
    return sources.split(',').map(s => s.trim());
  }, []);

  // Helper function to map order table to attachment table
  const getAttachmentTableName = useCallback((orderTableName) => {
    if (orderTableName === 'objednavky') {
      return 'pripojene_dokumenty';
    }
    // Pattern: objednavkyXXXX -> pripojene_odokumentyXXXX
    const match = orderTableName.match(/^objednavky(\d+.*)$/);
    if (match) {
      return `pripojene_odokumenty${match[1]}`;
    }
    return 'pripojene_odokumenty0123'; // fallback
  }, []);

  // Year dropdown state
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearSelectRef = useRef(null);

  // Month dropdown state
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthSelectRef = useRef(null);

  // Generate year options from 2016 to current year (DESC - od nejnovějšího k nejstaršímu)
  const yearOptions = useMemo(() => {
    const years = []; // Začni bez "Všechny roky"
    for (let year = currentYear; year >= 2016; year--) {
      years.push(year.toString());
    }
    years.push('Všechny roky'); // Přidej "Všechny roky" až na konec
    return years;
  }, [currentYear]);

  // Function to detect if any filters are active
  const hasActiveFilters = useMemo(() => {
    return globalFilter !== '' ||
           (Array.isArray(garantFilter) && garantFilter.length > 0) ||
           (Array.isArray(druhFilter) && druhFilter.length > 0) ||
           yearFilter !== currentYear.toString() ||
           fakturaFilter ||
           pokladniDokFilter ||
           zverejnitFilter;
  }, [globalFilter, garantFilter, druhFilter, yearFilter, currentYear, fakturaFilter, pokladniDokFilter, zverejnitFilter]);

  // Enhanced clear all filters function
  const clearAllFilters = () => {
    setGlobalFilter('');
    setGarantFilter([]);
    setDruhFilter([]);
    setYearFilter(currentYear.toString()); // Reset to current year
    setFakturaFilter(false);
    setPokladniDokFilter(false);
    setZverejnitFilter(false);

    // Clear from user-specific localStorage
    setUserStorage('orders_globalFilter', '');
    setUserStorage('orders_garantFilter', []);
    setUserStorage('orders_druhFilter', []);
    setUserStorage('orders_yearFilter', currentYear.toString());

    // Also clear calendar-related localStorage keys that might affect OrdersListNew
    try {
      const sid = user?.id || 'anon';
      localStorage.removeItem(`orders_quick_date_filter_${sid}`);
      localStorage.removeItem(`orders_quick_column_filters_${sid}`);
      localStorage.removeItem(`orders_quick_date_filter_updated_${sid}`);
      localStorage.removeItem(`orders_quick_column_filters_updated_${sid}`);
    } catch(_) {}
  };

  const handleGlobalFilterChange = (value) => {
    setGlobalFilter(value);
    setUserStorage('orders_globalFilter', value);
  };

  // Database source selection handlers
  const [isDbSourceDropdownOpen, setIsDbSourceDropdownOpen] = useState(false);
  const dbSourceSelectRef = useRef(null);

  const toggleDbSourceDropdown = () => {
    setIsDbSourceDropdownOpen(prev => !prev);
  };

  const handleDbSourceChange = async (dbSource) => {
    // Kontrola autentizace HNED
    if (!token || !username) {
      showToast('Nejste přihlášeni', { type: 'error' });
      return;
    }

    // Vyčistit cache před změnou
    try {
      ordersCacheService.clear();

      // Vyčistit také localStorage pro tento klíč
      if (user_id) {
        const storageKey = `orders_cache_${user_id}_${dbSource}`;
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
    }

    // Nastavit novou databázi
    setSelectedDbSource(dbSource);
    setUserStorage('orders_dbSource', dbSource);
    setIsDbSourceDropdownOpen(false);

    // Okamžitě zobrazit toast o načítání
    showToast(`🔄 Přepínám na databázi ${dbSource}...`, { type: 'info', duration: 2000 });

    // 🔒 Safety timeout - pokud se něco zasekne, killni to po 30s
    const timeoutId = setTimeout(() => {
      setLoading(false);
      doneGlobalProgress();
      showToast('⏰ Načítání trvá příliš dlouho, zkuste to znovu', { type: 'error' });
    }, 30000);

    const loadStartTime = performance.now();

    try {
      setLoading(true);
      startGlobalProgress();
      setGlobalProgress(10);

      const { yearFrom, yearTo } = calculateDateRange(yearFilter);
      const tabulkaObj = dbSource;
      const tabulkaOpriloh = getAttachmentTableName(tabulkaObj);

      setGlobalProgress(20);

      // Force refresh z databáze (VYNUCENÉ načtení, IGNOROVAT CACHE!)
      let data;

      data = await fetchOldOrders({ yearFrom, yearTo, token, username, tabulkaObj, tabulkaOpriloh });

      const loadEndTime = performance.now();
      const loadDuration = Math.round(loadEndTime - loadStartTime);

      setLastLoadSource('database');
      setLastLoadTime(new Date());
      setLastLoadDuration(loadDuration);

      setGlobalProgress(60);

        setGlobalProgress(70);

        if (data && Array.isArray(data)) {

          const processedData = processOrders(data).map((order) => ({
            ...order,
            prilohy: parseInt(order.prilohy, 10) || 0,
            cislo_lp: order.cislo_lp,
            subRows: [
              {
                Partner: [
                  `<strong>Partner: ${order.partner_nazev || 'neuvedeno'}</strong>`,
                  `Adresa: ${order.partner_adresa || 'neuvedeno'}`,
                  `IČ: ${order.partner_ic || 'neuvedeno'}`,
                ],
                "Transportní technika": [
                  `Transportní: ${order.tt_vyrc || 'neuvedeno'}`,
                  `Doplňující info: ${order.tt_dinfo || 'neuvedeno'}`,
                ],
              },
              {
                "Zveřejněno v registru": {
                  title: `Zveřejněno v registru${order.zverejnit === 'Ano' ? ' ✔' : ''}`,
                  details: [
                    `<strong>Datum zveřejnění:</strong> ${order.dt_zverejneni || 'neuvedeno'}`,
                    `<strong>IDRS:</strong> ${order.idds || 'neuvedeno'}`,
                  ],
                  background: order.zverejnit === 'Ano' && order.dt_zverejneni === '00.00.0000' ? 'lightcoral' : '',
                },
                Autoři: [
                  `<strong>Vytvořil:</strong> ${order.userCreator || 'neuvedeno'} dne ${order.dt_pridani}`,
                  `<strong>Aktualizoval:</strong> ${order.userUpdater || 'neuvedeno'} dne ${order.dt_modifikace}`,
                ],
              },
              {
                "Obsah a poznámka": [
                  `Obsah: ${order.obsah || 'neuvedeno'}`,
                  `Poznámka: ${order.poznamka || 'neuvedeno'}`,
                ],
              },
            ],
          }));

          setGlobalProgress(80);

          setOrders(processedData);

          setGlobalProgress(90);

          // Wait for UI to update
          await new Promise(resolve => setTimeout(resolve, 600));

          setLoading(false);
          doneGlobalProgress();

          showToast(`✅ Načteno ${data.length} objednávek z databáze ${tabulkaObj}`, {
            type: 'success',
            duration: 4000
          });
        } else {
          setOrders([]);
          setLoading(false);
          doneGlobalProgress();
          showToast(`⚠️ Databáze ${tabulkaObj} neobsahuje žádná data`, { type: 'warning' });
        }

      } catch (err) {
        clearTimeout(timeoutId);
        setError(getUserErrorMessage(err) || 'Nepodařilo se načíst data z vybrané databáze.');
        setLoading(false);
        doneGlobalProgress();
        showToast('❌ Chyba při načítání dat', { type: 'error' });
      } finally {
        clearTimeout(timeoutId);
      }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dbSourceSelectRef.current && !dbSourceSelectRef.current.contains(event.target)) {
        setIsDbSourceDropdownOpen(false);
      }
    };
    if (isDbSourceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDbSourceDropdownOpen]);

  // Load LPS data once token+username are ready
  useEffect(() => {
    const loadLps = async () => {
      if (!token || !username) return;
      try {
        const data = await fetchAllLps({ token, username });
        setLpsData(Array.isArray(data) ? data : []);
      } catch (e) {
      }
    };
    loadLps();
  }, [token, username]);

  // Toggle year dropdown
  const toggleYearDropdown = () => {
    setIsYearDropdownOpen(prev => !prev);
  };

  // Toggle month dropdown
  const toggleMonthDropdown = () => {
    setIsMonthDropdownOpen(prev => !prev);
  };

  // Close year dropdown when clicking outside
  useEffect(() => {
    if (!isYearDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (yearSelectRef.current && !yearSelectRef.current.contains(event.target)) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isYearDropdownOpen]);

  // Close month dropdown when clicking outside
  useEffect(() => {
    if (!isMonthDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (monthSelectRef.current && !monthSelectRef.current.contains(event.target)) {
        setIsMonthDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMonthDropdownOpen]);

  // Close database source dropdown when clicking outside
  useEffect(() => {
    if (!isDbSourceDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dbSourceSelectRef.current && !dbSourceSelectRef.current.contains(event.target)) {
        setIsDbSourceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDbSourceDropdownOpen]);

  // Handle month filter change
  const handleMonthChange = (newMonth) => {
    // Pokud uživatel vybere "show-more", jen zobraz další možnosti a nechej dropdown otevřený
    if (newMonth === 'show-more') {
      setShowExpandedMonths(true);
      return;
    }

    // Pokud uživatel vybere "show-less", sbal zpět na základní možnosti
    if (newMonth === 'show-less') {
      setShowExpandedMonths(false);
      return;
    }

    // Invalidovat cache při změně měsíce
    if (user_id) {
      ordersCacheService.clear();
    }

    // Pro skutečný výběr měsíce - zavřeme dropdown
    setSelectedMonth(newMonth);
    setUserStorage('orders_selectedMonth', newMonth);
    setIsMonthDropdownOpen(false);
  };

  // Helper funkce pro získání názvu měsíce
  const getMonthLabel = (value) => {
    const labels = {
      'all': 'Všechny měsíce',
      'last-month': 'Poslední měsíc',
      'last-quarter': 'Poslední kvartál',
      'last-half': 'Poslední půlrok',
      '1': 'Leden',
      '2': 'Únor',
      '3': 'Březen',
      '4': 'Duben',
      '5': 'Květen',
      '6': 'Červen',
      '7': 'Červenec',
      '8': 'Srpen',
      '9': 'Září',
      '10': 'Říjen',
      '11': 'Listopad',
      '12': 'Prosinec',
      '1-3': 'Q1 (Leden-Březen)',
      '4-6': 'Q2 (Duben-Červen)',
      '7-9': 'Q3 (Červenec-Září)',
      '10-12': 'Q4 (Říjen-Prosinec)'
    };
    return labels[value] || value;
  };

  const handleYearFilterChange = async (value) => {
    // 🚀 CACHE: Start měření doby načítání
    const loadStartTime = performance.now();

    try {
      setYearFilter(value);
      setUserStorage('orders_yearFilter', value); // Save year filter to user-specific localStorage
      setIsYearDropdownOpen(false); // Close dropdown

      setLoading(true);
      startGlobalProgress();
      setGlobalProgress(20);

      const yearFrom = value === 'Všechny roky' ? '2016-01-01' : `${value}-01-01`; // "Všechny roky" = 2016 až současnost
      const yearTo = value === 'Všechny roky' ? '2099-12-31' : `${value}-12-31`;   // Include full end date

      // Připrav názvy tabulek
      const tabulkaObj = selectedDbSource || process.env.REACT_APP_DB_ORDER_KEY;
      const tabulkaOpriloh = getAttachmentTableName(tabulkaObj);

      // 🚀 CACHE: Načíst z cache nebo DB (pouze pokud máme user_id)
      let data;
      if (user_id) {
        const cacheResult = await ordersCacheService.getOrders(
          user_id,
          async () => await fetchOldOrders({ yearFrom, yearTo, token, username, tabulkaObj, tabulkaOpriloh }),
          { yearFrom, yearTo, type: 'old-orders', dbSource: tabulkaObj }
        );
        data = cacheResult.data;

        // 🚀 CACHE: Změř dobu načítání
        const loadEndTime = performance.now();
        const loadDuration = Math.round(loadEndTime - loadStartTime);

        setLastLoadSource(cacheResult.fromCache ? 'cache' : 'database');
        setLastLoadTime(new Date());
        setLastLoadDuration(loadDuration);
      } else {
        // Fallback bez cache pokud není user_id
        data = await fetchOldOrders({ yearFrom, yearTo, token, username, tabulkaObj, tabulkaOpriloh });

        // 🚀 CACHE: Změř dobu načítání
        const loadEndTime = performance.now();
        const loadDuration = Math.round(loadEndTime - loadStartTime);

        setLastLoadSource('database');
        setLastLoadTime(new Date());
        setLastLoadDuration(loadDuration);
      }

      setGlobalProgress(60);
  // (debug logs removed)

      const processedData = Array.isArray(data)
        ? processOrders(data).map((order) => ({
            ...order,
            prilohy: parseInt(order.prilohy, 10) || 0,
            cislo_lp: order.cislo_lp,
            subRows: [
              {
                Partner: [
                  `<strong>Partner: ${order.partner_nazev || 'neuvedeno'}</strong>`,
                  `Adresa: ${order.partner_adresa || 'neuvedeno'}`,
                  `IČ: ${order.partner_ic || 'neuvedeno'}`,
                ],
                "Transportní technika": [
                  `Transportní: ${order.tt_vyrc || 'neuvedeno'}`,
                  `Doplňující info: ${order.tt_dinfo || 'neuvedeno'}`,
                ],
              },
              {
                "Zveřejněno v registru": {
                  title: `Zveřejněno v registru${order.zverejnit === 'Ano' ? ' ✔' : ''}`,
                  details: [
                    `<strong>Datum zveřejnění:</strong> ${order.dt_zverejneni || 'neuvedeno'}`,
                    `<strong>IDRS:</strong> ${order.idds || 'neuvedeno'}`,
                  ],
                  background: order.zverejnit === 'Ano' && order.dt_zverejneni === '00.00.0000' ? 'lightcoral' : '',
                },
                Autoři: [
                  `<strong>Vytvořil:</strong> ${order.userCreator || 'neuvedeno'} dne ${order.dt_pridani}`,
                  `<strong>Aktualizoval:</strong> ${order.userUpdater || 'neuvedeno'} dne ${order.dt_modifikace}`,
                ],
              },
              {
                "Obsah a poznámka": [
                  `Obsah: ${order.obsah || 'neuvedeno'}`,
                  `Poznámka: ${order.poznamka || 'neuvedeno'}`,
                ],
              },
            ],
          }))
        : [];

      setGlobalProgress(80);
      setOrders(processedData);
      setGlobalProgress(90);

      // ✅ Počkej chvíli aby se splash stihl zobrazit
      await new Promise(resolve => setTimeout(resolve, 600));

      // ✅ TEPRVE TEĎ VYPNU LOADING - data jsou v tabulce!
      setLoading(false);
      doneGlobalProgress();

    } catch (err) {
  setError('Nepodařilo se načíst data.');
  setLoading(false);
  doneGlobalProgress();
    } finally {
      // ❌ UŽ TADY NIC NEDĚLÁM - loading je vypnutý výše!
    }
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    setUserStorage('orders_isCollapsed', newState);
  };

  const toggleStatsCollapse = () => {
    const newState = !isStatsCollapsed;
    setIsStatsCollapsed(newState);
    setUserStorage('orders_isStatsCollapsed', newState);
  };

  const toggleFilterCollapse = () => {
    const newState = !isFilterCollapsed;
    setIsFilterCollapsed(newState);
    setUserStorage('orders_isFilterCollapsed', newState);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // Close the modal
    setSelectedOrderId(null); // Clear the selected order ID
  };

  const handleGarantFilterChange = (value) => {
    const newValue = Array.isArray(value) ? value : [];
    setGarantFilter(newValue);
    setUserStorage('orders_garantFilter', newValue);
  };

  const handleDruhFilterChange = (value) => {
    const newValue = Array.isArray(value) ? value : [];
    setDruhFilter(newValue);
    setUserStorage('orders_druhFilter', newValue);
  };

  const normalizeString = useCallback((str) => {
    if (!str || typeof str !== 'string') return ''; // Ensure input is a non-null string
    return str
      .toLowerCase()
      .normalize('NFD') // Normalize to decompose diacritics
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritic marks
  }, []);

  const extractCisloLp = useCallback((text) => {
    if (!text || typeof text !== 'string') return 'neuvedeno';

    const lpRegex = /\b(LPPT|LPZOS|LPIA|LPL|LPN|LPR|LPP|LPT|LPIT)\s*\d+(?:\/\d+)?\b/i; // Match patterns like LPPT3, LPIT3/2025, etc.
    const match = text.match(lpRegex);

    if (match) {
      return match[0]
        .split('/')[0] // Extract only the part before the slash
        .replace(/\s+/g, '') // Remove spaces
        .replace(/(\D)0+(\d)/, '$1$2'); // Remove leading zeros in the numeric part
    }

    return 'neuvedeno'; // Return 'neuvedeno' if no match is found
  }, []);

  const filterRows = useCallback((rows, filter, garantFilter, druhFilter, fakturaFilter, pokladniDokFilter, zverejnitFilter) => {
    return rows.filter((row) => {
      const matchesRow = Object.values(row).some((value) =>
        normalizeString(String(value)).includes(normalizeString(filter))
      );

      const matchesSubRows = row.subRows?.some((subRow) =>
        Object.values(subRow).some((value) =>
          normalizeString(String(value)).includes(normalizeString(filter))
        )
      );

      // Multiselect filtrování - pokud je pole prázdné, zobrazit vše
      const matchesGarantFilter = (Array.isArray(garantFilter) && garantFilter.length > 0)
        ? garantFilter.some(g => normalizeString(row.garant) === normalizeString(g))
        : true;

      const matchesDruhFilter = (Array.isArray(druhFilter) && druhFilter.length > 0)
        ? druhFilter.some(d => normalizeString(row.druh_sml) === normalizeString(d))
        : true;

      const matchesFakturaFilter = fakturaFilter ? row.faktura === 'Ano' : true;
      const matchesPokladniDokFilter = pokladniDokFilter ? row.pokladni_dok === 'Ano' : true;
      const matchesZverejnitFilter = zverejnitFilter ? row.zverejnit === 'Ano' : true;

      return (
        (matchesRow || matchesSubRows) &&
        matchesGarantFilter &&
        matchesDruhFilter &&
        matchesFakturaFilter &&
        matchesPokladniDokFilter &&
        matchesZverejnitFilter
      );
    });
  }, [normalizeString]);

  const filteredData = useMemo(() => {
    return filterRows(
      orders,
      globalFilter,
      garantFilter,
      druhFilter,
      fakturaFilter,
      pokladniDokFilter,
      zverejnitFilter
    );
  }, [orders, globalFilter, garantFilter, druhFilter, fakturaFilter, pokladniDokFilter, zverejnitFilter, filterRows]);

  const filteredTotalPrice = useMemo(() => {
    return filteredData.reduce((sum, order) => sum + (parseFloat(order.cena_rok) || 0), 0);
  }, [filteredData]);

  const filteredTotalOrders = useMemo(() => filteredData.length, [filteredData]);

  const filteredWithInvoice = useMemo(() => {
    return filteredData.filter((order) => order.faktura === 'Ano').length;
  }, [filteredData]);

  const filteredWithCashDocument = useMemo(() => {
    return filteredData.filter((order) => order.pokladni_dok === 'Ano').length;
  }, [filteredData]);

  const filteredPublished = useMemo(() => {
    return filteredData.filter((order) => order.zverejnit === 'Ano').length;
  }, [filteredData]);

  const totalAttachments = useMemo(() => {
    return filteredData.reduce((sum, order) => sum + (parseInt(order.prilohy, 10) || 0), 0);
  }, [filteredData]);

  // Celková cena a počet objednávek z DB (nezávisle na filtrech)
  const totalPriceFromDB = useMemo(() => {
    return orders.reduce((sum, order) => sum + (parseFloat(order.cena_rok) || 0), 0);
  }, [orders]);

  const totalOrdersFromDB = useMemo(() => orders.length, [orders]);

  // Celková cena za vybrané objednávky (checkboxy)
  const selectedOrdersTotalPrice = useMemo(() => {
    if (selectedOrders.size === 0) return 0;
    return filteredData
      .filter(order => selectedOrders.has(order.id))
      .reduce((sum, order) => sum + (parseFloat(order.cena_rok) || 0), 0);
  }, [filteredData, selectedOrders]);

  const resolvedOrders = 0; // Placeholder value
  const unresolvedOrders = 0; // Placeholder value

  // Checkbox handlers
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      const allOrderIds = new Set(filteredData.map(order => order.id));
      setSelectedOrders(allOrderIds);
    } else {
      setSelectedOrders(new Set());
    }
  }, [filteredData]);

  const handleSelectOrder = useCallback((orderId, checked) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  }, []);

  const processOrders = useCallback((orders) => {
    return orders.map((order) => {
      let cisloLp = 'neuvedeno';

      if (order.objMetaData && order.objMetaData.trim() !== '') {
        try {
          const metaData = JSON.parse(order.objMetaData);
          cisloLp = metaData.cislo_lp || 'neuvedeno';
        } catch (e) {
        }
      }

      if (cisloLp === 'neuvedeno' && order.poznamka) {
        cisloLp = extractCisloLp(order.poznamka);
      }

      // Removed per-item progress updates (avoid setState in render)

      return {
        ...order,
        garant: order.garant || 'neuvedeno', // Ensure "Úsek" is "neuvedeno" if empty
        druh_sml: order.druh_sml || 'neuvedeno', // Ensure "Druh" is "neuvedeno" if empty
        cislo_lp: cisloLp,
      };
    });
  }, [extractCisloLp]);

  // Funkce pro výpočet rozsahu dat podle roku a měsíce
  const calculateDateRange = useCallback((year, month) => {
    const currentYear = year === 'Všechny roky' ? new Date().getFullYear() : parseInt(year, 10);

    // Všechny roky
    if (year === 'Všechny roky') {
      if (month === 'all') {
        return { yearFrom: '2016-01-01', yearTo: '2099-12-31' };
      }
      // Pro "Všechny roky" s konkrétním měsícem/obdobím nemá smysl - vrátíme celý rok
      return { yearFrom: '2016-01-01', yearTo: '2099-12-31' };
    }

    // Jednotlivé měsíce (1-12)
    if (month >= '1' && month <= '12') {
      const monthNum = parseInt(month, 10);
      const lastDay = new Date(currentYear, monthNum, 0).getDate();
      return {
        yearFrom: `${currentYear}-${String(monthNum).padStart(2, '0')}-01`,
        yearTo: `${currentYear}-${String(monthNum).padStart(2, '0')}-${lastDay}`
      };
    }

    // Kvartály
    if (month === '1-3') {
      return { yearFrom: `${currentYear}-01-01`, yearTo: `${currentYear}-03-31` };
    }
    if (month === '4-6') {
      return { yearFrom: `${currentYear}-04-01`, yearTo: `${currentYear}-06-30` };
    }
    if (month === '7-9') {
      return { yearFrom: `${currentYear}-07-01`, yearTo: `${currentYear}-09-30` };
    }
    if (month === '10-12') {
      return { yearFrom: `${currentYear}-10-01`, yearTo: `${currentYear}-12-31` };
    }

    // Dynamické období
    const now = new Date();

    if (month === 'last-month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        yearFrom: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastMonth.getDate()).padStart(2, '0')}`,
        yearTo: `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`
      };
    }

    if (month === 'last-quarter') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return {
        yearFrom: `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(threeMonthsAgo.getDate()).padStart(2, '0')}`,
        yearTo: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      };
    }

    if (month === 'last-half') {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      return {
        yearFrom: `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-${String(sixMonthsAgo.getDate()).padStart(2, '0')}`,
        yearTo: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      };
    }

    // Default - celý rok
    return {
      yearFrom: `${currentYear}-01-01`,
      yearTo: `${currentYear}-12-31`
    };
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      // Skip if no token or username
      if (!token || !username) return;

      // 🚀 CACHE: Start měření doby načítání
      const loadStartTime = performance.now();

      try {
        setLoading(true);
  startGlobalProgress();
  setGlobalProgress(20);

        // Vypočítej rozsah dat podle roku a měsíce
        const { yearFrom, yearTo } = calculateDateRange(yearFilter, selectedMonth);

        // Připrav názvy tabulek
        const tabulkaObj = selectedDbSource || process.env.REACT_APP_DB_ORDER_KEY;
        const tabulkaOpriloh = getAttachmentTableName(tabulkaObj);

        // 🚀 CACHE: Načíst z cache nebo DB (pouze pokud máme user_id)
        let data;
        if (user_id) {
          const cacheResult = await ordersCacheService.getOrders(
            user_id,
            async () => await fetchOldOrders({ yearFrom, yearTo, token, username, tabulkaObj, tabulkaOpriloh }),
            { yearFrom, yearTo, type: 'old-orders', dbSource: tabulkaObj }
          );
          data = cacheResult.data;

          // 🚀 CACHE: Změř dobu načítání
          const loadEndTime = performance.now();
          const loadDuration = Math.round(loadEndTime - loadStartTime);

          setLastLoadSource(cacheResult.fromCache ? 'cache' : 'database');
          setLastLoadTime(new Date());
          setLastLoadDuration(loadDuration);
        } else {
          // Fallback bez cache pokud není user_id
          data = await fetchOldOrders({ yearFrom, yearTo, token, username, tabulkaObj, tabulkaOpriloh });

          // 🚀 CACHE: Změř dobu načítání
          const loadEndTime = performance.now();
          const loadDuration = Math.round(loadEndTime - loadStartTime);

          setLastLoadSource('database');
          setLastLoadTime(new Date());
          setLastLoadDuration(loadDuration);
        }

  // (debug logs removed)

       // console.log('Orders data received:', data); // Log the received data

  setGlobalProgress(60);
        const processedData = Array.isArray(data)
          ? processOrders(data).map((order) => ({
              ...order,
              prilohy: parseInt(order.prilohy, 10) || 0,
              cislo_lp: order.cislo_lp,
              subRows: [
                {
                  Partner: [
                    `<strong>Partner: ${order.partner_nazev || 'neuvedeno'}</strong>`,
                    `Adresa: ${order.partner_adresa || 'neuvedeno'}`,
                    `IČ: ${order.partner_ic || 'neuvedeno'}`,
                  ],
                  "Transportní technika": [
                    `Transportní: ${order.tt_vyrc || 'neuvedeno'}`,
                    `Doplňující info: ${order.tt_dinfo || 'neuvedeno'}`,
                  ],
                },
                {
                  "Zveřejněno v registru": {
                    title: `Zveřejněno v registru${order.zverejnit === 'Ano' ? ' ✔' : ''}`,
                    details: [
                      `<strong>Datum zveřejnění:</strong> ${order.dt_zverejneni || 'neuvedeno'}`,
                      `<strong>IDRS:</strong> ${order.idds || 'neuvedeno'}`,
                    ],
                    background: order.zverejnit === 'Ano' && order.dt_zverejneni === '00.00.0000' ? 'lightcoral' : '',
                  },
                  Autoři: [
                    `<strong>Vytvořil:</strong> ${order.userCreator || 'neuvedeno'} dne ${order.dt_pridani}`,
                    `<strong>Aktualizoval:</strong> ${order.userUpdater || 'neuvedeno'} dne ${order.dt_modifikace}`,
                  ],
                },
                {
                  "Obsah a poznámka": [
                    `Obsah: ${order.obsah || 'neuvedeno'}`,
                    `Poznámka: ${order.poznamka || 'neuvedeno'}`,
                  ],
                },
              ],
            }))
          : [];

        setGlobalProgress(80);
        setOrders(processedData);
        setGlobalProgress(90);

        // ✅ Počkej chvíli aby se splash stihl zobrazit
        await new Promise(resolve => setTimeout(resolve, 600));

        // ✅ TEPRVE TEĎ VYPNU LOADING - data jsou v tabulce!
        setLoading(false);
        doneGlobalProgress();

      } catch (err) {
  try { const code = getErrorCodeCZ(err) || ''; if (code === 'chyba_serveru' || code === 'server_error') { setError('Chyba na serveru. Zkuste to prosím později.'); } else { setError(getUserErrorMessage(err) || 'Nepodařilo se načíst data.'); } } catch(e) { setError(getUserErrorMessage(err) || 'Nepodařilo se načíst data.'); }
  try { const code = getErrorCodeCZ(err) || ''; if (code === 'chyba_serveru' || code === 'server_error') { try { setTimeout(() => { resetGlobalProgress && resetGlobalProgress(); }, 2200); } catch(e) {} } } catch(e) {}
  setLoading(false);
  doneGlobalProgress();
      } finally {
        // ❌ UŽ TADY NIC NEDĚLÁM - loading je vypnutý výše!
      }
    };

    fetchOrders();
  }, [yearFilter, selectedMonth, doneGlobalProgress, processOrders, setGlobalProgress, startGlobalProgress, token, username, user_id, getAttachmentTableName, selectedDbSource, calculateDateRange]);

  // Save sorting to localStorage when it changes
  useEffect(() => {
    setUserStorage('orders_sorting', sorting);
  }, [sorting]);

  const formatPrice = (price) => {
    if (isNaN(price)) return 'neuvedeno';
    return `${Number(price).toLocaleString('cs-CZ')},- Kč`;
  };

  const highlightText = useCallback((text, searchTerm) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }, []);

  const renderCellWithHighlight = useCallback((value, searchTerm) => {
    if (typeof value !== 'string') return value;
    return <span dangerouslySetInnerHTML={{ __html: highlightText(value, searchTerm) }} />;
  }, [highlightText]);

  const handleEditClick = (orderId) => {
    // console.log('Editing order with ID:', orderId); // Debug log to verify the orderId
    setSelectedOrderId(orderId); // Set the selected order ID
    setIsModalOpen(true); // Open the modal
  };

  const handleMigrateOrders = async () => {
    if (selectedOrders.size === 0) {
      showToast('Nevybrali jste žádné objednávky k převodu', { type: 'warning' });
      return;
    }

    // Otevřít import modal
    setIsImportModalOpen(true);
  };

  // Funkce pro volání API importu
  const handleImportOldOrders = async (orderIds, { onProgress, onComplete, onError } = {}) => {
    const orderTable = selectedDbSource || process.env.REACT_APP_DB_ORDER_KEY || 'objednavky0123';
    const attachmentTable = getAttachmentTableName(orderTable);

    // Validace před voláním API
    if (!token || !username || !user?.id) {
      const error = new Error('Chybí přihlašovací údaje! Token/username/userId nejsou nastaveny.');
      if (onError) onError(error);
      throw error;
    }

    try {
      // Zkus SSE streaming endpoint (pokud backend podporuje)
      try {
        return await importOldOrders25Streaming({
          token,
          username,
          userId: user?.id,
          oldOrderIds: orderIds,
          tabulkaObj: orderTable,
          tabulkaOpriloh: attachmentTable,
          onProgress,
          onComplete,
          onError
        });
      } catch (sseError) {
        // Pokud SSE selže (404, není implementováno), spadni na klasické API

        const response = await importOldOrders25({
          token,
          username,
          userId: user?.id,
          oldOrderIds: orderIds,
          tabulkaObj: orderTable,
          tabulkaOpriloh: attachmentTable
        });

        // Simuluj onComplete callback pro kompatibilitu
        if (onComplete) {
          onComplete({
            imported_count: response.imported_count,
            updated_count: response.updated_count,
            failed_count: response.failed_count,
            total_count: response.total_count
          });
        }

        return response;
      }
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  };

  // Callback po dokončení importu
  const handleImportComplete = () => {
    // Refresh seznam objednávek - force reload z aktuální databáze
    handleDbSourceChange(selectedDbSource);
    // Vyčistit výběr
    setSelectedOrders(new Set());
    showToast('Import byl úspěšně dokončen', { type: 'success' });
  };

  // Handler pro zavření import dialogu - vyčistí checkboxy
  const handleImportModalClose = () => {
    setIsImportModalOpen(false);
    // Vyčistit výběr po zavření (i když import nebyl dokončen)
    setSelectedOrders(new Set());
  };

  const [attachments, setAttachments] = useState({});
  const [attachmentsLoading, setAttachmentsLoading] = useState({});

  const fetchAttachments = async (orderId) => {
    try {
      setAttachmentsLoading((prev) => ({ ...prev, [orderId]: true })); // Set loading state for the specific order ID

  // New API2-auth wrapper to call old_endpoints.php with action 'react-attachment-id'
  const data = await fetchOrderAttachmentsOld({ id: orderId, token, username });

      if (Array.isArray(data)) {
        setAttachments((prev) => ({ ...prev, [orderId]: data })); // Update the attachments state
      } else {
        setAttachments((prev) => ({ ...prev, [orderId]: [] })); // Set empty array if format is invalid
      }
    } catch (err) {
      setAttachments((prev) => ({ ...prev, [orderId]: [] })); // Set empty array on error
    } finally {
      setAttachmentsLoading((prev) => ({ ...prev, [orderId]: false })); // Reset loading state
    }
  };

  // Pro staré objednávky před 2026 používáme původní eeo.zachranka.cz URL
  const attachmentBaseUrl = process.env.REACT_APP_LEGACY_ATTACHMENTS_BASE_URL || 'https://eeo.zachranka.cz/prilohy/';

  const handleOrderUpdated = () => {
    // Force reload z aktuální databáze po update objednávky
    handleDbSourceChange(selectedDbSource);
  };

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => {
        const allRowIds = filteredData.map(order => order.id);
        const isAllSelected = allRowIds.length > 0 && allRowIds.every(id => selectedOrders.has(id));
        const isSomeSelected = allRowIds.some(id => selectedOrders.has(id));
        return (
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={input => {
              if (input) input.indeterminate = isSomeSelected && !isAllSelected;
            }}
            onChange={(e) => handleSelectAll(e.target.checked)}
            title="Vybrat vše"
            style={{ cursor: 'pointer' }}
          />
        );
      },
      size: 50,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={selectedOrders.has(row.original.id)}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectOrder(row.original.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer' }}
          />
        </div>
      ),
    },
    {
      id: 'expander',
      header: ({ table }) => {
        const isAllExpanded = table.getIsAllRowsExpanded();
        return (
          <ExpandButton
            onClick={() => table.toggleAllRowsExpanded()}
            title={isAllExpanded ? 'SBALIT VŠE' : 'ROZBALIT VŠE'}
          >
            <FontAwesomeIcon icon={isAllExpanded ? faMinus : faPlus} />
          </ExpandButton>
        );
      },
      size: 50,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ExpandButton
            onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
            title={row.getIsExpanded() ? 'SBALIT' : 'ROZBALIT'}
          >
            <FontAwesomeIcon icon={row.getIsExpanded() ? faMinus : faPlus} />
          </ExpandButton>
        </div>
      ),
    },
    {
      accessorKey: 'datum_p',
      header: 'DATUM',
      cell: (info) => info.getValue(),
      sortingFn: (rowA, rowB) => {
        const [dayA, monthA, yearA] = rowA.original.datum_p.split('.').map(Number);
        const [dayB, monthB, yearB] = rowB.original.datum_p.split('.').map(Number);
        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
      },
    },
    { accessorKey: 'faktura', header: <span title="Faktura">F</span>, size: 50, cell: (info) => <div className="centered-cell">{info.getValue() === "Ano" ? '✔' : ''}</div> },
    { accessorKey: 'pokladni_dok', header: <span title="Pokladní doklad">P</span>, size: 50, cell: (info) => <div className="centered-cell">{info.getValue() === "Ano" ? '✔' : ''}</div> },
    { accessorKey: 'zverejnit', header: <span title="Zveřejněno v registru">R</span>, size: 50, cell: (info) => <div className="centered-cell">{info.getValue() === "Ano" ? '✔' : ''}</div> },
    { accessorKey: 'evidencni_c', header: 'EV.ČÍSLO', cell: (info) => renderCellWithHighlight(info.getValue(), globalFilter) },
  // Align left: plain text value for section (ÚSEK)
  { accessorKey: 'garant', header: 'ÚSEK', cell: (info) => info.getValue() },
    { accessorKey: 'userCreator', header: 'VYTVOŘIL', cell: (info) => renderCellWithHighlight(info.getValue(), globalFilter) },
  // Align left: plain text value for contract type (DRUH)
  { accessorKey: 'druh_sml', header: 'DRUH', cell: (info) => info.getValue() },
    { accessorKey: 'partner_nazev', header: 'PARTNER', cell: (info) => renderCellWithHighlight(info.getValue(), globalFilter) },
    {
      accessorKey: 'cena',
      header: 'CENA',
      cell: (info) => <div style={{textAlign:"right"}}>{formatPrice(info.getValue())}</div>
    },
    {
      accessorKey: 'cena_rok',
      header: 'CENA S DPH',
      cell: (info) => <div style={{textAlign:"right"}}>{formatPrice(info.getValue())}</div>
    },
    {
      accessorKey: 'cislo_lp',
      header: 'LP',
      cell: (info) => <div className="centered-cell">{info.getValue()}</div>
    },
    {
      accessorKey: 'prilohy',
      header: (
        <FontAwesomeIcon icon={faPaperclip} title="Přílohy" />
      ),
      size: 50,
      cell: ({ row }) => (
        <div className="centered-cell">
          {row.original.prilohy}
        </div>
      ),
    },
    {
      accessorKey: 'actions',
      header: 'AKCE',
      size: 90,
      cell: ({ row }) => {
        const viewOnly = true; // static for Orders page
        if (viewOnly) {
          return (
            <div className="action-icons view-only-disabled" title="Pouze náhled">
              <div className="view-only-text">VIEW ONLY</div>
              <div className="icons-row">
                <button className="action-button" disabled><FontAwesomeIcon icon={faEdit} /></button>
                <button className="action-button" disabled><FontAwesomeIcon icon={faCopy} /></button>
                <button className="action-button" disabled><FontAwesomeIcon icon={faFileAlt} /></button>
                <button className="action-button" disabled><FontAwesomeIcon icon={faTrash} /></button>
              </div>
            </div>
          );
        }
        return (
          <div className="action-icons">
            <button
              className="action-button"
              title="Editace objednávky"
              onClick={() => handleEditClick(row.original.id)}
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button className="action-button" title="Kopie objednávky">
              <FontAwesomeIcon icon={faCopy} />
            </button>
            <button className="action-button" title="Vytvořit šablonu z objednávky">
              <FontAwesomeIcon icon={faFileAlt} />
            </button>
            <button className="action-button" title="Smazat objednávku">
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        );
      },
    },
  ], [renderCellWithHighlight, globalFilter, selectedOrders, handleSelectAll, handleSelectOrder]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      sorting,
      expanded, // 🔧 Přidán kontrolovaný state pro rozbalené řádky
      pagination: {
        pageIndex: currentPageIndex,
        pageSize: pageSize,
      },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onExpandedChange: setExpanded, // 🔧 Handler pro změnu expanded state
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPagination = updater({ pageIndex: currentPageIndex, pageSize: pageSize });
        setCurrentPageIndex(newPagination.pageIndex);
        setPageSize(newPagination.pageSize);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.subRows?.length > 0,
    manualPagination: false,
  });

  const handleCellClick = (value) => {
    if (value) {
      navigator.clipboard.writeText(value).catch((err) => { console.error('Nepodařilo se zkopírovat text: ', err); });
    }
  };

  const renderPageNumbers = () => {
    const totalPages = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => (
        <button
          key={index}
          onClick={() => table.setPageIndex(index)}
          className={`pagination-number ${
            currentPage === index ? 'active' : ''
          }`}
        >
          {index + 1}
        </button>
      ));
    }

    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages - 2, currentPage + 1);

    return (
      <>
        <button
          onClick={() => table.setPageIndex(0)}
          className={`pagination-number ${currentPage === 0 ? 'active' : ''}`}
        >
          1
        </button>
        {startPage > 1 && <span className="pagination-ellipsis">...</span>}
        {Array.from({ length: endPage - startPage + 1 }, (_, index) => {
          const pageIndex = startPage + index;
          return (
            <button
            key={pageIndex}
            onClick={() => table.setPageIndex(pageIndex)}
            className={`pagination-number ${
              currentPage === pageIndex ? 'active' : ''
            }`}
          >
            {pageIndex + 1}
          </button>
        );
      })}
      {endPage < totalPages - 2 && <span className="pagination-ellipsis">...</span>}
      <button
        onClick={() => table.setPageIndex(totalPages - 1)}
        className={`pagination-number ${
          currentPage === totalPages - 1 ? 'active' : ''
        }`}
      >
        {totalPages}
      </button>
    </>
  );
};
const renderSubRows = (row) => {
  return (
    <tr>
      <td colSpan={columns.length} style={{ padding: 0 }}>
        <ExpandedContent>
          <ExpandedGrid>
            {row.original.subRows?.map((subRow, index) => (
              <React.Fragment key={`${row.id}-subrow-${index}`}>
                {Object.entries(subRow).map(([group, details]) => {
                  const isFullWidth = group === 'Obsah a poznámka';

                  if (group === 'Zveřejněno v registru') {
                    return (
                      <InfoCard key={group}>
                        <InfoCardTitle>{details.title}</InfoCardTitle>
                        {details.details.map((detail, i) => (
                          <InfoRow key={i}>
                            <InfoValue
                              style={{ textAlign: 'left', width: '100%' }}
                              dangerouslySetInnerHTML={{ __html: highlightText(detail, globalFilter) }}
                            />
                          </InfoRow>
                        ))}
                      </InfoCard>
                    );
                  }

                  return (
                    <InfoCard key={group} $fullWidth={isFullWidth}>
                      <InfoCardTitle>{group}</InfoCardTitle>
                      {details.map((detail, i) => (
                        <InfoRow key={i}>
                          <InfoValue
                            style={{ textAlign: 'left', width: '100%' }}
                            dangerouslySetInnerHTML={{ __html: highlightText(detail, globalFilter) }}
                          />
                        </InfoRow>
                      ))}
                    </InfoCard>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Přílohy sekce */}
            <InfoCard $fullWidth>
              <InfoCardTitle>
                <span>Přílohy ({row.original.prilohy})</span>
                {row.original.prilohy > 0 && (
                  <button
                    onClick={() => fetchAttachments(row.original.id)}
                    disabled={attachmentsLoading[row.original.id]}
                    title="Načíst přílohy"
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      color: '#3b82f6',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.125rem',
                    }}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </button>
                )}
              </InfoCardTitle>
              {attachments[row.original.id] && attachments[row.original.id].length > 0 ? (
                <div>
                  {attachments[row.original.id].map((attachment, index) => {
                    // Detekce přípony pro rozhodnutí, zda otevřít v prohlížeči nebo stáhnout
                    const fileName = attachment.soubor || '';
                    const ext = fileName.split('.').pop()?.toLowerCase();
                    const previewableExtensions = [
                      'pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp',
                      'txt', 'html', 'htm', 'xml', 'json', 'csv',
                      'mp4', 'webm', 'ogg', 'mp3', 'wav'
                    ];
                    const shouldPreview = previewableExtensions.includes(ext);

                    return (
                      <InfoRow key={index}>
                        <InfoValue style={{ textAlign: 'left', width: '100%' }}>
                          <a
                            href={`${attachmentBaseUrl}${attachment.soubor}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            {...(!shouldPreview && { download: fileName })}
                            style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}
                          >
                            {attachment.soubor}
                          </a>
                          {attachment.popis && <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>: {attachment.popis}</span>}
                        </InfoValue>
                      </InfoRow>
                    );
                  })}
                </div>
              ) : (
                <InfoRow>
                  <InfoValue style={{ textAlign: 'left', color: '#9ca3af' }}>
                    {attachments[row.original.id] ? 'Žádné přílohy' : 'Přílohy nebyly načteny'}
                  </InfoValue>
                </InfoRow>
              )}
            </InfoCard>
          </ExpandedGrid>
        </ExpandedContent>
      </td>
    </tr>
  );
};

// Loading: necháme stránku vykreslenou, data se doplní až po fetchi (progress bar indikuje průběh)

if (error) {
  return (
    <>
      <OrdersPageStyles />
      <div className="error-message">{error}</div>
    </>
  );
}

  // TODO: replace viewOnly constant with real permission logic
  const viewOnly = true; // temporary flag

return (
  <div className={`orders-page ${viewOnly ? 'view-only' : ''}`} style={{ position: 'relative' }}>
    <OrdersPageStyles />
    {/* Loading overlay with blur and fade effects */}
    <LoadingOverlay $visible={loading}>
      <LoadingSpinner $visible={loading} />
      <LoadingMessage $visible={loading}>Načítání objednávek</LoadingMessage>
      <LoadingSubtext $visible={loading}>Zpracovávám data z databáze...</LoadingSubtext>
    </LoadingOverlay>

    <PageContent $blurred={loading}>

    {/* Původní dimming overlay pro jemné loading stavy */}
    {false && (
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(255, 255, 255, 0.75)',
        zIndex: 10,
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
        borderRadius: 'inherit'
      }} />
    )}

    {/* Header Panel podle vzoru Orders25List - NAD dashboardem */}
    <YearFilterPanel>
      <YearFilterLeft>
        <YearFilterLabel>
          <FontAwesomeIcon icon={faCalendarAlt} />
          Rok:
        </YearFilterLabel>
        <YearDropdownContainer ref={yearSelectRef}>
          <YearDropdownButton onClick={toggleYearDropdown}>
            <span>{yearFilter}</span>
            <FontAwesomeIcon icon={isYearDropdownOpen ? faChevronUp : faChevronDown} />
          </YearDropdownButton>
          {isYearDropdownOpen && (
            <YearDropdownMenu>
              {yearOptions.map(year => (
                <YearDropdownItem key={year} onClick={() => handleYearFilterChange(year)}>
                  {year}
                </YearDropdownItem>
              ))}
            </YearDropdownMenu>
          )}
        </YearDropdownContainer>

        <MonthFilterLabel>
          <FontAwesomeIcon icon={faCalendarAlt} />
          Období:
        </MonthFilterLabel>
        <MonthDropdownContainer ref={monthSelectRef}>
          <MonthDropdownButton onClick={toggleMonthDropdown}>
            <span>{getMonthLabel(selectedMonth)}</span>
            <FontAwesomeIcon icon={isMonthDropdownOpen ? faChevronUp : faChevronDown} />
          </MonthDropdownButton>
          {isMonthDropdownOpen && (
            <MonthDropdownMenu>
              <MonthDropdownItem onClick={() => handleMonthChange('all')}>
                Všechny měsíce
              </MonthDropdownItem>
              <MonthDropdownItem onClick={() => handleMonthChange('last-month')}>
                Poslední měsíc
              </MonthDropdownItem>
              <MonthDropdownItem onClick={() => handleMonthChange('last-quarter')}>
                Poslední kvartál
              </MonthDropdownItem>
              <MonthDropdownItem onClick={() => handleMonthChange('last-half')}>
                Poslední půlrok
              </MonthDropdownItem>

              {!showExpandedMonths ? (
                <>
                  <MonthDropdownItem separator disabled>
                    ━━━━━━━━━━━━━━━━━━━━
                  </MonthDropdownItem>
                  <MonthDropdownItem action onClick={() => handleMonthChange('show-more')}>
                    ➕ Zobrazit další...
                  </MonthDropdownItem>
                </>
              ) : (
                <>
                  <MonthDropdownItem separator disabled>
                    ━━━━━━━━━━━━━━━━━━━━
                  </MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('1')}>Leden</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('2')}>Únor</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('3')}>Březen</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('4')}>Duben</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('5')}>Květen</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('6')}>Červen</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('7')}>Červenec</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('8')}>Srpen</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('9')}>Září</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('10')}>Říjen</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('11')}>Listopad</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('12')}>Prosinec</MonthDropdownItem>
                  <MonthDropdownItem separator disabled>
                    ━━━━━━━━━━━━━━━━━━━━
                  </MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('1-3')}>Q1 (Leden-Březen)</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('4-6')}>Q2 (Duben-Červen)</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('7-9')}>Q3 (Červenec-Září)</MonthDropdownItem>
                  <MonthDropdownItem onClick={() => handleMonthChange('10-12')}>Q4 (Říjen-Prosinec)</MonthDropdownItem>
                  <MonthDropdownItem separator disabled>
                    ━━━━━━━━━━━━━━━━━━━━
                  </MonthDropdownItem>
                  <MonthDropdownItem action onClick={() => handleMonthChange('show-less')}>
                    ➖ Zobrazit méně
                  </MonthDropdownItem>
                </>
              )}
            </MonthDropdownMenu>
          )}
        </MonthDropdownContainer>

        <YearFilterLabel style={{ marginLeft: '2rem' }}>
          <FontAwesomeIcon icon={faDatabase} />
          Databáze:
        </YearFilterLabel>
        <YearDropdownContainer ref={dbSourceSelectRef}>
          <YearDropdownButton onClick={toggleDbSourceDropdown}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{selectedDbSource}</span>
            <FontAwesomeIcon icon={isDbSourceDropdownOpen ? faChevronUp : faChevronDown} />
          </YearDropdownButton>
          {isDbSourceDropdownOpen && (
            <YearDropdownMenu>
              {availableDbSources.map(dbSource => (
                <YearDropdownItem
                  key={dbSource}
                  onClick={() => handleDbSourceChange(dbSource)}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    background: dbSource === selectedDbSource ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
                  }}
                >
                  {dbSource}
                  {dbSource === selectedDbSource && ' ✓'}
                </YearDropdownItem>
              ))}
            </YearDropdownMenu>
          )}
        </YearDropdownContainer>

        <HeaderActions>
          <HeaderActionButton
            onClick={() => handleDbSourceChange(selectedDbSource)}
            title="Aktualizovat seznam objednávek (force reload z databáze)"
            disabled={loading}
          >
            <FontAwesomeIcon
              icon={faSyncAlt}
              spin={loading}
            />
          </HeaderActionButton>

          {/* Import tlačítko - pouze pro uživatele se VŠEMI třemi oprávněními: ORDER_MANAGE AND ORDER_IMPORT AND ORDER_SHOW_ARCHIV */}
          {hasPermission && hasPermission('ORDER_MANAGE') && hasPermission('ORDER_IMPORT') && hasPermission('ORDER_SHOW_ARCHIV') && (
            <HeaderActionButton
              onClick={handleMigrateOrders}
              disabled={selectedOrders.size === 0}
              title={selectedOrders.size === 0 ? 'Vyberte objednávky k převodu' : `Převést ${selectedOrders.size} vybraných objednávek do nové DB`}
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </HeaderActionButton>
          )}
        </HeaderActions>
      </YearFilterLeft>

      <YearFilterTitle>
        {lastLoadSource && (
          <CacheStatusIconWrapper>
            <CacheStatusIcon fromCache={lastLoadSource === 'cache'}>
              <FontAwesomeIcon icon={lastLoadSource === 'cache' ? faBoltLightning : faDatabase} />
            </CacheStatusIcon>
            <div className="tooltip top" data-icon="none">
              {lastLoadSource === 'cache'
                ? '⚡ Načteno z cache (paměti) - rychlé zobrazení bez dotazu na databázi'
                : '💾 Načteno z databáze - aktuální data přímo ze serveru'
              }
              {lastLoadTime && (
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                  📅 {new Date(lastLoadTime).toLocaleTimeString('cs-CZ')}
                  {lastLoadDuration !== null && (
                    <span style={{ marginLeft: '0.5rem' }}>
                      ⏱️ {lastLoadDuration}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </CacheStatusIconWrapper>
        )}
        Seznam objednávek
        <FontAwesomeIcon icon={faFileInvoice} />
      </YearFilterTitle>
    </YearFilterPanel>

    <PageDivider />

    <div style={{
      opacity: loading ? 0.6 : 1,
      transition: 'opacity 0.3s ease'
    }}>

    {/* Dashboard - dlaždice */}
    {!isCollapsed && (
      <DashboardPanel>
        <DashboardGrid>
          <LargeStatCard $color="#4caf50">
            <div>
              <LargeStatValue>
                {Math.round(totalPriceFromDB).toLocaleString('cs-CZ')}&nbsp;Kč
              </LargeStatValue>
              <LargeStatLabel>
                Celková cena s DPH za období
              </LargeStatLabel>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#64748b',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                Celkem: {totalOrdersFromDB} {totalOrdersFromDB === 1 ? 'objednávka' : 'objednávek'} za období
              </div>
              {(() => {
                // Priorita: vybrané checkboxy > aktivní filtry
                if (selectedOrders.size > 0) {
                  return (
                    <div style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(100, 116, 139, 0.2)'
                    }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#3b82f6',
                        textAlign: 'center',
                        marginBottom: '0.25rem'
                      }}>
                        {Math.round(selectedOrdersTotalPrice).toLocaleString('cs-CZ')}&nbsp;Kč
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#3b82f6',
                        textAlign: 'center'
                      }}>
                        Celková cena za vybrané ({selectedOrders.size})
                      </div>
                    </div>
                  );
                }

                const hasActiveFilters =
                  globalFilter ||
                  garantFilter ||
                  druhFilter ||
                  fakturaFilter ||
                  pokladniDokFilter ||
                  zverejnitFilter;

                if (hasActiveFilters && filteredData.length < orders.length) {
                  return (
                    <div style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(100, 116, 139, 0.2)'
                    }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#f59e0b',
                        textAlign: 'center',
                        marginBottom: '0.25rem'
                      }}>
                        {Math.round(filteredTotalPrice).toLocaleString('cs-CZ')}&nbsp;Kč
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#f59e0b',
                        textAlign: 'center'
                      }}>
                        Celková cena za vybrané ({filteredData.length})
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <SummaryRow>
              <SummaryItem
                $color="#ff5722"
                $bg="rgba(255, 87, 34, 0.08)"
              >
                <SummaryLabel $color="#bf360c">Přílohy</SummaryLabel>
                <SummaryValue>{totalAttachments}</SummaryValue>
              </SummaryItem>

              <SummaryItem
                $color="#ff9800"
                $bg="rgba(255, 152, 0, 0.08)"
              >
                <SummaryLabel $color="#e65100">S fakturou</SummaryLabel>
                <SummaryValue>{filteredWithInvoice}</SummaryValue>
              </SummaryItem>
            </SummaryRow>
          </LargeStatCard>

          <StatCard $color="#2196f3">
            <StatHeader>
              <StatValue>{filteredTotalOrders}</StatValue>
              <StatIcon $color="#2196f3">
                <FontAwesomeIcon icon={faFileInvoice} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Celkový počet za období</StatLabel>
          </StatCard>

          <StatCard $color="#ff5722">
            <StatHeader>
              <StatValue>{totalAttachments}</StatValue>
              <StatIcon $color="#ff5722">
                <FontAwesomeIcon icon={faPaperclip} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Připojené přílohy za období</StatLabel>
          </StatCard>

          <StatCard $color="#ff9800">
            <StatHeader>
              <StatValue>{filteredWithInvoice}</StatValue>
              <StatIcon $color="#ff9800">
                <FontAwesomeIcon icon={faFileInvoiceDollar} />
              </StatIcon>
            </StatHeader>
            <StatLabel>S fakturou za období</StatLabel>
          </StatCard>

          <StatCard $color="#9c27b0">
            <StatHeader>
              <StatValue>{filteredWithCashDocument}</StatValue>
              <StatIcon $color="#9c27b0">
                <FontAwesomeIcon icon={faCashRegister} />
              </StatIcon>
            </StatHeader>
            <StatLabel>S pokladním dokladem za období</StatLabel>
          </StatCard>

          <StatCard $color="#3f51b5">
            <StatHeader>
              <StatValue>{filteredPublished}</StatValue>
              <StatIcon $color="#3f51b5">
                <FontAwesomeIcon icon={faGlobe} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zveřejněné v registru za období</StatLabel>
          </StatCard>

          <StatCard $color="#4caf50">
            <StatHeader>
              <StatValue>{resolvedOrders}</StatValue>
              <StatIcon $color="#4caf50">
                <FontAwesomeIcon icon={faCheckCircle} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Vyřízené</StatLabel>
          </StatCard>

          <StatCard $color="#f44336">
            <StatHeader>
              <StatValue>{unresolvedOrders}</StatValue>
              <StatIcon $color="#f44336">
                <FontAwesomeIcon icon={faTimesCircle} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Nevyřízené</StatLabel>
          </StatCard>
        </DashboardGrid>
      </DashboardPanel>
    )}

    <div className="collapse-line" style={{ marginTop: '0.5rem', marginBottom: '2.5rem' }}>
      <span className="dashboard-label">Dashboard - přehled</span>
      <hr className="divider-line" />
      <button className="collapse-button" onClick={toggleCollapse}>
        <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp} />
      </button>
    </div>

    {/* Grafy - statistiky */}
    {!isStatsCollapsed && (
      <div className="orders-boxes">
        <div className="orders-box stats-box" style={{ flex: '1 1 100%' }}>
          <div className="header-with-icon">
            <FontAwesomeIcon icon={faChartPie} className="header-icon-large" />
            <h1 className="page-title">Statistika objednávek</h1>
          </div>
          <Statistics filteredOrders={filteredData} selectedYear={yearFilter} lpsData={lpsData} />
        </div>
      </div>
    )}

    <div className="collapse-line" style={{ marginTop: '0.5rem', marginBottom: '2.5rem' }}>
      <span className="dashboard-label">Grafy a statistiky</span>
      <hr className="divider-line" />
      <button className="collapse-button" onClick={toggleStatsCollapse}>
        <FontAwesomeIcon icon={isStatsCollapsed ? faChevronDown : faChevronUp} />
      </button>
    </div>
    </div>

    {selectedOrders.size > 0 && (
      <div className="total-orders">
        <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
          Vybráno: {selectedOrders.size}
        </span>
      </div>
    )}

    <div className="filter-box" style={{ display: isFilterCollapsed ? 'none' : 'flex' }}>
      <div className="filter-buttons">
        <button
          className={`filter-button ${fakturaFilter ? 'active' : ''}`}
          onClick={toggleFakturaFilter}
          title="Faktura"
        >
          F
        </button>
        <button
          className={`filter-button ${pokladniDokFilter ? 'active' : ''}`}
          onClick={togglePokladniDokFilter}
          title="Pokladní doklad"
        >
          P
        </button>
        <button
          className={`filter-button ${zverejnitFilter ? 'active' : ''}`}
          onClick={toggleZverejnitFilter}
          title="Zveřejnit v registru"
        >
          R
        </button>
      </div>
      <div className="filter-input-wrapper">
        <div className="search-icon"><FontAwesomeIcon icon={faSearch} /></div>
        <input
          type="text"
          placeholder="Rychlý filtr..."
          value={globalFilter}
          onChange={(e) => handleGlobalFilterChange(e.target.value)}
          className="filter-input"
        />
        {globalFilter && <button className="clear-filter-button" onClick={() => handleGlobalFilterChange('')} aria-label="Vyčistit">×</button>}
      </div>
      <div className="filter-group">
        {/* Garant Filter - Custom Multi-Select */}
        <div style={{ flex: 1 }}>
          <CustomSelect
            value={garantFilter}
            onChange={handleGarantFilterChange}
            options={[...new Set(orders.map((order) => order.garant))].filter(Boolean).map(garant => ({
              id: garant,
              nazev: garant
            }))}
            field="garantFilter"
            placeholder="Všechny úseky"
            multiple={true}
            setSelectStates={setSelectStates}
            setSearchStates={setSearchStates}
            selectStates={selectStates}
            searchStates={searchStates}
          />
        </div>
        
        {/* Druh Filter - Custom Multi-Select */}
        <div style={{ flex: 1 }}>
          <CustomSelect
            value={druhFilter}
            onChange={handleDruhFilterChange}
            options={[...new Set(orders.map((order) => order.druh_sml))].filter(Boolean).map(druh => ({
              id: druh,
              nazev: druh
            }))}
            field="druhFilter"
            placeholder="Všechny druhy"
            multiple={true}
            setSelectStates={setSelectStates}
            setSearchStates={setSearchStates}
            selectStates={selectStates}
            searchStates={searchStates}
          />
        </div>
      </div>
    </div>
    <div className="collapse-line" style={{ marginTop: '0.5rem', marginBottom: '2.5rem' }}>
      <span className="dashboard-label">Filter objednávek</span>
      <hr className="divider-line" />
      <button className="collapse-button" onClick={toggleFilterCollapse}>
        <FontAwesomeIcon icon={isFilterCollapsed ? faChevronDown : faChevronUp} />
      </button>
    </div>

    {/* Table with Scroll Controls */}
    <TableScrollWrapper
      ref={setTableWrapperRef}
      $showLeftShadow={showLeftShadow}
      $showRightShadow={showRightShadow}
    >
      <TableContainer ref={setTableContainerRef}>
      <Table>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort && header.column.getCanSort();
                const sorted = header.column.getIsSorted && header.column.getIsSorted();
                let caret = null;
                if (sorted === 'asc') caret = <span style={{marginLeft:6, opacity:0.95}}><FontAwesomeIcon icon={faChevronUp} style={{fontSize:'12px', color:'#fff'}} /></span>;
                else if (sorted === 'desc') caret = <span style={{marginLeft:6, opacity:0.95}}><FontAwesomeIcon icon={faChevronDown} style={{fontSize:'12px', color:'#fff'}} /></span>;
                return (
                  <TableHeader
                    key={header.id}
                    style={{
                      width: header.column.getSize ? header.column.getSize() : undefined
                    }}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    title={canSort ? (sorted === 'asc' ? 'Řazeno vzestupně – klik pro sestupně' : sorted === 'desc' ? 'Řazeno sestupně – klik pro zrušení' : 'Klik pro řazení') : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:'100%'}}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {caret}
                      </div>
                    )}
                  </TableHeader>
                );
              })}
            </tr>
          ))}
        </TableHead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <React.Fragment key={row.id}>
              <TableRow
                $isEven={index % 2 === 0}
                onDoubleClick={() => row.toggleExpanded()}
                style={{ cursor: 'pointer' }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    onClick={() => handleCellClick(cell.getValue())}
                    style={{ cursor: 'copy' }}
                  >
                    {renderCellWithHighlight(
                      flexRender(cell.column.columnDef.cell, cell.getContext()),
                      globalFilter
                    )}
                  </TableCell>
                ))}
              </TableRow>
              {row.getIsExpanded() && renderSubRows(row)}
            </React.Fragment>
          ))}
        </tbody>
      </Table>

      {/* Pagination */}
      <PaginationContainer>
      <PaginationInfo>
        Zobrazeno {table.getRowModel().rows.length} z {filteredData.length} objednávek
        {filteredData.length !== orders.length && (
          <span> (filtrováno z {orders.length})</span>
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
            // Resetuj na první stránku při změně velikosti stránky
            setCurrentPageIndex(0);
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={250}>250</option>
        </PageSizeSelect>

        <PageButton
          onClick={() => {
            setCurrentPageIndex(0);
          }}
          disabled={!table.getCanPreviousPage()}
        >
          ««
        </PageButton>
        <PageButton
          onClick={() => {
            setCurrentPageIndex(prev => Math.max(0, prev - 1));
          }}
          disabled={!table.getCanPreviousPage()}
        >
          ‹
        </PageButton>

        <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
          Stránka {table.getState().pagination.pageIndex + 1} z {table.getPageCount()}
        </span>

        <PageButton
          onClick={() => {
            setCurrentPageIndex(prev => Math.min(table.getPageCount() - 1, prev + 1));
          }}
          disabled={!table.getCanNextPage()}
        >
          ›
        </PageButton>
        <PageButton
          onClick={() => {
            setCurrentPageIndex(table.getPageCount() - 1);
          }}
          disabled={!table.getCanNextPage()}
        >
          »»
        </PageButton>
      </PaginationControls>
    </PaginationContainer>
    </TableContainer>
    </TableScrollWrapper>

    {/* Floating Scroll Šipky - React Portal (FIXED position, mimo DOM tabulky) */}
    {createPortal(
      <>
        <ScrollArrowLeft
          $visible={showLeftArrow}
          $tableHovered={isTableHovered}
          $arrowHovered={isArrowHovered}
          onClick={handleScrollLeft}
          onMouseEnter={() => setIsArrowHovered(true)}
          onMouseLeave={() => setIsArrowHovered(false)}
          disabled={!showLeftArrow}
          aria-label="Scrollovat doleva"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </ScrollArrowLeft>

        <ScrollArrowRight
          $visible={showRightArrow}
          $tableHovered={isTableHovered}
          $arrowHovered={isArrowHovered}
          onClick={handleScrollRight}
          onMouseEnter={() => setIsArrowHovered(true)}
          onMouseLeave={() => setIsArrowHovered(false)}
          disabled={!showRightArrow}
          aria-label="Scrollovat doprava"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </ScrollArrowRight>
      </>,
      document.body
    )}

    {/* Modals */}
    <>
      {isModalOpen && (
        <OrderFormTabs
          orderId={selectedOrderId} // Pass the selected order ID
          onClose={handleCloseModal}
          onOrderUpdated={handleOrderUpdated} // Pass the callback to refresh orders
        />
      )}
    </>
    </PageContent>

    {/* Import Modal - MIMO PageContent, aby nebyl ovlivněn blur filterem */}
    <ImportOldOrdersModal
      isOpen={isImportModalOpen}
      onClose={handleImportModalClose}
      selectedOrderIds={Array.from(selectedOrders)}
      onImportComplete={handleImportComplete}
      importFunction={handleImportOldOrders}
    />
  </div>
);
};

export default Orders;
