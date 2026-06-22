/**
 * VEMA Deník - Hlavní stránka
 * Zobrazení importovaných dat z VEMA systému
 * 
 * Tabulky: 25v_firmyupl, 25v_fpazahl, 25v_smla
 * Právo: VEMA_VIEW
 * 
 * @author EEO Development Team
 * @date 2026-06-22
 */

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faFileInvoice, faFileContract, faSearch, faTimes, 
  faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
  faChevronDown, faChevronUp, faUpload, faCheckCircle, faPlus, faMinus
} from '@fortawesome/free-solid-svg-icons';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import AuthContext from '../context/AuthContext';
import { loadVemaFirmy, loadVemaFaktury, loadVemaSmlouvy, formatExcelDate, uploadVemaFiles, truncateVemaData } from '../services/apiVema';
import VemaKontrolaCell from '../components/VemaKontrolaCell';
import { getVemaFakturaPropojeni } from '../services/apiVemaPropojeni';

// ============================================================================
// STYLED COMPONENTS - OrderV3 style
// ============================================================================

const Container = styled.div`
  padding: 1rem;
  background: #f8fafc;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #202d65 0%, #1a2555 100%);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const HeaderButton = styled.button`
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SubTitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
`;

// Tabs
const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
`;

const Tab = styled.button`
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props => props.$active ? '#202d65' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.$active ? '#202d65' : '#f1f5f9'};
  }
`;

// Search
const SearchContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const SearchBox = styled.div`
  flex: 1;
  position: relative;
  
  > svg {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #202d65;
    box-shadow: 0 0 0 3px rgba(32, 45, 101, 0.1);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: #64748b;
  }
`;

// Table
const TableWrapper = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  padding: 0.875rem;
  text-align: center;
  background: #202d65;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;

  &:hover {
    background: #2d4080;
  }
`;

const TableRow = styled.tr`
  &:hover {
    background: #f8fafc;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #1e293b;
`;

const Badge = styled.span`
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    if (props.$type === 'aktivni') return '#dcfce7';
    if (props.$type === 'smazano') return '#fee2e2';
    if (props.$type === 'neaktivni') return '#f3f4f6';
    return '#e5e7eb';
  }};
  color: ${props => {
    if (props.$type === 'aktivni') return '#166534';
    if (props.$type === 'smazano') return '#991b1b';
    if (props.$type === 'neaktivni') return '#6b7280';
    return '#374151';
  }};
`;

// Import Modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #202d65 0%, #1a2555 100%);
  border-radius: 12px 12px 0 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ModalClose = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1.25rem;
  transition: color 0.2s;

  &:hover {
    color: white;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const FileUploadSection = styled.div`
  margin-bottom: 1.5rem;
`;

const FileUploadLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const FileInput = styled.input`
  display: block;
  width: 100%;
  padding: 0.625rem;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #6b7280;
  cursor: pointer;
  background: #f9fafb;
  transition: all 0.2s;

  &:hover {
    border-color: #202d65;
    background: #f3f4f6;
  }

  &::file-selector-button {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    font-weight: 600;
    cursor: pointer;
    margin-right: 0.75rem;
    transition: all 0.2s;

    &:hover {
      background: #f9fafb;
      border-color: #202d65;
    }
  }
`;

const ImportButton = styled.button`
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ProgressContainer = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const ProgressLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.$percent || 0}%;
`;

const ProgressPercent = styled.div`
  text-align: center;
  font-size: 0.75rem;
  color: #64748b;
`;

const InfoBox = styled.div`
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: #1e40af;
  line-height: 1.5;

  ul {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
  }

  li {
    margin: 0.25rem 0;
  }
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
  padding: 0.5rem 0.875rem;
  border: 1px solid #e5e7eb;
  background: ${props => props.disabled ? '#f1f5f9' : 'white'};
  color: ${props => props.disabled ? '#94a3b8' : '#202d65'};
  font-weight: 600;
  border-radius: 6px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  font-size: 0.875rem;

  &:hover:not(:disabled) {
    background: #202d65;
    color: white;
    border-color: #202d65;
  }
`;

const PageSizeSelector = styled.select`
  padding: 0.5rem 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #202d65;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #202d65;
  }
`;

const LoadingOverlay = styled.div`
  text-align: center;
  padding: 3rem;
  color: #64748b;
  font-size: 1rem;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin: 1rem 0;
`;

// Results Dialog Styled Components
const ResultsOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-center: center;
  z-index: 10000;
`;

const ResultsDialog = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const ResultsHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
`;

const ResultsBody = styled.div`
  padding: 1.5rem;
`;

const SummaryBox = styled.div`
  background: ${props => props.$success ? '#ecfdf5' : '#fef2f2'};
  border: 2px solid ${props => props.$success ? '#10b981' : '#ef4444'};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const SummaryTitle = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${props => props.$success ? '#065f46' : '#991b1b'};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${props => {
    if (props.$type === 'success') return '#10b981';
    if (props.$type === 'error') return '#ef4444';
    return '#374151';
  }};
`;

const BatchInfo = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #6b7280;
  
  strong {
    color: #374151;
  }
`;

const ResultsFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
`;

const CloseButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

const VemaDenik = () => {
  const { token, username, userDetail } = useContext(AuthContext);

  // State
  const [activeTab, setActiveTab] = useState('faktury'); // 'firmy' | 'faktury' | 'smlouvy'
  const [loading, setLoading] = useState(true); // Initial load = true
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Data
  const [firmyData, setFirmyData] = useState([]);
  const [fakturyData, setFakturyData] = useState([]);
  const [smlouvyData, setSmlouvyData] = useState([]);

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sorting, setSorting] = useState([]);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [firmyuplFile, setFirmyuplFile] = useState(null);
  const [fpazahlFile, setFpazahlFile] = useState(null);
  const [smlaFile, setSmlaFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  // Truncate state
  const [showTruncateModal, setShowTruncateModal] = useState(false);
  const [truncating, setTruncating] = useState(false);

  // Load data based on active tab
  useEffect(() => {
    if (!token || !username) return;

    let cancelled = false; // Cleanup flag

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'firmy') {
          const response = await loadVemaFirmy({ token, username, limit: 50000, offset: 0, search });
          if (!cancelled) setFirmyData(response.data || []);
        } else if (activeTab === 'faktury') {
          const response = await loadVemaFaktury({ token, username, limit: 50000, offset: 0, search });
          if (!cancelled) setFakturyData(response.data || []);
        } else if (activeTab === 'smlouvy') {
          const response = await loadVemaSmlouvy({ token, username, limit: 50000, offset: 0, search });
          if (!cancelled) setSmlouvyData(response.data || []);
        }
      } catch (err) {
        console.error('Error loading VEMA data:', err);
        if (!cancelled) setError(err.message || 'Chyba při načítání dat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true; // Cleanup - prevence race condition
    };
  }, [activeTab, token, username, search]);

  // Import handler
  const handleImport = async () => {
    if (!firmyuplFile || !fpazahlFile || !smlaFile) {
      alert('Musíte nahrát všechny 3 soubory!');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const result = await uploadVemaFiles({
        token,
        username,
        firmyuplFile,
        fpazahlFile,
        smlaFile,
        onProgress: (percent) => setImportProgress(percent)
      });

      // Zobrazit results dialog místo alert()
      setImportResults(result.data);
      setShowResultsDialog(true);

      // Reset a refresh dat
      setShowImportModal(false);
      setFirmyuplFile(null);
      setFpazahlFile(null);
      setSmlaFile(null);
      setImportProgress(0);

      // Reload VŠECH dat po importu (ne jen aktivní záložky)
      console.log('🔄 Reload všech VEMA dat po importu...');
      const [firmyResp, fakturyResp, smlouvyResp] = await Promise.all([
        loadVemaFirmy({ token, username, limit: 50000, offset: 0, search: '' }),
        loadVemaFaktury({ token, username, limit: 50000, offset: 0, search: '' }),
        loadVemaSmlouvy({ token, username, limit: 50000, offset: 0, search: '' })
      ]);
      console.log('📊 Firmy:', firmyResp.data?.length || 0);
      console.log('📄 Faktury:', fakturyResp.data?.length || 0);
      console.log('📋 Smlouvy:', smlouvyResp.data?.length || 0);
      setFirmyData(firmyResp.data || []);
      setFakturyData(fakturyResp.data || []);
      setSmlouvyData(smlouvyResp.data || []);

    } catch (err) {
      console.error('Import error:', err);
      alert('❌ Chyba při importu:\n' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Truncate handler
  const handleTruncate = async () => {
    if (!window.confirm('⚠️ POZOR!\n\nOpravdu chcete SMAZAT všechna VEMA data?\n\nTato akce je NEVRATNÁ!\n\n- Firmy\n- Faktury\n- Smlouvy\n\nBudou odstraněny VŠECHNY záznamy!')) {
      return;
    }

    setTruncating(true);

    try {
      const result = await truncateVemaData({ token, username });
      
      alert(`✅ VEMA data byla úspěšně smazána!\n\nSmazáno:\n- Firmy: ${result.deleted_counts.firmyupl}\n- Faktury: ${result.deleted_counts.fpazahl}\n- Smlouvy: ${result.deleted_counts.smla}\n\nCelkem: ${result.deleted_counts.total} záznamů`);

      // Reload empty data
      setFirmyData([]);
      setFakturyData([]);
      setSmlouvyData([]);
      setShowTruncateModal(false);

    } catch (err) {
      console.error('Truncate error:', err);
      alert('❌ Chyba při mazání dat:\n' + err.message);
    } finally {
      setTruncating(false);
    }
  };

  // ============================================================================
  // TABLE DEFINITIONS
  // ============================================================================

  // Firmy columns
  const firmyColumns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: info => <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{info.getValue()}</span>
    },
    {
      accessorKey: 'nazev',
      header: 'Název firmy',
      size: 250,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'ico',
      header: 'IČO',
      size: 100,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'obec',
      header: 'Obec',
      size: 150,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 200,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'stav',
      header: 'Stav',
      size: 80,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        
        // Mapování stavů na ikony (backend vrací bez diakritiky!)
        const stavMap = {
          'aktivni': { icon: '●', color: '#22c55e' },
          'aktivní': { icon: '●', color: '#22c55e' },
          'importovano': { icon: '●', color: '#22c55e' },
          'importováno': { icon: '●', color: '#22c55e' },
          'ok': { icon: '●', color: '#22c55e' },
          'zruseno': { icon: '✖', color: '#ef4444' },
          'zrušeno': { icon: '✖', color: '#ef4444' },
          'chyba': { icon: '✖', color: '#ef4444' },
          'zmena': { icon: '▲', color: '#f59e0b' },
          'změna': { icon: '▲', color: '#f59e0b' },
          'v_procesu': { icon: '◐', color: '#3b82f6' }
        };
        
        const stav = stavMap[val.toLowerCase()] || { icon: '●', color: '#94a3b8' };
        
        return (
          <span 
            title={val}
            style={{ 
              fontSize: '1.8em',
              color: stav.color,
              cursor: 'help',
              display: 'inline-block',
              fontWeight: 'bold',
              lineHeight: '1'
            }}
          >
            {stav.icon}
          </span>
        );
      }
    },
    {
      accessorKey: 'dt_importu',
      header: 'Importováno',
      size: 140,
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    },
    {
      accessorKey: 'kontrola',
      header: 'Kontrola',
      size: 100,
      minSize: 100,
      maxSize: 100,
      enableSorting: false,
      cell: info => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VemaKontrolaCell
            typZaznamu="firma"
            vemaId={info.row.original.firma}
            token={token}
            username={username}
          />
        </div>
      )
    }
  ], [token, username]);

  // Faktury columns
  const fakturyColumns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: info => <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{info.getValue()}</span>
    },
    {
      accessorKey: 'cfak',
      header: 'Č. faktury',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'vsymb',
      header: 'Variabilní symbol',
      size: 130,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'cdok',
      header: 'Číslo dokladu',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'nazevfak',
      header: 'Název',
      size: 250,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'firma_nazev',
      header: 'Firma',
      size: 200,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'firma_ico',
      header: 'IČO',
      size: 100,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'celkem',
      header: 'Částka',
      size: 100,
      cell: info => {
        const val = info.getValue();
        return val ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val) : '-';
      }
    },
    {
      accessorKey: 'dof',
      header: 'Datum vystavení',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return val ? formatExcelDate(val) : '-';
      }
    },
    {
      accessorKey: 'datpri',
      header: 'Datum přijetí',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return val ? formatExcelDate(val) : '-';
      }
    },
    {
      accessorKey: 'spl',
      header: 'Splatnost',
      size: 110,
      cell: info => {
        const val = info.getValue();
        return val ? formatExcelDate(val) : '-';
      }
    },
    {
      accessorKey: 'cobj',
      header: 'Č. objednávky',
      size: 150,
      cell: info => {
        // Použít formátované číslo objednávky, fallback na původní
        const formatted = info.row.original.cobj_formatovane;
        const original = info.getValue();
        const val = formatted || original;
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'csml',
      header: 'Č. smlouvy',
      size: 120,
      cell: info => {
        // Zobrazit původní číslo smlouvy (např. SM2200179)
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'smlouva_ecsml',
      header: 'Ev.číslo',
      size: 150,
      cell: info => {
        // Zobrazit evidenční číslo smlouvy (např. 007/75030926/17)
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'stav_zaznamu',
      header: 'Stav',
      size: 80,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        
        // Mapování stavů na ikony (backend vrací bez diakritiky!)
        const stavMap = {
          'aktivni': { icon: '●', color: '#22c55e' },
          'aktivní': { icon: '●', color: '#22c55e' },
          'importovano': { icon: '●', color: '#22c55e' },
          'importováno': { icon: '●', color: '#22c55e' },
          'ok': { icon: '●', color: '#22c55e' },
          'zruseno': { icon: '✖', color: '#ef4444' },
          'zrušeno': { icon: '✖', color: '#ef4444' },
          'chyba': { icon: '✖', color: '#ef4444' },
          'zmena': { icon: '▲', color: '#f59e0b' },
          'změna': { icon: '▲', color: '#f59e0b' },
          'v_procesu': { icon: '◐', color: '#3b82f6' }
        };
        
        const stav = stavMap[val.toLowerCase()] || { icon: '●', color: '#94a3b8' };
        
        return (
          <span 
            title={val}
            style={{ 
              fontSize: '1.8em',
              color: stav.color,
              cursor: 'help',
              display: 'inline-block',
              fontWeight: 'bold',
              lineHeight: '1'
            }}
          >
            {stav.icon}
          </span>
        );
      }
    },
    {
      accessorKey: 'dt_importu',
      header: 'Importováno',
      size: 140,
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    },
    {
      accessorKey: 'kontrola',
      header: 'Kontrola',
      size: 100,
      minSize: 100,
      maxSize: 100,
      enableSorting: false,
      cell: info => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VemaKontrolaCell
            typZaznamu="faktura"
            vemaId={info.row.original.cfak}
            vemaIdSecondary={info.row.original.firma}
            token={token}
            username={username}
          />
        </div>
      )
    }
  ], [token, username]);

  // Smlouvy columns
  const smlouvyColumns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: info => <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{info.getValue()}</span>
    },
    {
      accessorKey: 'csml',
      header: 'Č. smlouvy',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'ecsml',
      header: 'Evidenční č.',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'nazsml',
      header: 'Název',
      size: 250,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'firma_nazev',
      header: 'Firma',
      size: 200,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'hodnota',
      header: 'Hodnota',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return val ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val) : '-';
      }
    },
    {
      accessorKey: 'datuzavr',
      header: 'Datum uzavření',
      size: 130,
      cell: info => {
        const val = info.getValue();
        return val ? formatExcelDate(val) : '-';
      }
    },
    {
      accessorKey: 'stav_zaznamu',
      header: 'Stav',
      size: 80,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        
        // Mapování stavů na ikony (backend vrací bez diakritiky!)
        const stavMap = {
          'aktivni': { icon: '●', color: '#22c55e' },
          'aktivní': { icon: '●', color: '#22c55e' },
          'importovano': { icon: '●', color: '#22c55e' },
          'importováno': { icon: '●', color: '#22c55e' },
          'ok': { icon: '●', color: '#22c55e' },
          'zruseno': { icon: '✖', color: '#ef4444' },
          'zrušeno': { icon: '✖', color: '#ef4444' },
          'chyba': { icon: '✖', color: '#ef4444' },
          'zmena': { icon: '▲', color: '#f59e0b' },
          'změna': { icon: '▲', color: '#f59e0b' },
          'v_procesu': { icon: '◐', color: '#3b82f6' }
        };
        
        const stav = stavMap[val.toLowerCase()] || { icon: '●', color: '#94a3b8' };
        
        return (
          <span 
            title={val}
            style={{ 
              fontSize: '1.8em',
              color: stav.color,
              cursor: 'help',
              display: 'inline-block',
              fontWeight: 'bold',
              lineHeight: '1'
            }}
          >
            {stav.icon}
          </span>
        );
      }
    },
    {
      accessorKey: 'dt_importu',
      header: 'Importováno',
      size: 140,
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    },
    {
      accessorKey: 'kontrola',
      header: 'Kontrola',
      size: 100,
      minSize: 100,
      maxSize: 100,
      enableSorting: false,
      cell: info => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VemaKontrolaCell
            typZaznamu="smlouva"
            vemaId={info.row.original.csml}
            vemaIdSecondary={info.row.original.firma}
            token={token}
            username={username}
          />
        </div>
      )
    }
  ], [token, username]);

  // Select columns based on active tab
  const columns = useMemo(() => {
    if (activeTab === 'firmy') return firmyColumns;
    if (activeTab === 'faktury') return fakturyColumns;
    if (activeTab === 'smlouvy') return smlouvyColumns;
    return [];
  }, [activeTab, firmyColumns, fakturyColumns, smlouvyColumns]);

  // Select data based on active tab
  const data = useMemo(() => {
    if (activeTab === 'firmy') return firmyData;
    if (activeTab === 'faktury') return fakturyData;
    if (activeTab === 'smlouvy') return smlouvyData;
    return [];
  }, [activeTab, firmyData, fakturyData, smlouvyData]);

  // TanStack Table
  const table = useReactTable({
    data,
    columns,
    getRowId: (row, index) => {
      // VEMA data obsahují úplné duplicity! Index garantuje unikátnost
      if (activeTab === 'firmy') {
        return `${row.id || index}_${row.firma || ''}_${index}`;
      } else if (activeTab === 'faktury') {
        return `${row.id || index}_${row.firma || ''}_${row.cfak || ''}_${index}`;
      } else if (activeTab === 'smlouvy') {
        return `${row.id || index}_${row.firma || ''}_${row.csml || ''}_${index}`;
      }
      return String(index); // Fallback
    },
    enableRowSelection: false,
    autoResetPageIndex: false,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  // Paginated data - počítáno během renderu, ne v useMemo
  // Důvod: table.getSortedRowModel() je interně memoized TanStackem,
  // ale referenční stabilita `table` nezaručuje aktuální data
  const allSortedRows = table.getSortedRowModel().rows;
  const totalRows = allSortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const start = safePageIndex * pageSize;
  const end = start + pageSize;
  const paginatedData = allSortedRows.slice(start, end);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPageIndex(0); // Reset to first page on search
  };

  const handleClearSearch = () => {
    setSearch('');
    setPageIndex(0);
  };

  const goToFirstPage = () => setPageIndex(0);
  const goToPreviousPage = () => setPageIndex(prev => Math.max(0, prev - 1));
  const goToNextPage = () => setPageIndex(prev => Math.min(totalPages - 1, prev + 1));
  const goToLastPage = () => setPageIndex(totalPages - 1);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <div>
            <Title>
              <FontAwesomeIcon icon={faFileContract} />
              Deník VEMA
            </Title>
            <SubTitle>Importovaná data z VEMA systému</SubTitle>
          </div>
        </HeaderLeft>
        <HeaderRight>
          <HeaderButton onClick={() => setShowImportModal(true)}>
            <FontAwesomeIcon icon={faUpload} />
            Import dat
          </HeaderButton>
          {userDetail?.role_kod === 'SUPERADMIN' && (
            <HeaderButton 
              onClick={() => setShowTruncateModal(true)}
              style={{background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'}}
            >
              <FontAwesomeIcon icon={faTimes} />
              Vymazat vše
            </HeaderButton>
          )}
        </HeaderRight>
      </Header>

      {/* Tabs */}
      <TabsContainer>
        <Tab $active={activeTab === 'faktury'} onClick={() => { setActiveTab('faktury'); setPageIndex(0); }}>
          <FontAwesomeIcon icon={faFileInvoice} />
          Faktury ({fakturyData.length})
        </Tab>
        <Tab $active={activeTab === 'smlouvy'} onClick={() => { setActiveTab('smlouvy'); setPageIndex(0); }}>
          <FontAwesomeIcon icon={faFileContract} />
          Smlouvy ({smlouvyData.length})
        </Tab>
        <Tab $active={activeTab === 'firmy'} onClick={() => { setActiveTab('firmy'); setPageIndex(0); }}>
          <FontAwesomeIcon icon={faBuilding} />
          Firmy ({firmyData.length})
        </Tab>
      </TabsContainer>

      {/* Search */}
      <SearchContainer>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} />
          <SearchInput
            type="text"
            placeholder={`Hledat v ${activeTab}...`}
            value={search}
            onChange={handleSearchChange}
          />
          {search && (
            <ClearButton onClick={handleClearSearch}>
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>
      </SearchContainer>

      {/* Error */}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Table */}
      <TableWrapper>
        {loading ? (
          <LoadingOverlay>Načítám data...</LoadingOverlay>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  {table.getHeaderGroups()[0].headers.map(header => (
                    <TableHeader
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          <FontAwesomeIcon
                            icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                            style={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </div>
                    </TableHeader>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length}>
                      <LoadingOverlay>Žádná data k zobrazení</LoadingOverlay>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map(row => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </tbody>
            </Table>

            {/* Pagination */}
            <PaginationContainer>
              <PaginationInfo>
                Zobrazeno {totalRows > 0 ? start + 1 : 0}–{Math.min(end, totalRows)} z {totalRows}
              </PaginationInfo>

              <PaginationControls>
                <PageButton onClick={goToFirstPage} disabled={pageIndex === 0}>
                  <FontAwesomeIcon icon={faAnglesLeft} />
                </PageButton>
                <PageButton onClick={goToPreviousPage} disabled={pageIndex === 0}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                </PageButton>

                <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0.5rem' }}>
                  Stránka {pageIndex + 1} z {totalPages}
                </span>

                <PageButton onClick={goToNextPage} disabled={pageIndex >= totalPages - 1}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </PageButton>
                <PageButton onClick={goToLastPage} disabled={pageIndex >= totalPages - 1}>
                  <FontAwesomeIcon icon={faAnglesRight} />
                </PageButton>

                <PageSizeSelector value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}>
                  <option value={25}>25 / stránku</option>
                  <option value={50}>50 / stránku</option>
                  <option value={100}>100 / stránku</option>
                  <option value={200}>200 / stránku</option>
                </PageSizeSelector>
              </PaginationControls>
            </PaginationContainer>
          </>
        )}
      </TableWrapper>

      {/* Import Modal */}
      {showImportModal && (
        <ModalOverlay onClick={() => !importing && setShowImportModal(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                <FontAwesomeIcon icon={faUpload} />
                Import VEMA dat
              </ModalTitle>
              <ModalClose onClick={() => !importing && setShowImportModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </ModalClose>
            </ModalHeader>

            <ModalBody>
              <InfoBox>
                <strong>📋 Požadované soubory:</strong>
                <ul>
                  <li><strong>firmyupl.xlsx</strong> - Seznam firem</li>
                  <li><strong>fpazahl.xlsx</strong> - Seznam faktur</li>
                  <li><strong>smla.xlsx</strong> - Seznam smluv</li>
                </ul>
                <strong>⚠️ Poznámka:</strong> Všechny 3 soubory musí být nahrány současně.
              </InfoBox>

              <FileUploadSection>
                <FileUploadLabel>
                  1️⃣ Firmy (firmyupl.xlsx)
                </FileUploadLabel>
                <FileInput
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFirmyuplFile(e.target.files[0])}
                  disabled={importing}
                />
                {firmyuplFile && <div style={{fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem'}}>✓ {firmyuplFile.name}</div>}
              </FileUploadSection>

              <FileUploadSection>
                <FileUploadLabel>
                  2️⃣ Faktury (fpazahl.xlsx)
                </FileUploadLabel>
                <FileInput
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFpazahlFile(e.target.files[0])}
                  disabled={importing}
                />
                {fpazahlFile && <div style={{fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem'}}>✓ {fpazahlFile.name}</div>}
              </FileUploadSection>

              <FileUploadSection>
                <FileUploadLabel>
                  3️⃣ Smlouvy (smla.xlsx)
                </FileUploadLabel>
                <FileInput
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSmlaFile(e.target.files[0])}
                  disabled={importing}
                />
                {smlaFile && <div style={{fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem'}}>✓ {smlaFile.name}</div>}
              </FileUploadSection>

              {importing && (
                <ProgressContainer>
                  <ProgressLabel>Probíhá import...</ProgressLabel>
                  <ProgressBar>
                    <ProgressFill $percent={importProgress} />
                  </ProgressBar>
                  <ProgressPercent>{importProgress}%</ProgressPercent>
                </ProgressContainer>
              )}

              <ImportButton
                onClick={handleImport}
                disabled={importing || !firmyuplFile || !fpazahlFile || !smlaFile}
              >
                {importing ? (
                  <>🔄 Importuji data...</>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUpload} />
                    Spustit import
                  </>
                )}
              </ImportButton>
            </ModalBody>
          </ModalContainer>
        </ModalOverlay>
      )}

      {/* Results Dialog */}
      {showResultsDialog && importResults && (
        <ResultsOverlay onClick={() => setShowResultsDialog(false)}>
          <ResultsDialog onClick={(e) => e.stopPropagation()}>
            <ResultsHeader>
              <h2>
                <FontAwesomeIcon icon={faCheckCircle} />
                Import dokončen úspěšně
              </h2>
            </ResultsHeader>

            <ResultsBody>
              <SummaryBox $success={importResults.imported.smla > 0}>
                <SummaryTitle $success={importResults.imported.smla > 0}>
                  {importResults.imported.smla > 0 ? '✅ Import dokončen' : '⚠️ Import s problémem'}
                </SummaryTitle>

                <SummaryStats>
                  <StatItem>
                    <StatLabel>Firmy</StatLabel>
                    <StatValue $type="success">{importResults.imported.firmyupl}</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Faktury</StatLabel>
                    <StatValue $type="success">{importResults.imported.fpazahl}</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Smlouvy</StatLabel>
                    <StatValue $type={importResults.imported.smla > 0 ? 'success' : 'error'}>
                      {importResults.imported.smla}
                    </StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Celkem</StatLabel>
                    <StatValue>{importResults.imported.total}</StatValue>
                  </StatItem>
                </SummaryStats>

                <BatchInfo>
                  <strong>Batch ID:</strong> {importResults.batch_id}<br/>
                  <strong>Datum importu:</strong> {new Date(importResults.dt_importu).toLocaleString('cs-CZ')}
                </BatchInfo>
              </SummaryBox>
            </ResultsBody>

            <ResultsFooter>
              <CloseButton onClick={() => setShowResultsDialog(false)}>
                Zavřít
              </CloseButton>
            </ResultsFooter>
          </ResultsDialog>
        </ResultsOverlay>
      )}

      {/* Truncate Confirmation Modal */}
      {showTruncateModal && (
        <ModalOverlay onClick={() => !truncating && setShowTruncateModal(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <ModalHeader style={{background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'}}>
              <h2>⚠️ Vymazat všechna VEMA data</h2>
              <button onClick={() => setShowTruncateModal(false)} disabled={truncating}>×</button>
            </ModalHeader>
            <ModalBody>
              <div style={{
                padding: '1.5rem',
                background: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{color: '#991b1b', marginTop: 0}}>⚠️ POZOR - NEVRATNÁ AKCE!</h3>
                <p style={{color: '#7f1d1d', marginBottom: '1rem'}}>
                  Tato operace <strong>TRVALE SMAŽE</strong> všechna data z těchto tabulek:
                </p>
                <ul style={{color: '#7f1d1d', marginLeft: '1.5rem'}}>
                  <li>📊 <strong>Firmy</strong> ({firmyData.length} záznamů)</li>
                  <li>📄 <strong>Faktury</strong> ({fakturyData.length} záznamů)</li>
                  <li>📋 <strong>Smlouvy</strong> ({smlouvyData.length} záznamů)</li>
                </ul>
                <p style={{color: '#991b1b', fontWeight: 'bold', marginTop: '1rem', marginBottom: 0}}>
                  Celkem: <span style={{fontSize: '1.25rem'}}>{firmyData.length + fakturyData.length + smlouvyData.length}</span> záznamů bude ODSTRANĚNO!
                </p>
              </div>
              
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button
                  onClick={() => setShowTruncateModal(false)}
                  disabled={truncating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: truncating ? 'not-allowed' : 'pointer',
                    opacity: truncating ? 0.5 : 1
                  }}
                >
                  Zrušit
                </button>
                <button
                  onClick={handleTruncate}
                  disabled={truncating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: truncating ? 'not-allowed' : 'pointer',
                    opacity: truncating ? 0.5 : 1
                  }}
                >
                  {truncating ? '⏳ Mažu...' : '🗑️ Ano, SMAZAT VŠE'}
                </button>
              </div>
            </ModalBody>
          </ModalContainer>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default VemaDenik;
