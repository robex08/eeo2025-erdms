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
import { PanelBase, PanelHeader, TinyBtn, edgeHandles } from './PanelPrimitives';
import styled from '@emotion/styled';

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
  background: linear-gradient(135deg, #475569, #334155);
  padding: 0.6rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #64748b;
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
  scrollbar-color: #64748b rgba(255, 255, 255, 0.05);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #64748b;
    border-radius: 4px;
    border: 2px solid rgba(15, 23, 42, 0.92);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }
`;

const FakturaCard = styled.div`
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.12), rgba(71, 85, 105, 0.08));
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  padding: 0.7rem;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: linear-gradient(135deg, rgba(100, 116, 139, 0.18), rgba(71, 85, 105, 0.12));
    border-color: rgba(100, 116, 139, 0.5);
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
  color: #94a3b8;
  font-family: 'Courier New', monospace;
  background: rgba(100, 116, 139, 0.2);
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
  border-top: 1px solid rgba(100, 116, 139, 0.25);
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
  background: rgba(100, 116, 139, 0.1);
  border-radius: 5px;
  margin-bottom: 0.3rem;
  transition: background 0.15s;

  &:hover {
    background: rgba(100, 116, 139, 0.18);
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 2rem;
`;

const FileModalContent = styled.div`
  width: 90vw;
  height: 90vh;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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

const SpisovkaInboxPanel = ({ panelState, setPanelState, beginDrag, onClose }) => {
  const [faktury, setFaktury] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, rok: 2025 });
  const [fileViewer, setFileViewer] = useState({ visible: false, url: '', filename: '', type: '', content: '' });

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
    return date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
                  draggable={faktura.prilohy && faktura.prilohy.length > 0}
                  onDragStart={(e) => {
                    if (faktura.prilohy && faktura.prilohy.length > 0) {
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
                  style={{ cursor: (faktura.prilohy && faktura.prilohy.length > 0) ? 'grab' : 'default' }}
                  title={(faktura.prilohy && faktura.prilohy.length > 0) ? `Přetáhněte pro nahrání všech ${faktura.prilohy.length} příloh` : ''}
                >
                  <FakturaHeader>
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
                              e.dataTransfer.setData('text/spisovka-file-url', priloha.download_url);
                              e.dataTransfer.setData('text/spisovka-file-name', priloha.filename);
                              e.dataTransfer.setData('text/spisovka-file-mime', priloha.mime_type || 'application/octet-stream');
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            style={{ cursor: 'grab' }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.cursor = 'grab';
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

      {fileViewer.visible && ReactDOM.createPortal(
        <FileModal onClick={() => setFileViewer({ visible: false, url: '', filename: '', type: '', content: '' })}>
          <FileModalContent onClick={(e) => e.stopPropagation()}>
            <FileModalHeader>
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
    </PanelBase>,
    document.body
  );
};

export default SpisovkaInboxPanel;
