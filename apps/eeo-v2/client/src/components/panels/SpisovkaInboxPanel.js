import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBookOpen, 
  faTimes, 
  faFileAlt, 
  faDownload, 
  faSpinner, 
  faExclamationTriangle,
  faSync,
  faMinus,
  faSquare,
  faWindowRestore,
  faExpand
} from '@fortawesome/free-solid-svg-icons';
import { Sparkles } from 'lucide-react';
import { PanelBase, PanelHeader, TinyBtn, edgeHandles } from './PanelPrimitives';
import styled from '@emotion/styled';
import { extractTextFromPDF, extractInvoiceData } from '../../utils/invoiceOCR';
import ErrorDialog from '../ErrorDialog';
import { getSpisovkaZpracovaniList, deleteSpisovkaZpracovani } from '../../services/apiSpisovkaZpracovani';

// ============================================================
// STYLED COMPONENTS + ANIMATIONS
// ============================================================

// CSS animace pro pulsující tečku
const globalStyles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.2);
    }
  }
`;

// Přidat globální styly
if (typeof document !== 'undefined' && !document.getElementById('spisovka-pulse-animation')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'spisovka-pulse-animation';
  styleTag.textContent = globalStyles;
  document.head.appendChild(styleTag);
}

const InboxContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
  /* Žádná min-width - panel si určuje šířku sám */
`;

const InboxHeader = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 0.875rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
  margin-bottom: 0.75rem;
`;

const InboxTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: white;
  letter-spacing: 0.3px;
  display: flex;
  alignItems: 'center';
  gap: 0.625rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const InboxStats = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
`;

const InboxContent = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 8px;
  min-height: 0;
  border: 1px solid #e5e7eb;

  scrollbar-width: thin;
  scrollbar-color: #10b981 #f3f4f6;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 5px;
    border: 2px solid #f9fafb;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #059669, #047857);
  }
`;

// 📋 Status Badge pro zpracované dokumenty
const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.$status) {
      case 'ZAEVIDOVANO':
        return `
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        `;
      case 'NENI_FAKTURA':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        `;
      case 'CHYBA':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #ef4444;
        `;
      case 'DUPLIKAT':
        return `
          background: #e0e7ff;
          color: #3730a3;
          border: 1px solid #6366f1;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
        `;
    }
  }}
`;

const FakturaCard = styled.div`
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    background: #f0fdf4;
    border-color: #10b981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
    transform: translateY(-2px);
  }
`;

const FakturaHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const FakturaNazev = styled.div`
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.3;
  flex: 1;
`;

const FakturaID = styled.div`
  font-size: 0.7rem;
  color: #059669;
  font-family: 'Courier New', monospace;
  background: #d1fae5;
  padding: 0.3rem 0.6rem;
  border-radius: 5px;
  white-space: nowrap;
  font-weight: 600;
`;

const FakturaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #4b5563;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const InfoLabel = styled.span`
  color: #6b7280;
  font-weight: 700;
`;

const InfoValue = styled.span`
  color: #374151;
  font-weight: 500;
`;

const PrilohaSection = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 2px solid #e5e7eb;
`;

const PrilohaTitle = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const PrilohaItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.4rem;
  transition: all 0.2s ease;

  &:hover {
    background: #f0fdf4;
    border-color: #10b981;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const PrilohaInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PrilohaFilename = styled.div`
  font-size: 0.75rem;
  color: #1f2937;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PrilohaMeta = styled.div`
  font-size: 0.65rem;
  color: #6b7280;
  margin-top: 0.2rem;
`;

const PrilohaButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: #10b981;
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.25);
  }

  svg {
    font-size: 0.75rem;
  }
`;

const LoadingBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  gap: 0.75rem;
`;

const ErrorBox = styled.div`
  background: #fef2f2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  padding: 1rem;
  color: #dc2626;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
  gap: 0.75rem;
  opacity: 0.8;
`;

const RefreshButton = styled.button`
  background: white;
  border: 2px solid #e5e7eb;
  color: #6b7280;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    background: #f0fdf4;
    border-color: #10b981;
    color: #10b981;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FileModal = styled.div`
  position: fixed;
  top: ${props => props.y || 50}px;
  left: ${props => props.x || (window.innerWidth / 2)}px;
  width: ${props => props.w || (window.innerWidth / 2 - 40)}px;
  height: ${props => props.h || (window.innerHeight - 100)}px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  z-index: 100002;
  resize: both;
  min-width: 400px;
  min-height: 300px;
`;

const FileModalContent = styled.div`
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FileModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const FileModalTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FileCloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const FileIframe = styled.iframe`
  flex: 1;
  border: none;
  width: 100%;
  height: 100%;
`;

const FileObject = styled.object`
  flex: 1;
  border: none;
  width: 100%;
  height: 100%;
`;

const PdfFallback = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: #f8fafc;
  color: #334155;
`;

const DownloadButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #10b981;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #059669;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
  }
`;

const TxtViewer = styled.pre`
  flex: 1;
  overflow: auto;
  padding: 2rem;
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  background: #f9fafb;
  color: #1f2937;
  white-space: pre-wrap;
  word-wrap: break-word;
  border: 1px solid #e5e7eb;

  scrollbar-width: thin;
  scrollbar-color: #10b981 #f9fafb;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #f9fafb;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #10b981, #059669);
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #059669, #047857);
  }
`;

// ============================================================
// MAIN COMPONENT
// ============================================================

const SpisovkaInboxPanel = ({ panelState, setPanelState, beginDrag, onClose, onOCRDataExtracted, token, username, showToast }) => {
  const [faktury, setFaktury] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 1000, offset: 0 }); // Zvýšen limit pro datum filtry
  const [zpracovaneIds, setZpracovaneIds] = useState(new Set()); // 📋 Set zpracovaných dokument_id
  const [zpracovaneDetails, setZpracovaneDetails] = useState(new Map()); // 📋 Map dokument_id → {uzivatel_jmeno, zpracovano_kdy, fa_cislo_vema}
  const [filterMode, setFilterMode] = useState('nezaevidovane'); // 'vse' | 'nezaevidovane' | 'zaevidovane' - VÝCHOZÍ: Nezaevidované
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear()); // Rok (2025, 2024...)
  const [dateRange, setDateRange] = useState('dnes'); // 'dnes' | 'tyden' | 'mesic' | 'kvartal' | 'rok' - VÝCHOZÍ: Dnes
  const [activeDokumentId, setActiveDokumentId] = useState(null); // 🎯 ID dokumentu, se kterým uživatel právě pracuje
  const [expandedAttachments, setExpandedAttachments] = useState(new Set()); // 📎 Set expandovaných faktur (dokument_id)
  const [fileViewer, setFileViewer] = useState({ visible: false, url: '', filename: '', type: '', content: '' });
  const [ocrProgress, setOcrProgress] = useState({ visible: false, progress: 0, message: '' });
  const [fileViewerPosition, setFileViewerPosition] = useState(() => {
    // PDF viewer napravo - poloviční šířka okna (jako z Spisovky)
    return {
      x: window.innerWidth / 2, // Pravá polovina obrazovky
      y: 50, // Trochu od vrchu
      w: window.innerWidth / 2 - 40, // Poloviční šířka minus offset
      h: window.innerHeight - 100 // Výška do konce obrazovky
    };
  });
  const [isDraggingViewer, setIsDraggingViewer] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, title: '', message: '', details: null, onConfirm: null });

  const fetchTxtContent = async (url) => {
    try {
      // Použít proxy endpoint pro načtení TXT (řešení CORS)
      const proxyUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/proxy-txt?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      return text;
    } catch (error) {
      console.error('Chyba při načítání TXT souboru:', error);
      return `Chyba při načítání souboru:\n${error.message}\n\nURL: ${url}`;
    }
  };

  const handleFileViewerDrag = useCallback((e) => {
    if (!isDraggingViewer) return;
    e.preventDefault();
    setFileViewerPosition(prev => ({
      ...prev,
      x: e.clientX - 200,
      y: e.clientY - 20
    }));
  }, [isDraggingViewer]);

  const handleFileViewerDragEnd = useCallback(() => {
    setIsDraggingViewer(false);
  }, []);

  useEffect(() => {
    if (isDraggingViewer) {
      window.addEventListener('mousemove', handleFileViewerDrag);
      window.addEventListener('mouseup', handleFileViewerDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleFileViewerDrag);
        window.removeEventListener('mouseup', handleFileViewerDragEnd);
      };
    }
  }, [isDraggingViewer, handleFileViewerDrag, handleFileViewerDragEnd]);

  const handleOCRExtraction = async (priloha, dokumentId) => {
    try {
      // ✅ RESET polí před OCR
      if (onOCRDataExtracted) {
        onOCRDataExtracted({
          datumVystaveni: '',
          datumSplatnosti: '',
          variabilniSymbol: '',
          castka: ''
        });
      }
      
      setOcrProgress({ visible: true, progress: 0, message: 'Stahuji PDF ze Spisovky...' });

      // Použít proxy-file endpoint pro stažení PDF (řešení CORS)
      const proxyUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/proxy-file?url=${encodeURIComponent(priloha.download_url)}`;
      
      console.log(`📄 Fetching PDF via proxy: ${proxyUrl}`);
      console.log(`📄 Original URL: ${priloha.download_url}`);
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      console.log(`📄 Response received, Content-Type: ${contentType}, Length: ${contentLength}`);
      
      // Validace response
      if (!contentType || !contentType.includes('pdf')) {
        throw new Error(`Neplatný formát souboru: ${contentType || 'unknown'}. Očekáváno PDF.`);
      }
      
      setOcrProgress({ visible: true, progress: 3, message: 'Stahuji PDF data...' });
      
      // DŮLEŽITÉ: Počkáme na kompletní stažení jako ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Validace stažených dat
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Stažený soubor je prázdný. Zkuste to prosím znovu.');
      }
      
      if (arrayBuffer.byteLength < 100) {
        throw new Error(`Stažený soubor je příliš malý (${arrayBuffer.byteLength} bytes). Stahování možná selhalo.`);
      }
      
      // Validace PDF magických bytů (%PDF)
      const header = new Uint8Array(arrayBuffer.slice(0, 5));
      const headerStr = String.fromCharCode(...header);
      if (!headerStr.startsWith('%PDF')) {
        console.error('Invalid PDF header:', headerStr);
        throw new Error('Stažený soubor není platné PDF (chybí PDF header).');
      }
      
      
      setOcrProgress({ visible: true, progress: 5, message: 'PDF staženo, připravuji OCR...' });

      // OCR extrakce (předáváme přímo ArrayBuffer)
      const text = await extractTextFromPDF(arrayBuffer, (progress, message) => {
        setOcrProgress({ visible: true, progress, message });
      });

      // Vytěžení dat
      const data = extractInvoiceData(text);
      
      setOcrProgress({ visible: false, progress: 100, message: 'Hotovo!' });

      // Zobrazit varování, pokud dokument není faktura
      if (data.warning) {
        await new Promise((resolve) => {
          setErrorDialog({
            isOpen: true,
            title: '⚠️ Varování',
            message: data.warning,
            details: null,
            onConfirm: () => {
              setErrorDialog({ isOpen: false, title: '', message: '', details: null, onConfirm: null });
              resolve(true);
            },
            onClose: () => {
              setErrorDialog({ isOpen: false, title: '', message: '', details: null, onConfirm: null });
              resolve(false);
            }
          });
        }).then((proceed) => {
          if (!proceed) {
            console.log('📄 OCR zrušeno uživatelem - dokument není faktura');
            throw new Error('OCR_CANCELLED');
          }
        });
      }

      // Zavolat callback s daty + Spisovka metadata pro tracking
      if (onOCRDataExtracted) {
        onOCRDataExtracted({
          ...data,
          // 📋 SPISOVKA METADATA pro automatický tracking
          spisovka_dokument_id: dokumentId,
          spisovka_priloha_id: priloha.priloha_id
        });
      }

      console.log('📄 OCR Data + Spisovka metadata:', {
        ...data,
        spisovka_dokument_id: dokumentId,
        spisovka_priloha_id: priloha.priloha_id
      });
      
      // ✅ AUTOMATICKY OTEVŘÍT PDF pro kontrolu výsledků OCR
      console.log('📄 Opening PDF for verification...');
      setFileViewer({
        visible: true,
        url: priloha.download_url,
        filename: priloha.filename,
        type: 'pdf',
        content: ''
      });
    } catch (err) {
      console.error('❌ OCR Error:', err);
      setOcrProgress({ visible: false, progress: 0, message: '' });
      
      // Ignorovat cancel chybu
      if (err.message === 'OCR_CANCELLED') {
        return;
      }
      
      // Zobrazit error dialog
      setErrorDialog({
        isOpen: true,
        title: 'Chyba při OCR extrakci',
        message: err.message || 'Nepodařilo se extrahovat data z dokumentu.',
        details: err.stack || null,
        onConfirm: () => {
          setErrorDialog({ isOpen: false, title: '', message: '', details: null, onConfirm: null });
          // Otevřít PDF viewer pro manuální práci (použít STEJNOU URL jako preview)
          setFileViewer({
            visible: true,
            url: priloha.download_url,
            filename: priloha.filename,
            type: 'pdf',
            content: ''
          });
        },
        onClose: () => {
          setErrorDialog({ isOpen: false, title: '', message: '', details: null, onConfirm: null });
        }
      });
    }
  };

  // 📅 Helper: Výpočet datum rozsahu
  const calculateDateRange = useCallback((range, year) => {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    let dateFrom, dateTo;

    switch (range) {
      case 'dnes':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'tyden':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        dateFrom = weekAgo;
        dateTo = now;
        break;
      case 'mesic':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        dateFrom = monthAgo;
        dateTo = now;
        break;
      case 'kvartal':
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(now.getMonth() - 3);
        dateFrom = quarterAgo;
        dateTo = now;
        break;
      case 'rok':
        dateFrom = new Date(currentYear, 0, 1); // 1. ledna
        dateTo = new Date(currentYear, 11, 31, 23, 59, 59); // 31. prosince
        break;
      default:
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = now;
    }

    return {
      dateFrom: dateFrom.toISOString().split('T')[0], // YYYY-MM-DD
      dateTo: dateTo.toISOString().split('T')[0]
    };
  }, []);

  // 📋 Načíst zpracované dokumenty pro označení
  const fetchZpracovaneDokumenty = useCallback(async () => {
    try {
      // Token a username přicházejí jako props z InvoiceEvidencePage
      if (!token || !username) {
        console.warn('⚠️ Token nebo username chybí - nelze načíst zpracované dokumenty');
        return;
      }

      const response = await getSpisovkaZpracovaniList({
        username,
        token,
        limit: 1000, // Načíst všechny zpracované dokumenty
        offset: 0
      });

      if (response.status === 'ok' && response.data) {
        // Vytvořit Set z dokument_id pro rychlé vyhledávání
        const processedIds = new Set(response.data.map(item => item.dokument_id));
        setZpracovaneIds(processedIds);
        
        // Vytvořit Map s detaily pro každý dokument
        const detailsMap = new Map();
        response.data.forEach(item => {
          detailsMap.set(item.dokument_id, {
            uzivatel_jmeno: item.uzivatel_jmeno || 'Neznámý',
            zpracovano_kdy: item.zpracovano_kdy,
            fa_cislo_vema: item.fa_cislo_vema,
            faktura_id: item.faktura_id, // 🆕 Pro případné smazání faktury
            stav: item.stav
          });
        });
        setZpracovaneDetails(detailsMap);
      }
    } catch (err) {
      console.warn('⚠️ Nepodařilo se načíst zpracované dokumenty:', err);
      // Neblokujeme - panel může fungovat i bez tohoto
    }
  }, [token, username]);

  // 🗑️ Zrušit zpracování Spisovka dokumentu
  const handleCancelProcessing = useCallback(async (dokumentId, fakturaId, faCisloVema) => {
    setErrorDialog({
      isOpen: true,
      title: '🗑️ Zrušit zpracování dokumentu',
      message: (
        <div style={{ fontFamily: 'system-ui', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '12px' }}>
            Chcete zrušit zpracování tohoto dokumentu ze Spisovky?
          </p>
          {faCisloVema && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '12px'
            }}>
              <div><strong>Zaevidovaná faktura:</strong> {faCisloVema}</div>
              {fakturaId && <div style={{ fontSize: '12px', color: '#78716c', marginTop: '4px' }}>ID: {fakturaId}</div>}
            </div>
          )}
          <p style={{ marginBottom: '8px', fontWeight: 600, color: '#dc2626' }}>
            ⚠️ Pozor: Toto pouze odstraní vazbu mezi dokumentem a fakturou.
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            Fakturu můžete smazat ručně z formuláře editace faktury.
          </p>
        </div>
      ),
      onConfirm: async () => {
        try {
          // Smazat tracking
          await deleteSpisovkaZpracovani({
            username,
            token,
            dokument_id: dokumentId
          });
          
          // Vyčistit localStorage pokud je to aktivní dokument
          if (activeDokumentId === dokumentId) {
            localStorage.removeItem('spisovka_active_dokument');
            setActiveDokumentId(null);
          }
          
          // Refresh seznamu
          await fetchZpracovaneDokumenty();
          
          showToast && showToast('✅ Evidence zrušena', { type: 'success' });
          setErrorDialog({ isOpen: false, title: '', message: '', details: null, onConfirm: null });
        } catch (err) {
          showToast && showToast(`❌ Chyba: ${err.message}`, { type: 'error' });
          setErrorDialog({ isOpen: false, title: '', message: '', details: null, onConfirm: null });
        }
      }
    });
  }, [username, token, activeDokumentId, fetchZpracovaneDokumenty, showToast, setActiveDokumentId, setErrorDialog]);

  const fetchFaktury = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Načíst faktury pro zvolený rok (vždy celý rok, pak client-side filtrujeme podle dateRange)
      const apiUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/faktury?limit=${pagination.limit}&offset=${pagination.offset}&rok=${yearFilter}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setFaktury(data.data);
        setPagination(prev => ({ ...prev, total: data.pagination?.total || data.data.length }));
        
        // 📋 Načíst zpracované dokumenty po načtení faktur
        fetchZpracovaneDokumenty();
      } else {
        throw new Error(data.message || 'Nepodařilo se načíst faktury');
      }
    } catch (err) {
      setError(err.message);
      console.error('Chyba při načítání faktur ze spisovky:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, yearFilter, fetchZpracovaneDokumenty, token, username]);

  // Initial fetch + refetch při změně roku
  useEffect(() => {
    fetchFaktury();
  }, [yearFilter]); // 📅 Refetch při změně roku

  // Background refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFaktury();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchFaktury]);

  // 🎯 Polling pro aktivní dokument z localStorage
  useEffect(() => {
    const checkActiveDocument = () => {
      const activeDokId = localStorage.getItem('spisovka_active_dokument');
      const parsedDokId = activeDokId ? parseInt(activeDokId, 10) : null;
      
      // Pouze update stavu, scroll se provede v samostatném effectu
      setActiveDokumentId(parsedDokId);
    };

    // Initial check
    checkActiveDocument();

    // Poll každých 500ms (rychlá reakce na změny)
    const interval = setInterval(checkActiveDocument, 500);

    return () => clearInterval(interval);
  }, []);

  // 🎯 SCROLL NA AKTIVNÍ DOKUMENT po načtení seznamu
  useEffect(() => {
    if (activeDokumentId && faktury.length > 0) {
      // Počkat na render a pak scrollovat
      const timeoutId = setTimeout(() => {
        const element = document.querySelector(`[data-section="dokument-${activeDokumentId}"]`);
        if (element) {
          console.log('📜 Scrolling to active document:', activeDokumentId);
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        } else {
        }
      }, 300); // Delay pro zajištění renderování
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeDokumentId, faktury]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSnapRight = () => {
    // 📌 Snap panel doprava - zjistit šířku z pravého náhledového panelu (45% okna)
    // LAYOUT: fixed header (96px) + menubar (48px) = 144px top offset
    // Footer: 54px
    const headerHeight = 96; // Fixed header
    const menubarHeight = 48; // Menubar
    const footerHeight = 54; // Layout footer
    const topOffset = headerHeight + menubarHeight; // 144px celkem
    const minWidth = 620; // Minimální šířka aby tlačítka nevytekala
    
    // Najít pravý náhledový panel podle textu "Náhled" v SectionTitle
    let targetWidth = panelState.w; // Fallback na aktuální šířku
    
    const previewHeaders = Array.from(document.querySelectorAll('div')).filter(el => 
      el.textContent.includes('Náhled') && el.style.width && el.parentElement
    );
    
    if (previewHeaders.length > 0) {
      // Najít parent container (pravý sloupec)
      let previewColumn = previewHeaders[0].parentElement;
      while (previewColumn && !previewColumn.style.width?.includes('%')) {
        previewColumn = previewColumn.parentElement;
      }
      if (previewColumn) {
        const previewWidth = previewColumn.getBoundingClientRect().width;
        targetWidth = Math.max(previewWidth, minWidth);
      }
    }
    
    if (targetWidth === panelState.w) {
      // Fallback: použít 45% šířky okna (jako PreviewColumn)
      targetWidth = Math.max(Math.floor(window.innerWidth * 0.45), minWidth);
    }
    
    setPanelState(prev => ({
      ...prev,
      x: window.innerWidth - targetWidth, // Zarovnat k pravému okraji
      y: topOffset, // Pod header + menubar
      w: targetWidth,
      h: window.innerHeight - topOffset - footerHeight, // Celá výška minus header, menubar, footer
      minimized: false
    }));
  };

  const handleMinimize = () => {
    // ✅ OPRAVENO: Minimize = zavřít celý panel (ne jen obsah)
    if (onClose) onClose();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const currentStyle = {
    left: `${panelState.x}px`,
    top: `${panelState.y}px`,
    width: `${panelState.w}px`,
    height: `${panelState.h}px`,
    minWidth: '320px',
    minHeight: '200px',
    maxHeight: '90vh'
  };

  return ReactDOM.createPortal(
    <PanelBase style={currentStyle}>
      {edgeHandles(beginDrag, 'spisovkaInbox')}
      
      <PanelHeader
        onMouseDown={(e) => beginDrag(e, 'spisovkaInbox', 'move')}
        style={{ cursor: 'move' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FontAwesomeIcon icon={faBookOpen} style={{ color: '#1f2937' }} />
          Spisovka Inbox
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <TinyBtn 
            onClick={() => {
              fetchFaktury();
              fetchZpracovaneDokumenty();
            }} 
            title="Obnovit data (Spisovka + Tracking)"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <FontAwesomeIcon icon={faSync} spin={loading} />
          </TinyBtn>
          <TinyBtn onClick={handleSnapRight} title="Zarovnat doprava (celá výška)">
            <FontAwesomeIcon icon={faExpand} />
          </TinyBtn>
          <TinyBtn onClick={handleMinimize} title={panelState.minimized ? 'Obnovit' : 'Minimalizovat'}>
            <FontAwesomeIcon icon={panelState.minimized ? faWindowRestore : faMinus} />
          </TinyBtn>
          <TinyBtn onClick={handleClose} title="Zavřít">
            <FontAwesomeIcon icon={faTimes} />
          </TinyBtn>
        </div>
      </PanelHeader>

      {!panelState.minimized && (() => {
        // 📊 Spočítat filtrované faktury pro zobrazení v headeru
        const { dateFrom, dateTo } = calculateDateRange(dateRange, yearFilter);
        const dateFromTs = new Date(dateFrom).getTime();
        const dateToTs = new Date(dateTo + ' 23:59:59').getTime();
        
        const filteredCount = faktury.filter(faktura => {
          const fakturaDate = new Date(faktura.datum_vzniku);
          const fakturaTs = fakturaDate.getTime();
          if (fakturaTs < dateFromTs || fakturaTs > dateToTs) return false;
          
          const isZaevidovano = zpracovaneIds.has(faktura.dokument_id);
          if (filterMode === 'nezaevidovane') return !isZaevidovano;
          if (filterMode === 'zaevidovane') return isZaevidovano;
          return true;
        }).length;
        
        return (
        <InboxContainer>
          <InboxHeader>
            <InboxTitle>
              <FontAwesomeIcon icon={faBookOpen} />
              Faktury
            </InboxTitle>
            <InboxStats>
              {filteredCount} / {pagination.total} celkem
            </InboxStats>
          </InboxHeader>
          
          {/* 📅 ROK + DATUM FILTRY */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderBottom: '1px solid #bae6fd',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Rok selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>Rok:</span>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '2px solid #0284c7',
                  background: 'white',
                  color: '#0c4a6e',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const startYear = 2025; // Počáteční rok evidence
                  const years = [];
                  for (let y = currentYear; y >= startYear; y--) {
                    years.push(y);
                  }
                  return years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ));
                })()}
              </select>
            </div>

            {/* Datum range filtry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>Období:</span>
              {['dnes', 'tyden', 'mesic', 'kvartal', 'rok'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: dateRange === range ? '2px solid #0284c7' : '1px solid #94a3b8',
                    background: dateRange === range ? '#e0f2fe' : 'white',
                    color: dateRange === range ? '#0c4a6e' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: dateRange === range ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (dateRange !== range) {
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.color = '#0c4a6e';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (dateRange !== range) {
                      e.currentTarget.style.borderColor = '#94a3b8';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  {range === 'dnes' && 'Dnes'}
                  {range === 'tyden' && 'Týden zpět'}
                  {range === 'mesic' && 'Měsíc zpět'}
                  {range === 'kvartal' && 'Kvartál zpět'}
                  {range === 'rok' && 'Celý rok'}
                </button>
              ))}
            </div>
          </div>

          {/* 🔘 FILTROVACÍ TLAČÍTKA (Vše / Nezaevidované / Zaevidované) */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Zobrazit:</span>
              {['vse', 'nezaevidovane', 'zaevidovane'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: filterMode === mode ? '2px solid #10b981' : '1px solid #d1d5db',
                    background: filterMode === mode ? '#ecfdf5' : 'white',
                  color: filterMode === mode ? '#059669' : '#6b7280',
                  fontSize: '0.8rem',
                  fontWeight: filterMode === mode ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (filterMode !== mode) {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.color = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterMode !== mode) {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                {mode === 'vse' && 'Vše'}
                {mode === 'nezaevidovane' && `Nezaevidované (${faktury.filter(f => !zpracovaneIds.has(f.dokument_id)).length})`}
                {mode === 'zaevidovane' && `Zaevidované (${zpracovaneIds.size})`}
              </button>
            ))}
            </div>
            
            {/* 🎯 IKONA SCROLL NA AKTIVNÍ DOKUMENT */}
            {activeDokumentId && (
              <button
                onClick={() => {
                  const element = document.querySelector(`[data-section="dokument-${activeDokumentId}"]`);
                  if (element) {
                    element.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'center',
                      inline: 'nearest'
                    });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  color: '#1e40af',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Jdi na fakturu, se kterou právě pracuji"
              >
                ⚡
              </button>
            )}
          </div>

          {loading && (
            <LoadingBox>
              <FontAwesomeIcon icon={faSpinner} spin />
              Načítám faktury...
            </LoadingBox>
          )}

          {error && (
            <ErrorBox>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              Chyba: {error}
              <RefreshButton onClick={fetchFaktury} disabled={loading}>
                <FontAwesomeIcon icon={faSync} />
                Zkusit znovu
              </RefreshButton>
            </ErrorBox>
          )}

          {!loading && !error && faktury.length === 0 && (
            <EmptyBox>
              <FontAwesomeIcon icon={faBookOpen} size="2x" />
              Žádné faktury k zobrazení
            </EmptyBox>
          )}

          {!loading && !error && faktury.length > 0 && (() => {
            // 📅 Výpočet datum rozsahu
            const { dateFrom, dateTo } = calculateDateRange(dateRange, yearFilter);
            const dateFromTs = new Date(dateFrom).getTime();
            const dateToTs = new Date(dateTo + ' 23:59:59').getTime();
            
            // 🔍 Filtrování faktur podle režimu + datum rozsahu + název (pouze faktury)
            const filteredFaktury = faktury.filter(faktura => {
              // 0. Filter podle názvu - pouze dokumenty obsahující "Faktura", "Fa č.", "Fač.", "FA" atd.
              // Regex zachytí: faktura/faktúra, fa.č./fa.c./fa č./fa c./fač./fac./fak.č./fak.c./fak č./fak c., FA na začátku
              const nazev = (faktura.nazev || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Normalizace diakritiky
              const isFaktura = /faktur[aáuú]|fa[\s\.]*(c|č)[\s\.]?|fak[\s\.]*(c|č)[\s\.]?|^fa\s/i.test(nazev) || 
                                /faktur[aáuú]|fa[\s\.]*(c|č)[\s\.]?|fak[\s\.]*(c|č)[\s\.]?|^fa\s/i.test(faktura.nazev || '');
              
              if (!isFaktura) {
                return false; // Není faktura podle názvu
              }
              
              // 1. Filter podle dateRange
              const fakturaDate = new Date(faktura.datum_vzniku);
              const fakturaTs = fakturaDate.getTime();
              if (fakturaTs < dateFromTs || fakturaTs > dateToTs) {
                return false; // Mimo datum rozsah
              }
              
              // 2. Filter podle režimu (Vše / Nezaevidované / Zaevidované)
              const isZaevidovano = zpracovaneIds.has(faktura.dokument_id);
              if (filterMode === 'nezaevidovane') return !isZaevidovano;
              if (filterMode === 'zaevidovane') return isZaevidovano;
              return true; // 'vse'
            });
            
            if (filteredFaktury.length === 0) {
              return (
                <EmptyBox>
                  <FontAwesomeIcon icon={faBookOpen} size="2x" />
                  {filterMode === 'nezaevidovane' && 'Všechny faktury jsou zaevidované ✓'}
                  {filterMode === 'zaevidovane' && 'Zatím žádné zaevidované faktury'}
                </EmptyBox>
              );
            }
            
            return (
            <InboxContent>
              {filteredFaktury.map((faktura) => {
                const isActive = activeDokumentId === faktura.dokument_id;
                const isOtherActive = activeDokumentId && !isActive;
                
                return (
                <FakturaCard 
                  key={faktura.dokument_id}
                  data-section={`dokument-${faktura.dokument_id}`}
                  style={{
                    opacity: isOtherActive ? 0.4 : 1,
                    transition: 'opacity 0.3s ease',
                    position: 'relative'
                  }}
                >
                  {/* 🎯 Indikátor aktivního dokumentu */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                      borderRadius: '6px 6px 0 0',
                      zIndex: 1
                    }} />
                  )}
                  {isActive && (
                    <div style={{
                      padding: '6px 12px',
                      marginBottom: '12px',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      borderBottom: '1px solid #93c5fd',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1e40af'
                    }}>
                      <span style={{ fontSize: '16px' }}>⚡</span>
                      <span>Právě pracuji s touto fakturou</span>
                      <div style={{
                        marginLeft: 'auto',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        animation: 'pulse 2s infinite'
                      }} />
                    </div>
                  )}
                  <FakturaHeader
                    draggable={faktura.prilohy && faktura.prilohy.length > 0}
                    onDragStart={(e) => {
                      if (faktura.prilohy && faktura.prilohy.length > 0) {
                        e.stopPropagation();
                        e.currentTarget.style.cursor = 'grabbing';
                        e.currentTarget.style.opacity = '0.6';
                        // Předat všechny přílohy jako JSON + Spisovka metadata pro tracking
                        const attachmentsData = faktura.prilohy.map(p => ({
                          url: p.download_url,
                          filename: p.filename,
                          mime_type: p.mime_type || 'application/octet-stream',
                          // 📋 SPISOVKA METADATA pro automatický tracking
                          spisovka_dokument_id: faktura.dokument_id,
                          spisovka_file_id: p.file_id || p.priloha_id
                        }));
                        e.dataTransfer.setData('text/spisovka-attachments', JSON.stringify(attachmentsData));
                        e.dataTransfer.effectAllowed = 'copy';
                      }
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      e.currentTarget.style.cursor = (faktura.prilohy && faktura.prilohy.length > 0) ? 'grab' : 'default';
                      e.currentTarget.style.opacity = '1';
                    }}
                    style={{ cursor: (faktura.prilohy && faktura.prilohy.length > 0) ? 'grab' : 'default' }}
                    title={(faktura.prilohy && faktura.prilohy.length > 0) ? `Přetáhněte hlavičku pro nahrání všech ${faktura.prilohy.length} příloh` : ''}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                        <FakturaNazev>{faktura.nazev}</FakturaNazev>
                        <FakturaID>#{faktura.dokument_id}</FakturaID>
                      </div>
                      {zpracovaneIds.has(faktura.dokument_id) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <StatusBadge $status="ZAEVIDOVANO">
                            ✓ Zaevidováno
                          </StatusBadge>
                        </div>
                      )}
                    </div>
                  </FakturaHeader>

                  <FakturaInfo>
                    <InfoRow>
                      <InfoLabel>JID:</InfoLabel>
                      <InfoValue>{faktura.jid}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>Číslo jednací:</InfoLabel>
                      <InfoValue>{faktura.cislo_jednaci}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel>Datum vzniku:</InfoLabel>
                      <InfoValue>{formatDate(faktura.datum_vzniku)}</InfoValue>
                    </InfoRow>
                  </FakturaInfo>

                  {/* 📋 INFO O ZPRACOVÁNÍ (pokud je zaevidováno) */}
                  {zpracovaneIds.has(faktura.dokument_id) && zpracovaneDetails.has(faktura.dokument_id) && (() => {
                    const detail = zpracovaneDetails.get(faktura.dokument_id);
                    const zpracovanoDate = new Date(detail.zpracovano_kdy);
                    const timeAgo = Math.floor((Date.now() - zpracovanoDate.getTime()) / 1000);
                    let timeText = '';
                    if (timeAgo < 60) timeText = 'před chvílí';
                    else if (timeAgo < 3600) timeText = `před ${Math.floor(timeAgo / 60)} min`;
                    else if (timeAgo < 86400) timeText = `před ${Math.floor(timeAgo / 3600)} h`;
                    else timeText = `před ${Math.floor(timeAgo / 86400)} dny`;
                    
                    return (
                      <div style={{
                        padding: '0.75rem 1rem',
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        borderTop: '1px solid #a7f3d0',
                        borderBottom: '1px solid #a7f3d0',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          fontSize: '0.8rem',
                          color: '#047857',
                          fontWeight: 500
                        }}>
                          <span>✓</span>
                          <span>
                            Zaevidováno <strong>{timeText}</strong>
                            {detail.fa_cislo_vema && <> jako <strong>{detail.fa_cislo_vema}</strong></>}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelProcessing(faktura.dokument_id, detail.faktura_id, detail.fa_cislo_vema);
                            }}
                            style={{
                              marginLeft: 'auto',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600
                            }}
                            title="Zrušit zpracování tohoto dokumentu"
                          >
                            <span>🗑️</span>
                            <span>Zrušit</span>
                          </button>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#059669',
                          marginTop: '0.25rem',
                          paddingLeft: '1.5rem'
                        }}>
                          Uživatel: <strong>{detail.uzivatel_jmeno}</strong> • {zpracovanoDate.toLocaleString('cs-CZ')}
                        </div>
                      </div>
                    );
                  })()}

                  {faktura.prilohy && faktura.prilohy.length > 0 && (
                    <PrilohaSection>
                      <PrilohaTitle>
                        📎 Přílohy ({faktura.prilohy.length})
                      </PrilohaTitle>
                      {(() => {
                        const isExpanded = expandedAttachments.has(faktura.dokument_id);
                        const attachmentsToShow = isExpanded ? faktura.prilohy : faktura.prilohy.slice(0, 3);
                        return attachmentsToShow.map((priloha) => {
                        const isPdf = priloha.mime_type === 'application/pdf';
                        const isTxt = priloha.mime_type === 'text/plain' || priloha.filename.toLowerCase().endsWith('.txt');
                        const canPreview = isPdf || isTxt;
                        return (
                          <PrilohaItem 
                            key={priloha.file_id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.currentTarget.style.cursor = 'grabbing';
                              e.currentTarget.style.opacity = '0.6';
                              e.dataTransfer.setData('text/spisovka-file-url', priloha.download_url);
                              e.dataTransfer.setData('text/spisovka-file-name', priloha.filename);
                              e.dataTransfer.setData('text/spisovka-file-mime', priloha.mime_type || 'application/octet-stream');
                              e.dataTransfer.setData('text/spisovka-file-id', priloha.file_id); // 🆕 ID přílohy
                              e.dataTransfer.setData('text/spisovka-dokument-id', faktura.dokument_id); // 🆕 ID dokumentu
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            style={{ cursor: 'grab' }}
                            onDragEnd={(e) => {
                              e.stopPropagation();
                              e.currentTarget.style.cursor = 'grab';
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            <PrilohaInfo>
                              <PrilohaFilename>
                                {isPdf && '📄 '}{isTxt && '📝 '}{priloha.filename}
                              </PrilohaFilename>
                              <PrilohaMeta>
                                {formatFileSize(priloha.size)}
                              </PrilohaMeta>
                            </PrilohaInfo>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {/* OCR Button VLEVO - pouze pro PDF */}
                              {isPdf && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOCRExtraction(priloha, faktura.dokument_id);
                                  }}
                                  style={{
                                    background: '#3b82f6',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#2563eb';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.25)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#3b82f6';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                                  }}
                                  title="Vytěžit údaje pomocí OCR"
                                >
                                  <Sparkles size={14} />
                                  <span>OCR</span>
                                </button>
                              )}
                              
                              {/* PDF/TXT Preview Button VPRAVO */}
                              <PrilohaButton
                                as={canPreview ? 'button' : 'a'}
                                href={canPreview ? undefined : priloha.download_url}
                                target={canPreview ? undefined : "_blank"}
                                rel={canPreview ? undefined : "noopener noreferrer"}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (isPdf) {
                                    // Otevřít PDF v modalu
                                    setFileViewer({
                                      visible: true,
                                      url: priloha.download_url,
                                      filename: priloha.filename,
                                      type: 'pdf',
                                      content: ''
                                    });
                                  } else if (isTxt) {
                                    const txtContent = await fetchTxtContent(priloha.download_url);
                                    setFileViewer({
                                      visible: true,
                                      url: priloha.download_url,
                                      filename: priloha.filename,
                                      type: 'txt',
                                      content: txtContent
                                    });
                                  }
                                }}
                              >
                                <FontAwesomeIcon icon={isPdf ? faFileAlt : (isTxt ? faFileAlt : faDownload)} />
                                {isPdf ? 'PDF' : (isTxt ? 'TXT' : 'DL')}
                              </PrilohaButton>
                            </div>
                          </PrilohaItem>
                        );
                        });
                      })()}
                      {faktura.prilohy.length > 3 && (
                        <div 
                          style={{ 
                            fontSize: '0.75rem', 
                            color: '#3b82f6', 
                            marginTop: '0.5rem', 
                            textAlign: 'center', 
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedAttachments(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(faktura.dokument_id)) {
                                newSet.delete(faktura.dokument_id);
                              } else {
                                newSet.add(faktura.dokument_id);
                              }
                              return newSet;
                            });
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#dbeafe';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#eff6ff';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {expandedAttachments.has(faktura.dokument_id) 
                            ? '▲ Skrýt přílohy' 
                            : `▼ Zobrazit +${faktura.prilohy.length - 3} další`}
                        </div>
                      )}
                    </PrilohaSection>
                  )}
                </FakturaCard>
              );
              })}
            </InboxContent>
            );
          })()}
        </InboxContainer>
        );
      })()}

      {/* OCR Progress Overlay */}
      {ocrProgress.visible && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.98) 0%, rgba(243, 244, 246, 0.98) 100%)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          zIndex: 1000,
          borderRadius: '8px',
          border: '2px solid #e5e7eb',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <Sparkles size={40} color="white" style={{ animation: 'spin 2s linear infinite' }} />
          </div>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: '700', 
            color: '#1f2937',
            textAlign: 'center'
          }}>
            <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
            OCR extrakce z PDF
          </div>
          <div style={{ 
            fontSize: '0.9rem', 
            color: '#6b7280',
            textAlign: 'center',
            maxWidth: '300px'
          }}>
            {ocrProgress.message}
          </div>
          <div style={{ 
            width: '85%', 
            maxWidth: '320px', 
            height: '10px', 
            backgroundColor: '#e5e7eb', 
            borderRadius: '5px', 
            overflow: 'hidden',
            border: '1px solid #d1d5db',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${ocrProgress.progress}%`, 
              background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
            }} />
          </div>
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#1e40af', 
            fontWeight: '700',
            background: 'rgba(59, 130, 246, 0.1)',
            padding: '0.25rem 0.75rem',
            borderRadius: '12px'
          }}>
            {Math.round(ocrProgress.progress)}%
          </div>
        </div>
      )}

      {fileViewer.visible && ReactDOM.createPortal(
        <FileModal 
          x={fileViewerPosition.x}
          y={fileViewerPosition.y}
          w={fileViewerPosition.w}
          h={fileViewerPosition.h}
        >
          <FileModalContent>
            <FileModalHeader
              onMouseDown={(e) => {
                setIsDraggingViewer(true);
                e.preventDefault();
              }}
              style={{ cursor: isDraggingViewer ? 'grabbing' : 'grab' }}
            >
              <FileModalTitle>
                <FontAwesomeIcon icon={faFileAlt} />
                {fileViewer.filename}
              </FileModalTitle>
              <FileCloseButton onClick={() => setFileViewer({ visible: false, url: '', filename: '', type: '', content: '' })}>
                <FontAwesomeIcon icon={faTimes} />
              </FileCloseButton>
            </FileModalHeader>
            {fileViewer.type === 'pdf' ? (
              <FileObject 
                data={fileViewer.url}
                type="application/pdf"
                title={fileViewer.filename}
              >
                <PdfFallback>
                  <FontAwesomeIcon icon={faFileAlt} size="3x" style={{ color: '#64748b' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>PDF nelze zobrazit v prohlížeči</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', maxWidth: '400px' }}>
                    Váš prohlížeč nepodporuje zobrazení PDF souborů. Můžete soubor stáhnout a otevřít externě.
                  </div>
                  <DownloadButton href={fileViewer.url} download={fileViewer.filename}>
                    <FontAwesomeIcon icon={faDownload} />
                    Stáhnout PDF
                  </DownloadButton>
                </PdfFallback>
              </FileObject>
            ) : fileViewer.type === 'txt' ? (
              <TxtViewer>{fileViewer.content}</TxtViewer>
            ) : null}
          </FileModalContent>
        </FileModal>,
        document.body
      )}

      <ErrorDialog
        isOpen={errorDialog.isOpen}
        title={errorDialog.title}
        message={errorDialog.message}
        details={errorDialog.details}
        onConfirm={errorDialog.onConfirm}
        onClose={errorDialog.onClose}
        confirmText={errorDialog.onConfirm ? (errorDialog.title.includes('Varování') ? 'Pokračovat' : 'Otevřít PDF') : null}
        cancelText="Zrušit"
      />
    </PanelBase>,
    document.body
  );
};

export default SpisovkaInboxPanel;
