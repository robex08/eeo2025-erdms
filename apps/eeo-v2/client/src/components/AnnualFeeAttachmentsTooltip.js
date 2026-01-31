import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt, faFilePdf, faFileImage, faFileExcel, faFileWord, 
  faFileArchive, faFile, faExternalLinkAlt
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
  max-width: min(400px, calc(100vw - 40px));
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
  background: ${props => props.$bgColor || '#e0e7ff'};
  color: ${props => props.$iconColor || '#4f46e5'};
  font-size: 1.1rem;
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FileName = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
  flex-wrap: wrap;
`;

const FileBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: ${props => props.$bgColor || '#e0e7ff'};
  color: ${props => props.$color || '#4f46e5'};
  font-weight: 600;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #3b82f6;
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
`;

// Helper funkce
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  
  const iconMap = {
    pdf: { icon: faFilePdf, bg: '#fef2f2', color: '#dc2626' },
    doc: { icon: faFileWord, bg: '#eff6ff', color: '#2563eb' },
    docx: { icon: faFileWord, bg: '#eff6ff', color: '#2563eb' },
    xls: { icon: faFileExcel, bg: '#f0fdf4', color: '#16a34a' },
    xlsx: { icon: faFileExcel, bg: '#f0fdf4', color: '#16a34a' },
    jpg: { icon: faFileImage, bg: '#fef3c7', color: '#f59e0b' },
    jpeg: { icon: faFileImage, bg: '#fef3c7', color: '#f59e0b' },
    png: { icon: faFileImage, bg: '#fef3c7', color: '#f59e0b' },
    gif: { icon: faFileImage, bg: '#fef3c7', color: '#f59e0b' },
    zip: { icon: faFileArchive, bg: '#f3f4f6', color: '#6b7280' },
    rar: { icon: faFileArchive, bg: '#f3f4f6', color: '#6b7280' },
  };
  
  return iconMap[ext] || { icon: faFile, bg: '#f1f5f9', color: '#64748b' };
};

const getFileExtension = (filename) => {
  return filename.split('.').pop().toUpperCase();
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const AnnualFeeAttachmentsTooltip = ({ 
  attachments = [], 
  position, 
  onView,
  token,
  username 
}) => {
  const handleOpenInViewer = async (attachment) => {
    if (!attachment.id) return;
    
    try {
      const BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');
      
      if (!token || !username) {
        console.error('Chybí přihlašovací údaje');
        return;
      }
      
      // Stáhnout soubor jako blob
      const response = await fetch(`${BASE_URL}/annual-fees/attachments/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          username,
          attachment_id: attachment.id
        }),
      });

      if (!response.ok) {
        throw new Error('Chyba při načítání souboru');
      }

      const blobData = await response.blob();
      const filename = attachment.originalni_nazev_souboru || 'priloha';
      const ext = filename.toLowerCase().split('.').pop();

      // Určit MIME type podle přípony
      let mimeType = 'application/octet-stream';
      if (ext === 'pdf') {
        mimeType = 'application/pdf';
      } else if (['jpg', 'jpeg'].includes(ext)) {
        mimeType = 'image/jpeg';
      } else if (ext === 'png') {
        mimeType = 'image/png';
      } else if (ext === 'gif') {
        mimeType = 'image/gif';
      }

      // Vytvořit nový Blob se správným MIME typem
      const blob = new Blob([blobData], { type: mimeType });
      
      // Vytvořit URL pro blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Zavolat onView s attachment + blobUrl
      if (onView) {
        onView({
          ...attachment,
          blobUrl: blobUrl,
          filename: filename,
          fileType: ext === 'pdf' ? 'pdf' : (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext) ? 'image' : 'other')
        });
      }
      
    } catch (error) {
      console.error('Chyba při otevírání přílohy:', error);
    }
  };

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
            const filename = attachment.originalni_nazev_souboru || 'priloha';
            const filesize = attachment.velikost_souboru_b || 0;
            const fileInfo = getFileIcon(filename);
            const ext = getFileExtension(filename);
            const userName = attachment.nahrano_jmeno || 'Neznámý';
            
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
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>• {userName}</span>
                  </FileDetails>
                </AttachmentInfo>
                
                <ActionButtons>
                  <ActionButton 
                    onClick={() => handleOpenInViewer(attachment)}
                    title="Otevřít náhled"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
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

export default AnnualFeeAttachmentsTooltip;
