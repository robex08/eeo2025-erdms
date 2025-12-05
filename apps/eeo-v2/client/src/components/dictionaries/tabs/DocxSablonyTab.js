/**
 * DOCX Šablony Tab - Správa DOCX šablon s TanStack Table
 * Implementováno podle Users.js vzhledu a API dokumentace
 * @date 2025-10-20
 */

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Search, FileText, Calculator, Hash, Package } from 'lucide-react';
import {
  faFileWord, faPlus, faSearch, faEdit, faTrash, faSyncAlt,
  faDownload, faUpload, faFilter, faTimes, faToggleOn, faToggleOff,
  faCheckCircle, faTimesCircle, faFileExport, faClock, faBolt, faHdd,
  faCode, faCheck, faCopy, faInfoCircle, faEye, faExpandArrowsAlt, faCompress,
  faChevronUp, faChevronDown, faEraser, faSync
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import { ProgressContext } from '../../../context/ProgressContext';
import { SelectWithIcon } from '../../CustomSelect';
import { getTypyPriloh25 } from '../../../services/api25orders';
import {
  getDocxSablonyList,
  getDocxSablonaDetail,
  createDocxSablona,
  updateDocxSablona,
  updateDocxSablonaWithFile,
  reuploadDocxSablona,
  deleteDocxSablona,
  deactivateDocxSablona,
  removeDocxSablonaFile,
  downloadDocxSablona,
  downloadDocxSablonaAsFile,
  verifyDocxSablony,
  verifySingleDocxSablona
} from '../../../services/apiv2Dictionaries';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { prettyDate } from '../../../utils/format';
import { removeDiacritics } from '../../../utils/textHelpers';
import ConfirmDialog from '../../ConfirmDialog';
import DocxTemplateEditor from '../../docx/DocxTemplateEditor';
import DocxMappingExpandableSection from '../../docx/DocxMappingExpandableSection.jsx';
// ⭐ DocxPreviewModal odstraněn - používá se univerzální HTML náhled v nové záložce
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { processDocxWithFields } from '../../../utils/docx/processDocx';
import { validateDocxMapping, autoFixMapping } from '../../../utils/docx/validateDocxMapping';

// =============================================================================
// GLOBÁLNÍ SCROLLBAR STYLY - jednotný design pro celou komponentu
// =============================================================================

const scrollbarStyles = `
  /* Webkit scrollbars (Chrome, Safari, Edge) */
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

  /* Firefox scrollbars */
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
`;

// JSON editor specifický scrollbar - tmavší šedý
const jsonScrollbarStyles = `
  /* Webkit scrollbars (Chrome, Safari, Edge) */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #64748b; /* Tmavší šedá */
    border-radius: 4px;

    &:hover {
      background: #475569; /* Ještě tmavší při hover */
    }
  }

  /* Firefox scrollbars */
  scrollbar-width: thin;
  scrollbar-color: #64748b #f1f5f9;
`;

// =============================================================================
// STYLED COMPONENTS - podle vzoru Users.js
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

  svg {
    font-size: 1rem;
    ${props => props.$loading && `
      animation: spin 1s linear infinite;
    `}
  }
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

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  /* Pevné šířky pro specifické sloupce */
  th:nth-of-type(2), td:nth-of-type(2) { width: 147px !important; min-width: 147px !important; max-width: 147px !important; }   /* Typ šablony */
  th:nth-of-type(3), td:nth-of-type(3) { width: 147px !important; min-width: 147px !important; max-width: 147px !important; }   /* Vytvořeno */
  th:nth-of-type(4), td:nth-of-type(4) { width: 135px !important; min-width: 135px !important; max-width: 135px !important; }   /* Verze */
  th:nth-of-type(5), td:nth-of-type(5) { width: 135px !important; min-width: 135px !important; max-width: 135px !important; }   /* Velikost */
  /* Uživatel (6) - žádná pevná šířka, dynamicky zabere zbytek */
  th:nth-of-type(7), td:nth-of-type(7) { width: 150px !important; min-width: 150px !important; max-width: 150px !important; }   /* Částka */
  th:nth-of-type(8), td:nth-of-type(8) { width: 50px !important; min-width: 50px !important; max-width: 50px !important; }   /* Disk */
  th:nth-of-type(9), td:nth-of-type(9) { width: 50px !important; min-width: 50px !important; max-width: 50px !important; }   /* Aktivní */
  th:last-child, td:last-child { width: 120px !important; min-width: 120px !important; max-width: 120px !important; }      /* Akce */
`;

const TableHeaderRow = styled.tr`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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

const TableRow = styled.tr`
  background: ${props => {
    if (props.$isInactive) return '#f8f9fa'; // Šedivé pozadí pro neaktivní
    return props.$isEven ? '#f8fafc' : 'white';
  }};
  opacity: ${props => props.$isInactive ? 0.7 : 1};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$isInactive ? '#e9ecef' : '#f9fafb'};
  }
`;

const TableCell = styled.td`
  vertical-align: middle;
  padding-top: 1rem;
  padding-bottom: 1rem;
`;

const ActionCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;

  .action-row {
    display: flex;
    gap: 0.12rem;
    align-items: center;
    justify-content: center;
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem; /* Zmenšeno z 2rem na 1.75rem = 28px */
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

  &.download {
    &:hover {
      color: #059669;
      background: #ecfdf5;
    }
  }

  &.edit {
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }

  &.delete {
    &:hover {
      color: #dc2626;
      background: #fef2f2;
    }
  }
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    position: absolute;
    left: 0.5rem;
    color: #9ca3af;
    font-size: 0.75rem;
    pointer-events: none;
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

const IconFilterButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.15);
  }

  &:active {
    transform: scale(0.95);
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Pagination = styled.div`
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

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #3730a3;
  font-family: monospace;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  svg {
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }

  p {
    margin: 0;
  }
`;

// Upload Modal styles
// =============================================================================
// MODAL STYLED COMPONENTS - podle UserManagementModal.js
// =============================================================================

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

const ModalOverlay = styled.div`
  position: fixed !important;
  top: ${props => props.$isFullscreen ? '0 !important' : '132px'};
  left: 0 !important;
  right: 0 !important;
  bottom: ${props => props.$isFullscreen ? '0 !important' : '60px'};
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.$isFullscreen ? '1050 !important' : '1010'};
  padding: ${props => props.$isFullscreen ? '0' : '1rem'};
  cursor: default;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: ${props => props.$isFullscreen ? '0' : '16px'};
  width: ${props => props.$isFullscreen ? '100vw' : '100%'};
  max-width: ${props => props.$isFullscreen ? 'none' : (props.$expanded ? '1400px' : '900px')};
  height: ${props => props.$isFullscreen ? '100vh' : 'calc(100vh - 280px)'};
  max-height: ${props => props.$isFullscreen ? 'none' : 'calc(100vh - 280px)'};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: ${props => props.$isFullscreen ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2)'};
  animation: ${slideInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transition: all 0.3s ease;
  z-index: ${props => props.$isFullscreen ? '1051 !important' : 'auto'};
  position: ${props => props.$isFullscreen ? 'relative !important' : 'static'};
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem 0.75rem 1.5rem;
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.05"><circle cx="30" cy="30" r="1"/></g></svg>');
    pointer-events: none;
  }
`;

const ModalHeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
`;

const ModalSubtitle = styled.p`
  margin: 0.375rem 0 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8125rem;
  font-weight: 400;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  padding: 0.625rem;
  border-radius: 10px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${scrollbarStyles}
`;

// Layout kontejner - roztáhne se přes celou výšku
const UpperSection = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$hasMapping ? '1fr 1.8fr' : '1fr'};
  grid-template-rows: 1fr;
  gap: ${props => props.$hasMapping ? '1.25rem' : '0'};
  transition: all 0.3s ease;
  flex: 1;
  overflow: hidden;
  padding: 1rem 1.25rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

// Levý sloupec - roztáhne se přes celou dostupnou výšku
const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
`;

// Pravý sloupec - roztáhne se přes celou dostupnou výšku až k patičce
const RightColumn = styled.div`
  display: ${props => props.$visible ? 'flex' : 'none'};
  flex-direction: column;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease;
  overflow: hidden;
  height: 100%;
`;

// Řádek s názvem a nahráním přílohy
const NameAndFileRow = styled.div`
  display: block;
  width: 100%;
`;

// Spodní sekce pro JSON co nejblíže k horním sekcím
const BottomSection = styled.div`
  width: 100%;
  margin-top: 0.5rem;
`;

// JSON Editor - roztáhne se na zbývající prostor
const FullWidthJsonEditor = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const JsonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%);
  border-bottom: 1px solid #cbd5e1;
  flex-shrink: 0;
`;

const JsonTitle = styled.h4`
  margin: 0;
  color: #1e293b;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #3b82f6;
  }
`;

const JsonActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

const JsonEditor = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const JsonTextarea = styled.textarea`
  width: 100%;
  height: 150px;
  background: #1f2937;
  color: #e5e7eb;
  border: none;
  padding: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  resize: none;
  outline: none;

  &::placeholder {
    color: #6b7280;
  }
`;

// Textarea - roztáhne se na celou dostupnou výšku
const FullWidthJsonTextarea = styled.textarea`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  color: transparent;
  border: none;
  padding: 0.5rem 1rem; /* Menší padding top/bottom */
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  resize: none;
  outline: none;
  overflow: auto; /* Textarea může scrollovat */
  z-index: 2;

  &::placeholder {
    color: #94a3b8;
    font-style: italic;
  }

  /* JSON Syntax Highlighting simulation pro textarea */
  ::selection {
    background: rgba(59, 130, 246, 0.2);
  }

  ${jsonScrollbarStyles}
`;

// JSON syntax highlighting overlay component
const JsonHighlightContainer = styled.div`
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: auto; /* Umožní scrollování */
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  ${jsonScrollbarStyles}
`;

const JsonHighlightOverlay = styled.pre`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 0.5rem 1rem; /* Stejný padding jako textarea */
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  background: transparent;
  color: #374151; /* Základní barva textu */
  pointer-events: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: auto; /* Overlay může scrollovat, ale bude synchronizováno */
  z-index: 1;

  /* JSON Syntax Colors pro světlé téma */
  .json-key {
    color: #d97706; /* Amber pro klíče */
    font-weight: 600;
  }

  .json-string {
    color: #059669; /* Emerald pro řetězce */
  }

  .json-number {
    color: #2563eb; /* Blue pro čísla */
    font-weight: 500;
  }

  .json-boolean {
    color: #7c3aed; /* Purple pro booleany */
    font-weight: 600;
  }

  .json-null {
    color: #dc2626; /* Red pro null */
    font-weight: 600;
    font-style: italic;
  }

  .json-punctuation {
    color: #64748b; /* Slate pro interpunkci */
    font-weight: 600;
  }

  ${jsonScrollbarStyles}
`;

// Validační komponenty
const ValidationPanel = styled.div`
  margin-top: 0.75rem;
  border-radius: 6px;
  background: ${props => props.$type === 'error' ? '#fef2f2' : '#fffbeb'};
  border: 1px solid ${props => props.$type === 'error' ? '#fecaca' : '#fde68a'};
  padding: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
  ${scrollbarStyles}
`;

const ValidationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: ${props => props.$type === 'error' ? '#dc2626' : '#d97706'};
  font-weight: 600;
  font-size: 0.875rem;
`;

const ValidationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ValidationItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border-left: 3px solid ${props => props.$type === 'error' ? '#ef4444' : '#f59e0b'};
  font-size: 0.8125rem;
`;

const ValidationItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #1f2937;
`;

const ValidationItemBody = styled.div`
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1.4;
`;

const ValidationSuggestion = styled.div`
  margin-top: 0.25rem;
  padding: 0.375rem 0.5rem;
  background: #f0fdf4;
  border-radius: 3px;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
`;

const AutoFixButton = styled.button`
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ValidationSummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: ${props => props.$valid ? '#f0fdf4' : '#fef2f2'};
  border-radius: 6px;
  border: 1px solid ${props => props.$valid ? '#bbf7d0' : '#fecaca'};
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
`;

const FormSectionHeader = styled.div`
  padding: 1rem 1.25rem 0 1.25rem;
  flex-shrink: 0;
`;

const FormSectionContent = styled.div`
  padding: 1rem 1.25rem;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 1.25rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.8125rem;
  color: #374151;
  margin-bottom: 0.375rem;
  display: block;

  &::after {
    content: ${props => props.required ? '" *"' : '""'};
    color: #dc2626;
    margin-left: 2px;
  }
`;

const InputWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg {
    position: absolute;
    left: 0.75rem;
    top: ${props => props.hasTextarea ? '0.75rem' : '50%'};
    transform: ${props => props.hasTextarea ? 'none' : 'translateY(-50%)'};
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px;
    height: 16px;
  }

  input {
    padding-left: 2rem;
  }

  textarea {
    padding-left: 2rem;
  }

  /* Zpracování číselného inputu bez spin buttonů */
  input[type="text"].no-spinner::-webkit-outer-spin-button,
  input[type="text"].no-spinner::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="text"].no-spinner {
    -moz-appearance: textfield;
  }
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  min-height: 2.5rem; /* Sjednocená výška se StableCustomSelect */
  padding: ${props => props.hasIcon ? '0.75rem 0.75rem 0.75rem 2rem' : '0.75rem'}; /* Větší padding pro sjednocení */
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem; /* Větší font jako ve StableCustomSelect */
  transition: all 0.2s ease;
  background: ${props => props.hasError ? '#fef2f2' : '#ffffff'};

  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  font-weight: ${props => {
    if (props.disabled) return '400';
    return props.value && props.value !== '' ? '600' : '400';
  }};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:focus + svg {
    color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #9ca3af;
    opacity: 1;
    font-weight: 400;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem; /* Sjednocený padding */
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem; /* Sjednocený font size */
  transition: all 0.2s ease;
  background: ${props => props.hasError ? '#fef2f2' : '#ffffff'};
  min-height: 2.5rem; /* Sníženo na ~2 řádky */
  max-height: 3.5rem; /* Max ~2 řádky s paddingem */
  resize: vertical;
  font-family: ${props => props.monospace ? 'monospace' : 'inherit'};
  line-height: 1.2; /* Kompaktnější řádkování */

  /* Stejná logika pro zvýraznění jako u Input */
  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  font-weight: ${props => {
    if (props.disabled) return '400';
    return props.value && props.value !== '' ? '600' : '400';
  }};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:focus + svg {
    color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #9ca3af;
    opacity: 1;
    font-weight: 400;
  }
`;

const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem; /* Menší padding */
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8125rem;
  color: #374151;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #3b82f6;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid #e5e7eb;
`;

const SectionIcon = styled.div`
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 0.9375rem;
  font-weight: 600;
`;

const ModalFooter = styled.div`
  padding: 1.25rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
`;

const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #64748b;
`;

const FooterRight = styled.div`
  display: flex;
  gap: 0.875rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.3s;

  &.cancel {
    background: white;
    color: #64748b;
    border: 2px solid #e2e8f0;

    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
  }

  &.primary {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
    }

    &:disabled {
      background: #e2e8f0;
      color: #64748b;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }
`;

const FileDropZone = styled.div`
  border: 2px dashed #e5e7eb;
  border-radius: 12px;
  padding: 0.5rem; /* Sníženo o 1em pro více prostoru */
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafbfc;
  min-height: 80px; /* Také sníženo pro kompaktnější vzhled */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  user-select: none;

  &:hover, &.drag-over {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
  }

  .icon {
    font-size: 2.5rem;
    color: #9ca3af;
    margin-bottom: 0.75rem;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  .text {
    color: #6b7280;
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.4;
    pointer-events: none;
  }

  &:hover .icon {
    color: #3b82f6;
    transform: scale(1.1);
  }

  &:hover .text {
    color: #1f2937;
  }
`;

// Verify Modal Components
const VerifyStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  padding: 1rem;
  border-radius: 8px;
  background: ${props => {
    if (props.$status === 'success') return '#dcfce7';
    if (props.$status === 'warning') return '#fef3c7';
    if (props.$status === 'error') return '#fee2e2';
    return '#f3f4f6';
  }};
  border: 1px solid ${props => {
    if (props.$status === 'success') return '#bbf7d0';
    if (props.$status === 'warning') return '#fde68a';
    if (props.$status === 'error') return '#fecaca';
    return '#e5e7eb';
  }};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
`;

const VerifyDetails = styled.div`
  margin-top: 1.5rem;
`;

const DetailSection = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const DetailLabel = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
`;

const DetailValue = styled.div`
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
  background: white;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
`;

const DetailStatus = styled.div`
  display: inline-block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.$ok ? '#059669' : '#dc2626'};
  margin-right: 1rem;
`;

const ProblemItem = styled.div`
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  border-left: 3px solid #f59e0b;
  font-size: 0.875rem;
`;

// =============================================================================
// STABLE CUSTOM SELECT COMPONENTS
// =============================================================================

const StableSelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const StableSelectButton = styled.button`
  width: 100%;
  min-height: 2.5rem;
  padding: 0.75rem 3rem 0.75rem ${props => props.hasIcon ? '2rem' : '1rem'};
  background: white;
  border: 2px solid ${props => props.hasError ? '#dc2626' : props.isOpen ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: left;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: inherit;
  font-weight: ${props => props.disabled ? '400' : (props.hasValue ? '600' : '400')};
  color: ${props => props.disabled ? '#9ca3af' : props.hasValue ? '#1f2937' : '#6b7280'};

  &:hover:not(:disabled) {
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }

  /* Chevron ikona */
  &::after {
    content: '';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%) rotate(${props => props.isOpen ? '180deg' : '0deg'});
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid #6b7280;
    transition: transform 0.2s ease;
  }
`;

const StableSelectDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 4000;
  margin-top: 2px;

  /* Optimalizace pro plynulé scrollování */
  scroll-behavior: smooth;
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f8f9fa;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

const StableSelectSearchBox = styled.div`
  position: relative;
  padding: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
  background: #f8f9fa;
`;

const StableSelectSearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const StableSelectSearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
`;

const StableSelectOption = styled.div`
  padding: ${props => props.level === 0 ? '0.75rem 1rem' : '0.5rem 1rem 0.5rem 2rem'};
  cursor: ${props => props.isHeader ? 'default' : 'pointer'};
  font-size: 0.875rem;
  color: ${props => props.level === 0 ? '#111827' : '#4b5563'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props =>
    props.isHeader ? '#f9fafb' :
    props.selected ? '#eff6ff' : 'white'
  };
  border-left: ${props => props.selected ? '3px solid #3b82f6' : '3px solid transparent'};
  border-bottom: ${props => props.level === 0 ? '1px solid #e5e7eb' : 'none'};
  font-weight: ${props => props.selected ? '600' : '400'} !important; /* Bold jen pro vybranou možnost */

  &:hover {
    background: ${props =>
      props.isHeader ? '#f3f4f6' :
      props.selected ? '#dbeafe' : '#f8fafc'
    };
    font-weight: ${props => props.selected ? '600' : '400'} !important; /* Zůstává stejné i při hover */
  }

  &:last-child {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
  }

  span {
    padding-left: ${props => (props.level || 0) * 20}px;
    font-weight: ${props => props.selected ? '600' : '400'} !important; /* Bold jen pro vybranou možnost */
  }
`;

const StableSelectValue = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// StableCustomSelect Component
const StableCustomSelect = React.memo(({
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = "Vyberte...",
  disabled = false,
  hasError = false,
  required = false,
  field,
  loading = false,
  loadingText = 'Načítání...',
  icon = null,
  multiple = false,
  getOptionLabel,
  getOptionValue
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [internalScroll, setInternalScroll] = useState(0);

  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);

  // Zpracování hodnot
  const normalizedValue = multiple ? (Array.isArray(value) ? value : []) : value;

  // Filtrované možnosti
  const filteredOptions = useMemo(() => {
    if (!searchTerm || loading) return options;
    return options.filter(option => {
      let label;
      if (getOptionLabel) {
        label = getOptionLabel(option, field);
      } else {
        // Fallback pro různé typy objektů
        if (field === 'strediska' || field === 'strediska_kod') {
          label = option.label || option.name || option.nazev_stavu || String(option);
        } else if (field === 'lp_kod') {
          label = option.cislo_lp ? `${option.cislo_lp} - ${option.nazev_uctu || ''}` : option.label || String(option);
        } else {
          label = option.label || option.nazev || option.name || String(option);
        }
      }
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [options, searchTerm, loading, getOptionLabel, field]);

  // Display hodnota
  const displayValue = useMemo(() => {
    if (multiple) {
      if (normalizedValue.length === 0) return placeholder;
      return normalizedValue.map(val => {
        const option = options.find(opt => {
          const optVal = getOptionValue ? getOptionValue(opt, field) : (opt.id || opt.value || opt);
          return optVal === val;
        });
        if (option) {
          // Použij externí getOptionLabel funkci nebo fallback
          if (getOptionLabel) {
            return getOptionLabel(option, field);
          }
          // Fallback pro různé typy objektů
          if (field === 'strediska' || field === 'strediska_kod') {
            return option.label || option.name || option.nazev_stavu || String(option);
          }
          if (field === 'lp_kod') {
            return option.cislo_lp ? `${option.cislo_lp} - ${option.nazev_uctu || ''}` : option.label || String(option);
          }
          return option.label || option.nazev || option.name || String(option);
        }
        return String(val);
      }).join(', ');
    } else {
      if (!normalizedValue) return placeholder;
      const option = options.find(opt => {
        const optVal = getOptionValue ? getOptionValue(opt, field) : (opt.id || opt.value || opt);
        return optVal === normalizedValue;
      });
      if (option) {
        if (getOptionLabel) {
          return getOptionLabel(option, field);
        }
        return option.label || option.nazev || option.name || String(option);
      }
      // Pokud není nalezen option a jde o prikazce nebo schvalovatel s hodnotou 0 nebo null, zobraz "Neznámý"
      if ((field === 'prikazce' || field === 'schvalovatel') && (normalizedValue === 0 || normalizedValue === null || normalizedValue === '0')) {
        return 'Neznámý';
      }
      return String(normalizedValue);
    }
  }, [normalizedValue, options, placeholder, multiple, getOptionLabel, getOptionValue, field]);

  // Zavření při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Auto-focus search při otevření
  useEffect(() => {
    if (isOpen && searchInputRef.current && filteredOptions.length > 5) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, filteredOptions.length]);

  // Zachování scroll pozice
  useEffect(() => {
    // Scroll pozice se už neukládá kvůli změně na absolute positioning
  }, [filteredOptions, internalScroll]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(prev => !prev);
    if (isOpen) {
      setSearchTerm('');
    }
  };

  const handleOptionClick = (option) => {
    // Scroll pozice se už neukládá kvůli změně na absolute positioning

    const optionValue = getOptionValue ? getOptionValue(option, field) : (option.id || option.value || option);

    if (multiple) {
      const currentValues = Array.isArray(normalizedValue) ? normalizedValue : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];

      // Pro multiselect pošli pole přímo
      onChange(newValues);
      if (onBlur) onBlur(field, newValues);
    } else {
      // Pro single select pošli hodnotu přímo
      onChange(optionValue);
      if (onBlur) onBlur(field, optionValue);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const isSelected = (option) => {
    const optionValue = getOptionValue ? getOptionValue(option, field) : (option.id || option.value || option);
    return multiple
      ? normalizedValue.includes(optionValue)
      : normalizedValue === optionValue;
  };

  return (
    <StableSelectWrapper ref={wrapperRef}>
      <StableSelectButton
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        hasError={hasError}
        isOpen={isOpen}
        hasValue={multiple ? normalizedValue.length > 0 : !!normalizedValue}
        hasIcon={!!icon}
      >
        {icon && (
          <span style={{
            position: 'absolute',
            left: '12px',
            color: '#9ca3af',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {React.cloneElement(icon, { size: 16 })}
          </span>
        )}
        <StableSelectValue title={displayValue}>
          {displayValue}
        </StableSelectValue>
      </StableSelectButton>

      {isOpen && !disabled && (
        <StableSelectDropdown>
          {filteredOptions.length > 0 && (
            <StableSelectSearchBox>
              <StableSelectSearchIcon>
                <Search size={16} />
              </StableSelectSearchIcon>
              <StableSelectSearchInput
                ref={searchInputRef}
                type="text"
                placeholder="Vyhledat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </StableSelectSearchBox>
          )}

          {loading ? (
            <StableSelectOption>{loadingText}</StableSelectOption>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const optionValue = getOptionValue ? getOptionValue(option, field) : (option.id || option.value || option);
              let optionLabel;

              if (getOptionLabel) {
                optionLabel = getOptionLabel(option, field);
              } else {
                // Fallback pro různé typy objektů
                if (field === 'strediska' || field === 'strediska_kod') {
                  optionLabel = option.label || option.name || option.nazev_stavu || String(option);
                } else if (field === 'lp_kod') {
                  optionLabel = option.cislo_lp ? `${option.cislo_lp} - ${option.nazev_uctu || ''}` : option.label || String(option);
                } else {
                  optionLabel = option.label || option.nazev || option.name || String(option);
                }
              }

              const selected = isSelected(option);
              const level = option.level || 0;
              const isHeader = option.isHeader || (level === 0 && !option.value && !option.id);

              return (
                <StableSelectOption
                  key={optionValue || index}
                  selected={selected}
                  level={level}
                  isHeader={isHeader}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Neumožni kliknout na header
                    if (!isHeader) {
                      handleOptionClick(option);
                    }
                  }}
                >
                  {multiple && !isHeader && (
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      onChange={() => {}} // Prázdný handler aby nedával warning
                    />
                  )}
                  <span>{optionLabel}</span>
                </StableSelectOption>
              );
            })
          ) : (
            <StableSelectOption>Žádné výsledky</StableSelectOption>
          )}
        </StableSelectDropdown>
      )}
    </StableSelectWrapper>
  );
});

// =============================================================================
// JSON SYNTAX HIGHLIGHTING HELPER
// =============================================================================

// Funkce pro jednoduché JSON syntax highlighting
const highlightJsonSyntax = (jsonString) => {
  if (!jsonString) return '';

  try {
    // Escape HTML nejdříve
    let highlighted = jsonString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // JSON syntax highlighting s CSS třídami
    highlighted = highlighted
      // Klíče objektů (před dvojtečkou) - důležité: zachováváme uvozovky a dvojtečku
      .replace(/"([^"\\]*(\\.[^"\\]*)*)"\s*:/g, '<span class="json-key">"$1"</span><span class="json-punctuation">:</span>')
      // Řetězce (hodnoty) - pouze ty co nejsou před dvojtečkou
      .replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="json-string">"$1"</span>')
      // Řetězce v polích
      .replace(/\[\s*"([^"\\]*(\\.[^"\\]*)*)"/g, '[<span class="json-string">"$1"</span>')
      .replace(/,\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ', <span class="json-string">"$1"</span>')
      // Čísla (včetně záporných a desetinných)
      .replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>')
      .replace(/\[\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, '[<span class="json-number">$1</span>')
      .replace(/,\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ', <span class="json-number">$1</span>')
      // Boolean hodnoty
      .replace(/:\s*(true|false)\b/g, ': <span class="json-boolean">$1</span>')
      .replace(/\[\s*(true|false)\b/g, '[<span class="json-boolean">$1</span>')
      .replace(/,\s*(true|false)\b/g, ', <span class="json-boolean">$1</span>')
      // null hodnoty
      .replace(/:\s*null\b/g, ': <span class="json-null">null</span>')
      .replace(/\[\s*null\b/g, '[<span class="json-null">null</span>')
      .replace(/,\s*null\b/g, ', <span class="json-null">null</span>')
      // Interpunkce (závorky, čárky) - ale ne ty už zpracované
      .replace(/([{}[\],])/g, '<span class="json-punctuation">$1</span>');

    return highlighted;
  } catch (error) {
    console.error('JSON highlighting error:', error);
    return jsonString;
  }
};

// =============================================================================
// API SERVICES
// =============================================================================

// Base URL pro API - včetně api.eeo prefixu
const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/';

// Helper funkce pro vytvoření docxApi s aktuálním username - NOVÁ VERZE
const createDocxApi = (username) => ({
  async list(token, filters = {}) {
    return await getDocxSablonyList({
      token,
      username: username || 'system',
      ...filters
    });
  },

  async create(token, formData) {
    // FormData už obsahuje všechna pole včetně file
    // Stačí jen přidat token do FormData
    formData.append('token', token);
    formData.append('username', username || 'system');

    return await createDocxSablona(token, formData);
  },

  async update(token, id, data) {
    return await updateDocxSablona({
      token,
      username: username || 'system',
      id,
      ...data
    });
  },

  async updateWithFile(token, id, formData) {
    // Pro update s možností výměny souboru
    // FormData už obsahuje všechna pole
    formData.append('token', token);
    formData.append('username', username || 'system');
    formData.append('id', id);

    return await updateDocxSablonaWithFile(token, id, formData);
  },

  async reupload(token, id, file) {
    return await reuploadDocxSablona({
      token,
      username: username || 'system',
      id,
      file
    });
  },

  async delete(token, id) {
    return await deleteDocxSablona({
      token,
      username: username || 'system',
      id
    });
  },

  async deactivate(token, id) {
    return await deactivateDocxSablona({
      token,
      username: username || 'system',
      id
    });
  },

  async download(token, id) {
    return await downloadDocxSablona({
      token,
      username: username || 'system',
      id
    });
  },

  async verify(token) {
    return await verifyDocxSablony({
      token,
      username: username || 'system'
    });
  },

  async verifySingle(token, id) {
    return await verifySingleDocxSablona({
      token,
      username: username || 'system',
      id
    });
  },

  // Legacy method pro kompatibilitu
  getDownloadUrl(token, id) {
    // Toto by se už nemělo používat, ale zachováváme pro kompatibilitu
    return `${process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/'}sablona_docx/download?username=${username || 'system'}&token=${token}&id=${id}`;
  }
});

// =============================================================================
// KOMPONENTA
// =============================================================================

// Výchozí hodnoty formuláře
const defaultUploadForm = {
  file: null,
  nazev: '',
  popis: '',
  typ_dokumentu: '',
  aktivni: true,
  verze: '1.0',
  platnost_od: '',
  platnost_do: '',
  castka: '', // ⭐ NOVÉ POLE: Částka pro šablonu
  min_cena: '', // ⭐ Minimální cena (od)
  max_cena: '', // ⭐ Maximální cena (do)
  mapovani_json: '',
  docx_mapping: {}
};

const DocxSablonyTab = () => {
  const { token, user, hasPermission, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { start: startProgress, setProgress, done: doneProgress } = useContext(ProgressContext);

  // Vytvoření API instance s aktuálním username
  const docxApi = useMemo(() => createDocxApi(user?.username), [user?.username]);

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

  // Load data - memoized to prevent useEffect loops
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      startProgress();

      const result = await docxApi.list(token, {}); // Načti všechny šablony, včetně neaktivních

      if (result.status === 'ok') {
        const templates = result.data || [];
        setData(templates);

        // Spustit automatickou verifikaci existence souborů na pozadí
        // Neblokuje UI, běží asynchronně
        // skipAutoDeactivation = FALSE - automatická deaktivace ZAPNUTA
        // (Deaktivuje POUZE když soubor NEEXISTUJE)
        verifyFilesInBackground(templates, false);

        // ✅ Zbytečný toast odstraněn - data se načítají automaticky
      } else {
        throw new Error(result.error || 'Chyba při načítání dat');
      }
    } catch (error) {
      console.error('Load error:', error);
      showToast(error.message || 'Chyba při načítání dat', 'error');
    } finally {
      setLoading(false);
      doneProgress();
    }
  }, [token, user?.username, docxApi, startProgress, doneProgress, showToast]);

  // Načtení typů dokumentů - memoized
  const loadTypyDokumentu = useCallback(async () => {
    try {
      setLoadingTypy(true);
      const typy = await getTypyPriloh25({
        token,
        username: user?.username || 'system'
      });

      // Přidání prázdné možnosti na začátek
      const typyOptions = [
        { value: '', label: 'Vyberte typ dokumentu...' },
        ...typy
      ];

      setTypyDokumentu(typyOptions);
    } catch (error) {
      console.error('Chyba při načítání typů dokumentů:', error);
      showToast('Chyba při načítání typů dokumentů', 'error');
      // Fallback na základní typy
      setTypyDokumentu([
        { value: '', label: 'Vyberte typ dokumentu...' },
        { value: 'OBJEDNAVKA', label: 'Objednávka' },
        { value: 'SMLOUVA', label: 'Smlouva' },
        { value: 'PROTOKOL', label: 'Protokol' }
      ]);
    } finally {
      setLoadingTypy(false);
    }
  }, [token, user?.username, showToast]);

  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState(() => {
    return getUserStorage('docxSablony_globalFilter', '');
  });
  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('docxSablony_columnFilters', {});
  });
  const [aktivniFilter, setAktivniFilter] = useState(() => {
    return getUserStorage('docxSablony_aktivniFilter', 'all'); // 'all' | 'aktivni' | 'neaktivni'
  });
  const [diskFilter, setDiskFilter] = useState(() => {
    return getUserStorage('docxSablony_diskFilter', 'all'); // 'all' | 'ok' | 'error'
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [typyDokumentu, setTypyDokumentu] = useState([]);
  const [loadingTypy, setLoadingTypy] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [diskStatus, setDiskStatus] = useState({}); // {templateId: {status: 'checking'|'ok'|'error', error?: string}}
  const [downloadedTemplateFile, setDownloadedTemplateFile] = useState(null); // File objekt pro editaci
  const [mappingSectionVisible, setMappingSectionVisible] = useState(false); // Kontrola zobrazení mapování
  const [jsonCopied, setJsonCopied] = useState(false); // Pro copy feedback
  // ⭐ showPreviewModal a previewTemplate odstraněny - používá se univerzální HTML náhled v nové záložce
  const [inlinePreviewHtml, setInlinePreviewHtml] = useState(null); // HTML náhled v dialogu
  const [isDragging, setIsDragging] = useState(false); // Drag & drop state
  const [isFullscreen, setIsFullscreen] = useState(false); // Fullscreen režim
  const [showFileReplaceConfirm, setShowFileReplaceConfirm] = useState(false); // Potvrzení výměny souboru
  const [pendingFileInputId, setPendingFileInputId] = useState(null); // ID file inputu pro opakované otevření
  const [inlinePreviewExpanded, setInlinePreviewExpanded] = useState(false); // Rozbalení náhledu
  const [generatingPreview, setGeneratingPreview] = useState(false); // Loading stav náhledu
  const [showFileRemoveConfirm, setShowFileRemoveConfirm] = useState(false); // Potvrzení odstranění souboru
  const [mappingValidation, setMappingValidation] = useState(null); // Validace mappingu

  // ⚠️ POZNÁMKA: Backend používá 'mapovani_json' pro DOCX mapování (nikoli 'docx_mapping')

  // Pagination state
  const [pageSize, setPageSize] = useState(() => getUserStorage('docxSablony_pageSize', 25));
  const [pageIndex, setPageIndex] = useState(() => getUserStorage('docxSablony_pageIndex', 0));

  // Upload form state
  const [uploadForm, setUploadForm] = useState(defaultUploadForm);

  // Pagination navigation helpers
  const goToFirstPage = () => {
    setPageIndex(0);
  };

  const goToPreviousPage = () => {
    setPageIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setPageIndex(prev => Math.min(table.getPageCount() - 1, prev + 1));
  };

  const goToLastPage = () => {
    setPageIndex(table.getPageCount() - 1);
  };

  // Automatická verifikace existence souborů na pozadí
  const verifyFilesInBackground = async (templates, skipAutoDeactivation = false) => {
    if (!templates || templates.length === 0) {
      return;
    }

    try {
      const verifyResult = await docxApi.verify(token);

      if (verifyResult.status === 'ok' && verifyResult.data) {
        const diskStatusUpdate = {};
        const templatesToDeactivate = [];

        // Zpracuj každý template a okamžitě deaktivuj, pokud soubor neexistuje
        for (const templateResult of verifyResult.data) {
          if (templateResult.id) {
            const fileExists = templateResult.file_exists;
            const template = templates.find(t => t.id === templateResult.id);

            const statusUpdate = {
              status: fileExists ? 'ok' : 'error',
              error: fileExists ? null : 'Soubor neexistuje na disku'
            };

            // ⚡ OKAMŽITÁ AKTUALIZACE diskStatus pro tuto šablonu
            setDiskStatus(prev => ({
              ...prev,
              [templateResult.id]: statusUpdate
            }));

            diskStatusUpdate[templateResult.id] = statusUpdate;

            // OKAMŽITÁ deaktivace, pokud soubor neexistuje
            if (!fileExists && !skipAutoDeactivation) {
              if (template && (template.aktivni === 1 || template.aktivni === true)) {
                try {
                  const deactivateResult = await docxApi.deactivate(token, template.id);

                  if (deactivateResult.success) {
                    // ⚡ OKAMŽITÁ AKTUALIZACE LOKÁLNÍHO STAVU ⚡
                    // Odstraň deaktivovanou šablonu ze seznamu okamžitě
                    setData(prevData => {
                      const newData = prevData.filter(t => t.id !== template.id);
                      return newData;
                    });

                    templatesToDeactivate.push({
                      id: template.id,
                      nazev: template.nazev,
                      success: true
                    });
                  } else {
                    templatesToDeactivate.push({
                      id: template.id,
                      nazev: template.nazev,
                      success: false,
                      error: deactivateResult.message || 'Neznámá chyba'
                    });
                  }
                } catch (deactivateError) {
                  // V případě chyby se NEODSTRAŇUJE ze seznamu - zůstává viditelná s chybovým statusem
                  templatesToDeactivate.push({
                    id: template.id,
                    nazev: template.nazev,
                    success: false,
                    error: deactivateError.message
                  });
                }
              }
            }
          }
        }

        // Počet chybějících souborů a výsledky deaktivace
        const missingFiles = Object.values(diskStatusUpdate).filter(status => status.status === 'error').length;
        const successfulDeactivations = templatesToDeactivate.filter(t => t.success).length;
        const failedDeactivations = templatesToDeactivate.filter(t => !t.success).length;

        // Spočítej chybějící soubory POUZE u AKTIVNÍCH šablon
        const templatesWithStatus = verifyResult.data.map(r => {
          const t = templates.find(x => x.id === r.id);
          return { ...r, aktivni: t?.aktivni };
        });
        const missingActive = templatesWithStatus.filter(t => !t.file_exists && (t.aktivni === 1 || t.aktivni === true)).length;

        // Toast POUZE pro aktivní šablony s chybějícími soubory
        if (missingActive > 0) {

          // Notifikace uživateli o výsledcích automatické deaktivace
          if (successfulDeactivations > 0) {
            showToast(
              `⚠️ Automaticky deaktivováno ${successfulDeactivations} šablon s chybějícími soubory na disku`,
              'warning'
            );
          }
          if (failedDeactivations > 0) {
            showToast(
              `❌ Nepodařilo se deaktivovat ${failedDeactivations} šablon`,
              'error'
            );
          }

          // Po deaktivaci znovu načti data ze serveru pro potvrzení, ale rychleji
          if (successfulDeactivations > 0) {
            setTimeout(async () => {
              try {
                setLoading(true);
                startProgress();

                const result = await docxApi.list(token, { aktivni: 1 }); // Načteme znovu jen aktivní
                if (result.status === 'ok') {
                  const templates = result.data || [];
                  setData(templates);

                  // Verifikace bez automatické deaktivace
                  verifyFilesInBackground(templates, true);
                }
              } catch (error) {
                console.error('Chyba při opakovaném načítání:', error);
                showToast('Chyba při načítání aktualizovaných dat', 'error');
              } finally {
                setLoading(false);
                doneProgress();
              }
            }, 500); // Kratší zpoždění - lokální stav už je aktualizovaný
          }
        }
      } else {
        console.error('X Verifikace selhala - neocekavany status:', verifyResult);
      }
    } catch (error) {
      console.error('⚠️ Automatická verifikace se nezdařila:', error);
    }
  };

  // Auto-detekce typu dokumentu podle názvu souboru
  const detectDocumentType = (filename) => {
    if (!filename || !typyDokumentu.length) return '';

    const name = filename.toLowerCase();

    // Mapování klíčových slov na typy
    const keywords = {
      'objednavka': ['objednavka', 'objednavku', 'order', 'zakzka'],
      'faktura': ['faktura', 'fakturu', 'invoice', 'ucet'],
      'smlouva': ['smlouva', 'smlouvu', 'contract', 'dohoda'],
      'protokol': ['protokol', 'meeting', 'zasedani', 'vysledek'],
      'kosilka': ['kosilka', 'obal', 'cover'],
      'schvaleni': ['schvaleni', 'approval', 'potvrzeni'],
      'jine': ['ostatni', 'other', 'misc']
    };

    // Hledání shody v názvech typů z BE
    for (const typ of typyDokumentu) {
      if (!typ.value) continue; // Přeskočit prázdnou možnost

      const typName = typ.label.toLowerCase();
      const typValue = typ.value.toLowerCase();

      // Direct match s názvem typu
      if (name.includes(typName) || name.includes(typValue)) {
        return typ.value;
      }

      // Match podle klíčových slov
      const typeKeywords = keywords[typValue] || [];
      for (const keyword of typeKeywords) {
        if (name.includes(keyword)) {
          return typ.value;
        }
      }
    }

    return ''; // Žádná shoda nenalezena
  };

  // Zavření upload/edit modalu s resetem editačního módu
  const handleCloseUploadModal = () => {
    // Reset editačního módu
    setIsEditMode(false);
    setEditingTemplate(null);

    // Reset fullscreen módu
    setIsFullscreen(false);

    // Reset formuláře
    setUploadForm({ ...defaultUploadForm });

    // Reset DOCX mapování stavů
    setDownloadedTemplateFile(null);
    setMappingSectionVisible(false);

    // Reset inline náhledu
    setInlinePreviewHtml(null);
    setInlinePreviewExpanded(false);
    setGeneratingPreview(false);

    // Zavřít modal
    setShowUploadModal(false);
  };

  // Reset formuláře a otevření upload modalu
  const handleOpenUploadModal = () => {
    console.log('➕ Otevírám modal pro přidání nové šablony');

    // Reset editačního módu
    setIsEditMode(false);
    setEditingTemplate(null);

    // Reset formuláře na výchozí hodnoty
    setUploadForm({ ...defaultUploadForm });

    // Reset DOCX mapování stavů
    setDownloadedTemplateFile(null);
    setMappingSectionVisible(false);

    // Otevřít modal
    setShowUploadModal(true);
  };

  useEffect(() => {
    if (token) {
      loadData();
      loadTypyDokumentu();
    }
  }, [token, loadData, loadTypyDokumentu]);

  // Validace mappingu při změně
  useEffect(() => {
    try {
      const mappingToValidate = uploadForm.docx_mapping || JSON.parse(uploadForm.mapovani_json || '{}');
      
      if (Object.keys(mappingToValidate).length > 0) {
        const validation = validateDocxMapping(mappingToValidate);
        setMappingValidation(validation);
      } else {
        setMappingValidation(null);
      }
    } catch (error) {
      // Nevalidní JSON - nastavíme chybu
      setMappingValidation({
        valid: false,
        errors: [{ type: 'parse', message: 'Nevalidní JSON formát' }],
        warnings: [],
        totalFields: 0,
        validFields: 0
      });
    }
  }, [uploadForm.docx_mapping, uploadForm.mapovani_json]);

  // Automatická oprava mappingu
  const handleAutoFixMapping = () => {
    try {
      const currentMapping = uploadForm.docx_mapping || JSON.parse(uploadForm.mapovani_json || '{}');
      const fixedMapping = autoFixMapping(currentMapping);
      const fixedJson = JSON.stringify(fixedMapping, null, 2);
      
      setUploadForm(prev => ({
        ...prev,
        docx_mapping: fixedMapping,
        mapovani_json: fixedJson
      }));
      
      showToast('✅ Mapping byl automaticky opraven', 'success');
    } catch (error) {
      showToast('❌ Chyba při opravě mappingu: ' + error.message, 'error');
    }
  };

  // Save filters to localStorage when they change
  useEffect(() => {
    setUserStorage('docxSablony_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_diskFilter', diskFilter);
  }, [diskFilter, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('docxSablony_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  // Memoized handlers for better performance
  const handleVerifyTemplateMemo = useCallback(async (template) => {
    await handleVerifyTemplate(template);
  }, [token]);

  const handleDownloadMemo = useCallback(async (template) => {
    await handleDownload(template);
  }, [token]);

  const handleDownloadOriginalMemo = useCallback(async (template) => {
    await handleDownloadOriginal(template);
  }, [token]);

  const handlePreviewMemo = useCallback(async (template) => {
    await handlePreview(template);
  }, [token]);

  const handleEditMemo = useCallback((template) => {
    handleEdit(template);
  }, [diskStatus]);

  const handleDeleteClickMemo = useCallback((template) => {
    handleDeleteClick(template);
  }, []);

  const handleToggleStatusMemo = useCallback(async (template) => {
    await handleToggleStatus(template);
  }, [token]);

  // Table columns
  const columns = useMemo(() => [
    {
      accessorKey: 'nazev',
      header: () => <div style={{ textAlign: 'left', paddingLeft: '1rem' }}>Název šablony</div>,
      cell: ({ getValue, row }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left', paddingLeft: '1rem' }}>
          <FileText size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {getValue()}
              {row.original.id && (
                <sup style={{
                  fontSize: '0.6rem',
                  color: '#9ca3af',
                  fontWeight: 'normal',
                  marginLeft: '4px'
                }}>
                  #{row.original.id}
                </sup>
              )}
            </div>
            {row.original.popis && (
              <div style={{ fontSize: '0.8125rem', color: '#6b7280', fontStyle: 'italic' }}>
                {row.original.popis}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'typ_dokumentu',
      size: 147,
      maxSize: 147,
      minSize: 147,
      header: () => <div style={{ textAlign: 'center' }}>Typ šablony</div>,
      cell: ({ getValue }) => (
        <div style={{ textAlign: 'center' }}>
          <Badge>{getValue() || 'N/A'}</Badge>
        </div>
      )
    },
    {
      accessorKey: 'dt_vytvoreni',
      size: 147,
      maxSize: 147,
      minSize: 147,
      header: () => <div style={{ textAlign: 'center' }}>Vytvořeno</div>,
      cell: ({ getValue }) => {
        const dateValue = getValue();
        if (!dateValue) return <div style={{ textAlign: 'center', color: '#9ca3af' }}>—</div>;

        const date = new Date(dateValue);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = `${day}.${month}.${year}`;

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        return (
          <div style={{ fontSize: '0.875rem', textAlign: 'center', lineHeight: '1.4' }}>
            <div>{dateStr}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{timeStr}</div>
          </div>
        );
      }
    },
    {
      accessorKey: 'verze',
      size: 135,
      maxSize: 135,
      minSize: 135,
      header: () => <div style={{ textAlign: 'center' }}>Verze</div>,
      cell: ({ getValue }) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: 'monospace' }}>
            {getValue() || '1.0'}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'velikost_souboru',
      size: 135,
      maxSize: 135,
      minSize: 135,
      header: () => <div style={{ textAlign: 'center' }}>Velikost</div>,
      cell: ({ getValue }) => {
        const bytes = getValue() || 0;
        const kb = (bytes / 1024).toFixed(1);
        return <div style={{ textAlign: 'center' }}>{`${kb} KB`}</div>;
      }
    },
    {
      accessorKey: 'uzivatele',
      // Žádná size - dynamicky zabere zbytek dostupného místa
      header: () => <div style={{ textAlign: 'left' }}>Uživatel</div>,
      cell: ({ row }) => {
        const vytvoril = row.original.vytvoril?.jmeno || '—';
        const aktualizoval = row.original.aktualizoval?.jmeno || '—';
        return (
          <div
            style={{ textAlign: 'left', fontSize: '0.875rem' }}
            title={`Vytvořil: ${vytvoril}\nAktualizoval: ${aktualizoval}`}
          >
            <div style={{ color: '#059669', fontWeight: '500' }}>
              {vytvoril}
            </div>
            <div style={{ color: '#3b82f6', fontWeight: '500', marginTop: '2px' }}>
              {aktualizoval}
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'castka',
      size: 150,
      maxSize: 150,
      minSize: 150,
      header: () => <div style={{ textAlign: 'right', paddingRight: '1rem' }}>Částka</div>,
      cell: ({ getValue }) => {
        const castka = getValue();
        if (castka === null || castka === undefined) {
          return <div style={{ textAlign: 'right', paddingRight: '1rem', color: '#9ca3af' }}>—</div>;
        }
        return (
          <div style={{ textAlign: 'right', paddingRight: '1rem', fontWeight: '600' }}>
            {new Intl.NumberFormat('cs-CZ', {
              style: 'currency',
              currency: 'CZK',
              maximumFractionDigits: 0
            }).format(castka)}
          </div>
        );
      }
    },
    {
      id: 'disk_status',
      size: 50, // Zmenšeno z 60 na 50px
      maxSize: 50,
      header: () => <div style={{ textAlign: 'center' }}>Disk</div>,
      cell: ({ row }) => {
        const template = row.original;
        const status = diskStatus[template.id];

        return (
          <div style={{ textAlign: 'center' }}>
            <FontAwesomeIcon
              icon={faHdd}
              onClick={() => handleVerifyTemplateMemo(template)}
              title={status?.error || 'Klikněte pro kontrolu existence souboru'}
              style={{
                color: status?.status === 'checking' ? '#f59e0b' :
                       status?.status === 'ok' ? '#059669' :
                       status?.status === 'error' ? '#dc2626' : '#6b7280',
                cursor: 'pointer',
                fontSize: '18px',
                animation: status?.status === 'checking' ? 'pulse 1s infinite' : 'none'
              }}
            />
          </div>
        );
      }
    },
    {
      accessorKey: 'aktivni',
      size: 50, // Zmenšeno z 60 na 50px
      maxSize: 50,
      header: () => <div style={{ textAlign: 'center' }}>Aktivní</div>,
      cell: ({ getValue }) => (
        <div style={{
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          fontSize: '18px'
        }}
        title={getValue() ? 'Aktivní' : 'Neaktivní'}
        >
          <FontAwesomeIcon
            icon={getValue() ? faCheckCircle : faTimesCircle}
            style={{ color: getValue() ? '#16a34a' : '#dc2626' }}
          />
        </div>
      )
    },
    {
      id: 'actions',
      size: 120, // Přesně 4×28px ikony + mezery + padding
      maxSize: 120,
      minSize: 120, // Pevná šířka
      enableResizing: false, // Zakázat měnění velikosti
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
      cell: ({ row }) => (
        <ActionCell>
          <div className="action-row">
            <IconButton
              className="download-original"
              onClick={() => handleDownloadOriginalMemo(row.original)}
              title="Stáhnout originální šablonu (bez mapování)"
              style={{ color: '#8b5cf6' }}
            >
              <FontAwesomeIcon icon={faFileWord} />
            </IconButton>
            <IconButton
              className="download"
              onClick={() => handleDownloadMemo(row.original)}
              title="Stáhnout"
            >
              <FontAwesomeIcon icon={faDownload} />
            </IconButton>
            {(() => {
              // Zkontroluj mapování v docx_mapping nebo mapovani_json
              const mappingSource = row.original.docx_mapping || row.original.mapovani_json;
              const hasMapping = mappingSource && (
                typeof mappingSource === 'string'
                  ? mappingSource !== '{}' && mappingSource.trim() !== ''
                  : Object.keys(mappingSource).length > 0
              );

              return (
                <IconButton
                  className="preview"
                  onClick={hasMapping ? () => handlePreviewMemo(row.original) : undefined}
                  title={hasMapping ? "Náhled s daty" : "Náhled není dostupný - chybí mapování polí"}
                  disabled={!hasMapping}
                  style={{
                    opacity: hasMapping ? 1 : 0.3,
                    cursor: hasMapping ? 'pointer' : 'not-allowed'
                  }}
                >
                  <FontAwesomeIcon icon={faEye} />
                </IconButton>
              );
            })()}
          </div>
          <div className="action-row">
            <IconButton
              className={row.original.aktivni ? 'toggle-active' : 'toggle-inactive'}
              onClick={() => handleToggleStatusMemo(row.original)}
              title={row.original.aktivni ? 'Deaktivovat šablonu' : 'Aktivovat šablonu'}
            >
              <FontAwesomeIcon icon={row.original.aktivni ? faToggleOn : faToggleOff} />
            </IconButton>
            <IconButton
              className="edit"
              onClick={() => handleEditMemo(row.original)}
              title="Upravit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </IconButton>
            {hasPermission('DICT_MANAGE') && (
              <IconButton
                className="delete"
                onClick={() => handleDeleteClickMemo(row.original)}
                title="Smazat úplně z disku (hard delete)"
              >
                <FontAwesomeIcon icon={faTrash} />
              </IconButton>
            )}
          </div>
        </ActionCell>
      )
    }
  ], [diskStatus, hasPermission, handleVerifyTemplateMemo, handleDownloadOriginalMemo, handleDownloadMemo, handlePreviewMemo, handleEditMemo, handleDeleteClickMemo, handleToggleStatusMemo]);

  // Helper funkce pro porovnání číselných hodnot s operátory
  const compareNumericValue = (itemValue, filterValue) => {
    if (!filterValue || filterValue.trim() === '') return true;

    const trimmed = filterValue.trim();
    const operatorMatch = trimmed.match(/^(>=|<=|>|<|=)\s*(.+)$/);

    if (!operatorMatch) {
      // Bez operátoru - obsahuje text
      return String(itemValue || '').toLowerCase().includes(trimmed.toLowerCase());
    }

    const operator = operatorMatch[1];
    const valueStr = operatorMatch[2].trim();
    const compareValue = parseFloat(valueStr);

    if (isNaN(compareValue)) return true; // Neplatné číslo - ignorovat

    const numericItemValue = parseFloat(itemValue);
    if (isNaN(numericItemValue)) return false; // Položka nemá číslo

    switch (operator) {
      case '>': return numericItemValue > compareValue;
      case '<': return numericItemValue < compareValue;
      case '>=': return numericItemValue >= compareValue;
      case '<=': return numericItemValue <= compareValue;
      case '=': return numericItemValue === compareValue;
      default: return true;
    }
  };

  // Filtrovaná data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Filtr aktivní/neaktivní
      if (aktivniFilter === 'aktivni' && !item.aktivni) return false; // Zobrazit jen aktivní (truthy)
      if (aktivniFilter === 'neaktivni' && item.aktivni) return false; // Zobrazit jen neaktivní (falsy)
      // 'all' - zobrazí vše (aktivní i neaktivní)

      // Filtr disk status
      if (diskFilter !== 'all') {
        const status = diskStatus[item.id];
        if (diskFilter === 'ok' && status?.status !== 'ok') return false;
        if (diskFilter === 'error' && status?.status !== 'error') return false;
      }

      // Global filter (Fulltext) - vyhledávání ve všech sloupcích BEZ DIAKRITIKY
      if (globalFilter) {
        const searchNormalized = removeDiacritics(globalFilter);

        // Získej kompletní jména uživatelů pro vyhledávání
        // POZOR: V DB je často celé jméno v jednom poli (např. "IT Super ADMIN 1")
        const vytvorilJmeno = item.vytvoril?.jmeno || '';
        const vytvorilPrijmeni = item.vytvoril?.prijmeni || '';
        const vytvorilUsername = item.vytvoril?.username || '';
        const vytvorilCele = [vytvorilJmeno, vytvorilPrijmeni, vytvorilUsername].filter(Boolean).join(' ');

        const aktualizovalJmeno = item.aktualizoval?.jmeno || '';
        const aktualizovalPrijmeni = item.aktualizoval?.prijmeni || '';
        const aktualizovalUsername = item.aktualizoval?.username || '';
        const aktualizovalCele = [aktualizovalJmeno, aktualizovalPrijmeni, aktualizovalUsername].filter(Boolean).join(' ');

        // Formátuj datum pro vyhledávání (včetně času)
        let dtVytvoreni = '';
        let dtVytvoreniCas = '';
        if (item.dt_vytvoreni) {
          const date = new Date(item.dt_vytvoreni);
          dtVytvoreni = date.toLocaleDateString('cs-CZ');
          dtVytvoreniCas = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        }

        // Formátuj velikost souboru pro vyhledávání
        const velikostKB = item.velikost_souboru ? (item.velikost_souboru / 1024).toFixed(1) + ' KB' : '';

        // Formátuj částku pro vyhledávání (včetně nuly)
        const castkaStr = (item.castka !== null && item.castka !== undefined) ? new Intl.NumberFormat('cs-CZ', {
          style: 'currency',
          currency: 'CZK',
          maximumFractionDigits: 0
        }).format(item.castka) : '';

        // Status aktivní/neaktivní jako text
        const aktivniText = item.aktivni ? 'aktivní' : 'neaktivní';

        const matchGlobal =
          removeDiacritics(item.nazev || '').includes(searchNormalized) ||
          removeDiacritics(item.popis || '').includes(searchNormalized) ||
          removeDiacritics(item.typ_dokumentu || '').includes(searchNormalized) ||
          removeDiacritics((item.verze || '').toString()).includes(searchNormalized) ||
          removeDiacritics(velikostKB).includes(searchNormalized) ||
          // Uživatelé - ROBUSTNÍ hledání (hledá i v jednotlivých slovech)
          removeDiacritics(vytvorilJmeno).includes(searchNormalized) ||
          removeDiacritics(vytvorilPrijmeni).includes(searchNormalized) ||
          removeDiacritics(vytvorilUsername).includes(searchNormalized) ||
          removeDiacritics(vytvorilCele).includes(searchNormalized) ||
          // Rozdělení jména na slova a hledání v každém slově zvlášť
          vytvorilJmeno.split(/\s+/).some(word => removeDiacritics(word).includes(searchNormalized)) ||
          vytvorilPrijmeni.split(/\s+/).some(word => removeDiacritics(word).includes(searchNormalized)) ||
          //
          removeDiacritics(aktualizovalJmeno).includes(searchNormalized) ||
          removeDiacritics(aktualizovalPrijmeni).includes(searchNormalized) ||
          removeDiacritics(aktualizovalUsername).includes(searchNormalized) ||
          removeDiacritics(aktualizovalCele).includes(searchNormalized) ||
          // Rozdělení jména na slova a hledání v každém slově zvlášť
          aktualizovalJmeno.split(/\s+/).some(word => removeDiacritics(word).includes(searchNormalized)) ||
          aktualizovalPrijmeni.split(/\s+/).some(word => removeDiacritics(word).includes(searchNormalized)) ||
          // Datum a čas
          removeDiacritics(dtVytvoreni).includes(searchNormalized) ||
          removeDiacritics(dtVytvoreniCas).includes(searchNormalized) ||
          // Částka
          removeDiacritics(castkaStr).includes(searchNormalized) ||
          // Název souboru
          removeDiacritics(item.nazev_souboru || '').includes(searchNormalized) ||
          // Aktivní status
          removeDiacritics(aktivniText).includes(searchNormalized);

        if (!matchGlobal) return false;
      }

      // Column filters
      if (columnFilters.nazev && !(item.nazev || '').toLowerCase().includes(columnFilters.nazev.toLowerCase())) return false;
      if (columnFilters.typ_dokumentu && !(item.typ_dokumentu || '').toLowerCase().includes(columnFilters.typ_dokumentu.toLowerCase())) return false;

      // Číselné filtry s operátory
      if (columnFilters.verze && !compareNumericValue(item.verze, columnFilters.verze)) return false;
      if (columnFilters.velikost_souboru && !compareNumericValue(item.velikost_souboru, columnFilters.velikost_souboru)) return false;

      if (columnFilters.dt_vytvoreni && !(item.dt_vytvoreni || '').toLowerCase().includes(columnFilters.dt_vytvoreni.toLowerCase())) return false;
      if (columnFilters.dt_upraveno && !(item.dt_upraveno || '').toLowerCase().includes(columnFilters.dt_upraveno.toLowerCase())) return false;

      return true;
    });
  }, [data, globalFilter, columnFilters, aktivniFilter, diskFilter, diskStatus]);

  // Table instance
  const table = useReactTable({
    data: filteredData, // UŽ OBSAHUJE náš custom global filter
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // NE getFilteredRowModel - už je filtrované!
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableGlobalFilter: false, // Vypnout TanStack global filter - máme vlastní!
    state: {
      // globalFilter NENÍ ve state - používáme custom
      pagination: { pageSize, pageIndex },
    },
    initialState: {
      pagination: { pageSize: 25, pageIndex: 0 },
      columnSizing: {
        verze: 50,
        velikost_souboru: 80,
        castka: 80,
        dt_vytvoreni: 90,
        dt_aktualizace: 90,
        aktivni: 70
      }
    },
    // onGlobalFilterChange VYPNUTO - máme vlastní global filter v filteredData
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function'
        ? updater({ pageSize, pageIndex })
        : updater;
      setPageSize(newState.pageSize);
      setPageIndex(newState.pageIndex);
    },
  });

  // Handlers
  const handleUpload = async (e) => {
    e.preventDefault();

    // Rozpoznat, zda jde o editaci nebo nové nahrání
    const isEditing = isEditMode && editingTemplate;
    const action = isEditing ? 'editace' : 'nahrání';

    console.log(`🔧 Zahajuji ${action} šablony:`, {
      isEditing,
      templateId: editingTemplate?.id,
      templateName: editingTemplate?.nazev,
      diskStatus: diskStatus[editingTemplate?.id],
      hasNewFile: !!uploadForm.file
    });

    // Validace povinných polí
    const errors = [];

    // Pro nové šablony je soubor vždy povinný
    // Pro editaci je povinný pouze pokud původní soubor neexistuje
    if (isEditing) {
      const templateDiskStatus = diskStatus[editingTemplate.id];
      const fileExists = templateDiskStatus?.status === 'ok';

      if (!fileExists && !uploadForm.file) {
        errors.push('Soubor je povinný - původní soubor neexistuje, musíte nahrát nový');
      }
    } else {
      if (!uploadForm.file) {
        errors.push('Soubor je povinný - vyberte DOCX soubor');
      }
    }

    if (!uploadForm.nazev?.trim()) {
      errors.push('Název šablony je povinný');
    }

    if (!uploadForm.typ_dokumentu) {
      errors.push('Typ dokumentu je povinný');
    }

    if (errors.length > 0) {
      showToast(`Vyplňte povinná pole:\n${errors.join('\n')}`, 'error');
      return;
    }

    try {
      console.log(`🔐 DocxSablonyTab ${action.charAt(0).toUpperCase() + action.slice(1)}:`, {
        username: user?.username || 'system',
        filename: uploadForm.file?.name,
        hasToken: !!token,
        endpoint: isEditing ?
          `${API_BASE_URL}sablona_docx/update` :
          `${API_BASE_URL}sablona_docx/create`
      });

      let result;

      if (isEditing) {
        // EDITACE - použij update API
        if (uploadForm.file) {
          // S novým souborem
          const formData = new FormData();
          formData.append('file', uploadForm.file);
          formData.append('nazev', uploadForm.nazev);
          formData.append('popis', uploadForm.popis);
          formData.append('typ_dokumentu', uploadForm.typ_dokumentu);
          formData.append('aktivni', uploadForm.aktivni ? '1' : '0');
          formData.append('verze', uploadForm.verze);
          formData.append('castka', uploadForm.castka || '0'); // ⭐ NOVÉ POLE: Částka
          console.log('💾 [DOCX Tab] Ukládám částku (s novým souborem):', uploadForm.castka);
          formData.append('platnost_od', uploadForm.platnost_od);
          formData.append('platnost_do', uploadForm.platnost_do);
          // ⭐ Backend očekává 'mapovani_json' pro DOCX mapování
          if (uploadForm.docx_mapping && Object.keys(uploadForm.docx_mapping).length > 0) {
            const docxMappingJson = JSON.stringify(uploadForm.docx_mapping);
            formData.append('mapovani_json', docxMappingJson);
            console.log('💾 Ukládám DOCX mapování (s novým souborem) jako mapovani_json:', {
              mapping: uploadForm.docx_mapping,
              jsonString: docxMappingJson,
              fieldsCount: Object.keys(uploadForm.docx_mapping).length
            });
          } else {
            console.log('⚠️ DOCX mapování je prázdné nebo neexistuje (s novým souborem)');
            formData.append('mapovani_json', uploadForm.mapovani_json || '');
          }

          result = await docxApi.updateWithFile(token, editingTemplate.id, formData);
        } else {
          // Bez nového souboru - pouze metadata
          const updateData = {
            nazev: uploadForm.nazev,
            popis: uploadForm.popis,
            typ_dokumentu: uploadForm.typ_dokumentu,
            aktivni: uploadForm.aktivni ? 1 : 0,
            verze: uploadForm.verze,
            castka: parseFloat(uploadForm.castka) || 0, // ⭐ NOVÉ POLE: Částka
            platnost_od: uploadForm.platnost_od,
            platnost_do: uploadForm.platnost_do,
            mapovani_json: uploadForm.mapovani_json
          };

          console.log('💾 [DOCX Tab] Ukládám částku (bez nového souboru):', updateData.castka, 'původní:', uploadForm.castka);

          // Přidáme DOCX mapování pokud existuje
          if (uploadForm.docx_mapping && Object.keys(uploadForm.docx_mapping).length > 0) {
            updateData.docx_mapping = JSON.stringify(uploadForm.docx_mapping);
            console.log('💾 Ukládám DOCX mapování (bez souboru):', {
              mapping: uploadForm.docx_mapping,
              jsonString: updateData.docx_mapping,
              fieldsCount: Object.keys(uploadForm.docx_mapping).length
            });
          } else {
            console.log('⚠️ DOCX mapování je prázdné nebo neexistuje (bez souboru)');
          }

          console.log('📤 Posílám updateData na backend:', updateData);
          console.log('📤 castka v updateData:', updateData.castka, typeof updateData.castka);

          result = await docxApi.update(token, editingTemplate.id, updateData);
        }
      } else {
        // NOVÉ NAHRÁNÍ
        const formData = new FormData();
        formData.append('file', uploadForm.file);
        formData.append('nazev', uploadForm.nazev);
        formData.append('popis', uploadForm.popis);
        formData.append('typ_dokumentu', uploadForm.typ_dokumentu);
        formData.append('aktivni', uploadForm.aktivni ? '1' : '0');
        formData.append('verze', uploadForm.verze);
        formData.append('castka', uploadForm.castka || '0'); // ⭐ NOVÉ POLE: Částka
        console.log('💾 [DOCX Tab] Ukládám částku (při vytvoření):', uploadForm.castka);
        formData.append('platnost_od', uploadForm.platnost_od);
        formData.append('platnost_do', uploadForm.platnost_do);
        // ⭐ Backend očekává 'mapovani_json' pro DOCX mapování
        if (uploadForm.docx_mapping && Object.keys(uploadForm.docx_mapping).length > 0) {
          const docxMappingJson = JSON.stringify(uploadForm.docx_mapping);
          formData.append('mapovani_json', docxMappingJson);
          console.log('💾 Ukládám DOCX mapování (při vytvoření) jako mapovani_json:', {
            mapping: uploadForm.docx_mapping,
            jsonString: docxMappingJson,
            fieldsCount: Object.keys(uploadForm.docx_mapping).length
          });
        } else {
          console.log('⚠️ DOCX mapování je prázdné nebo neexistuje (při vytvoření)');
          formData.append('mapovani_json', uploadForm.mapovani_json || '');
        }

        result = await docxApi.create(token, formData);
      }

      console.log(`🔥 DOCX ${action.charAt(0).toUpperCase() + action.slice(1)} Result:`, result);

      if (result.status === 'ok') {
        showToast(
          isEditing ?
            `✅ Šablona "${uploadForm.nazev}" byla úspěšně aktualizována` :
            '✅ Šablona byla úspěšně nahrána',
          'success'
        );

        // Vyčistit stavy
        setShowUploadModal(false);
        setIsEditMode(false);
        setEditingTemplate(null);
        setUploadForm({ ...defaultUploadForm });

        // Znovu načíst data
        loadData();
      } else {
        // Pokud result obsahuje HTML obsah, zobraz ho
        if (result.htmlContent) {
          console.error('🔥 Server vrátil HTML:', result.htmlContent);
          showToast(`❌ Server Error (${result.status}): ${result.htmlContent.substring(0, 500)}...`, 'error');
        } else {
          throw new Error(result.error || `Chyba při ${action}`);
        }
      }
    } catch (error) {
      console.error(`🔥 ${action.charAt(0).toUpperCase() + action.slice(1)} error (full):`, error);

      // Pokud je to fetch error s response, zkus získat HTML
      if (error.response) {
        console.error('🔥 Response status:', error.response.status);
        console.error('🔥 Response headers:', error.response.headers);
        console.error('🔥 Response data:', error.response.data);

        // Zobraz celou HTML response
        showToast(`❌ Server Error (${error.response.status}): ${JSON.stringify(error.response.data)}`, 'error');
      } else if (error.message && error.message.includes('Failed to fetch')) {
        showToast('❌ Síťová chyba: Server neodpovídá nebo je nedostupný', 'error');
      } else {
        showToast(`❌ ${action.charAt(0).toUpperCase() + action.slice(1)} Error: ${error.message || 'Neznámá chyba'}`, 'error');
      }
    }
  };

  const handleToggleStatus = async (template) => {
    try {
      const newStatus = !template.aktivni;
      const action = newStatus ? 'aktivace' : 'deaktivace';

      console.log(`🔄 DOCX Template Toggle Status:`, {
        templateId: template.id,
        templateName: template.nazev,
        currentStatus: template.aktivni,
        newStatus: newStatus,
        action: action
      });

      // Okamžitá aktualizace lokálního stavu
      setData(prevData =>
        prevData.map(t =>
          t.id === template.id
            ? { ...t, aktivni: newStatus ? 1 : 0 }
            : t
        )
      );

      let result;
      if (newStatus) {
        // Aktivace - použij update API
        console.log(`API CALL: docxApi.update(token, ${template.id}, { aktivni: 1 })`);
        result = await docxApi.update(token, template.id, { aktivni: 1 });
        console.log(`BE RESPONSE aktivace:`, JSON.stringify(result, null, 2));
      } else {
        // Deaktivace - použij deactivate API
        console.log(`API CALL: docxApi.deactivate(token, ${template.id})`);
        result = await docxApi.deactivate(token, template.id);
        console.log(`BE RESPONSE deaktivace:`, JSON.stringify(result, null, 2));
      }

      console.log(`Kontrola vysledku - newStatus: ${newStatus}, result.status: ${result.status}, result.success: ${result.success}`);

      if ((newStatus && result.status === 'ok') || (!newStatus && result.success)) {
        showToast(
          `✅ Šablona "${template.nazev}" byla úspěšně ${newStatus ? 'aktivována' : 'deaktivována'}`,
          'success'
        );
      } else {
        // Rollback při chybě
        setData(prevData =>
          prevData.map(t =>
            t.id === template.id
              ? { ...t, aktivni: template.aktivni }
              : t
          )
        );
        throw new Error(result.error || `Chyba při ${action}`);
      }
    } catch (error) {
      console.error('Toggle status error:', error);

      // Rollback při chybě
      setData(prevData =>
        prevData.map(t =>
          t.id === template.id
            ? { ...t, aktivni: template.aktivni }
            : t
        )
      );

      showToast(`❌ Chyba při změně stavu: ${error.message}`, 'error');
    }
  };

  // Stažení originální šablony (bez zpracování mapování)
  const handleDownloadOriginal = async (template) => {
    try {
      console.log('📥 Stahování originální DOCX šablony:', {
        templateId: template.id,
        templateName: template.nazev,
        username: user?.username
      });

      setProgress(true);
      const blob = await docxApi.download(token, template.id);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.nazev_souboru || `${template.nazev}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('✅ Originální šablona stažena', 'success');
    } catch (error) {
      console.error('Download original error:', error);
      showToast(`❌ Chyba při stahování: ${error.message}`, 'error');
    } finally {
      setProgress(false);
    }
  };

  const handleDownload = async (template) => {
    try {
      console.log('📥 DOCX Download Request:', {
        templateId: template.id,
        templateName: template.nazev,
        username: user?.username,
        hasMapping: !!(template.docx_mapping || template.mapovani_json)
      });

      // Zkontroluj, jestli má šablona mapování
      const mappingSource = template.docx_mapping || template.mapovani_json;
      const hasMapping = mappingSource && (
        typeof mappingSource === 'string'
          ? mappingSource !== '{}' && mappingSource.trim() !== ''
          : Object.keys(mappingSource).length > 0
      );

      if (!hasMapping) {
        // Bez mapování - stáhni přímo
        console.log('📄 Stahuji šablonu bez mapování (prázdná)');
        const blob = await docxApi.download(token, template.id);

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = template.nazev_souboru || `${template.nazev}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }

      // S mapováním - stáhni, naplň pole a pak stáhni
      console.log('📝 Stahuji šablonu s mapováním - budu plnit pole');
      setProgress(true);

      // Stáhni šablonu jako File
      const file = await downloadDocxSablonaAsFile({
        token,
        username: user?.username,
        id: template.id,
        fileName: template.nazev_souboru || 'template.docx'
      });

      // Parsuj mapování
      const mapping = typeof mappingSource === 'string'
        ? JSON.parse(mappingSource)
        : mappingSource;

      // Import funkcí pro rozšířené mapování
      const { createEnhancedFieldMapping, createFieldValuesFromMapping, getOrderFieldsForMapping } = await import('../../../utils/docx/docxProcessor.js');
      const { processDocxWithFields } = await import('../../../utils/docx/processDocx.js');

      // Získej definice polí a vytvoř rozšířené mapování
      const orderFields = getOrderFieldsForMapping();
      const enhancedMapping = createEnhancedFieldMapping(mapping, orderFields);

      // Vytvoř field values s podporou složených polí
      const fieldValues = createFieldValuesFromMapping(enhancedMapping, null);

      console.log('🔧 Zpracovávám DOCX s rozšířenými poli:', fieldValues);
      console.log('📊 Základní mapování:', mapping);
      console.log('📊 Rozšířené mapování:', enhancedMapping);

      // Zpracuj DOCX - rozbal, nahraď pole, zabal zpět
      const result = await processDocxWithFields({
        file: file,
        fieldValues: fieldValues,
        keepEmptyFields: false // Odstraň nevyplněná pole
      });

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('✅ DOCX zpracován:', result.stats);

      // Stáhni výsledný soubor
      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.nazev_souboru || `${template.nazev}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`✅ Staženo s ${result.stats.replacedCount} vyplněnými poli`, 'success');

    } catch (error) {
      console.error('Download error:', error);
      showToast(`❌ Chyba při stahování: ${error.message}`, 'error');
    } finally {
      setProgress(false);
    }
  };

  // ============================================================================
  // UNIVERZÁLNÍ HTML NÁHLED - Společná funkce pro všechny typy náhledu
  // ============================================================================
  const generateUniversalHtmlPreview = async (file, mapping, templateName = '') => {
    if (!file || !mapping || Object.keys(mapping).length === 0) {
      throw new Error('Pro náhled je potřeba DOCX soubor a definované mapování');
    }

    try {
      console.log('🎨 Generuji univerzální HTML náhled...', {
        file: file.name,
        mappingFields: Object.keys(mapping).length,
        mapping: mapping
      });

      // Import funkcí pro rozšířené mapování
      const { createEnhancedFieldMapping, createFieldValuesFromMapping, getOrderFieldsForMapping } = await import('../../../utils/docx/docxProcessor.js');
      const { processDocxWithFields } = await import('../../../utils/docx/processDocx.js');

      // Získej definice polí
      const orderFields = getOrderFieldsForMapping();

      // Vytvoř rozšířené mapování včetně složených polí
      const enhancedMapping = createEnhancedFieldMapping(mapping, orderFields);

      // Vytvoř field values pro preview (bez skutečných dat)
      const fieldValues = createFieldValuesFromMapping(enhancedMapping, null);

      console.log('📋 Enhanced mapping:', enhancedMapping);
      console.log('📋 Field values pro náhled:', fieldValues);

      // Zpracuj DOCX a nahraď pole - rozbal ZIP, nahraď v XML, zabal zpět
      const result = await processDocxWithFields({
        file: file,
        fieldValues: fieldValues,
        keepEmptyFields: true // Zachovat pole bez hodnoty
      });

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('📊 Statistiky náhrady:', result.stats);

      // Teď konvertuj výsledný DOCX na HTML pomocí mammoth
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer: await result.blob.arrayBuffer() });
      let html = htmlResult.value;

      // Styluj DB pole v HTML - použij rozšířené mapování pro lepší vizualizaci
      Object.entries(mapping).forEach(([docxField, dbField]) => {
        // Vytvořit reprezentativní hodnoty podle typu pole
        let displayValue = '';
        const dbFieldLower = dbField.toLowerCase();

        if (dbFieldLower.includes('cislo') || dbFieldLower.includes('number')) {
          displayValue = Math.floor(Math.random() * 90000) + 10000; // 5-ciferné číslo
        } else if (dbFieldLower.includes('datum') || dbFieldLower.includes('date')) {
          displayValue = new Date().toLocaleDateString('cs-CZ');
        } else if (dbFieldLower.includes('cena') || dbFieldLower.includes('price') || dbFieldLower.includes('amount')) {
          displayValue = (Math.random() * 50000 + 1000).toLocaleString('cs-CZ', {
            style: 'currency',
            currency: 'CZK'
          });
        } else if (dbFieldLower.includes('email')) {
          displayValue = 'priklad@email.cz';
        } else if (dbFieldLower.includes('telefon') || dbFieldLower.includes('phone')) {
          displayValue = '+420 777 123 456';
        } else if (dbFieldLower.includes('adresa') || dbFieldLower.includes('address')) {
          displayValue = 'Příkladová ulice 123, 110 00 Praha';
        } else if (dbFieldLower.includes('nazev') || dbFieldLower.includes('jmeno') || dbFieldLower.includes('name')) {
          displayValue = 'Příkladové jméno/název';
        } else {
          displayValue = `[${dbField}]`;
        }

        // Nahraď DOCX pole reprezentativními hodnotami
        const regex = new RegExp(`\\{${docxField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
        const styledValue = `<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-weight: 600; border: 1px solid #93c5fd;">${displayValue}</span>`;
        html = html.replace(regex, styledValue);
      });

      // Vytvoř kompletní HTML dokument s CSS styly
      const fullHtml = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Náhled DOCX šablony - ${templateName || 'Bez názvu'}</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.4;
      margin: 40px;
      background: white;
      color: #000;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #1f2937;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    p {
      margin-bottom: 1em;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .field-highlight {
      background: #dbeafe !important;
      color: #1e40af !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      font-weight: 600 !important;
      border: 1px solid #93c5fd !important;
    }
  </style>
</head>
<body>
  <div style="margin-bottom: 20px; padding: 10px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px;">
    <strong>📄 Náhled DOCX šablony:</strong> ${templateName || 'Bez názvu'}<br>
    <small>Pole jsou zvýrazněna modře s ukázkovými hodnotami podle typu</small>
  </div>
  ${html}
</body>
</html>`;

      // Otevři v nové záložce
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Uvolni URL po chvíli
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      console.log(`✅ HTML náhled vygenerován: ${result.stats.replacedCount} polí nahrazeno (včetně ${Object.keys(enhancedMapping).length - Object.keys(mapping).length} složených polí)`);

      return { success: true, stats: result.stats, enhancedMapping };

    } catch (error) {
      console.error('❌ Chyba při generování HTML náhledu:', error);
      throw error;
    }
  };

  // ============================================================================
  // PREVIEW HANDLER - Otevření náhledu DOCX z tabulky (nyní také v nové záložce)
  // ============================================================================
  const handlePreview = async (template) => {
    console.log('👁️ Zahajuji preview šablony z tabulky:', template);

    // Zkontroluj, zda má šablona mapování
    const mappingSource = template.docx_mapping || template.mapovani_json;
    const hasMapping = mappingSource &&
      (typeof mappingSource === 'string' ? mappingSource !== '{}' : Object.keys(mappingSource).length > 0);

    if (!hasMapping) {
      showToast('⚠️ Šablona nemá definované mapování polí. Nejdříve upravte šablonu a namapujte pole.', 'warning');
      return;
    }

    try {
      setProgress(30);

      // Stáhni DOCX soubor podle ID (guid neexistuje v DB)
      const file = await downloadDocxSablonaAsFile({
        token,
        username: user?.username,
        id: template.id,
        fileName: template.nazev_souboru || 'template.docx'
      });

      if (!file) {
        throw new Error('Nepodařilo se stáhnout soubor šablony');
      }

      console.log('📄 Soubor připraven pro preview:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      setProgress(60);

      // Použij univerzální funkci pro HTML náhled
      let mapping = mappingSource;
      if (typeof mapping === 'string') {
        try {
          mapping = JSON.parse(mapping);
        } catch (e) {
          console.warn('⚠️ Nepodařilo se parsovat mapování z stringu:', e);
          mapping = {};
        }
      }

      await generateUniversalHtmlPreview(file, mapping, template.nazev);
      showToast('✅ Náhled otevřen v nové záložce', 'success');

    } catch (error) {
      console.error('❌ Chyba při načítání náhledu:', error);
      showToast(`Chyba při načítání náhledu: ${error.message}`, 'error');
    } finally {
      setProgress(false);
    }
  };

  const handleEdit = (template) => {
    // Nastavit editační mód
    setIsEditMode(true);
    setEditingTemplate(template);

    // Naplnit formulář aktuálními daty šablony
    let existingDocxMapping = {};
    try {
      // ⚠️ OPRAVA: Backend používá primárně 'mapovani_json' pro DOCX mapování
      const mappingSource = template.mapovani_json || template.docx_mapping;

      if (mappingSource) {
        existingDocxMapping = typeof mappingSource === 'string'
          ? JSON.parse(mappingSource)
          : mappingSource;

        // Nastavit viditelnost mapovací sekce pokud existuje mapování
        if (Object.keys(existingDocxMapping).length > 0) {
          setMappingSectionVisible(true);
        }
      } else {
        setMappingSectionVisible(false);
      }
    } catch (error) {
      console.error('❌ Chyba při parsování DOCX mapování:', error);
      existingDocxMapping = {};
      setMappingSectionVisible(false);
    }

    // Připravit mapovani_json pro textarea (musí být string)
    let mapovaniJsonString = '';
    if (template.mapovani_json) {
      mapovaniJsonString = typeof template.mapovani_json === 'string'
        ? template.mapovani_json
        : JSON.stringify(template.mapovani_json, null, 2);
    } else if (Object.keys(existingDocxMapping).length > 0) {
      mapovaniJsonString = JSON.stringify(existingDocxMapping, null, 2);
    }

    const formData = {
      file: null, // Soubor se nahrává znovu pouze pokud je třeba
      nazev: template.nazev || '',
      popis: template.popis || '',
      typ_dokumentu: template.typ_dokumentu || '',
      aktivni: template.aktivni === 1 || template.aktivni === '1' || template.aktivni === true,
      verze: template.verze || '1.0',
      castka: template.castka !== undefined && template.castka !== null ? template.castka : '', // ⭐ Správné načítání (0 je validní hodnota!)
      platnost_od: template.platnost_od || '',
      platnost_do: template.platnost_do || '',
      mapovani_json: mapovaniJsonString,
      docx_mapping: existingDocxMapping
    };

    setUploadForm(formData);

    // Zobrazit stejný modal jako pro upload, ale v editačním módu
    setShowUploadModal(true);

    // Pokusit se stáhnout existující DOCX soubor pro analýzu mapování
    // (pouze pokud má soubor na disku status 'ok')
    const templateDiskStatus = diskStatus[template.id];
    if (templateDiskStatus?.status === 'ok') {
      downloadExistingDocxForAnalysis(template);
    } else {
      // Soubor na disku neexistuje nebo má chybu - zkusit zobrazit mapování i bez souboru
      setDownloadedTemplateFile(null);
      // Pokud existuje mapování, zobrazit sekci i bez souboru
      if (existingDocxMapping && Object.keys(existingDocxMapping).length > 0) {
        setMappingSectionVisible(true);
        console.log('📝 Zobrazuji mapovací sekci s existujícím mapováním bez DOCX souboru');
      } else {
        setMappingSectionVisible(false);
        console.log('📝 DOCX soubor není k dispozici na disku, mapování nebude zobrazeno');
      }
    }
  };

  const handleDeleteClick = (template) => {
    setSelectedTemplate(template);
    setShowConfirmDelete(true);
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      // Trash tlačítko volá vždy jen DICT_MANAGE s deleteAction='delete'
      console.log('🗑️ DOCX Hard Delete Request:', {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.nazev,
        username: user?.username,
        userRole: user?.role
      });

      // Hard delete - skutečné smazání z DB i disku
      const result = await docxApi.delete(token, selectedTemplate.id);

      console.log('🗑️ DOCX Hard Delete Result:', result);

      if (result.status === 'ok') {
        showToast('✅ Šablona a soubor byly úspěšně smazány z disku', 'success');
        loadData();
      } else {
        throw new Error(result.error || 'Chyba při mazání');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast(error.message || 'Chyba při mazání šablony', 'error');
    } finally {
      setShowConfirmDelete(false);
      setSelectedTemplate(null);
    }
  };

  const handleVerify = async () => {
    try {
      startProgress();
      setVerifyResult(null);

      console.log('🔍 DOCX Verify Request:', {
        username: user?.username,
        endpoint: `${API_BASE_URL}sablona_docx/verify`
      });

      const result = await docxApi.verify(token);

      console.log('🔍 DOCX Verify Result:', result);

      if (result.status === 'ok') {
        setVerifyResult(result);
        setShowVerifyModal(true);

        const summary = result.summary;
        if (summary.integrity_ok) {
          showToast(`✅ Integrita OK - ${summary.valid_templates}/${summary.total_templates} šablon v pořádku`, 'success');
        } else {
          showToast(`⚠️ Nalezeny problémy - ${summary.missing_files} chybějících souborů`, 'warning');
        }
      } else {
        throw new Error(result.error || 'Chyba při verifikaci');
      }
    } catch (error) {
      console.error('Verify error:', error);
      showToast(error.message || 'Chyba při verifikaci šablon', 'error');
    } finally {
      doneProgress();
    }
  };

  const handleVerifyTemplate = async (template) => {
    try {
      // Set checking status
      setDiskStatus(prev => ({
        ...prev,
        [template.id]: { status: 'checking' }
      }));

      console.log('🔍 DOCX Template Verify Single:', {
        templateId: template.id,
        templateName: template.nazev,
        username: user?.username
      });

      // Použij nové verifySingle API
      const result = await docxApi.verifySingle(token, template.id);

      if (result.status === 'ok' && result.data) {
        const templateResult = result.data;
        const status = templateResult.file_exists ? 'ok' : 'error';
        const error = templateResult.file_exists ? null : 'Soubor neexistuje na disku';

        setDiskStatus(prev => ({
          ...prev,
          [template.id]: { status, error }
        }));

        // ✅ Zbytečné toasty odstraněny - status je vidět v ikoně u šablony
        // Chybové stavy se zobrazují červenou ikonou, OK stavy zelenou
      } else {
        throw new Error(result.error || result.message || 'Chyba při verifikaci šablony');
      }
    } catch (error) {
      console.error('Template verify error:', error);
      setDiskStatus(prev => ({
        ...prev,
        [template.id]: { status: 'error', error: error.message }
      }));
      showToast(`❌ Chyba při verifikaci: ${error.message}`, 'error');
    }
  };

  // Kontrola před otevřením file dialogu
  const handleFileInputClick = (fileInputId) => {
    const hasExistingFile = uploadForm.file || downloadedTemplateFile;

    if (hasExistingFile) {
      // Zobrazit potvrzovací dialog před otevřením file dialogu
      setPendingFileInputId(fileInputId);
      setShowFileReplaceConfirm(true);
      return;
    }

    // Pokud není soubor, přímo otevřít file dialog
    document.getElementById(fileInputId)?.click();
  };

  const handleFileSelect = (file) => {
    // Validate file
    if (!file.name.toLowerCase().endsWith('.docx')) {
      showToast('Pouze DOCX soubory jsou povoleny', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Soubor je příliš velký (max 10MB)', 'error');
      return;
    }

    // Přímo nahradit soubor
    performFileReplace(file);
  };

  const performFileReplace = (file) => {
    // Nahrazení předchozího souboru (pouze jeden soubor najednou)
    const detectedType = detectDocumentType(file.name);

    setUploadForm(prev => ({
      ...prev,
      file,
      // Auto-vyplnění názvu ze jména souboru (bez .docx)
      nazev: prev.nazev || file.name.replace(/\.docx$/i, ''),
      // Auto-detekce typu dokumentu
      typ_dokumentu: prev.typ_dokumentu || detectedType,
      // Reset mapování při výměně souboru
      json_mapovani: {}
    }));

    // Pro upload mode se mapovací sekce zobrazí automaticky díky JSX podmínce
    // Pro edit mode potřebujeme explicitně nastavit stav a aktualizovat pole
    if (isEditMode && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setMappingSectionVisible(true);

      // Automaticky extrahuj pole z nového souboru
      console.log('🔄 Automaticky aktualizuji pole po výběru nového souboru v edit módu');
      try {
        // Import DOCX procesoru pro extrakci polí
        import('../../../utils/docx/docxProcessor.js').then(({ extractDocxFields }) => {
          extractDocxFields(file).then(fields => {
            console.log('🔍 Extrahovaná pole z nového souboru:', fields);
            // Pole se automaticky aktualizují v DocxMappingExpandableSection komponentě
            showToast('✅ Pole úspěšně aktualizována z nového souboru', 'success');
          }).catch(error => {
            console.error('❌ Chyba při extrakci polí:', error);
            showToast('⚠️ Nepodařilo se extrahovat pole z nového souboru', 'warning');
          });
        });
      } catch (error) {
        console.error('❌ Chyba při načítání DOCX procesoru:', error);
      }
    }

    // ✅ Zbytečné toasty odstraněny - uživatel vidí vybraný soubor v UI
  };

  // Funkce pro odstranění souboru šablony (zachová záznam v DB)
  const handleRemoveTemplateFile = async (template) => {
    try {
      console.log('🗑️ Odstraňuji soubor šablony:', template);

      await removeDocxSablonaFile({
        token,
        username: user?.username || 'system',
        id: template.id
      });

      // Refresh seznamu pro aktualizaci disk status
      await loadData();

      // ✅ Zbytečný toast odstraněn - uživatel vidí změnu v UI

    } catch (error) {
      console.error('❌ Chyba při odstraňování souboru šablony:', error);
      showToast(`Chyba při odstraňování souboru: ${error.message}`, 'error');
    }
  };

  // Funkce pro stažení existujícího DOCX souboru při editaci
  const downloadExistingDocxForAnalysis = async (template) => {
    try {
      const file = await downloadDocxSablonaAsFile({
        token,
        username: user?.username || 'system',
        id: template.id,
        fileName: template.nazev_souboru || `${template.nazev}.docx`
      });

      setDownloadedTemplateFile(file);
      setMappingSectionVisible(true);
      // ✅ Zbytečný toast odstraněn - interní technická operace

      return file;
    } catch (error) {
      console.error('❌ Chyba při stahování DOCX souboru:', error);
      setDownloadedTemplateFile(null);
      setMappingSectionVisible(false);
      showToast(`Soubor není k dispozici pro analýzu: ${error.message}`, 'warning');
      return null;
    }
  };

  // Handler pro změnu DOCX mapování
  const handleDocxMappingChange = (mapping) => {
    setUploadForm(prev => ({
      ...prev,
      docx_mapping: mapping,
      mapovani_json: JSON.stringify(mapping, null, 2)
    }));

    // 📝 Mapování bylo aktualizováno - náhled se generuje pouze manuálně na tlačítko
  };

  // Handler pro kopírování JSON
  const handleCopyJson = async () => {
    const jsonContent = uploadForm.mapovani_json || JSON.stringify(uploadForm.docx_mapping || {}, null, 2);
    try {
      await navigator.clipboard.writeText(jsonContent);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
      showToast('JSON mapování zkopírováno', 'success');
    } catch (error) {
      console.error('Chyba při kopírování:', error);
      showToast('Chyba při kopírování JSON', 'error');
    }
  };

  // Handler pro generování inline náhledu
  // ============================================================================
  // INLINE PREVIEW HANDLER - Náhled v edit dialogu (nyní také v nové záložce)
  // ============================================================================
  const handleGenerateInlinePreview = async () => {
    if (!downloadedTemplateFile || !uploadForm.docx_mapping || Object.keys(uploadForm.docx_mapping).length === 0) {
      showToast('⚠️ Pro náhled je potřeba DOCX soubor a definované mapování', 'warning');
      return;
    }

    try {
      setGeneratingPreview(true);

      // Použij univerzální funkci pro HTML náhled
      await generateUniversalHtmlPreview(downloadedTemplateFile, uploadForm.docx_mapping, uploadForm.nazev);
      showToast('✅ Náhled otevřen v nové záložce', 'success');

    } catch (error) {
      console.error('❌ Chyba při generování náhledu:', error);
      showToast(`Chyba při generování náhledu: ${error.message}`, 'error');
    } finally {
      setGeneratingPreview(false);
    }
  };

  return (
    <Container>
      <ActionBar>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Hledat v názvu šablony, typu, verzi, uživateli..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          {globalFilter && (
            <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        <ActionButton onClick={handleOpenUploadModal} $primary>
          <FontAwesomeIcon icon={faUpload} />
          Nahrát šablonu
        </ActionButton>
      </ActionBar>

      <TableContainer>
        <Table>
          <thead>
            {/* První řádek - názvy sloupců */}
            {table.getHeaderGroups().map((headerGroup) => (
              <TableHeaderRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeader
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && header.column.getIsSorted() && (
                        <FontAwesomeIcon
                          icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                          style={{ fontSize: '0.75em', marginLeft: '0.25rem' }}
                        />
                      )}
                    </div>
                  </TableHeader>
                ))}
              </TableHeaderRow>
            ))}

            {/* Druhý řádek - filtry pro jednotlivé sloupce */}
            <TableHeaderRow>
              {table.getHeaderGroups()[0]?.headers.map(header => (
                <TableHeader key={`filter-${header.id}`} style={{
                  padding: '0.5rem',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  {header.id === 'actions' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '32px'
                    }}>
                      <FilterActionButton
                        onClick={() => {
                          setColumnFilters({});
                          setAktivniFilter('all');
                          setDiskFilter('all');
                        }}
                        title="Vymazat všechny filtry sloupců"
                        disabled={Object.keys(columnFilters).length === 0 && aktivniFilter === 'all' && diskFilter === 'all'}
                      >
                        <FontAwesomeIcon icon={faEraser} />
                      </FilterActionButton>
                    </div>
                  ) : header.id === 'disk_status' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '32px'
                    }}>
                      <IconFilterButton
                        onClick={() => {
                          // Cyklus: all -> ok -> error -> all
                          if (diskFilter === 'all') {
                            setDiskFilter('ok');
                          } else if (diskFilter === 'ok') {
                            setDiskFilter('error');
                          } else {
                            setDiskFilter('all');
                          }
                        }}
                        title={
                          diskFilter === 'all' ? 'Zobrazeny všechny (klikněte pro filtr OK)' :
                          diskFilter === 'ok' ? 'Zobrazeny pouze OK (klikněte pro filtr chyb)' :
                          'Zobrazeny pouze chyby (klikněte pro zobrazení všech)'
                        }
                      >
                        {diskFilter === 'all' ? (
                          <div style={{ position: 'relative', width: '20px', height: '20px' }}>
                            <FontAwesomeIcon
                              icon={faHdd}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
                                color: '#059669'
                              }}
                            />
                            <FontAwesomeIcon
                              icon={faHdd}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
                                color: '#dc2626'
                              }}
                            />
                          </div>
                        ) : diskFilter === 'ok' ? (
                          <FontAwesomeIcon icon={faHdd} style={{ color: '#059669' }} />
                        ) : (
                          <FontAwesomeIcon icon={faHdd} style={{ color: '#dc2626' }} />
                        )}
                      </IconFilterButton>
                    </div>
                  ) : header.column.columnDef.accessorKey === 'aktivni' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '32px'
                    }}>
                      <IconFilterButton
                        onClick={() => {
                          // Cyklus: all -> aktivni -> neaktivni -> all
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
                  ) : (
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder={`Hledat...`}
                        value={columnFilters[header.column.columnDef.accessorKey] || ''}
                        onChange={(e) => {
                          const newFilters = { ...columnFilters };
                          if (e.target.value) {
                            newFilters[header.column.columnDef.accessorKey] = e.target.value;
                          } else {
                            delete newFilters[header.column.columnDef.accessorKey];
                          }
                          setColumnFilters(newFilters);
                        }}
                      />
                      {columnFilters[header.column.columnDef.accessorKey] && (
                        <ColumnClearButton
                          onClick={() => {
                            const newFilters = { ...columnFilters };
                            delete newFilters[header.column.columnDef.accessorKey];
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
            </TableHeaderRow>
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <TableCell colSpan={columns.length}>
                  <EmptyState>
                    <FontAwesomeIcon icon={faFileWord} size="3x" style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                    <h3>Žádné šablony</h3>
                    <p>Zatím nebyly nahrány žádné DOCX šablony.</p>
                  </EmptyState>
                </TableCell>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  $isEven={index % 2 === 0}
                  $isInactive={row.original.aktivni === 0}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </tbody>
        </Table>

        <Pagination>
          <PaginationInfo>
            Zobrazeno {Math.min(pageIndex * pageSize + 1, data.length)} - {Math.min((pageIndex + 1) * pageSize, data.length)} z {data.length} šablon
          </PaginationInfo>

          <PaginationControls>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
              Zobrazit:
            </span>
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

            <PageButton
              onClick={goToFirstPage}
              disabled={pageIndex === 0}
            >
              ««
            </PageButton>
            <PageButton
              onClick={goToPreviousPage}
              disabled={pageIndex === 0}
            >
              ‹
            </PageButton>

            <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
              Stránka {pageIndex + 1} z {Math.max(1, table.getPageCount())}
            </span>

            <PageButton
              onClick={goToNextPage}
              disabled={pageIndex >= table.getPageCount() - 1}
            >
              ›
            </PageButton>
            <PageButton
              onClick={goToLastPage}
              disabled={pageIndex >= table.getPageCount() - 1}
            >
              »»
            </PageButton>
          </PaginationControls>
        </Pagination>
      </TableContainer>

      {/* Upload Modal - React Portal pro fullscreen support */}
      {showUploadModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: isFullscreen ? '0' : '132px',
            left: '0',
            right: '0',
            bottom: isFullscreen ? '0' : '60px',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000',
            padding: isFullscreen ? '0' : '1rem',
            cursor: 'default'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: isFullscreen ? '0' : '16px',
              width: isFullscreen ? '100vw' : '100%',
              maxWidth: isFullscreen ? 'none' : (
                ((!isEditMode && uploadForm.file && uploadForm.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
                 (isEditMode && downloadedTemplateFile)) ? '1464px' : '900px'  // 1400px + 64px (4rem)
              ),
              height: isFullscreen ? '100vh' : 'calc(100vh - 280px)',
              maxHeight: isFullscreen ? 'none' : 'calc(100vh - 280px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: isFullscreen ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
              zIndex: '1001'
            }}
          >
            <ModalHeader>
              <ModalHeaderContent>
                <HeaderLeft>
                  <ModalTitle>
                    {isEditMode ? `Upravit šablonu "${editingTemplate?.nazev}"` : 'Nahrát novou šablonu'}
                  </ModalTitle>
                  <ModalSubtitle>Nahrajte DOCX soubor a nastavte vlastnosti šablony</ModalSubtitle>
                </HeaderLeft>
                <CloseButton onClick={() => setIsFullscreen(!isFullscreen)}>
                  <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpandArrowsAlt} />
                </CloseButton>
              </ModalHeaderContent>
            </ModalHeader>

            <ModalForm onSubmit={handleUpload}>
              <ModalBody>
                {/* Horní sekce - dynamicky se přizpůsobuje podle mapování */}
                <UpperSection
                  $hasMapping={
                    (!isEditMode && uploadForm.file && uploadForm.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
                    (isEditMode && downloadedTemplateFile)
                  }
                >
                  {/* Levý sloupec - Detail objednávky + nahrání */}
                  <LeftColumn>
                    <FormSection>
                      <FormSectionHeader>
                        <SectionHeader>
                          <SectionIcon>📄</SectionIcon>
                          <SectionTitle>Detail šablony</SectionTitle>
                        </SectionHeader>
                      </FormSectionHeader>

                      <FormSectionContent>

                      {/* Kompaktní info o aktuální šabloně při editaci */}
                      {isEditMode && editingTemplate && (
                        <div style={{
                          marginBottom: '1rem',
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          {/* První řádek - Aktuální + ikona stavu + popelnice */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {editingTemplate.nazev_souboru && (
                                <span
                                  style={{
                                    fontSize: '1rem',
                                    cursor: 'help'
                                  }}
                                  title={diskStatus[editingTemplate.id]?.status === 'ok' ? 'Soubor existuje na disku' :
                                         diskStatus[editingTemplate.id]?.status === 'error' ? 'Soubor neexistuje na disku' :
                                         'Stav souboru neověřen'}
                                >
                                  {diskStatus[editingTemplate.id]?.status === 'ok' ? '✅' :
                                   diskStatus[editingTemplate.id]?.status === 'error' ? '❌' :
                                   '❓'}
                                </span>
                              )}
                              <strong>Aktuální:</strong>
                            </span>

                            {/* Popelnice vpravo bez červeného rámečku */}
                            {diskStatus[editingTemplate.id]?.status === 'ok' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowFileRemoveConfirm(true);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.875rem',
                                  color: '#6b7280',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Odstranit aktuální soubor"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            )}
                          </div>

                          {/* Druhý řádek - název souboru */}
                          <div style={{
                            paddingLeft: '1.5rem',
                            color: '#374151',
                            fontSize: '0.9rem'
                          }}>
                            {editingTemplate.nazev_souboru || 'N/A'}
                          </div>

                          {/* Třetí řádek - kompaktní file upload */}
                          <div style={{
                            paddingLeft: '0.5rem',
                            paddingRight: '0.5rem',
                            marginTop: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '4px' }}>
                              {uploadForm.file && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUploadForm(prev => ({ ...prev, file: null }));
                                    setMappingSectionVisible(false);
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: '9px',
                                    color: '#dc2626',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fee2e2';
                                    e.currentTarget.style.borderColor = '#f87171';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                    e.currentTarget.style.borderColor = '#fecaca';
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                  Odstranit
                                </button>
                              )}
                            </div>
                            <FileDropZone
                              onClick={() => {
                                handleFileInputClick('fileInput');
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(true);
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(false);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(false);

                                const files = Array.from(e.dataTransfer.files);
                                const docxFile = files.find(file => file.name.endsWith('.docx'));
                                if (docxFile) {
                                  handleFileSelect(docxFile);
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                width: '100%',
                                height: '50px',
                                backgroundColor: isDragging ? '#f0f9ff' : (uploadForm.file ? '#f0fdf4' : '#f9fafb'),
                                border: isDragging ? '2px dashed #3b82f6' : (uploadForm.file ? '1px solid #bbf7d0' : '1px dashed #d1d5db'),
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px',
                                textAlign: 'center',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ lineHeight: '1.2' }}>
                                {uploadForm.file ? (
                                  <>
                                    <div style={{ color: '#059669', fontSize: '12px', marginBottom: '2px' }}>
                                      <FontAwesomeIcon icon={faFileWord} />
                                      <span style={{ marginLeft: '4px', fontSize: '10px', fontWeight: '500' }}>
                                        {uploadForm.file.name}
                                      </span>
                                    </div>
                                    <small style={{ color: '#6b7280', fontSize: '9px' }}>
                                      ({(uploadForm.file.size / 1024 / 1024).toFixed(1)} MB)
                                    </small>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ fontSize: '10px', fontWeight: '500', marginBottom: '2px' }}>
                                      Klikněte pro přidání nebo výměnu DOCX šablony
                                    </div>
                                    <small style={{ color: '#6b7280', fontSize: '9px' }}>(max 10MB)</small>
                                  </>
                                )}
                              </div>
                            </FileDropZone>
                            <input
                              id="fileInput"
                              type="file"
                              accept=".docx"
                              multiple={false}
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileSelect(file);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Název a Typ pod sebou - bez file uploadu */}
                      <NameAndFileRow>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                          <FormGroup style={{ flex: '1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <Label required>Název šablony</Label>
                              <CheckboxLabel>
                                <input
                                  type="checkbox"
                                  checked={uploadForm.aktivni}
                                  onChange={(e) => setUploadForm(prev => ({ ...prev, aktivni: e.target.checked }))}
                                />
                                Aktivní
                              </CheckboxLabel>
                            </div>
                            <InputWithIcon>
                              <FileText size={16} />
                              <Input
                                type="text"
                                value={uploadForm.nazev}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, nazev: e.target.value }))}
                                required
                                placeholder="např. Smlouva o dílo, Faktura za služby, Pracovní smlouva..."
                              />
                            </InputWithIcon>
                          </FormGroup>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <FormGroup style={{ flex: '1' }}>
                            <Label required>Typ dokumentu {loadingTypy && '(načítá se...)'}</Label>
                            <StableCustomSelect
                              value={uploadForm.typ_dokumentu}
                              onChange={(value) => setUploadForm(prev => ({ ...prev, typ_dokumentu: value }))}
                              options={typyDokumentu.map(typ => ({ value: typ.value, label: typ.label }))}
                              placeholder="Vyberte typ dokumentu..."
                              icon={<Package size={16} />}
                              disabled={loadingTypy}
                              field="typ_dokumentu"
                            />
                          </FormGroup>

                          <FormGroup style={{ flex: '0 0 75px' }}>
                            <Label>Verze</Label>
                            <InputWithIcon>
                              <Hash size={16} />
                              <Input
                                type="text"
                                value={uploadForm.verze}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, verze: e.target.value }))}
                                placeholder="1.0"
                                style={{ textAlign: 'center' }}
                              />
                            </InputWithIcon>
                          </FormGroup>

                          <FormGroup style={{ flex: '0 0 120px' }}>
                            <Label>Částka</Label>
                            <InputWithIcon>
                              <Calculator size={16} />
                              <div style={{ position: 'relative' }}>
                                <Input
                                  type="text"
                                  className="no-spinner"
                                  value={uploadForm.castka ? new Intl.NumberFormat('cs-CZ').format(uploadForm.castka) : ''}
                                  onChange={(e) => {
                                    // Odstranit formátování a ponechat pouze čísla a tečku
                                    const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                    setUploadForm(prev => ({ ...prev, castka: value }));
                                  }}
                                  onBlur={(e) => {
                                    // Při opuštění pole pouze vyčistit formátování, ale zachovat číslo
                                    const cleanValue = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                    const numValue = parseFloat(cleanValue);

                                    if (!isNaN(numValue)) {
                                      setUploadForm(prev => ({ ...prev, castka: numValue.toString() }));
                                    } else if (cleanValue === '') {
                                      setUploadForm(prev => ({ ...prev, castka: '' }));
                                    }
                                    // Jinak ponechej původní hodnotu
                                  }}
                                  placeholder="např. 25 000"
                                  style={{
                                    textAlign: 'right',
                                    paddingRight: '35px' // Místo pro "Kč"
                                  }}
                                />
                                <span style={{
                                  position: 'absolute',
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#6b7280',
                                  fontSize: '14px',
                                  pointerEvents: 'none'
                                }}>
                                  Kč
                                </span>
                              </div>
                            </InputWithIcon>
                          </FormGroup>
                        </div>
                      </NameAndFileRow>

                      {/* File upload pro create mode - kompaktní obdélníček */}
                      {!isEditMode && (
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '8px' }}>
                            {uploadForm.file && (
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadForm(prev => ({ ...prev, file: null }));
                                  setMappingSectionVisible(false);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '10px',
                                  color: '#dc2626',
                                  backgroundColor: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fee2e2';
                                  e.currentTarget.style.borderColor = '#f87171';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fef2f2';
                                  e.currentTarget.style.borderColor = '#fecaca';
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                                Odstranit
                              </button>
                            )}
                          </div>
                          <FileDropZone
                            onClick={() => {
                              handleFileInputClick('fileInputCreate');
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(false);

                              const files = Array.from(e.dataTransfer.files);
                              const docxFile = files.find(file => file.name.endsWith('.docx'));
                              if (docxFile) {
                                handleFileSelect(docxFile);
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              width: '100%',
                              height: '60px',
                              backgroundColor: isDragging ? '#f0f9ff' : (uploadForm.file ? '#f0fdf4' : '#f9fafb'),
                              border: isDragging ? '2px dashed #3b82f6' : (uploadForm.file ? '1px solid #bbf7d0' : '1px dashed #d1d5db'),
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '12px',
                              textAlign: 'center',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ lineHeight: '1.3' }}>
                              {uploadForm.file ? (
                                <>
                                  <div style={{ color: '#059669', fontSize: '14px', marginBottom: '4px' }}>
                                    <FontAwesomeIcon icon={faFileWord} />
                                    <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: '500' }}>
                                      {uploadForm.file.name}
                                    </span>
                                  </div>
                                  <small style={{ color: '#6b7280', fontSize: '10px' }}>
                                    ({(uploadForm.file.size / 1024 / 1024).toFixed(1)} MB)
                                  </small>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: '11px', fontWeight: '500', marginBottom: '4px' }}>
                                    Klikněte pro přidání nebo výměnu DOCX šablony
                                  </div>
                                  <small style={{ color: '#6b7280', fontSize: '10px' }}>(max 10MB)</small>
                                </>
                              )}
                            </div>
                          </FileDropZone>
                          <input
                            id="fileInputCreate"
                            type="file"
                            accept=".docx"
                            multiple={false}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileSelect(file);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Popis přes celou šířku */}
                      <FormGroup>
                        <Label>Popis</Label>
                        <InputWithIcon hasTextarea>
                          <FileText size={16} />
                          <TextArea
                            value={uploadForm.popis}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, popis: e.target.value }))}
                            placeholder="např. Šablona pro smlouvy o dílo s dodavateli, Fakturace za poskytnuté služby, Pracovní smlouvy na dobu určitou..."
                            style={{ minHeight: '50px', paddingLeft: '2rem' }}
                          />
                        </InputWithIcon>
                      </FormGroup>

                      {/* JSON Mapování DOCVARIABLE */}
                      <FullWidthJsonEditor>
                          <JsonHeader>
                            <JsonTitle>
                              <FontAwesomeIcon icon={faCode} />
                              JSON
                            </JsonTitle>
                            <JsonActions>
                              <CopyButton
                                type="button"
                                onClick={downloadedTemplateFile && uploadForm.docx_mapping && Object.keys(uploadForm.docx_mapping).length > 0 ? handleGenerateInlinePreview : undefined}
                                disabled={generatingPreview || !downloadedTemplateFile || !uploadForm.docx_mapping || Object.keys(uploadForm.docx_mapping).length === 0}
                                title={
                                  generatingPreview ? 'Generuje se náhled...' :
                                  !downloadedTemplateFile ? 'Náhled není dostupný - chybí DOCX soubor' :
                                  !uploadForm.docx_mapping || Object.keys(uploadForm.docx_mapping).length === 0 ? 'Náhled není dostupný - chybí mapování polí' :
                                  'Zobrazit náhled dokumentu s vybranými daty'
                                }
                              >
                                <FontAwesomeIcon icon={generatingPreview ? faSyncAlt : faEye} spin={generatingPreview} />
                              </CopyButton>
                              <CopyButton
                                type="button"
                                onClick={handleCopyJson}
                                title={jsonCopied ? 'JSON bylo zkopírováno do schránky!' : 'Kopírovat JSON mapování do schránky'}
                              >
                                <FontAwesomeIcon icon={jsonCopied ? faCheck : faCopy} />
                              </CopyButton>
                            </JsonActions>
                          </JsonHeader>
                          <JsonEditor>
                            <JsonHighlightContainer>
                              {/* Syntax highlighted overlay */}
                              <JsonHighlightOverlay
                                dangerouslySetInnerHTML={{
                                  __html: highlightJsonSyntax(
                                    uploadForm.mapovani_json || JSON.stringify(uploadForm.docx_mapping || {}, null, 2)
                                  )
                                }}
                              />

                              {/* Actual textarea for input - musí být ve stejném containeru pro synchronní scroll */}
                              <FullWidthJsonTextarea
                                value={uploadForm.mapovani_json || JSON.stringify(uploadForm.docx_mapping || {}, null, 2)}
                                onChange={(e) => {
                                  setUploadForm(prev => ({ ...prev, mapovani_json: e.target.value }));
                                  // Pokusíme se parsovat a aktualizovat docx_mapping
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    setUploadForm(prev => ({ ...prev, docx_mapping: parsed }));
                                  } catch (error) {
                                    // Nevalidní JSON - ignorujeme
                                  }
                                }}
                                onScroll={(e) => {
                                  // Synchronizuj scroll overlay s textarea
                                  const overlay = e.target.parentElement.querySelector('pre');
                                  if (overlay) {
                                    overlay.scrollTop = e.target.scrollTop;
                                    overlay.scrollLeft = e.target.scrollLeft;
                                  }
                                }}
                                placeholder={`{
  "EVIDENCNI_CISLO": "cislo_objednavky",
  "DNAZEV": "dodavatel_nazev + dodavatel_kontakt_jmeno",
  "CENA_BEZDPH": "ev_cislo_objednavky"
}`}
                                spellCheck={false}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                style={{
                                  caretColor: '#1e293b'
                                }}
                              />
                            </JsonHighlightContainer>
                          </JsonEditor>

                          {/* Validační panel */}
                          {mappingValidation && (
                            <>
                              {/* Souhrn validace */}
                              {mappingValidation.totalFields > 0 && (
                                <ValidationSummary $valid={mappingValidation.valid}>
                                  <div>
                                    {mappingValidation.valid ? (
                                      <>
                                        <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#059669', marginRight: '0.5rem' }} />
                                        <strong>Mapping je v pořádku</strong> - {mappingValidation.validFields}/{mappingValidation.totalFields} polí validních
                                      </>
                                    ) : (
                                      <>
                                        <FontAwesomeIcon icon={faTimesCircle} style={{ color: '#dc2626', marginRight: '0.5rem' }} />
                                        <strong>Nalezeny problémy</strong> - {mappingValidation.errors.length} chyb, {mappingValidation.warnings.length} varování
                                      </>
                                    )}
                                  </div>
                                  {!mappingValidation.valid && mappingValidation.errors.some(e => e.type === 'deprecated') && (
                                    <AutoFixButton onClick={handleAutoFixMapping}>
                                      <FontAwesomeIcon icon={faSync} />
                                      Automaticky opravit
                                    </AutoFixButton>
                                  )}
                                </ValidationSummary>
                              )}

                              {/* Chyby */}
                              {mappingValidation.errors.length > 0 && (
                                <ValidationPanel $type="error">
                                  <ValidationHeader $type="error">
                                    <FontAwesomeIcon icon={faTimesCircle} />
                                    Chyby v mappingu ({mappingValidation.errors.length})
                                  </ValidationHeader>
                                  <ValidationList>
                                    {mappingValidation.errors.map((error, index) => (
                                      <ValidationItem key={index} $type="error">
                                        <ValidationItemHeader>
                                          <span>Pole: <code>{error.docxField}</code></span>
                                        </ValidationItemHeader>
                                        <ValidationItemBody>
                                          {error.type === 'deprecated' && (
                                            <>
                                              <div>❌ Zastaralá cesta: <code>{error.apiPath}</code></div>
                                              <div style={{ marginTop: '0.25rem', color: '#374151' }}>
                                                💡 {error.reason}
                                              </div>
                                              {error.suggestion && (
                                                <ValidationSuggestion>
                                                  ✅ Použijte: <strong>{error.suggestion}</strong>
                                                </ValidationSuggestion>
                                              )}
                                            </>
                                          )}
                                          {error.type === 'invalid' && (
                                            <>
                                              <div>❌ Neplatná cesta: <code>{error.apiPath}</code></div>
                                              <div style={{ marginTop: '0.25rem', color: '#374151' }}>
                                                💡 Toto pole neexistuje v enriched API struktuře
                                              </div>
                                            </>
                                          )}
                                          {error.type === 'parse' && (
                                            <div>❌ {error.message}</div>
                                          )}
                                        </ValidationItemBody>
                                      </ValidationItem>
                                    ))}
                                  </ValidationList>
                                </ValidationPanel>
                              )}

                              {/* Varování */}
                              {mappingValidation.warnings.length > 0 && (
                                <ValidationPanel $type="warning">
                                  <ValidationHeader $type="warning">
                                    <FontAwesomeIcon icon={faInfoCircle} />
                                    Varování ({mappingValidation.warnings.length})
                                  </ValidationHeader>
                                  <ValidationList>
                                    {mappingValidation.warnings.map((warning, index) => (
                                      <ValidationItem key={index} $type="warning">
                                        <ValidationItemHeader>
                                          <span>Pole: <code>{warning.docxField}</code></span>
                                        </ValidationItemHeader>
                                        <ValidationItemBody>
                                          ⚠️ {warning.message}
                                        </ValidationItemBody>
                                      </ValidationItem>
                                    ))}
                                  </ValidationList>
                                </ValidationPanel>
                              )}
                            </>
                          )}
                        </FullWidthJsonEditor>
                      </FormSectionContent>
                    </FormSection>
                  </LeftColumn>

                  {/* Pravý sloupec - Interaktivní mapování (dynamicky se zobrazuje) */}
                  <RightColumn
                    $visible={
                      (!isEditMode && uploadForm.file && uploadForm.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
                      (isEditMode && (downloadedTemplateFile || (mappingSectionVisible && Object.keys(uploadForm.docx_mapping || {}).length > 0)))
                    }
                  >
                    {/* Upload mode: Zobrazit pokud je vybraný DOCX soubor */}
                    {!isEditMode && uploadForm.file && uploadForm.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && (
                      <DocxMappingExpandableSection
                        file={uploadForm.file}
                        mapping={uploadForm.docx_mapping || {}}
                        onMappingChange={handleDocxMappingChange}
                        expanded={true}
                        onExpandChange={() => {}}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        token={token}
                        username={user?.username}
                        sampleOrderId={1}
                        useDynamicFields={true}
                      />
                    )}

                    {/* Edit mode: Zobrazit pokud máme stažený DOCX soubor */}
                    {isEditMode && downloadedTemplateFile && (
                      <DocxMappingExpandableSection
                        file={downloadedTemplateFile}
                        mapping={uploadForm.docx_mapping || {}}
                        onMappingChange={handleDocxMappingChange}
                        expanded={mappingSectionVisible}
                        onExpandChange={setMappingSectionVisible}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        token={token}
                        username={user?.username}
                        sampleOrderId={1}
                        useDynamicFields={true}
                      />
                    )}

                    {/* Edit mode fallback: Zobrazit mapování i bez DOCX souboru pokud existuje */}
                    {isEditMode && !downloadedTemplateFile && mappingSectionVisible && Object.keys(uploadForm.docx_mapping || {}).length > 0 && (
                      <div style={{
                        padding: '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                          color: '#6b7280',
                          fontSize: '0.9rem'
                        }}>
                          <FontAwesomeIcon icon={faInfoCircle} />
                          <span>Existující mapování polí (bez DOCX souboru pro analýzu)</span>
                        </div>
                        <div style={{
                          backgroundColor: 'white',
                          padding: '1rem',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          flex: 1,
                          overflow: 'auto'
                        }}>
                          <pre style={{
                            margin: 0,
                            fontSize: '0.8rem',
                            color: '#374151',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {JSON.stringify(uploadForm.docx_mapping, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </RightColumn>
                </UpperSection>
              </ModalBody>

              <ModalFooter>
                <FooterLeft>
                  <FontAwesomeIcon icon={faUpload} />
                  Připraveno k nahrání
                </FooterLeft>
                <FooterRight>
                  <Button type="button" className="cancel" onClick={handleCloseUploadModal}>
                    <FontAwesomeIcon icon={faTimes} />
                    Zrušit
                  </Button>
                  <Button
                    type="submit"
                    className="primary"
                    disabled={
                      !uploadForm.nazev ||
                      (!isEditMode && !uploadForm.file) ||
                      (isEditMode && diskStatus[editingTemplate?.id]?.status === 'error' && !uploadForm.file)
                    }
                  >
                    <FontAwesomeIcon icon={faUpload} />
                    {isEditMode ? 'Uložit změny' : 'Nahrát šablonu'}
                  </Button>
                </FooterRight>
              </ModalFooter>
            </ModalForm>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Smazat šablonu úplně z disku"
        message={`Opravdu chcete ÚPLNĚ SMAZAT šablonu "${selectedTemplate?.nazev}"?\n\n⚠️ POZOR: Tato akce je nevratná!\n\n• Šablona bude odstraněna z databáze\n• Fyzický soubor bude smazán z disku\n• Všechny reference na tuto šablonu budou ztraceny\n\nPokračovat pouze pokud jste si jisti.`}
        confirmText="Smazat úplně z disku"
        cancelText="Zrušit"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowConfirmDelete(false);
          setSelectedTemplate(null);
        }}
        variant="danger"
      />

      {/* Verify Results Modal */}
      {showVerifyModal && verifyResult && (
        <ModalOverlay onClick={() => setShowVerifyModal(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                <FontAwesomeIcon icon={faCheckCircle} />
                Výsledky verifikace šablon
              </ModalTitle>
              <CloseButton onClick={() => setShowVerifyModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              <VerifyStats>
                <StatCard $status={verifyResult.summary.integrity_ok ? 'success' : 'warning'}>
                  <StatLabel>Celkový stav</StatLabel>
                  <StatValue>{verifyResult.summary.integrity_ok ? '✅ V pořádku' : '⚠️ Problémy'}</StatValue>
                </StatCard>

                <StatCard>
                  <StatLabel>Celkem šablon</StatLabel>
                  <StatValue>{verifyResult.summary.total_templates}</StatValue>
                </StatCard>

                <StatCard $status="success">
                  <StatLabel>Platné šablony</StatLabel>
                  <StatValue>{verifyResult.summary.valid_templates}</StatValue>
                </StatCard>

                <StatCard $status={verifyResult.summary.missing_files > 0 ? 'error' : 'success'}>
                  <StatLabel>Chybějící soubory</StatLabel>
                  <StatValue>{verifyResult.summary.missing_files}</StatValue>
                </StatCard>
              </VerifyStats>

              <VerifyDetails>
                <DetailSection>
                  <DetailLabel>📂 Upload adresář</DetailLabel>
                  <DetailValue>{verifyResult.upload_directory}</DetailValue>
                  <DetailStatus $ok={verifyResult.directory_exists}>
                    {verifyResult.directory_exists ? '✅ Existuje' : '❌ Neexistuje'}
                  </DetailStatus>
                  <DetailStatus $ok={verifyResult.directory_writable}>
                    {verifyResult.directory_writable ? '✅ Zapisovatelný' : '❌ Pouze čtení'}
                  </DetailStatus>
                </DetailSection>

                {verifyResult.summary.missing_files > 0 && (
                  <DetailSection>
                    <DetailLabel>⚠️ Šablony s chybějícími soubory</DetailLabel>
                    {verifyResult.templates?.filter(t => !t.file_exists).map(template => (
                      <ProblemItem key={template.id}>
                        <strong>{template.nazev}</strong> - chybí soubor: {template.cesta_souboru}
                      </ProblemItem>
                    ))}
                  </DetailSection>
                )}

                {verifyResult.orphaned_files?.length > 0 && (
                  <DetailSection>
                    <DetailLabel>🗂️ Opuštěné soubory (nejsou v DB)</DetailLabel>
                    {verifyResult.orphaned_files.map((file, index) => (
                      <ProblemItem key={index}>
                        {file}
                      </ProblemItem>
                    ))}
                  </DetailSection>
                )}
              </VerifyDetails>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                className="primary"
                onClick={() => setShowVerifyModal(false)}
              >
                Zavřít
              </Button>
            </ModalFooter>
          </ModalContainer>
        </ModalOverlay>
      )}

      {/* ⭐ STARÝ PREVIEW MODAL ODSTRANĚN - Všechny náhledy se nyní otevírají v nové záložce */}

      {/* Potvrzovací dialog pro výměnu souboru - React Portal */}
      {showFileReplaceConfirm && createPortal(
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1020',
            padding: '1rem'
          }}
          onClick={() => setShowFileReplaceConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              zIndex: '1021'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>
              Potvrdit výměnu souboru
            </h3>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280', lineHeight: '1.5' }}>
              Nahráním nového souboru dojde k vyresetování současného mapování polí.
              Všechna nastavená mapování mezi DOCX proměnnými a databázovými poli budou ztracena.
            </p>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontWeight: '500' }}>
              Přejete si pokračovat?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowFileReplaceConfirm(false);
                  setPendingFileInputId(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Zrušit
              </button>
              <button
                onClick={() => {
                  setShowFileReplaceConfirm(false);
                  // Otevřít file dialog po potvrzení
                  if (pendingFileInputId) {
                    document.getElementById(pendingFileInputId)?.click();
                    setPendingFileInputId(null);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Pokračovat a resetovat mapování
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ConfirmDialog pro odstranění souboru */}
      {showFileRemoveConfirm && createPortal(
        <ConfirmDialog
          isOpen={showFileRemoveConfirm}
          onConfirm={() => {
            setShowFileRemoveConfirm(false);
            handleRemoveTemplateFile(editingTemplate);
          }}
          onCancel={() => setShowFileRemoveConfirm(false)}
          title="Odstranit soubor šablony"
          message={`Opravdu chcete odstranit aktuální soubor šablony? ${isEditMode ? 'Soubor bude smazán i ze vzdáleného disku. ' : ''}Všechna mapování budou ztracena a bude nutné nahrát nový soubor.`}
          confirmText="Odstranit"
          cancelText="Zrušit"
          type="danger"
        />,
        document.body
      )}
    </Container>
  );
};

export default DocxSablonyTab;
