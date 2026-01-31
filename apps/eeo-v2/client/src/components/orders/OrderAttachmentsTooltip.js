import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ErrorDialog from '../ErrorDialog';
import { 
  faFileAlt, faFilePdf, faFileImage, faFileExcel, faFileWord, 
  faFileArchive, faFile, faExternalLinkAlt, faTimes, faFileCode
} from '@fortawesome/free-solid-svg-icons';

// Styled Components - modré téma pro objednávky
const TooltipContainer = styled.div`
  position: fixed;
  z-index: 100000;
  background: white;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.05);
  padding: 0;
  min-width: 320px;
  max-width: min(420px, calc(100vw - 40px));
  animation: slideInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  @keyframes slideInScale {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const TooltipHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e0e7ff;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 12px 12px 0 0;
  font-weight: 600;
  font-size: 0.95rem;
  color: #1e40af;
  display: flex;
  align-items: center;
  justify-content: space-between;
  letter-spacing: -0.01em;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #60a5fa;
  padding: 0.375rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    transform: scale(1.1);
  }
`;

const AttachmentsList = styled.div`
  max-height: 320px;
  overflow-y: auto;
  padding: 0.5rem 0;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f8fafc;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
  position: relative;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #f8fafc;
  }
`;

const FileIconContainer = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${props => props.$bgColor || 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'};
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  
  svg {
    color: ${props => props.$iconColor || '#3b82f6'};
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
  background: ${props => props.$bgColor || 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'};
  color: ${props => props.$color || '#3b82f6'};
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.1);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #3b82f6;
  padding: 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    transform: scale(1.1);
  }
`;

const EmptyState = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
`;

// Helper functions
const getFileExtension = (filename) => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const getFileIconAndColor = (filename) => {
  const ext = getFileExtension(filename);
  
  switch (ext) {
    case 'pdf':
      return { icon: faFilePdf, color: '#3b82f6', bgColor: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return { icon: faFileImage, color: '#8b5cf6', bgColor: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' };
    case 'doc':
    case 'docx':
      return { icon: faFileWord, color: '#2563eb', bgColor: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' };
    case 'xls':
    case 'xlsx':
      return { icon: faFileExcel, color: '#059669', bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' };
    case 'zip':
    case 'rar':
    case '7z':
      return { icon: faFileArchive, color: '#d97706', bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' };
    case 'txt':
    case 'md':
    case 'json':
    case 'xml':
      return { icon: faFileCode, color: '#6366f1', bgColor: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' };
    default:
      return { icon: faFileAlt, color: '#3b82f6', bgColor: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' };
  }
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return 'Neznámá velikost';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size >= 10 ? Math.round(size) : Math.round(size * 10) / 10} ${sizes[i]}`;
};

const OrderAttachmentsTooltip = ({ attachments, position, onClose, token, username, orderId, onView }) => {
  const [errorDialog, setErrorDialog] = useState(null);

  // Zavřít tooltip při scrollování
  useEffect(() => {
    const handleScroll = () => {
      if (onClose) {
        onClose();
      }
    };

    // Přidat scroll listener na window i na scrollovací kontejnery
    window.addEventListener('scroll', handleScroll, true);
    
    // Cleanup při unmount
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);
  const handleAttachmentClick = async (attachment) => {
    try {
      // Import download funkce z API pro objednávky
      const { downloadAttachment25 } = await import('../../services/api25orders');
      
      if (!token || !username) {
        setErrorDialog({
          title: 'Chybí přihlašovací údaje',
          message: 'Pro zobrazení přílohy je potřeba být přihlášen.'
        });
        return;
      }

      if (!orderId) {
        setErrorDialog({
          title: 'Chybí ID objednávky',
          message: 'Nelze určit, ke které objednávce příloha patří.'
        });
        return;
      }

      if (!attachment.id) {
        setErrorDialog({
          title: 'Chybí ID přílohy',
          message: 'Příloha nemá platný identifikátor.'
        });
        return;
      }
      
      // Stáhnout soubor jako blob
      const blobData = await downloadAttachment25({
        token,
        username,
        objednavka_id: orderId,
        attachment_id: attachment.id
      });
      
      const filename = attachment.originalni_nazev_souboru || attachment.filename || 'priloha';
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
      } else if (ext === 'bmp') {
        mimeType = 'image/bmp';
      } else if (ext === 'webp') {
        mimeType = 'image/webp';
      } else if (ext === 'svg') {
        mimeType = 'image/svg+xml';
      }

      // Vytvořit nový Blob se správným MIME typem
      const blob = new Blob([blobData], { type: mimeType });
      
      // Vytvořit URL pro blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Check if file type is supported for preview
      const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const downloadableTypes = ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar'];
      
      if (previewableTypes.includes(ext)) {
        // Zavolat onView s attachment + blobUrl pro podporované soubory
        if (onView) {
          onView({
            ...attachment,
            blobUrl: blobUrl,
            filename: filename,
            fileType: ext === 'pdf' ? 'pdf' : 'image'
          });
          onClose();
        }
      } else if (downloadableTypes.includes(ext)) {
        
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Cleanup blob URL
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
        
        onClose();
      } else {
        
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
        
        onClose();
      }
      
    } catch (error) {
      setErrorDialog({
        title: 'Chyba při zobrazování přílohy',
        message: error.message || 'Nepodařilo se zobrazit přílohu. Zkuste to prosím znovu.'
      });
    }
  };



  if (!attachments || attachments.length === 0) {
    return (
      <TooltipContainer
        style={{
          top: position.top,
          left: position.left
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipHeader>
          <span>📎 Přílohy objednávky</span>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} size="sm" />
          </CloseButton>
        </TooltipHeader>
        <EmptyState>
          <div>📋</div>
          <div style={{ marginTop: '0.5rem' }}>Objednávka nemá žádné přílohy</div>
        </EmptyState>
      </TooltipContainer>
    );
  }

  return (
    <TooltipContainer
      style={{
        top: position.top,
        left: position.left
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <TooltipHeader>
        <span>📎 Přílohy objednávky ({attachments.length})</span>
        <CloseButton onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} size="sm" />
        </CloseButton>
      </TooltipHeader>
      
      <AttachmentsList>
        {attachments.map((attachment, index) => {
          const filename = attachment.originalni_nazev_souboru || attachment.filename || 'Neznámý soubor';
          const { icon, color, bgColor } = getFileIconAndColor(filename);
          const ext = getFileExtension(filename);
          
          return (
            <AttachmentItem key={attachment.id || index}>
              <FileIconContainer $iconColor={color} $bgColor={bgColor}>
                <FontAwesomeIcon icon={icon} />
              </FileIconContainer>
              
              <AttachmentInfo>
                <FileName title={filename}>
                  {filename}
                </FileName>
                <FileDetails>
                  <FileBadge $color={color} $bgColor={bgColor}>
                    {ext || 'soubor'}
                  </FileBadge>
                  <span>•</span>
                  <span>{formatFileSize(attachment.velikost_souboru_b || attachment.size)}</span>
                </FileDetails>
              </AttachmentInfo>
              
              <ActionButtons>
                <ActionButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAttachmentClick(attachment);
                  }}
                  title="Otevřít náhled přílohy"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </ActionButton>
              </ActionButtons>
            </AttachmentItem>
          );
        })}
      </AttachmentsList>
      
      {/* Custom Error Dialog místo system alertů */}
      {errorDialog && (
        <ErrorDialog
          title={errorDialog.title}
          message={errorDialog.message}
          onClose={() => setErrorDialog(null)}
        />
      )}
    </TooltipContainer>
  );
};

export default OrderAttachmentsTooltip;