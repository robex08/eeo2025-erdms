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
  faWindowRestore
} from '@fortawesome/free-solid-svg-icons';
import { Sparkles } from 'lucide-react';
import { PanelBase, PanelHeader, TinyBtn, edgeHandles } from './PanelPrimitives';
import styled from '@emotion/styled';
import { extractTextFromPDF, extractInvoiceData } from '../../utils/invoiceOCR';
import ErrorDialog from '../ErrorDialog';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const InboxContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
`;

const InboxHeader = styled.div`
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  padding: 0.6rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #60a5fa;
`;

const InboxTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const InboxStats = styled.div`
  font-size: 0.65rem;
  color: #cbd5e1;
  font-weight: 600;
`;

const InboxContent = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.3rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  min-height: 0;

  scrollbar-width: thin;
  scrollbar-color: #93c5fd rgba(255, 255, 255, 0.05);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #93c5fd;
    border-radius: 4px;
    border: 2px solid rgba(15, 23, 42, 0.92);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #60a5fa;
  }
`;

const FakturaCard = styled.div`
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.12), rgba(96, 165, 250, 0.08));
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 8px;
  padding: 0.7rem;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: linear-gradient(135deg, rgba(147, 197, 253, 0.18), rgba(96, 165, 250, 0.12));
    border-color: rgba(96, 165, 250, 0.5);
    transform: translateX(2px);
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
  font-size: 0.75rem;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.3;
  flex: 1;
`;

const FakturaID = styled.div`
  font-size: 0.6rem;
  color: #60a5fa;
  font-family: 'Courier New', monospace;
  background: rgba(96, 165, 250, 0.2);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  white-space: nowrap;
`;

const FakturaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.65rem;
  color: #cbd5e1;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const InfoLabel = styled.span`
  color: #94a3b8;
  font-weight: 600;
`;

const InfoValue = styled.span`
  color: #e2e8f0;
`;

const PrilohaSection = styled.div`
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(96, 165, 250, 0.25);
`;

const PrilohaTitle = styled.div`
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 600;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
`;

const PrilohaItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem;
  background: rgba(96, 165, 250, 0.1);
  border-radius: 5px;
  margin-bottom: 0.3rem;
  transition: background 0.15s;

  &:hover {
    background: rgba(96, 165, 250, 0.18);
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
  font-size: 0.65rem;
  color: #f1f5f9;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PrilohaMeta = styled.div`
  font-size: 0.55rem;
  color: #cbd5e1;
  margin-top: 0.15rem;
`;

const PrilohaButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.5rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    transform: scale(1.05);
  }

  svg {
    font-size: 0.65rem;
  }
`;

const LoadingBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.75rem;
  gap: 0.5rem;
`;

const ErrorBox = styled.div`
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  padding: 0.7rem;
  color: #fca5a5;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #94a3b8;
  font-size: 0.75rem;
  text-align: center;
  gap: 0.5rem;
  opacity: 0.7;
`;

const RefreshButton = styled.button`
  background: rgba(100, 116, 139, 0.15);
  border: 1px solid rgba(100, 116, 139, 0.3);
  color: #94a3b8;
  padding: 0.3rem 0.6rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.25);
    border-color: rgba(16, 185, 129, 0.5);
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
  background: linear-gradient(135deg, #475569, #334155);
  color: white;
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
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const TxtViewer = styled.pre`
  flex: 1;
  overflow: auto;
  padding: 2rem;
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  background: #1e293b;
  color: #e2e8f0;
  white-space: pre-wrap;
  word-wrap: break-word;

  scrollbar-width: thin;
  scrollbar-color: #64748b #1e293b;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #1e293b;
  }

  &::-webkit-scrollbar-thumb {
    background: #64748b;
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }
`;

// ============================================================
// MAIN COMPONENT
// ============================================================

const SpisovkaInboxPanel = ({ panelState, setPanelState, beginDrag, onClose, onOCRDataExtracted }) => {
  const [faktury, setFaktury] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, rok: 2025 });
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
      console.log(`✅ PDF completely downloaded: ${arrayBuffer.byteLength} bytes`);
      
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
      
      console.log(`✅ PDF validated: header="${headerStr}", size=${arrayBuffer.byteLength} bytes`);
      
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

      // Zavolat callback s daty
      if (onOCRDataExtracted) {
        onOCRDataExtracted(data);
      }

      console.log('📄 OCR Data:', data);
      
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

  const fetchFaktury = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/faktury?limit=${pagination.limit}&offset=${pagination.offset}&rok=${pagination.rok}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setFaktury(data.data);
        setPagination(data.pagination);
      } else {
        throw new Error(data.message || 'Nepodařilo se načíst faktury');
      }
    } catch (err) {
      setError(err.message);
      console.error('Chyba při načítání faktur ze spisovky:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, pagination.rok]);

  // Initial fetch
  useEffect(() => {
    fetchFaktury();
  }, []);

  // Background refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Spisovka auto-refresh (5 minut)');
      fetchFaktury();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchFaktury]);

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

  const handleMinimize = () => {
    setPanelState(s => ({ ...s, minimized: !s.minimized }));
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
          <FontAwesomeIcon icon={faBookOpen} style={{ color: '#94a3b8' }} />
          Spisovka Inbox
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <TinyBtn onClick={handleMinimize} title={panelState.minimized ? 'Obnovit' : 'Minimalizovat'}>
            <FontAwesomeIcon icon={panelState.minimized ? faWindowRestore : faMinus} />
          </TinyBtn>
          <TinyBtn onClick={handleClose} title="Zavřít">
            <FontAwesomeIcon icon={faTimes} />
          </TinyBtn>
        </div>
      </PanelHeader>

      {!panelState.minimized && (
        <InboxContainer>
          <InboxHeader>
            <InboxTitle>
              <FontAwesomeIcon icon={faBookOpen} />
              Faktury {pagination.rok}
            </InboxTitle>
            <InboxStats>
              {pagination.total} celkem
            </InboxStats>
          </InboxHeader>

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

          {!loading && !error && faktury.length > 0 && (
            <InboxContent>
              {faktury.map((faktura) => (
                <FakturaCard 
                  key={faktura.dokument_id}
                >
                  <FakturaHeader
                    draggable={faktura.prilohy && faktura.prilohy.length > 0}
                    onDragStart={(e) => {
                      if (faktura.prilohy && faktura.prilohy.length > 0) {
                        e.stopPropagation();
                        e.currentTarget.style.cursor = 'grabbing';
                        e.currentTarget.style.opacity = '0.6';
                        // Předat všechny přílohy jako JSON
                        const attachmentsData = faktura.prilohy.map(p => ({
                          url: p.download_url,
                          filename: p.filename,
                          mime_type: p.mime_type || 'application/octet-stream'
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
                    <FakturaNazev>{faktura.nazev}</FakturaNazev>
                    <FakturaID>#{faktura.dokument_id}</FakturaID>
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

                  {faktura.prilohy && faktura.prilohy.length > 0 && (
                    <PrilohaSection>
                      <PrilohaTitle>
                        📎 Přílohy ({faktura.prilohy.length})
                      </PrilohaTitle>
                      {faktura.prilohy.slice(0, 3).map((priloha) => {
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
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: '600',
                                    boxShadow: '0 1px 3px rgba(139, 92, 246, 0.3)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(139, 92, 246, 0.5)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 92, 246, 0.3)';
                                  }}
                                  title="Vytěžit údaje pomocí OCR"
                                >
                                  <Sparkles size={12} />
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
                      })}
                      {faktura.prilohy.length > 3 && (
                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.3rem', textAlign: 'center' }}>
                          +{faktura.prilohy.length - 3} další
                        </div>
                      )}
                    </PrilohaSection>
                  )}
                </FakturaCard>
              ))}
            </InboxContent>
          )}
        </InboxContainer>
      )}

      {/* OCR Progress Overlay */}
      {ocrProgress.visible && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 1000,
          borderRadius: '8px'
        }}>
          <Sparkles size={48} color="#8b5cf6" style={{ animation: 'spin 2s linear infinite' }} />
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1a1a1a' }}>
            OCR extrakce z PDF
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {ocrProgress.message}
          </div>
          <div style={{ width: '80%', maxWidth: '300px', height: '8px', backgroundColor: '#e9d5ff', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${ocrProgress.progress}%`, 
              backgroundColor: '#8b5cf6', 
              transition: 'width 0.3s ease' 
            }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: '600' }}>
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
