import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt, faFilePdf, faFileImage, faFileExcel, faFileWord, 
  faFileArchive, faFile, faDownload, faEye, faTimes 
} from '@fortawesome/free-solid-svg-icons';

// Styled Components
const TooltipContainer = styled.div`
  position: fixed;
  z-index: 10000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 0;
  min-width: 280px;
  max-width: 400px;
  animation: fadeIn 0.15s ease-out;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const TooltipHeader = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  letter-spacing: 0.01em;
`;

const AttachmentsList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem 0;
  
  /* Stylový scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
`;

const AttachmentItem = styled.div`
  padding: 0.75rem 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  transition: background-color 0.2s;
  cursor: default;
  
  &:hover {
    background-color: #f8fafc;
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid #f1f5f9;
  }
`;

const FileIconBox = styled.div`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: ${props => props.$bgColor || '#f1f5f9'};
  
  svg {
    color: ${props => props.$iconColor || '#64748b'};
    font-size: 1.25rem;
  }
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FileName = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.01em;
`;

const FileDetails = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  letter-spacing: 0.01em;
`;

const FileBadge = styled.span`
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.$bgColor || '#f1f5f9'};
  color: ${props => props.$color || '#64748b'};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  padding: 0.375rem;
  cursor: pointer;
  color: #64748b;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #e2e8f0;
    color: #334155;
  }
  
  svg {
    font-size: 0.9rem;
  }
`;

const EmptyState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
  letter-spacing: 0.01em;
`;

// Float Viewer Modal
const ViewerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: fadeIn 0.2s ease-out;
`;

const ViewerContainer = styled.div`
  position: relative;
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const ViewerHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const ViewerTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80%;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.01em;
`;

const CloseButton = styled.button`
  background: #f1f5f9;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: #e2e8f0;
    color: #334155;
  }
`;

const ViewerContent = styled.div`
  flex: 1;
  overflow: auto;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  
  iframe, img {
    width: 100%;
    height: 100%;
    border: none;
  }
  
  img {
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
  }
`;

const UnsupportedMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #64748b;
  
  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #94a3b8;
  }
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
    font-size: 1.125rem;
  }
  
  p {
    margin: 0 0 1.5rem 0;
  }
`;

const DownloadButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background: #2563eb;
  }
`;

// Helper functions
const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  
  const iconMap = {
    pdf: { icon: faFilePdf, color: '#dc2626', bg: '#fee2e2' },
    doc: { icon: faFileWord, color: '#2563eb', bg: '#dbeafe' },
    docx: { icon: faFileWord, color: '#2563eb', bg: '#dbeafe' },
    xls: { icon: faFileExcel, color: '#059669', bg: '#d1fae5' },
    xlsx: { icon: faFileExcel, color: '#059669', bg: '#d1fae5' },
    png: { icon: faFileImage, color: '#7c3aed', bg: '#ede9fe' },
    jpg: { icon: faFileImage, color: '#7c3aed', bg: '#ede9fe' },
    jpeg: { icon: faFileImage, color: '#7c3aed', bg: '#ede9fe' },
    gif: { icon: faFileImage, color: '#7c3aed', bg: '#ede9fe' },
    zip: { icon: faFileArchive, color: '#ea580c', bg: '#fed7aa' },
    rar: { icon: faFileArchive, color: '#ea580c', bg: '#fed7aa' },
    txt: { icon: faFileAlt, color: '#64748b', bg: '#f1f5f9' }
  };
  
  return iconMap[ext] || { icon: faFile, color: '#64748b', bg: '#f1f5f9' };
};

const getFileExtension = (filename) => {
  return filename?.split('.').pop()?.toUpperCase() || 'FILE';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const canPreview = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt'].includes(ext);
};

/**
 * InvoiceAttachmentsTooltip
 * Tooltip pro zobrazení seznamu příloh faktury s možností náhledu a stažení
 */
const InvoiceAttachmentsTooltip = ({ 
  attachments = [], 
  position = { top: 0, left: 0 },
  onClose,
  onDownload
}) => {
  const [viewerAttachment, setViewerAttachment] = useState(null);

  // Helper pro získání názvu souboru z různých možných klíčů
  const getFileName = (attachment) => {
    return attachment.originalni_nazev_souboru || 
           attachment.original_filename || 
           attachment.nazev_souboru || 
           attachment.filename || 
           'Příloha';
  };

  // Helper pro získání velikosti souboru
  const getFileSize = (attachment) => {
    return attachment.velikost || 
           attachment.velikost_souboru_b || 
           attachment.size || 
           0;
  };

  const handleView = (attachment) => {
    const filename = getFileName(attachment);
    if (!canPreview(filename)) {
      // Pokud nelze zobrazit, stáhnout
      handleDownload(attachment);
      return;
    }
    setViewerAttachment(attachment);
  };

  const handleDownload = (attachment) => {
    if (onDownload) {
      onDownload(attachment);
    }
  };

  const getFileUrl = (attachment) => {
    // URL pro zobrazení/stažení přílohy
    const baseUrl = process.env.REACT_APP_API_URL || 'https://erdms.zachranka.cz';
    return `${baseUrl}/api.eeo/v2025.03_25/?action=downloadInvoiceAttachment&attachment_id=${attachment.id}`;
  };

  if (viewerAttachment) {
    const filename = getFileName(viewerAttachment);
    const ext = filename?.split('.').pop()?.toLowerCase();
    const url = getFileUrl(viewerAttachment);
    
    return ReactDOM.createPortal(
      <ViewerOverlay onClick={() => setViewerAttachment(null)}>
        <ViewerContainer onClick={(e) => e.stopPropagation()}>
          <ViewerHeader>
            <ViewerTitle>{filename}</ViewerTitle>
            <CloseButton onClick={() => setViewerAttachment(null)}>
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </ViewerHeader>
          <ViewerContent>
            {ext === 'pdf' && (
              <iframe src={url} title={filename} />
            )}
            {['png', 'jpg', 'jpeg', 'gif'].includes(ext) && (
              <img src={url} alt={filename} />
            )}
            {ext === 'txt' && (
              <iframe src={url} title={filename} />
            )}
            {!canPreview(filename) && (
              <UnsupportedMessage>
                <FontAwesomeIcon icon={faFileAlt} />
                <h4>Náhled není podporován</h4>
                <p>Tento typ souboru nelze zobrazit v prohlížeči.</p>
                <DownloadButton onClick={() => handleDownload(viewerAttachment)}>
                  <FontAwesomeIcon icon={faDownload} />
                  Stáhnout soubor
                </DownloadButton>
              </UnsupportedMessage>
            )}
          </ViewerContent>
        </ViewerContainer>
      </ViewerOverlay>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <TooltipContainer style={{ top: position.top, left: position.left }}>
      <TooltipHeader>
        Přílohy ({attachments.length})
      </TooltipHeader>
      
      {attachments.length === 0 ? (
        <EmptyState>Žádné přílohy</EmptyState>
      ) : (
        <AttachmentsList>
          {attachments.map((attachment) => {
            const filename = getFileName(attachment);
            const filesize = getFileSize(attachment);
            const fileInfo = getFileIcon(filename);
            const ext = getFileExtension(filename);
            
            return (
              <AttachmentItem key={attachment.id}>
                <FileIconBox $bgColor={fileInfo.bg} $iconColor={fileInfo.color}>
                  <FontAwesomeIcon icon={fileInfo.icon} />
                </FileIconBox>
                
                <AttachmentInfo>
                  <FileName title={filename}>
                    {filename}
                  </FileName>
                  <FileDetails>
                    <FileBadge $bgColor={fileInfo.bg} $color={fileInfo.color}>
                      {ext}
                    </FileBadge>
                    <span>{formatFileSize(filesize)}</span>
                  </FileDetails>
                </AttachmentInfo>
                
                <ActionButtons>
                  <ActionButton 
                    onClick={() => handleView(attachment)}
                    title="Zobrazit náhled"
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </ActionButton>
                  <ActionButton 
                    onClick={() => handleDownload(attachment)}
                    title="Stáhnout"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </ActionButton>
                </ActionButtons>
              </AttachmentItem>
            );
          })}
        </AttachmentsList>
      )}
    </TooltipContainer>,
    document.body
  );
};

export default InvoiceAttachmentsTooltip;
