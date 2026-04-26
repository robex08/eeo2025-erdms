import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt, faMessage, faPlus, faEdit, faTrash, faSave, faTimes,
  faSearch, faEraser, faExclamationTriangle, faExpand, faCompress,
  faBold, faItalic, faUnderline, faListUl, faListOl, faLink, faUnlink, faCode,
  faEye, faEyeSlash, faCheckCircle, faTimesCircle, faUser,
  faTrophy, faMinus, faSortAlphaDown, faFilter, faBolt
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import * as planningApi from '../services/planningApi';
import { prettyDate } from '../utils/format';
import DatePicker from '../components/DatePicker';
import TimePicker from '../components/TimePicker';
import { CustomSelect } from '../components/CustomSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import SmartTooltip from '../styles/SmartTooltip';
import PlanningEventCalendarPopup from '../components/PlanningEventCalendarPopup';
import PlanningAllEventsCalendar from '../components/PlanningAllEventsCalendar';
import '../styles/tableFiltersImprovement.css';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;

  @keyframes popupFadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
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

const TabContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1rem;
`;

const TabHeader = styled.div`
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;

  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button`
  flex: 0 0 auto;
  min-width: 160px;
  padding: 0.6rem 1.2rem;
  background: ${props => props.$active ? 'white' : 'transparent'};
  border: none;
  border-bottom: 3px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  color: ${props => props.$active ? '#3b82f6' : '#64748b'};
  font-weight: ${props => props.$active ? '600' : '500'};
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;

  &:hover {
    background: ${props => props.$active ? 'white' : '#f1f5f9'};
    color: ${props => props.$active ? '#3b82f6' : '#3b82f6'};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
`;

const ContentArea = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: ${props => props.$variant === 'danger' ? '#dc2626' : props.$variant === 'secondary' ? '#6b7280' : '#3b82f6'};
  color: white;
  font-weight: 600;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$variant === 'danger' ? '#b91c1c' : props.$variant === 'secondary' ? '#4b5563' : '#2563eb'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SearchPanel = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SearchPanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
`;

const SearchPanelTitle = styled.h3`
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  > svg {
    color: #3b82f6;
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
`;

const ToggleSwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: #3b82f6;
  }

  &:checked + span:before {
    transform: translateX(20px);
  }
`;

const ToggleSwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
`;

const ToggleLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #4b5563;
  user-select: none;
`;

const ClearAllButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;

  > svg:first-of-type {
    position: absolute;
    left: 0.9rem;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    pointer-events: none;
    font-size: 1rem;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.6rem 2.3rem 0.6rem 2.4rem;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.82rem !important;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif !important;
  transition: all 0.2s ease;
  background: white;

  &:focus {
    outline: none;
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`;

const TableContainer = styled.div`
  position: relative;
  width: 100%;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.9rem;

  tbody tr {
    background: white;
    border-bottom: 1px solid #f1f5f9;
  }

  tbody tr:hover {
    background-color: #f8fafc;
  }

  tbody tr:last-child {
    border-bottom: none;
  }
`;

const TableHead = styled.thead`
  background: #f8fafc;
  
  tr {
    border-bottom: 1px solid #e5e7eb;
  }
  
  tr:last-child {
    border-bottom: 2px solid #e5e7eb;
  }
`;

const TableRow = styled.tr``;

const TableHeader = styled.th`
  padding: 0.35rem 0.5rem 0.2rem 0.5rem;
  text-align: left;
  font-weight: 600;
  color: #334155 !important;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 0.7rem !important;
  white-space: nowrap;
  user-select: none;

  &.center {
    text-align: center;
  }

  &.filter-cell {
    padding: 0rem 0.35rem 0.35rem 0.35rem;
    background: transparent !important;
  }
`;

const SortableHeader = styled(TableHeader)`
  cursor: pointer;
`;

const TableCell = styled.td`
  padding: 0.45rem 0.6rem;
  color: #1f2937;
  vertical-align: middle;

  &.center {
    text-align: center;
  }
`;

const HtmlPreviewBox = styled.div`
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  font-size: 0.8rem;
  color: #1f2937;
`;

const HtmlPreviewContent = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  line-height: 1.35;
  max-height: calc(1.35em * 3);

  p,
  ul,
  ol {
    margin: 0;
  }

  ul,
  ol {
    padding-left: 1.1rem;
  }

  a {
    color: #2563eb;
    text-decoration: none;
  }
`;

const HtmlPreviewEmpty = styled.div`
  color: #94a3b8;
  font-style: italic;
`;

const HtmlTooltipContent = styled.div`
  /* Reset zděděných stylů z TooltipBubble */
  font-weight: normal;
  white-space: normal;
  line-height: 1.6;
  
  /* Základní styly */
  color: white;
  font-size: 0.8rem;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.2);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  h2, h3, h4 {
    margin: 1.2em 0 0.6em 0;
    font-weight: 700;
    line-height: 1.3;
  }

  h2:first-child, h3:first-child, h4:first-child {
    margin-top: 0;
  }

  h2 {
    font-size: 1.4em;
  }

  h3 {
    font-size: 1.2em;
  }

  p {
    margin: 1em 0;
    line-height: 1.6;
  }

  p:first-child {
    margin-top: 0;
  }

  p:last-child {
    margin-bottom: 0;
  }

  ul, ol {
    margin: 0.8em 0;
    padding-left: 2em;
    line-height: 1.6;
  }

  li {
    margin: 0.4em 0;
  }

  ul ul, ol ol, ul ol, ol ul {
    margin: 0.3em 0;
  }

  strong {
    font-weight: 700;
  }

  em {
    font-style: italic;
  }

  a {
    color: #60a5fa;
    text-decoration: underline;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.6rem;
  background: white;
  border-top: 1px solid #f1f5f9;
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
  font-weight: 600;
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

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${props => {
    if (props.$type === 'role') return '#dbeafe';
    if (props.$type === 'user') return '#dcfce7';
    return '#f3f4f6';
  }};
  color: ${props => {
    if (props.$type === 'role') return '#1e40af';
    if (props.$type === 'user') return '#166534';
    return '#374151';
  }};
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.$variant === 'danger' ? '#dc2626' : '#6b7280'};
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${props => props.$variant === 'danger' ? '#fef2f2' : '#f3f4f6'};
    color: ${props => props.$variant === 'danger' ? '#b91c1c' : '#374151'};
  }
`;

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
  padding: ${props => props.$fullScreen ? '0' : '1rem'};
  animation: fadeInBg 0.2s ease;

  @keyframes fadeInBg {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: ${props => props.$fullScreen ? '0' : '16px'};
  width: ${props => props.$fullScreen ? '100vw' : '100%'};
  max-width: ${props => props.$fullScreen ? '100vw' : '950px'};
  height: ${props => props.$fullScreen ? '100vh' : 'auto'};
  max-height: ${props => props.$fullScreen ? '100vh' : 'calc(100vh - 2rem)'};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.15);
  animation: slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ModalHeader = styled.div`
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
`;

const ModalTitle = styled.div`
  h3 {
    margin: 0 0 0.15rem;
    font-size: 0.95rem;
    font-weight: 700;
  }
  p {
    margin: 0;
    font-size: 0.75rem;
    opacity: 0.82;
  }
`;

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModalBody = styled.div`
  padding: 1rem 1.25rem;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  padding: 0.85rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  background: #fafafa;
  flex-shrink: 0;
`;

const FormGroup = styled.div`
  margin-bottom: 0.9rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0.85rem;
  margin-bottom: 0.9rem;
`;

const RecipientsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.85rem;
  margin-bottom: 0.5rem;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
`;

const SendToAllCheckbox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
`;

const SendToAllLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  user-select: none;
`;

const SendToAllToggle = styled.div`
  position: relative;
  width: 48px;
  height: 26px;
  background: ${props => props.$checked ? '#3b82f6' : '#cbd5e1'};
  border-radius: 13px;
  transition: background 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${props => props.$checked ? '#2563eb' : '#94a3b8'};
  }

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.$checked ? '25px' : '3px'};
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: left 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

// Řádek s termínem (4 pickery + tlačítko odebrat)
const TerminRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 0.5rem;
  align-items: end;
  padding: 0.45rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
`;

const TerminyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 38vh;
  overflow-y: auto;
  padding-right: 0.25rem;

  @media (max-height: 800px) {
    max-height: 32vh;
  }
`;

const TerminRemoveBtn = styled.button`
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  height: 38px;
  width: 38px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #fecaca;
    border-color: #f87171;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const TerminAddBtn = styled.button`
  width: 100%;
  margin-top: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: transparent;
  border: 2px dashed #10b981;
  border-radius: 8px;
  color: #10b981;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: #f0fdf4;
    border-color: #059669;
  }

  &:hover {
    background: #bfdbfe;
    border-color: #60a5fa;
  }
`;

const ValidationError = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    flex-shrink: 0;
  }
`;

const TerminIndexBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  margin-right: 0.35rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid ${props => props.$hasError ? '#dc2626' : '#e2e8f0'};
  border-radius: 9px;
  font-size: 0.85rem;
  color: #1e293b;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.12)' : 'rgba(59, 130, 246, 0.12)'};
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 0.85rem;
  color: #1e293b;
  resize: vertical;
  min-height: 62px;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const EditorContainer = styled.div`
  border: 1.5px solid ${props => props.$hasError ? '#dc2626' : '#e2e8f0'};
  border-radius: 9px;
  background: white;
  overflow: hidden;
`;

const EditorToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const EditorGroup = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const EditorButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: none;
  background: ${props => props.$active ? '#dbeafe' : 'transparent'};
  color: ${props => props.$active ? '#1d4ed8' : '#64748b'};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    background: #e2e8f0;
    color: #1f2937;
  }
`;

const EditorArea = styled.div`
  min-height: 140px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  line-height: 1.55;
  color: #1e293b;
  outline: none;

  &:focus {
    box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.15);
  }

  &:empty:before {
    content: attr(data-placeholder);
    color: #94a3b8;
  }

  ul,
  ol {
    padding-left: 1.2rem;
    margin: 0.35rem 0;
  }
`;

const EditorSource = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 0.6rem 0.75rem;
  border: none;
  outline: none;
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
  line-height: 1.5;
  color: #1f2937;
  resize: vertical;
`;

const Checkbox = styled.input`
  margin-right: 0.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
  user-select: none;
`;

// Wrapper pro sladění výšky DatePicker a TimePicker s Input
const DateTimeWrapper = styled.div`
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  width: 100%;
  position: relative;

  /* Všechny přímé děti i potomci roztaženi na 100% */
  & > div,
  & > div > div {
    width: 100% !important;
  }

  /* Přepsání stylů pro DatePicker input - FIXNÍ výška 38px */
  input {
    width: 100% !important;
    padding: 0 0.625rem !important;
    padding-left: 2rem !important;
    padding-right: ${props => props.$hasValue ? '3rem' : '0.625rem'} !important;
    border: 1.5px solid ${props => props.$error ? '#dc2626' : '#e2e8f0'} !important;
    border-radius: 9px !important;
    font-size: 0.85rem !important;
    font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif !important;
    color: #111827 !important;
    height: 38px !important;
    min-height: 38px !important;
    max-height: 38px !important;
    line-height: 38px !important;
    box-sizing: border-box !important;
    box-shadow: none !important;
    outline: none !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  /* Focus a hover efekty - čistý border bez dvojitého ohraničení */
  input:hover:not(:disabled) {
    border-color: #cbd5e1 !important;
    box-shadow: none !important;
    outline: none !important;
  }

  input:focus,
  input:focus-visible {
    border-color: #3b82f6 !important;
    box-shadow: none !important;
    outline: none !important;
  }

  /* TimePicker hlavní input button - padding-right dle počtu akčních tlačítek */
  button[data-time-input="true"] {
    width: 100% !important;
    padding: 0 0.625rem !important;
    padding-left: 2rem !important;
    padding-right: ${props => props.$hasValue ? '4.5rem' : '2.5rem'} !important;
    border: 1.5px solid ${props => props.$error ? '#dc2626' : '#e2e8f0'} !important;
    border-radius: 9px !important;
    font-size: 0.85rem !important;
    font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif !important;
    height: 38px !important;
    min-height: 38px !important;
    max-height: 38px !important;
    line-height: 1 !important;
    box-sizing: border-box !important;
  }

  /* TimePicker button focus/hover - bez dvojitého ohraničení */
  button[data-time-input="true"]:hover:not(:disabled),
  button[data-time-input="true"]:focus {
    border-color: #3b82f6 !important;
    box-shadow: none !important;
    outline: none !important;
  }

  /* Ikony kalendáře/hodin vlevo */
  div > div > svg {
    left: 0.625rem !important;
    width: 16px !important;
    height: 16px !important;
  }

  /* DatePicker clear button - VŽDY na pravý kraj inputu */
  div > div > button[title="Smazat datum"] {
    right: 6px !important;
    left: auto !important;
    color: #94a3b8 !important;
    opacity: 0.7 !important;
    font-size: 18px !important;
    font-weight: 500 !important;
    z-index: 10 !important;
    background: white !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
  }

  div > div > button[title="Smazat datum"]:hover {
    opacity: 0.9 !important;
    color: #64748b !important;
  }

  /* TimePicker clear button - VŽDY na pravý kraj inputu */
  div > div > button[title="Smazat čas"] {
    right: 6px !important;
    left: auto !important;
  }

  /* TimePicker "Nyní" button - těsně vedle × (nebo na kraj pokud není ×) */
  div > div > button[title="Aktuální čas"] {
    right: ${props => props.$hasValue ? '36px' : '6px'} !important;
    left: auto !important;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PlanningAdminPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('planning_active_tab');
      return saved === 'messages' ? 'messages' : 'events';
    } catch (e) {
      return 'events';
    }
  }); // 'messages' | 'events'
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, type: null, name: '' });
  const [isModalFullScreen, setIsModalFullScreen] = useState(false);
  const [isHtmlView, setIsHtmlView] = useState(false);
  const editorRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return localStorage.getItem('planning_search_term') || '';
    } catch (e) {
      return '';
    }
  });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('planning_column_filters');
      return saved ? JSON.parse(saved) : {
        nazev: '',
        organizator: '',
        text: '',
        dt_od: '',
        dt_do: ''
      };
    } catch (e) {
      return {
        nazev: '',
        organizator: '',
        text: '',
        dt_od: '',
        dt_do: ''
      };
    }
  });
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState({
    nazev: '',
    organizator: '',
    text: '',
    dt_od: '',
    dt_do: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      const saved = localStorage.getItem('planning_items_per_page');
      return saved ? parseInt(saved, 10) : 50;
    } catch (e) {
      return 50;
    }
  });
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(() => {
    try {
      const saved = localStorage.getItem('planning_include_inactive');
      return saved === null ? true : saved === 'true';
    } catch (e) {
      return true;
    }
  });
  
  // Třídění tabulky - výchozí dle dt_updated DESC
  const [sortField, setSortField] = useState('dt_updated');
  const [sortDirection, setSortDirection] = useState('DESC');
  
  // Sort ikona jako v Invoices25List
  const sortIcon = (field) => (
    <span style={{ marginLeft: '0.2rem', fontSize: '0.65rem', opacity: sortField === field ? 1 : 0.3, color: sortField === field ? '#2563eb' : 'inherit' }}>
      {sortField !== field ? '⇅' : sortDirection === 'ASC' ? '↑' : '↓'}
    </span>
  );

  const [eventResponses, setEventResponses] = useState({});
  const [expandedEvents, setExpandedEvents] = useState(() => {
    try {
      const raw = localStorage.getItem('planning_admin_expanded_events_v1');
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return new Set();
  });
  // Sort odpovedi v sub-radku: { [eventId]: 'name' | 'type' }
  const [responsesSort, setResponsesSort] = useState(() => {
    try {
      const raw = localStorage.getItem('planning_admin_responses_sort_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return {};
  });
  // Popup kalendář pro událost
  const [calendarPopupEvent, setCalendarPopupEvent] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, width: 860, height: 500 });
  
  // Modal s kumulativním kalendářem všech událostí
  const [showAllEventsCalendar, setShowAllEventsCalendar] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('planning_admin_expanded_events_v1', JSON.stringify(Array.from(expandedEvents)));
    } catch (e) { /* ignore */ }
  }, [expandedEvents]);

  useEffect(() => {
    try {
      localStorage.setItem('planning_admin_responses_sort_v1', JSON.stringify(responsesSort));
    } catch (e) { /* ignore */ }
  }, [responsesSort]);

  // Seznamy pro výběr příjemců
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    nazev: '',
    obsah: '', // pro zprávy
    popis: '', // pro události
    dt_od_date: '',
    dt_od_time: '',
    dt_do_date: '',
    dt_do_time: '',
    prijemci: [],
    sendToAll: false // 🆕 Poslat všem aktivním uživatelům
  });

  const isMessagesTab = activeTab === 'messages';
  const editorField = isMessagesTab ? 'obsah' : 'popis';
  const editorValue = formData[editorField] || '';
  const editorLabel = isMessagesTab ? 'Obsah *' : 'Popis';
  const editorPlaceholder = isMessagesTab
    ? 'Zadejte obsah zprávy (HTML)'
    : 'Zadejte popis události (HTML)';
  const editorSourcePlaceholder = '<p>HTML kód...</p>';
  
  // Vybraní příjemci (separátní state pro lepší UX)
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Termíny pro události (pole - může být více termínů)
  // Pro zprávy se používá jen první termín (terminy[0])
  const [terminy, setTerminy] = useState([
    { dt_od_date: '', dt_od_time: '', dt_do_date: '', dt_do_time: '', kapacita: null }
  ]);

  // Validační chyby
  const [validationErrors, setValidationErrors] = useState({});

  // CustomSelect state
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState({});

  // Kontrola oprávnění
  useEffect(() => {
    if (!hasPermission('PLANNING_MANAGE')) {
      showToast('Nemáte oprávnění ke správě plánování', 'error');
      return;
    }
  }, [hasPermission, showToast]);

  useEffect(() => {
    try {
      localStorage.setItem('planning_active_tab', activeTab);
    } catch (e) {
      // ignore storage errors
    }
  }, [activeTab]);

  // Ukládání filtrů do localStorage
  useEffect(() => {
    try {
      localStorage.setItem('planning_search_term', searchTerm);
    } catch (e) {
      // ignore storage errors
    }
  }, [searchTerm]);

  useEffect(() => {
    try {
      localStorage.setItem('planning_column_filters', JSON.stringify(columnFilters));
    } catch (e) {
      // ignore storage errors
    }
  }, [columnFilters]);

  useEffect(() => {
    try {
      localStorage.setItem('planning_include_inactive', String(includeInactive));
    } catch (e) {
      // ignore storage errors
    }
  }, [includeInactive]);

  useEffect(() => {
    try {
      localStorage.setItem('planning_items_per_page', String(itemsPerPage));
    } catch (e) {
      // ignore storage errors
    }
  }, [itemsPerPage]);

  // Načtení seznamu rolí a uživatelů při otevření modálu
  useEffect(() => {
    if (modalOpen) {
      loadRecipientOptions();
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen && isModalFullScreen) {
      setIsModalFullScreen(false);
    }
  }, [modalOpen, isModalFullScreen]);

  useEffect(() => {
    if (modalOpen) {
      setIsHtmlView(false);
    }
  }, [modalOpen, activeTab]);

  useEffect(() => {
    if (!isHtmlView && editorRef.current) {
      if (editorRef.current.innerHTML !== editorValue) {
        editorRef.current.innerHTML = editorValue;
      }
    }
  }, [editorValue, isHtmlView, modalOpen, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 400);

    return () => clearTimeout(timer);
  }, [columnFilters]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [activeTab, searchTerm, columnFilters, includeInactive]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: itemsPerPage,
        search_term: debouncedSearchTerm,
        filter_nazev: debouncedColumnFilters.nazev,
        filter_organizator: debouncedColumnFilters.organizator,
        filter_text: debouncedColumnFilters.text,
        filter_dt_od: debouncedColumnFilters.dt_od,
        filter_dt_do: debouncedColumnFilters.dt_do,
        include_inactive: includeInactive ? 1 : 0,
        sort_field: sortField,
        sort_direction: sortDirection
      };
      
      if (activeTab === 'messages') {
        const response = await planningApi.getMessagesList(params);
        setMessages(response.data || []);
        setTotalItems(response.pagination?.total || response.count || 0);
        setTotalPages(response.pagination?.total_pages || 0);
      } else {
        const response = await planningApi.getEventsList(params);
        setEvents(response.data || []);
        setTotalItems(response.pagination?.total || response.count || 0);
        setTotalPages(response.pagination?.total_pages || 0);
      }
    } catch (error) {
      console.error('❌ Chyba načítání dat:', error);
      showToast('Chyba při načítání dat', 'error');
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, itemsPerPage, debouncedSearchTerm, debouncedColumnFilters, includeInactive, sortField, sortDirection, showToast]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setColumnFilters({
      nazev: '',
      organizator: '',
      text: '',
      dt_od: '',
      dt_do: ''
    });
    setCurrentPage(1);
    
    // Vymazat z localStorage
    try {
      localStorage.removeItem('planning_search_term');
      localStorage.removeItem('planning_column_filters');
    } catch (e) {
      // ignore storage errors
    }
  };

  // Třídění: null → ASC → DESC → null
  const handleSort = (field) => {
    if (sortField !== field) {
      // Nový sloupec - začni na ASC
      setSortField(field);
      setSortDirection('ASC');
    } else {
      // Stejný sloupec - cykluj: ASC → DESC → null
      if (sortDirection === 'ASC') {
        setSortDirection('DESC');
      } else if (sortDirection === 'DESC') {
        // Zrušit třídění - vrátit na výchozí
        setSortField('dt_updated');
        setSortDirection('DESC');
      } else {
        // Nemělo by nastat
        setSortDirection('ASC');
      }
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const applyEditorCommand = (command, value = null) => {
    if (isHtmlView) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    setFormData(prev => ({ ...prev, [editorField]: editor.innerHTML }));
  };

  const handleInsertLink = () => {
    const url = window.prompt('Zadejte URL odkazu');
    if (!url) return;
    applyEditorCommand('createLink', url);
  };

  const handleEditorInput = (event) => {
    const html = event.currentTarget ? event.currentTarget.innerHTML : '';
    setFormData(prev => ({ ...prev, [editorField]: html }));
  };

  // Načtení dat
  useEffect(() => {
    if (hasPermission('PLANNING_MANAGE')) {
      loadData();
    }
  }, [hasPermission, loadData]);

  useEffect(() => {
    if (activeTab !== 'events') {
      setEventResponses({});
      return;
    }

    if (!events || events.length === 0) {
      setEventResponses({});
      return;
    }

    const ids = events.map(e => e.id).filter(Boolean);
    planningApi.getEventResponsesList(ids)
      .then((response) => {
        setEventResponses(response.data || {});
      })
      .catch((error) => {
        console.error('❌ Chyba načítání odpovědí:', error);
        setEventResponses({});
      });
  }, [activeTab, events]);

  const loadRecipientOptions = async () => {
    try {
      const [rolesResponse, usersResponse] = await Promise.all([
        planningApi.getActiveRoles(),
        planningApi.getActiveUsers()
      ]);
      
      setAvailableRoles(rolesResponse.data || []);
      setAvailableUsers(usersResponse.data || []);
    } catch (error) {
      console.error('❌ Chyba načítání příjemců:', error);
      showToast('Chyba při načítání seznamu příjemců', 'error');
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      nazev: '',
      obsah: '',
      popis: '',
      dt_od_date: '',
      dt_od_time: '',
      dt_do_date: '',
      dt_do_time: '',
      prijemci: []
    });
    setTerminy([{ dt_od_date: '', dt_od_time: '', dt_do_date: '', dt_do_time: '', kapacita: null }]);
    setSelectedRoles([]);
    setSelectedUsers([]);
    setIsHtmlView(false);
    setModalOpen(true);
  };

  // ========================================================================
  // Helper funkce pro termíny (události mohou mít více termínů)
  // ========================================================================

  // Přičte X minut k času "HH:MM" a vrátí { date, time } s případným přesahem do dalšího dne
  const addMinutesToDateTime = (dateStr, timeStr, minutesToAdd) => {
    if (!dateStr || !timeStr) return { date: '', time: '' };
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(dateStr);
    d.setHours(h, m + minutesToAdd, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
  };

  // Aktualizace jednoho termínu v poli - BEZ auto-fill (jen set value).
  // Auto-fill DO+60 se řeší přes completeTerminTime (po výběru minut v TimePickeru).
  const updateTermin = (index, field, newValue) => {
    // Vyčistit validační chyby při změně
    if (validationErrors.terminy) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next.terminy;
        return next;
      });
    }
    
    setTerminy(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: newValue };
      return next;
    });
  };

  // Volá se až když je čas kompletně vybraný (hodiny + minuty) v TimePickeru.
  // Pokud byl zrovna doplněn dt_od a "DO" je prázdné → automaticky vyplň +60 min.
  const completeTerminTime = (index, field, newTime) => {
    setTerminy(prev => {
      const next = [...prev];
      const term = { ...next[index], [field]: newTime };

      const hasOd = term.dt_od_date && term.dt_od_time;
      const hasDo = term.dt_do_date || term.dt_do_time;
      if (hasOd && !hasDo && field === 'dt_od_time') {
        const plus60 = addMinutesToDateTime(term.dt_od_date, term.dt_od_time, 60);
        term.dt_do_date = plus60.date;
        term.dt_do_time = plus60.time;
      }

      next[index] = term;
      return next;
    });
  };

  const addTermin = () => {
    setTerminy(prev => [
      ...prev,
      { dt_od_date: '', dt_od_time: '', dt_do_date: '', dt_do_time: '', kapacita: null }
    ]);
  };

  const removeTermin = (index) => {
    setTerminy(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const parseDateTimeParts = (value) => {
    if (!value) return { date: '', time: '' };
    if (value instanceof Date && !isNaN(value)) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      const hh = String(value.getHours()).padStart(2, '0');
      const mi = String(value.getMinutes()).padStart(2, '0');
      return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
    }

    const raw = String(value);
    let datePart = '';
    let timePart = '';

    if (raw.includes('T')) {
      [datePart, timePart] = raw.split('T');
    } else if (raw.includes(' ')) {
      [datePart, timePart] = raw.split(' ');
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      datePart = raw;
    }

    return {
      date: datePart ? datePart.slice(0, 10) : '',
      time: timePart ? timePart.slice(0, 5) : ''
    };
  };

  const handleEdit = async (item) => {
    setEditingItem(item);
    setIsHtmlView(false);
    setSelectedRoles([]);
    setSelectedUsers([]);
    setModalOpen(true);

    try {
      const [detailResponse, rolesResponse, usersResponse] = await Promise.all([
        activeTab === 'messages' ? planningApi.getMessage(item.id) : planningApi.getEvent(item.id),
        planningApi.getActiveRoles(),
        planningApi.getActiveUsers()
      ]);

      const detail = detailResponse?.data || item;
      const roles = rolesResponse?.data || [];
      const users = usersResponse?.data || [];

      setAvailableRoles(roles);
      setAvailableUsers(users);

      // Parse datetime do date/time bez posunu časové zóny
      const parsedOd = parseDateTimeParts(detail.dt_od);
      const parsedDo = parseDateTimeParts(detail.dt_do);
      const dt_od_date = parsedOd.date;
      const dt_od_time = parsedOd.time;
      const dt_do_date = parsedDo.date;
      const dt_do_time = parsedDo.time;

      setFormData({
        nazev: detail.nazev || '',
        obsah: detail.obsah || '',
        popis: detail.popis || '',
        dt_od_date,
        dt_od_time,
        dt_do_date,
        dt_do_time,
        prijemci: detail.prijemci || []
      });

      // Načti termíny (pouze pro události) – backend vrací všechny rovnocenné termíny
      // v `detail.terminy`. Pokud by byl prázdný seznam (legacy nebo chyba), fallback na
      // dt_od/dt_do události.
      let parsedTerminy = [];
      if (Array.isArray(detail.terminy) && detail.terminy.length > 0) {
        parsedTerminy = detail.terminy.map(t => {
          const termOd = parseDateTimeParts(t.dt_od);
          const termDo = parseDateTimeParts(t.dt_do);
          return {
            id: t.id,
            dt_od_date: termOd.date,
            dt_od_time: termOd.time,
            dt_do_date: termDo.date,
            dt_do_time: termDo.time,
            poznamka: t.poznamka || '',
            kapacita: t.kapacita !== null && t.kapacita !== undefined ? t.kapacita : null
          };
        });
      } else {
        parsedTerminy = [{
          dt_od_date,
          dt_od_time,
          dt_do_date,
          dt_do_time,
          kapacita: null
        }];
      }
      setTerminy(parsedTerminy);

      const prijemci = Array.isArray(detail.prijemci) ? detail.prijemci : [];
      const selectedRoleIds = prijemci
        .filter((p) => p.typ_prijemce === 'role' && p.kod_role)
        .map((p) => roles.find((role) => role.kod_role === p.kod_role)?.id)
        .filter((id) => id != null)
        .map((id) => Number(id));

      const selectedUserIds = prijemci
        .filter((p) => p.typ_prijemce === 'user' && p.user_id)
        .map((p) => Number(p.user_id));

      setSelectedRoles(selectedRoleIds);
      setSelectedUsers(selectedUserIds);
    } catch (error) {
      console.error('❌ Chyba načítání detailu:', error);
      showToast('Chyba při načítání detailu', 'error');
    }
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      // Sestavit pole prijemci z vybraných rolí a uživatelů
      const prijemci = [
        ...selectedRoles.map(roleId => ({
          typ_prijemce: 'role',
          kod_role: availableRoles.find(r => r.id === parseInt(roleId))?.kod_role,
          user_id: null
        })),
        ...selectedUsers.map(userId => ({
          typ_prijemce: 'user',
          kod_role: null,
          user_id: parseInt(userId)
        }))
      ];
      
      // Helper: převede term { dt_od_date, dt_od_time, dt_do_date, dt_do_time } na { dt_od, dt_do }
      const termToDatetime = (t) => {
        let dod = null;
        if (t.dt_od_date && t.dt_od_time) dod = `${t.dt_od_date} ${t.dt_od_time}:00`;
        else if (t.dt_od_date) dod = `${t.dt_od_date} 00:00:00`;
        let ddo = null;
        if (t.dt_do_date && t.dt_do_time) ddo = `${t.dt_do_date} ${t.dt_do_time}:00`;
        else if (t.dt_do_date) ddo = `${t.dt_do_date} 23:59:59`;
        return { dt_od: dod, dt_do: ddo };
      };

      // Pro UDÁLOSTI: všechny termíny jsou rovnocenné, posíláme je jako pole `terminy`.
      // Backend si sám z MIN/MAX dopočítá dt_od/dt_do události (DB triggery).
      // Pro ZPRÁVY používáme formData (klasický interval).
      let dt_od = null;
      let dt_do = null;
      let terminyPayload = [];

      // Vyčistit předchozí validační chyby
      setValidationErrors({});

      // Validace: Název je povinný
      if (!formData.nazev || !formData.nazev.trim()) {
        setValidationErrors({ nazev: 'Název je povinný' });
        return;
      }

      // Validace: Obsah/Popis je povinný
      if (activeTab === 'messages') {
        if (!formData.obsah || !formData.obsah.trim()) {
          setValidationErrors({ obsah: 'Obsah zprávy je povinný' });
          return;
        }
      }
      // Popis události je NEPOVINNÝ (již bez validace)

      // Validace: Alespoň jedna role NEBO jeden uživatel (POKUD NENÍ sendToAll)
      if (!formData.sendToAll && selectedRoles.length === 0 && selectedUsers.length === 0) {
        setValidationErrors({ prijemci: 'Vyberte alespoň jednu roli nebo jednoho uživatele, nebo zaškrtněte "Všem"' });
        return;
      }

      if (activeTab === 'events') {
        const validTerminy = terminy.filter(t => t.dt_od_date && t.dt_od_time);
        if (validTerminy.length === 0) {
          setValidationErrors({ terminy: 'Zadejte alespoň jeden termín s datem a časem od' });
          return;
        }
        terminyPayload = validTerminy.map(t => {
          const mapped = termToDatetime(t);
          return {
            ...(t.id ? { id: t.id } : {}),
            dt_od: mapped.dt_od,
            dt_do: mapped.dt_do,
            poznamka: t.poznamka || null,
            kapacita: t.kapacita !== null && t.kapacita !== undefined && t.kapacita !== '' ? parseInt(t.kapacita) : null
          };
        });
      } else {
        // ZPRÁVY - použij formData
        if (formData.dt_od_date && formData.dt_od_time) {
          dt_od = `${formData.dt_od_date} ${formData.dt_od_time}:00`;
        } else if (formData.dt_od_date) {
          dt_od = `${formData.dt_od_date} 00:00:00`;
        }
        if (formData.dt_do_date && formData.dt_do_time) {
          dt_do = `${formData.dt_do_date} ${formData.dt_do_time}:00`;
        } else if (formData.dt_do_date) {
          dt_do = `${formData.dt_do_date} 23:59:59`;
        }
      }

      const data = {
        nazev: formData.nazev,
        obsah: formData.obsah,
        popis: formData.popis,
        dt_od,
        dt_do,
        prijemci: formData.sendToAll ? [] : prijemci, // 🆕 Pokud sendToAll, poslat prázdné pole
        sendToAll: formData.sendToAll ? 1 : 0, // 🆕 Flag pro backend
        // Pro události: všechny termíny rovnocenně
        ...(activeTab === 'events' ? { terminy: terminyPayload } : {})
      };

      if (activeTab === 'messages') {
        if (editingItem) {
          await planningApi.updateMessage(editingItem.id, data);
          showToast('Zpráva aktualizována', 'success');
        } else {
          await planningApi.createMessage(data);
          showToast('Zpráva vytvořena', 'success');
        }
      } else {
        if (editingItem) {
          await planningApi.updateEvent(editingItem.id, data);
          showToast('Událost aktualizována', 'success');
        } else {
          await planningApi.createEvent(data);
          showToast('Událost vytvořena', 'success');
        }
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('❌ Chyba ukládání:', error);
      // Toast jen pro obecné chyby (network apod.), validace řešena inline
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item) => {
    const currentState = Number(item?.aktivni) === 1 ? 1 : 0;
    const nextState = currentState === 1 ? 0 : 1;

    try {
      if (activeTab === 'messages') {
        await planningApi.setMessageActive(item.id, nextState);
        showToast(nextState === 1 ? 'Zpráva aktivována' : 'Zpráva deaktivována', 'success');
      } else {
        await planningApi.setEventActive(item.id, nextState);
        showToast(nextState === 1 ? 'Událost aktivována' : 'Událost deaktivována', 'success');
      }

      if (nextState === 0 && !includeInactive) {
        setIncludeInactive(true);
      }

      loadData();
    } catch (error) {
      console.error('❌ Chyba změny stavu:', error);
      showToast('Chyba při změně stavu', 'error');
    }
  };

  const openDeleteConfirm = (item) => {
    setConfirmDelete({
      open: true,
      id: item.id,
      type: activeTab,
      name: item.nazev || ''
    });
  };

  const closeDeleteConfirm = () => {
    setConfirmDelete({ open: false, id: null, type: null, name: '' });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id || !confirmDelete.type) {
      closeDeleteConfirm();
      return;
    }

    try {
      if (confirmDelete.type === 'messages') {
        await planningApi.deleteMessage(confirmDelete.id);
        showToast('Zpráva smazána', 'success');
      } else {
        await planningApi.deleteEvent(confirmDelete.id);
        showToast('Událost smazána', 'success');
      }
      loadData();
    } catch (error) {
      console.error('❌ Chyba mazání:', error);
      showToast('Chyba při mazání', 'error');
    } finally {
      closeDeleteConfirm();
    }
  };

  // CustomSelect helper funkce
  const toggleSelect = (field) => {
    setSelectStates(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const filterOptions = (options, searchTerm, field) => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    
    if (field === 'recipients_roles') {
      return options.filter(role => 
        (role.nazev_role || '').toLowerCase().includes(lowerSearch) ||
        (role.kod_role || '').toLowerCase().includes(lowerSearch)
      );
    }
    
    if (field === 'recipients_users') {
      return options.filter(user =>
        (user.jmeno || '').toLowerCase().includes(lowerSearch) ||
        (user.prijmeni || '').toLowerCase().includes(lowerSearch) ||
        (user.email || '').toLowerCase().includes(lowerSearch)
      );
    }
    
    return options;
  };

  const getOptionLabel = (option, field) => {
    if (!option) return '';
    
    if (field === 'recipients_roles') {
      return `${option.nazev_role} (${option.kod_role})`;
    }
    
    if (field === 'recipients_users') {
      return `${option.prijmeni} ${option.jmeno} - ${option.email}`;
    }
    
    return option.label || option.nazev || String(option);
  };

  const formatTooltipDateTime = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    if (isNaN(d)) return String(dt);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  const buildEventDatesTooltip = (item) => {
    // Událost má N rovnocenných termínů. Zobrazujeme pouze ty
    // (dt_od/dt_do události je pouze MIN/MAX agregát dopočtený DB triggery).
    const dates = Array.isArray(item?.terminy) ? item.terminy : [];
    if (dates.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
          📅 Všechny termíny ({dates.length})
        </div>
        {dates.map((term, index) => {
          const od = formatTooltipDateTime(term?.dt_od);
          const doVal = term?.dt_do ? formatTooltipDateTime(term.dt_do) : '';
          const range = doVal ? `${od} - ${doVal}` : od;
          const isFull = term.is_full;
          const acceptedCount = term.accepted_count || 0;
          const kapacita = term.kapacita;
          
          return (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.3rem 0.5rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '4px',
              borderLeft: `3px solid ${isFull ? '#fbbf24' : '#60a5fa'}`
            }}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, minWidth: '1.2rem' }}>
                {index + 1}.
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>
                  {range}
                </div>
                {kapacita > 0 && (
                  <div style={{ color: isFull ? '#fbbf24' : '#94a3b8', fontSize: '0.65rem', marginTop: '0.1rem' }}>
                    {isFull ? '🔴 Obsazeno' : '✅'} {acceptedCount}/{kapacita}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const buildRecipientsTooltip = (item) => {
    const roles = Array.isArray(item?.prijemci_roles) ? item.prijemci_roles : [];
    const users = Array.isArray(item?.prijemci_users) ? item.prijemci_users : [];
    if (roles.length === 0 && users.length === 0) {
      return null;
    }

    // Ostranit email (text za " - " nebo obsahujici "@") a duplicity
    const cleanName = (raw) => {
      if (!raw) return '';
      let str = String(raw);
      // Oddelit email pokud je za " - " nebo " – "
      str = str.split(/\s[-–]\s/)[0];
      // Smazat emaily v textu
      str = str.replace(/\S+@\S+\.\S+/g, '').trim();
      // Smazat koncove oddelovace
      str = str.replace(/[-–—,;]+\s*$/g, '').trim();
      return str;
    };

    const uniqueSorted = (arr) => {
      const set = new Set();
      arr.forEach(v => {
        const c = cleanName(v);
        if (c) set.add(c);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'cs'));
    };

    const cleanedRoles = uniqueSorted(roles);
    const cleanedUsers = uniqueSorted(users);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {cleanedRoles.length > 0 && (
          <div>
            <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              👥 Role ({cleanedRoles.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {cleanedRoles.map((role, idx) => (
                <div key={idx} style={{ 
                  color: '#cbd5e1', 
                  fontSize: '0.72rem', 
                  paddingLeft: '0.8rem',
                  position: 'relative'
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>
                  {role}
                </div>
              ))}
            </div>
          </div>
        )}
        {cleanedUsers.length > 0 && (
          <div>
            <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              👤 Uživatelé ({cleanedUsers.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {cleanedUsers.map((user, idx) => (
                <div key={idx} style={{ 
                  color: '#cbd5e1', 
                  fontSize: '0.72rem', 
                  paddingLeft: '0.8rem',
                  position: 'relative'
                }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>
                  {user}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const formatResponseType = (type) => {
    if (type === 'accepted') return 'Akceptováno';
    if (type === 'declined') return 'Odmítnuto';
    return type || '-';
  };

  const formatResponseDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  const formatTermLabel = (resp) => {
    if (!resp?.dt_od) return 'Termín';
    const start = formatResponseDate(resp.dt_od);
    const end = resp.dt_do ? formatResponseDate(resp.dt_do) : '';
    return end ? `${start} – ${end}` : start;
  };

  // Vyhodnoceni shody terminu - kolik uzivatelu akceptovalo ktery termin
  const buildTermAgreement = (item, responses) => {
    const terms = Array.isArray(item?.terminy) ? item.terminy : [];
    if (terms.length === 0) return [];
    const acceptedByTerm = new Map();
    const declinedByTerm = new Map();
    (responses || []).forEach(r => {
      const tid = Number(r.termin_id);
      if (!tid) return;
      if (r.typ_odpovedi === 'accepted') {
        acceptedByTerm.set(tid, (acceptedByTerm.get(tid) || 0) + 1);
      } else if (r.typ_odpovedi === 'declined') {
        declinedByTerm.set(tid, (declinedByTerm.get(tid) || 0) + 1);
      }
    });
    const rows = terms.map(t => ({
      termin_id: Number(t.id),
      dt_od: t.dt_od,
      dt_do: t.dt_do,
      kapacita: t.kapacita !== null && t.kapacita !== undefined ? Number(t.kapacita) : null,
      accepted: acceptedByTerm.get(Number(t.id)) || 0,
      declined: declinedByTerm.get(Number(t.id)) || 0
    }));
    const maxAccepted = rows.reduce((m, r) => Math.max(m, r.accepted), 0);
    rows.forEach(r => { r.isWinner = maxAccepted > 0 && r.accepted === maxAccepted; });
    // Seradit podle datumu terminu (dt_od) vzestupne
    rows.sort((a, b) => {
      const ta = a.dt_od ? new Date(a.dt_od).getTime() : 0;
      const tb = b.dt_od ? new Date(b.dt_od).getTime() : 0;
      return ta - tb;
    });
    return rows;
  };

  const toggleExpandEvent = (id) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentData = activeTab === 'messages' ? messages : events;

  if (!hasPermission('PLANNING_MANAGE')) {
    return (
      <PageContainer>
        <EmptyState>
          <FontAwesomeIcon icon={faCalendarAlt} size="3x" style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <div>Nemáte oprávnění ke správě plánování</div>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TitlePanel>
        <PageTitle>
          <FontAwesomeIcon icon={faCalendarAlt} />
          Správa plánování a rezervací
        </PageTitle>
      </TitlePanel>

      <TabContainer>
        <TabHeader>
          <Tab $active={activeTab === 'events'} onClick={() => setActiveTab('events')}>
            <FontAwesomeIcon icon={faCalendarAlt} />
            Kalendářové události
          </Tab>
          <Tab $active={activeTab === 'messages'} onClick={() => setActiveTab('messages')}>
            <FontAwesomeIcon icon={faMessage} />
            Dashboard zprávy
          </Tab>
        </TabHeader>

        <ContentArea>
          <ActionBar>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {activeTab === 'events' && (
                <Button $variant="secondary" onClick={() => setShowAllEventsCalendar(true)}>
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  Kalendář všech událostí
                </Button>
              )}
              <Button onClick={handleCreate}>
                <FontAwesomeIcon icon={faPlus} />
                {activeTab === 'messages' ? 'Nová zpráva' : 'Nová událost'}
              </Button>
            </div>
          </ActionBar>

          <SearchPanel>
            <SearchPanelHeader>
              <SearchPanelTitle>
                <FontAwesomeIcon icon={faSearch} />
                Filtry a vyhledávání
              </SearchPanelTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ToggleLabel>
                  Zobrazit neaktivní
                  <ToggleSwitch>
                    <ToggleSwitchInput
                      type="checkbox"
                      checked={includeInactive}
                      onChange={(e) => setIncludeInactive(e.target.checked)}
                    />
                    <ToggleSwitchSlider />
                  </ToggleSwitch>
                </ToggleLabel>
                <ClearAllButton onClick={handleClearFilters}>
                  <FontAwesomeIcon icon={faEraser} />
                  Vymazat filtry
                </ClearAllButton>
              </div>
            </SearchPanelHeader>
            <SearchInputWrapper>
              <FontAwesomeIcon icon={faSearch} />
              <SearchInput
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hledat v názvu a textu..."
              />
              {searchTerm && (
                <SearchClearButton onClick={() => setSearchTerm('')}>
                  <FontAwesomeIcon icon={faTimes} />
                </SearchClearButton>
              )}
            </SearchInputWrapper>
          </SearchPanel>

          {loading ? (
            <EmptyState>Načítání...</EmptyState>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow className="header-row">
                    <TableHeader style={{ width: '36px', textAlign: 'center' }}>
                      {activeTab === 'events' && (() => {
                        const eventsWithResponses = events.filter(ev => (eventResponses[ev.id] || []).length > 0);
                        if (eventsWithResponses.length === 0) return null;
                        const anyExpanded = eventsWithResponses.some(ev => expandedEvents.has(ev.id));
                        const toggleAll = () => {
                          setExpandedEvents(prev => {
                            if (anyExpanded) {
                              // sbalit vse
                              const next = new Set(prev);
                              eventsWithResponses.forEach(ev => next.delete(ev.id));
                              return next;
                            }
                            // rozbalit vse
                            const next = new Set(prev);
                            eventsWithResponses.forEach(ev => next.add(ev.id));
                            return next;
                          });
                        };
                        return (
                          <IconButton
                            onClick={toggleAll}
                            title={anyExpanded ? 'Sbalit vše' : 'Rozbalit vše'}
                          >
                            <FontAwesomeIcon icon={anyExpanded ? faMinus : faPlus} />
                          </IconButton>
                        );
                      })()}
                    </TableHeader>
                    <SortableHeader
                      onClick={() => handleSort('nazev')}
                    >
                      Název{sortIcon('nazev')}
                    </SortableHeader>
                    <SortableHeader
                      onClick={() => handleSort('organizator')}
                    >
                      Organizátor{sortIcon('organizator')}
                    </SortableHeader>
                    <SortableHeader
                      onClick={() => handleSort(activeTab === 'messages' ? 'obsah' : 'popis')}
                    >
                      {activeTab === 'messages' ? 'Obsah' : 'Popis'}{sortIcon(activeTab === 'messages' ? 'obsah' : 'popis')}
                    </SortableHeader>
                    <SortableHeader
                      onClick={() => handleSort('dt_od')}
                    >
                      Datum od{sortIcon('dt_od')}
                    </SortableHeader>
                    <SortableHeader
                      onClick={() => handleSort('dt_do')}
                    >
                      Datum do{sortIcon('dt_do')}
                    </SortableHeader>
                    {activeTab === 'events' && <TableHeader className="center">Kapacita</TableHeader>}
                    <TableHeader className="center">Příjemci</TableHeader>
                    {activeTab === 'events' && <TableHeader className="center">Reakce</TableHeader>}
                    <TableHeader>
                      <FontAwesomeIcon icon={faBolt} style={{ color: '#f59e0b', fontSize: '0.95rem' }} />
                    </TableHeader>
                  </TableRow>
                  <TableRow className="filter-row">
                    <TableHeader className="filter-cell" />
                    <TableHeader className="filter-cell">
                      <div className="text-filter-wrapper">
                        <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                        <input
                          type="text"
                          className="filter-input"
                          placeholder="Název..."
                          value={columnFilters.nazev}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, nazev: e.target.value }))}
                        />
                        {columnFilters.nazev && (
                          <button
                            className="filter-clear"
                            onClick={() => setColumnFilters(prev => ({ ...prev, nazev: '' }))}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </div>
                    </TableHeader>
                    <TableHeader className="filter-cell">
                      <div className="text-filter-wrapper">
                        <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                        <input
                          type="text"
                          className="filter-input"
                          placeholder="Organizátor..."
                          value={columnFilters.organizator || ''}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, organizator: e.target.value }))}
                        />
                        {columnFilters.organizator && (
                          <button
                            className="filter-clear"
                            onClick={() => setColumnFilters(prev => ({ ...prev, organizator: '' }))}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </div>
                    </TableHeader>
                    <TableHeader className="filter-cell">
                      <div className="text-filter-wrapper">
                        <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                        <input
                          type="text"
                          className="filter-input"
                          placeholder={activeTab === 'messages' ? 'Obsah...' : 'Popis...'}
                          value={columnFilters.text}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, text: e.target.value }))}
                        />
                        {columnFilters.text && (
                          <button
                            className="filter-clear"
                            onClick={() => setColumnFilters(prev => ({ ...prev, text: '' }))}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </div>
                    </TableHeader>
                    <TableHeader className="filter-cell">
                      <div className="date-filter-wrapper">
                        <DatePicker
                          fieldName="filter_dt_od"
                          value={columnFilters.dt_od}
                          onChange={(value) => setColumnFilters(prev => ({ ...prev, dt_od: value }))}
                          placeholder="Datum od"
                          variant="compact"
                        />
                      </div>
                    </TableHeader>
                    <TableHeader className="filter-cell">
                      <div className="date-filter-wrapper">
                        <DatePicker
                          fieldName="filter_dt_do"
                          value={columnFilters.dt_do}
                          onChange={(value) => setColumnFilters(prev => ({ ...prev, dt_do: value }))}
                          placeholder="Datum do"
                          variant="compact"
                        />
                      </div>
                    </TableHeader>
                    {activeTab === 'events' && <TableHeader className="filter-cell" />}
                    <TableHeader className="filter-cell" />
                    {activeTab === 'events' && <TableHeader className="filter-cell" />}
                    <TableHeader className="filter-cell" />
                  </TableRow>
                </TableHead>
                <tbody>
                  {currentData.length === 0 ? (
                    <TableRow>
                      <TableCell className="center" colSpan={activeTab === 'events' ? 10 : 8}>
                        {activeTab === 'messages' ? 'Žádné zprávy' : 'Žádné události'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentData.map((item) => {
                      const extraTermCount = activeTab === 'events' && Array.isArray(item.terminy) ? item.terminy.length : 0;
                      const previewHtml = activeTab === 'messages' ? item.obsah : item.popis;
                      const isActive = Number(item.aktivni) === 1;
                      
                      // ✅ Kontrola, zda má událost nějaký plný termín
                      const hasFullTerm = activeTab === 'events' && Array.isArray(item.terminy) && item.terminy.some(t => t.is_full === true);
                      
                      // ✅ Row style s červeným pozadím pro plné termíny
                      let rowStyle = isActive ? {} : { opacity: 0.65, color: '#94a3b8' };
                      if (hasFullTerm) {
                        rowStyle = { ...rowStyle, backgroundColor: '#fee2e2' };
                      }
                      
                      const cellStyle = isActive ? undefined : { color: '#94a3b8' };
                      const toggleIconColor = isActive ? '#065f46' : '#9ca3af';
                      const recipientsTooltip = buildRecipientsTooltip(item);
                      const rolesCount = Array.isArray(item?.prijemci_roles) ? item.prijemci_roles.length : 0;
                      const usersCount = Array.isArray(item?.prijemci_users) ? item.prijemci_users.length : 0;
                      const fallbackRecipientsCount = rolesCount + usersCount;
                      const numericRecipientsCount = Number.isFinite(Number(item.pocet_prijemcu))
                        ? Number(item.pocet_prijemcu)
                        : 0;
                      const recipientsCount = fallbackRecipientsCount > 0
                        ? fallbackRecipientsCount
                        : numericRecipientsCount;
                      const responses = activeTab === 'events' ? (eventResponses[item.id] || []) : [];
                      const responsesCount = responses.length;
                      const acceptedCount = responses.filter(r => r.typ_odpovedi === 'accepted').length;
                      const declinedCount = responses.filter(r => r.typ_odpovedi === 'declined').length;
                      const isExpanded = expandedEvents.has(item.id);
                      const agreement = activeTab === 'events' ? buildTermAgreement(item, responses) : [];
                      const colCount = activeTab === 'events' ? 10 : 8;
                      return (
                        <React.Fragment key={item.id}>
                          <TableRow style={rowStyle}>
                            <TableCell className="center" style={{ width: '36px', padding: '0.25rem' }}>
                              {activeTab === 'events' && responsesCount > 0 && (
                                <IconButton
                                  onClick={() => toggleExpandEvent(item.id)}
                                  title={isExpanded ? 'Sbalit' : 'Rozbalit'}
                                >
                                  <FontAwesomeIcon icon={isExpanded ? faMinus : faPlus} />
                                </IconButton>
                              )}
                            </TableCell>
                            <TableCell style={cellStyle}>
                              {activeTab === 'events' && (
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const popupWidth = Math.min(860, window.innerWidth - 40);
                                    const popupHeight = Math.min(500, window.innerHeight - 100);
                                    const margin = 20;
                                    const headerHeight = 80; // Výška hlavičky stránky
                                    
                                    let top = rect.bottom + window.scrollY + 8;
                                    let left = rect.left + window.scrollX;
                                    
                                    // Horizontální pozice - vycentruj pokud je ikona moc vlevo
                                    if (left + popupWidth > window.innerWidth - margin) {
                                      left = Math.max(margin, window.innerWidth - popupWidth - margin);
                                    }
                                    if (left < margin) {
                                      left = margin;
                                    }
                                    
                                    // Vertikální pozice
                                    const spaceBelow = window.innerHeight + window.scrollY - rect.bottom;
                                    const spaceAbove = rect.top + window.scrollY - headerHeight;
                                    
                                    if (spaceBelow < popupHeight + margin && spaceAbove > spaceBelow) {
                                      // Zobraz nad ikonou
                                      top = Math.max(
                                        window.scrollY + headerHeight + margin,
                                        rect.top + window.scrollY - popupHeight - 8
                                      );
                                    } else {
                                      // Zobraz pod ikonou
                                      top = Math.max(
                                        window.scrollY + headerHeight + margin,
                                        Math.min(top, window.scrollY + window.innerHeight - popupHeight - margin)
                                      );
                                    }
                                    
                                    setPopupPosition({ top, left, width: popupWidth, height: popupHeight });
                                    setCalendarPopupEvent(item);
                                  }}
                                  title="Zobrazit v kalendáři"
                                  style={{ marginRight: '0.5rem', color: '#3b82f6' }}
                                >
                                  <FontAwesomeIcon icon={faCalendarAlt} />
                                </IconButton>
                              )}
                              <strong>{item.nazev}</strong>
                            </TableCell>
                            <TableCell style={cellStyle}>
                              <div style={{ fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.15rem' }}>
                                  {item.autor_prijmeni && item.autor_jmeno
                                    ? `${item.autor_prijmeni} ${item.autor_jmeno}`
                                    : (item.autor_jmeno || item.autor_prijmeni || '—')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {item.dt_created ? prettyDate(item.dt_created) : '—'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell style={cellStyle}>
                              {previewHtml ? (
                                <SmartTooltip
                                  text={
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                                        📝 {activeTab === 'messages' ? 'Obsah zprávy' : 'Popis události'}
                                      </div>
                                      <HtmlTooltipContent dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                    </div>
                                  }
                                  icon="none"
                                  multiline
                                  preferredPosition="right"
                                  maxWidth="500px"
                                  interactive={true}
                                >
                                  <HtmlPreviewBox style={{ cursor: 'help' }}>
                                    <HtmlPreviewContent style={cellStyle} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                  </HtmlPreviewBox>
                                </SmartTooltip>
                              ) : (
                                <HtmlPreviewBox>
                                  <HtmlPreviewEmpty>—</HtmlPreviewEmpty>
                                </HtmlPreviewBox>
                              )}
                            </TableCell>
                            <TableCell style={cellStyle}>
                              {item.dt_od ? prettyDate(item.dt_od) : '-'}
                              {extraTermCount > 0 && (
                                <SmartTooltip
                                  text={buildEventDatesTooltip(item)}
                                  icon="none"
                                  multiline
                                  preferredPosition="right"
                                  maxWidth="350px"
                                  interactive={true}
                                >
                                  <Badge $type="role" style={{ marginLeft: '0.5rem' }}>
                                    +{extraTermCount}
                                  </Badge>
                                </SmartTooltip>
                              )}
                            </TableCell>
                            <TableCell style={cellStyle}>{item.dt_do ? prettyDate(item.dt_do) : '-'}</TableCell>
                            {activeTab === 'events' && (
                              <TableCell className="center">
                                {(() => {
                                  const accepted = parseInt(item.accepted_count) || 0;
                                  const maxKap = item.max_kapacita;
                                  const isFull = maxKap && accepted >= maxKap;
                                  const badgeColor = isFull ? '#dc2626' : (maxKap ? '#3b82f6' : '#64748b');
                                  const displayText = maxKap ? `${accepted}/${maxKap}` : `${accepted}/∞`;
                                  
                                  const tooltipJSX = (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700 }}>
                                        📊 Kapacita události
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <span style={{ 
                                            width: '14px', 
                                            height: '14px', 
                                            borderRadius: '3px', 
                                            background: '#dc2626',
                                            display: 'inline-block'
                                          }} />
                                          <span style={{ color: '#fca5a5', fontSize: '0.72rem' }}>
                                            Obsazeno (kapacita naplněna)
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <span style={{ 
                                            width: '14px', 
                                            height: '14px', 
                                            borderRadius: '3px', 
                                            background: '#3b82f6',
                                            display: 'inline-block'
                                          }} />
                                          <span style={{ color: '#93c5fd', fontSize: '0.72rem' }}>
                                            Volná místa
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <span style={{ 
                                            width: '14px', 
                                            height: '14px', 
                                            borderRadius: '3px', 
                                            background: '#64748b',
                                            display: 'inline-block'
                                          }} />
                                          <span style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>
                                            Neomezená kapacita (∞)
                                          </span>
                                        </div>
                                      </div>
                                      <div style={{ 
                                        borderTop: '1px solid rgba(255,255,255,0.2)', 
                                        paddingTop: '0.4rem',
                                        color: '#94a3b8',
                                        fontSize: '0.7rem'
                                      }}>
                                        <strong style={{ color: '#cbd5e1' }}>Aktuálně:</strong> {accepted} akceptováno {maxKap ? `z ${maxKap}` : '(neomezeno)'}
                                      </div>
                                    </div>
                                  );
                                  
                                  return (
                                    <SmartTooltip 
                                      text={tooltipJSX} 
                                      icon="none" 
                                      multiline 
                                      preferredPosition="right"
                                      maxWidth="280px"
                                      interactive={true}
                                    >
                                      <Badge $type="user" style={{ background: badgeColor, color: 'white' }}>
                                        {displayText}
                                      </Badge>
                                    </SmartTooltip>
                                  );
                                })()}
                              </TableCell>
                            )}
                            <TableCell className="center">
                              {recipientsTooltip ? (
                                <SmartTooltip
                                  text={recipientsTooltip}
                                  icon="none"
                                  multiline
                                  preferredPosition="right"
                                  maxWidth="300px"
                                  interactive={true}
                                >
                                  <Badge $type="user">{recipientsCount}</Badge>
                                </SmartTooltip>
                              ) : (
                                <Badge $type="user">{recipientsCount}</Badge>
                              )}
                            </TableCell>
                            {activeTab === 'events' && (
                              <TableCell className="center">
                                {responsesCount === 0 ? (
                                  <Badge $type="user" style={{ opacity: 0.5 }}>0</Badge>
                                ) : (
                                  <div style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                                    {(() => {
                                      const uniqueUsers = Array.from(new Map(
                                        responses.map(r => [r.user_id, `${(r.prijmeni || '').trim()} ${(r.jmeno || '').trim()}`.trim() || `Uživatel #${r.user_id}`])
                                      ).values()).sort((a, b) => a.localeCompare(b, 'cs'));
                                      const winners = agreement.filter(a => a.isWinner && a.accepted > 0);
                                      const fmtShort = (dt) => {
                                        if (!dt) return '';
                                        const d = new Date(dt);
                                        if (isNaN(d)) return String(dt);
                                        const dd = String(d.getDate()).padStart(2, '0');
                                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                                        const hh = String(d.getHours()).padStart(2, '0');
                                        const mi = String(d.getMinutes()).padStart(2, '0');
                                        return `${dd}.${mm}. ${hh}:${mi}`;
                                      };
                                      const winnerLines = winners.map(w => {
                                        const od = fmtShort(w.dt_od);
                                        const doo = w.dt_do ? fmtShort(w.dt_do) : '';
                                        const range = doo ? `${od}–${doo}` : od;
                                        return `🏆 ${range} (${w.accepted}×)`;
                                      });
                                      const tooltipJSX = (winnerLines.length > 0 || uniqueUsers.length > 0) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                          {winnerLines.length > 0 && (
                                            <div>
                                              <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                                                🏆 Nejvíce akceptováno
                                              </div>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                {winners.map((w, idx) => {
                                                  const od = formatTooltipDateTime(w.dt_od);
                                                  const doVal = w.dt_do ? formatTooltipDateTime(w.dt_do) : '';
                                                  const range = doVal ? `${od} - ${doVal}` : od;
                                                  return (
                                                    <div key={idx} style={{ color: '#fde68a', fontSize: '0.72rem' }}>
                                                      • {range} <span style={{ color: '#fbbf24', fontWeight: 700 }}>({w.accepted}×)</span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                          {uniqueUsers.length > 0 && (
                                            <div>
                                              <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                                                👤 Reagovali ({uniqueUsers.length})
                                              </div>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                {uniqueUsers.map((n, idx) => (
                                                  <div key={idx} style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>
                                                    • {n}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : null;
                                      return tooltipJSX ? (
                                        <SmartTooltip text={tooltipJSX} icon="none" multiline preferredPosition="right" maxWidth="350px" interactive={true}>
                                          <Badge $type="user">{responsesCount}</Badge>
                                        </SmartTooltip>
                                      ) : (
                                        <Badge $type="user">{responsesCount}</Badge>
                                      );
                                    })()}
                                    {acceptedCount > 0 && (
                                      <span title="Akceptováno" style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: 600 }}>
                                        <FontAwesomeIcon icon={faCheckCircle} /> {acceptedCount}
                                      </span>
                                    )}
                                    {declinedCount > 0 && (
                                      <span title="Odmítnuto" style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 600 }}>
                                        <FontAwesomeIcon icon={faTimesCircle} /> {declinedCount}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="center">
                              <IconButton
                                onClick={() => handleToggleActive(item)}
                                title={isActive ? 'Deaktivovat' : 'Aktivovat'}
                              >
                                <FontAwesomeIcon icon={isActive ? faEye : faEyeSlash} style={{ color: toggleIconColor }} />
                              </IconButton>
                              <IconButton onClick={() => handleEdit(item)} title="Upravit">
                                <FontAwesomeIcon icon={faEdit} />
                              </IconButton>
                              <IconButton $variant="danger" onClick={() => openDeleteConfirm(item)} title="Smazat">
                                <FontAwesomeIcon icon={faTrash} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          {activeTab === 'events' && isExpanded && responsesCount > 0 && (
                            <TableRow style={{ background: '#f8fafc' }}>
                              <TableCell colSpan={colCount} style={{ padding: 0 }}>
                                <div style={{ padding: '0.75rem 1rem 0.75rem 3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '3px solid #3b82f6' }}>
                                  {/* Shoda terminu */}
                                  {agreement.length > 0 && (
                                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                        <FontAwesomeIcon icon={faTrophy} style={{ color: '#eab308', marginRight: '0.4rem' }} />
                                        Shoda termínů – nejvíce akceptováno
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {agreement.map((row, idx) => (
                                          <div
                                            key={row.termin_id}
                                            style={{
                                              display: 'flex',
                                              gap: '0.75rem',
                                              alignItems: 'center',
                                              padding: '0.35rem 0.6rem',
                                              borderRadius: '4px',
                                              background: row.isWinner ? '#dcfce7' : '#f8fafc',
                                              border: row.isWinner ? '1px solid #86efac' : '1px solid transparent',
                                              fontSize: '0.8rem'
                                            }}
                                          >
                                            <span style={{ fontWeight: 700, color: '#475569', minWidth: '1.5rem' }}>{idx + 1}.</span>
                                            <span style={{ color: '#1e293b', minWidth: '15rem' }}>
                                              {formatResponseDate(row.dt_od)}{row.dt_do ? ` – ${formatResponseDate(row.dt_do)}` : ''}
                                            </span>
                                            <span style={{ 
                                              fontSize: '0.85rem', 
                                              fontWeight: 600,
                                              color: row.kapacita && row.accepted >= row.kapacita ? '#dc2626' : '#64748b',
                                              minWidth: '4rem',
                                              maxWidth: '4rem'
                                            }}>
                                              {row.kapacita ? `${row.accepted}/${row.kapacita}` : `${row.accepted}/∞`}
                                              {row.kapacita && row.accepted >= row.kapacita && ' 🔴'}
                                            </span>
                                            <span style={{ flex: 1 }} />
                                            {row.isWinner && row.accepted > 0 && (
                                              <Badge $type="role" style={{ background: '#16a34a', color: '#fff' }}>
                                                <FontAwesomeIcon icon={faTrophy} style={{ marginRight: '0.25rem' }} />
                                                NEJVĚTŠÍ SHODA
                                              </Badge>
                                            )}
                                            <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                              <FontAwesomeIcon icon={faCheckCircle} /> {row.accepted}
                                            </span>
                                            <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                              <FontAwesomeIcon icon={faTimesCircle} /> {row.declined}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Seznam odpovedi */}
                                  <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    {(() => {
                                      const sortMode = responsesSort[item.id] || 'type';
                                      const toggleSort = () => setResponsesSort(prev => ({ ...prev, [item.id]: (prev[item.id] === 'type' ? 'name' : 'type') }));
                                      const isName = sortMode === 'name';
                                      const tooltipJSX = (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                          <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {isName ? '🔤 Řazeno podle jména' : '📊 Řazeno podle reakce'}
                                          </div>
                                          <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                            Kliknutím přepnout
                                          </div>
                                        </div>
                                      );
                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                            Reakce ({responsesCount})
                                          </div>
                                          <SmartTooltip text={tooltipJSX} icon="none" preferredPosition="left" maxWidth="200px">
                                            <button
                                              type="button"
                                              onClick={toggleSort}
                                              style={{
                                                background: '#3b82f6',
                                                color: '#fff',
                                                border: '1px solid #3b82f6',
                                                borderRadius: '4px',
                                                padding: '0.25rem 0.45rem',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                lineHeight: 1
                                              }}
                                            >
                                              <FontAwesomeIcon icon={isName ? faSortAlphaDown : faFilter} />
                                            </button>
                                          </SmartTooltip>
                                        </div>
                                      );
                                    })()}
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                      <thead>
                                        <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                                          <th style={{ textAlign: 'left', padding: '0.35rem 0.6rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Uživatel</th>
                                          <th style={{ textAlign: 'left', padding: '0.35rem 0.6rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Odpověď</th>
                                          <th style={{ textAlign: 'left', padding: '0.35rem 0.6rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Datum odpovědi</th>
                                          <th style={{ textAlign: 'left', padding: '0.35rem 0.6rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Termín</th>
                                          <th style={{ textAlign: 'left', padding: '0.35rem 0.6rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Poznámka</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(() => {
                                          const sortMode = responsesSort[item.id] || 'type';
                                          const sorted = [...responses].sort((a, b) => {
                                            if (sortMode === 'type') {
                                              // accepted -> declined -> jine; pak jmeno
                                              const order = { accepted: 0, declined: 1 };
                                              const oa = order[a.typ_odpovedi] ?? 2;
                                              const ob = order[b.typ_odpovedi] ?? 2;
                                              if (oa !== ob) return oa - ob;
                                            }
                                            const na = `${(a.prijmeni || '').trim()} ${(a.jmeno || '').trim()}`.trim().toLowerCase();
                                            const nb = `${(b.prijmeni || '').trim()} ${(b.jmeno || '').trim()}`.trim().toLowerCase();
                                            return na.localeCompare(nb, 'cs');
                                          });
                                          return sorted.map((resp, idx) => {
                                          const isAccepted = resp.typ_odpovedi === 'accepted';
                                          const isDeclined = resp.typ_odpovedi === 'declined';
                                          const rowBg = isAccepted ? '#dcfce7' : (isDeclined ? '#fef2f2' : '#ffffff');
                                          const respColor = isAccepted ? '#15803d' : (isDeclined ? '#b91c1c' : '#475569');
                                          const tdStyle = { padding: '0.35rem 0.6rem', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' };
                                          return (
                                            <tr key={`${item.id}-${resp.user_id}-${resp.termin_id}-${idx}`} style={{ background: rowBg }}>
                                              <td style={{ ...tdStyle, color: '#1f2937' }}>
                                                <div style={{ fontWeight: 600 }}>
                                                  {(resp.prijmeni || '').trim()} {(resp.jmeno || '').trim()}
                                                </div>
                                                {(resp.email || resp.telefon) && (
                                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                    {resp.email && (
                                                      <a href={`mailto:${resp.email}`} style={{ color: '#64748b', textDecoration: 'none' }}>
                                                        ✉ {resp.email}
                                                      </a>
                                                    )}
                                                    {resp.telefon && (
                                                      <a href={`tel:${resp.telefon}`} style={{ color: '#64748b', textDecoration: 'none' }}>
                                                        ☎ {resp.telefon}
                                                      </a>
                                                    )}
                                                  </div>
                                                )}
                                              </td>
                                              <td style={{ ...tdStyle, color: respColor, fontWeight: 600 }}>
                                                <FontAwesomeIcon icon={isAccepted ? faCheckCircle : (isDeclined ? faTimesCircle : faCalendarAlt)} style={{ marginRight: '0.3rem' }} />
                                                {formatResponseType(resp.typ_odpovedi)}
                                              </td>
                                              <td style={{ ...tdStyle, color: '#64748b' }}>{formatResponseDate(resp.dt_odpovedi)}</td>
                                              <td style={{ ...tdStyle, color: '#334155' }}>{formatTermLabel(resp)}</td>
                                              <td style={{ ...tdStyle, color: '#334155', fontStyle: resp.poznamka ? 'italic' : 'normal' }}>
                                                {resp.poznamka ? `„${resp.poznamka}"` : '—'}
                                              </td>
                                            </tr>
                                          );
                                        });
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </Table>

              {totalItems > 0 && (
                <PaginationContainer>
                  <PaginationInfo>
                    Zobrazeno {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, totalItems)} z {totalItems.toLocaleString('cs-CZ')} {activeTab === 'messages' ? 'zpráv' : 'událostí'}
                  </PaginationInfo>
                  <PaginationControls>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '0.5rem' }}>
                      Zobrazit:
                    </span>
                    <PageSizeSelect
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value, 10))}
                      disabled={loading}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </PageSizeSelect>

                    <PageButton
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1 || loading}
                      title="První stránka"
                    >
                      ««
                    </PageButton>

                    <PageButton
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || loading}
                      title="Předchozí stránka"
                    >
                      ‹
                    </PageButton>

                    <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0.75rem' }}>
                      Stránka {currentPage} z {Math.max(totalPages, 1)}
                    </span>

                    <PageButton
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages || loading}
                      title="Další stránka"
                    >
                      ›
                    </PageButton>

                    <PageButton
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage >= totalPages || loading}
                      title="Poslední stránka"
                    >
                      ››
                    </PageButton>
                  </PaginationControls>
                </PaginationContainer>
              )}
            </TableContainer>
          )}
        </ContentArea>
      </TabContainer>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={closeDeleteConfirm}
        onConfirm={executeDelete}
        title="Opravdu chcete smazat?"
        message={
          `${confirmDelete.type === 'messages' ? 'Zpráva' : 'Událost'}` +
          `${confirmDelete.name ? ` "${confirmDelete.name}"` : ''} bude smazána.`
        }
        icon={faExclamationTriangle}
        variant="danger"
        cancelText="Zrušit"
        confirmText="Smazat"
      />

      {/* Modal pro vytváření/editaci */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <ModalOverlay $fullScreen={isModalFullScreen}>
          <ModalContent $fullScreen={isModalFullScreen}>
            <ModalHeader>
              <ModalTitle>
                <h3>
                  {editingItem ? 'Upravit' : 'Vytvořit'} {activeTab === 'messages' ? 'zprávu' : 'událost'}
                </h3>
                <p>Vyplňte požadované informace</p>
              </ModalTitle>
              <HeaderActions>
                <CloseBtn type="button" onClick={() => setIsModalFullScreen(prev => !prev)} title={isModalFullScreen ? 'Zmenšit' : 'Fullscreen'}>
                  <FontAwesomeIcon icon={isModalFullScreen ? faCompress : faExpand} />
                </CloseBtn>
                <CloseBtn type="button" onClick={() => setModalOpen(false)} title="Zavřít">
                  <FontAwesomeIcon icon={faTimes} />
                </CloseBtn>
              </HeaderActions>
            </ModalHeader>

            <ModalBody>
              <FormGroup>
                <Label>Název *</Label>
                <Input
                  type="text"
                  value={formData.nazev}
                  onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
                  placeholder="Zadejte název"
                  required
                  $hasError={!!validationErrors.nazev}
                />
                {validationErrors.nazev && (
                  <ValidationError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    {validationErrors.nazev}
                  </ValidationError>
                )}
              </FormGroup>

              <FormGroup>
                <Label>{editorLabel}</Label>
                <EditorContainer $hasError={!!validationErrors[editorField]}>
                  <EditorToolbar>
                    <EditorGroup>
                      <EditorButton type="button" onClick={() => applyEditorCommand('bold')} title="Tučné">
                        <FontAwesomeIcon icon={faBold} />
                      </EditorButton>
                      <EditorButton type="button" onClick={() => applyEditorCommand('italic')} title="Kurzíva">
                        <FontAwesomeIcon icon={faItalic} />
                      </EditorButton>
                      <EditorButton type="button" onClick={() => applyEditorCommand('underline')} title="Podtržení">
                        <FontAwesomeIcon icon={faUnderline} />
                      </EditorButton>
                      <EditorButton type="button" onClick={() => applyEditorCommand('insertUnorderedList')} title="Seznam">
                        <FontAwesomeIcon icon={faListUl} />
                      </EditorButton>
                      <EditorButton type="button" onClick={() => applyEditorCommand('insertOrderedList')} title="Číslovaný seznam">
                        <FontAwesomeIcon icon={faListOl} />
                      </EditorButton>
                      <EditorButton type="button" onClick={handleInsertLink} title="Vložit odkaz">
                        <FontAwesomeIcon icon={faLink} />
                      </EditorButton>
                      <EditorButton type="button" onClick={() => applyEditorCommand('unlink')} title="Odebrat odkaz">
                        <FontAwesomeIcon icon={faUnlink} />
                      </EditorButton>
                    </EditorGroup>
                    <EditorGroup>
                      <EditorButton
                        type="button"
                        onClick={() => setIsHtmlView(prev => !prev)}
                        title={isHtmlView ? 'Zpět na editor' : 'HTML kód'}
                        $active={isHtmlView}
                      >
                        <FontAwesomeIcon icon={faCode} />
                      </EditorButton>
                    </EditorGroup>
                  </EditorToolbar>
                  {isHtmlView ? (
                    <EditorSource
                      value={editorValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, [editorField]: e.target.value }))}
                      placeholder={editorSourcePlaceholder}
                    />
                  ) : (
                    <EditorArea
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorInput}
                      data-placeholder={editorPlaceholder}
                      suppressContentEditableWarning
                    />
                  )}
                </EditorContainer>
                {validationErrors[editorField] && (
                  <ValidationError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    {validationErrors[editorField]}
                  </ValidationError>
                )}
              </FormGroup>

              {activeTab === 'events' ? (
                <>
                  <Label>Termíny ({terminy.length})</Label>
                  <TerminyList>
                    {terminy.map((t, idx) => {
                      const hasError = validationErrors.terminy && (!t.dt_od_date || !t.dt_od_time);
                      return (
                      <TerminRow key={idx}>
                        <div>
                          <Label><TerminIndexBadge>{idx + 1}</TerminIndexBadge>Datum od</Label>
                          <DateTimeWrapper $hasValue={!!t.dt_od_date} $error={hasError}>
                            <DatePicker
                              value={t.dt_od_date}
                              onChange={(newDate) => updateTermin(idx, 'dt_od_date', newDate)}
                              placeholder="Datum"
                            />
                          </DateTimeWrapper>
                        </div>
                        <div>
                          <Label>Čas od</Label>
                          <DateTimeWrapper $hasValue={!!t.dt_od_time} $error={hasError}>
                            <TimePicker
                              value={t.dt_od_time}
                              onChange={(newTime) => updateTermin(idx, 'dt_od_time', newTime)}
                              onTimeComplete={(newTime) => completeTerminTime(idx, 'dt_od_time', newTime)}
                              placeholder="Čas"
                            />
                          </DateTimeWrapper>
                        </div>
                        <div>
                          <Label>Datum do</Label>
                          <DateTimeWrapper $hasValue={!!t.dt_do_date}>
                            <DatePicker
                              value={t.dt_do_date}
                              onChange={(newDate) => updateTermin(idx, 'dt_do_date', newDate)}
                              placeholder="Datum"
                            />
                          </DateTimeWrapper>
                        </div>
                        <div>
                          <Label>Čas do</Label>
                          <DateTimeWrapper $hasValue={!!t.dt_do_time}>
                            <TimePicker
                              value={t.dt_do_time}
                              onChange={(newTime) => updateTermin(idx, 'dt_do_time', newTime)}
                              placeholder="Čas"
                            />
                          </DateTimeWrapper>
                        </div>
                        <div>
                          <Label>Kapacita</Label>
                          <SmartTooltip 
                            text={
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 700 }}>
                                  ℹ️ Kapacita termínu
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>
                                  Prázdné nebo 0 = neomezeno
                                </div>
                              </div>
                            } 
                            icon="none" 
                            preferredPosition="right"
                            maxWidth="200px"
                          >
                            <Input
                              type="number"
                              min="0"
                              value={t.kapacita ?? ''}
                              onChange={(e) => updateTermin(idx, 'kapacita', e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="0"
                              style={{ width: '5rem', textAlign: 'right' }}
                            />
                          </SmartTooltip>
                        </div>
                        <TerminRemoveBtn
                          type="button"
                          onClick={() => removeTermin(idx)}
                          disabled={terminy.length <= 1}
                          title="Odebrat termín"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </TerminRemoveBtn>
                      </TerminRow>
                      );
                    })}
                  </TerminyList>
                  {validationErrors.terminy && (
                    <ValidationError>
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                      {validationErrors.terminy}
                    </ValidationError>
                  )}
                  <TerminAddBtn type="button" onClick={addTermin}>
                    <FontAwesomeIcon icon={faPlus} />
                    Přidat další termín
                  </TerminAddBtn>
                </>
              ) : (
                <FormRow>
                  <div>
                    <Label>Datum od</Label>
                    <DateTimeWrapper $hasValue={!!formData.dt_od_date}>
                      <DatePicker
                        value={formData.dt_od_date}
                        onChange={(newDate) => setFormData(prev => ({ ...prev, dt_od_date: newDate }))}
                        placeholder="Vyberte datum"
                      />
                    </DateTimeWrapper>
                  </div>
                  <div>
                    <Label>Čas od</Label>
                    <DateTimeWrapper $hasValue={!!formData.dt_od_time}>
                      <TimePicker
                        value={formData.dt_od_time}
                        onChange={(newTime) => setFormData(prev => ({ ...prev, dt_od_time: newTime }))}
                        onTimeComplete={(newTime) => {
                          // Auto-fill DO +60min teprve po výběru minut (kompletní čas)
                          setFormData(prev => {
                            const nf = { ...prev, dt_od_time: newTime };
                            if (newTime && prev.dt_od_date && !prev.dt_do_date && !prev.dt_do_time) {
                              const plus = addMinutesToDateTime(prev.dt_od_date, newTime, 60);
                              nf.dt_do_date = plus.date;
                              nf.dt_do_time = plus.time;
                            }
                            return nf;
                          });
                        }}
                        placeholder="Vyberte čas"
                      />
                    </DateTimeWrapper>
                  </div>
                  <div>
                    <Label>Datum do</Label>
                    <DateTimeWrapper $hasValue={!!formData.dt_do_date}>
                      <DatePicker
                        value={formData.dt_do_date}
                        onChange={(newDate) => setFormData({ ...formData, dt_do_date: newDate })}
                        placeholder="Vyberte datum"
                      />
                    </DateTimeWrapper>
                  </div>
                  <div>
                    <Label>Čas do</Label>
                    <DateTimeWrapper $hasValue={!!formData.dt_do_time}>
                      <TimePicker
                        value={formData.dt_do_time}
                        onChange={(newTime) => setFormData({ ...formData, dt_do_time: newTime })}
                        placeholder="Vyberte čas"
                      />
                    </DateTimeWrapper>
                  </div>
                </FormRow>
              )}

              <RecipientsRow>
                <FormGroup>
                  <Label>Role (příjemci)</Label>
                  <div style={validationErrors.prijemci ? { border: '2px solid #dc2626', borderRadius: '6px' } : {}}>
                    <CustomSelect
                      value={selectedRoles}
                      onChange={(newValues) => setSelectedRoles(newValues)}
                      options={availableRoles}
                      placeholder="-- Vyberte role --"
                      field="recipients_roles"
                      multiple={true}
                      selectStates={selectStates}
                      setSelectStates={setSelectStates}
                      searchStates={searchStates}
                      setSearchStates={setSearchStates}
                      touchedSelectFields={touchedSelectFields}
                      setTouchedSelectFields={setTouchedSelectFields}
                      toggleSelect={toggleSelect}
                      filterOptions={filterOptions}
                      getOptionLabel={getOptionLabel}
                      enableSearch={true}
                      disabled={formData.sendToAll}
                    />
                  </div>
                </FormGroup>

                <FormGroup>
                  <Label>Konkrétní uživatelé (příjemci)</Label>
                  <div style={validationErrors.prijemci ? { border: '2px solid #dc2626', borderRadius: '6px' } : {}}>
                    <CustomSelect
                      value={selectedUsers}
                      onChange={(newValues) => setSelectedUsers(newValues)}
                      options={availableUsers}
                      placeholder="-- Vyberte uživatele --"
                      field="recipients_users"
                      multiple={true}
                      selectStates={selectStates}
                      setSelectStates={setSelectStates}
                      searchStates={searchStates}
                      setSearchStates={setSearchStates}
                      touchedSelectFields={touchedSelectFields}
                      setTouchedSelectFields={setTouchedSelectFields}
                      toggleSelect={toggleSelect}
                      filterOptions={filterOptions}
                      getOptionLabel={getOptionLabel}
                      enableSearch={true}
                      disabled={formData.sendToAll}
                    />
                  </div>
                </FormGroup>

                <SendToAllCheckbox>
                  <SendToAllLabel
                    onClick={() => {
                      const newValue = !formData.sendToAll;
                      setFormData({ ...formData, sendToAll: newValue });
                      if (newValue) {
                        // Vyčistit výběr rolí a uživatelů
                        setSelectedRoles([]);
                        setSelectedUsers([]);
                      }
                    }}
                  >
                    <SendToAllToggle $checked={formData.sendToAll} />
                    <span>Všem</span>
                  </SendToAllLabel>
                </SendToAllCheckbox>
              </RecipientsRow>
              {validationErrors.prijemci && (
                <ValidationError>
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  {validationErrors.prijemci}
                </ValidationError>
              )}
            </ModalBody>

            <ModalFooter>
              <Button $variant="secondary" onClick={() => setModalOpen(false)}>
                <FontAwesomeIcon icon={faTimes} />
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.nazev || (activeTab === 'messages' && !formData.obsah)}>
                <FontAwesomeIcon icon={faSave} />
                {isSaving ? 'Ukládám...' : 'Uložit'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>,
        document.body
      )}

      {/* Popup kalendář pro událost */}
      {calendarPopupEvent && typeof document !== 'undefined' && createPortal(
        <>
          {/* Průhledná vrstva pro zavření */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998
            }}
            onClick={() => setCalendarPopupEvent(null)}
          />
          {/* Popup okno */}
          <div
            style={{
              position: 'absolute',
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              zIndex: 9999,
              display: 'inline-flex',
              flexDirection: 'column',
              animation: 'popupFadeIn 0.15s ease-out',
              maxHeight: `${popupPosition.height || 520}px`,
              maxWidth: '95vw'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hlavička */}
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, #f8fafc, white)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#3b82f6', fontSize: '1.1rem' }} />
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1rem', 
                    fontWeight: 700, 
                    color: '#1e293b'
                  }}>
                    {calendarPopupEvent.nazev}
                  </h3>
                  <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Kalendářový přehled a reakce
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCalendarPopupEvent(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.75rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  lineHeight: 1,
                  transition: 'all 0.2s',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#1e293b';
                  e.target.style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#94a3b8';
                  e.target.style.background = 'transparent';
                }}
                title="Zavřít"
              >
                ×
              </button>
            </div>
            
            {/* Obsah */}
            <div style={{ 
              padding: '1rem',
              flex: 1,
              overflow: 'hidden',
              display: 'flex'
            }}>
              <PlanningEventCalendarPopup 
                event={calendarPopupEvent}
                responses={eventResponses[calendarPopupEvent.id] || []}
              />
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal s kumulativním kalendářem všech událostí */}
      {showAllEventsCalendar && typeof document !== 'undefined' && createPortal(
        <PlanningAllEventsCalendar
          events={events}
          eventResponses={eventResponses}
          onClose={() => setShowAllEventsCalendar(false)}
        />,
        document.body
      )}
    </PageContainer>
  );
};

export default PlanningAdminPage;
