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
  max-width: min(400px, calc(100vw - 40px)); /* Respektovat šířku okna s 20px marginem z každé strany */
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
  background: ${props => props.$bgColor || 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  
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
  background: ${props => props.$bgColor || 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'};
  color: ${props => props.$color || '#64748b'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: #ffffff;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg {
    font-size: 0.9rem;
  }
  
  &:hover {
    background: #eff6ff;
    color: #1d4ed8;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
  letter-spacing: 0.01em;
`;

// Helper functions
const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  
  const iconMap = {
    pdf: { icon: faFilePdf, color: '#dc2626', bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' },
    doc: { icon: faFileWord, color: '#1d4ed8', bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' },
    docx: { icon: faFileWord, color: '#1d4ed8', bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' },
    xls: { icon: faFileExcel, color: '#047857', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' },
    xlsx: { icon: faFileExcel, color: '#047857', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' },
    png: { icon: faFileImage, color: '#7e22ce', bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
    jpg: { icon: faFileImage, color: '#7e22ce', bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
    jpeg: { icon: faFileImage, color: '#7e22ce', bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
    gif: { icon: faFileImage, color: '#7e22ce', bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
    zip: { icon: faFileArchive, color: '#c2410c', bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' },
    rar: { icon: faFileArchive, color: '#c2410c', bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' },
    txt: { icon: faFileAlt, color: '#374151', bg: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }
  };
  
  return iconMap[ext] || { icon: faFile, color: '#64748b', bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' };
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



/**
 * InvoiceAttachmentsTooltip
 * Tooltip pro zobrazení seznamu příloh faktury s možností náhledu a stažení
 */
const InvoiceAttachmentsTooltip = ({ 
  attachments = [], 
  position = { top: 0, left: 0 },
  onClose,
  onView,
  token,
  username
}) => {

  // Helper pro získání názvu souboru z různých možných klíčů
  const getFileName = (attachment) => {
    return attachment.originalni_nazev_souboru || 
           attachment.original_filename || 
           attachment.nazev_souboru || 
           attachment.filename || 
           'Příloha';
  };

  // Helper pro získání velikosti souboru (v bytech)
  const getFileSize = (attachment) => {
    return attachment.velikost_b || 
           attachment.velikost || 
           attachment.velikost_souboru_b || 
           attachment.size || 
           0;
  };

  // Helper pro zobrazení jména uživatele
  const getUserName = (attachment) => {
    // Priorita: nahrano_uzivatel_detail > nahrano_uzivatel > fallback
    if (attachment.nahrano_uzivatel_detail) {
      const detail = attachment.nahrano_uzivatel_detail;
      const parts = [];
      
      if (detail.titul_pred) parts.push(detail.titul_pred);
      if (detail.jmeno) parts.push(detail.jmeno);
      if (detail.prijmeni) parts.push(detail.prijmeni);
      if (detail.titul_za) parts.push(detail.titul_za);
      
      const fullName = parts.join(' ').trim();
      if (fullName) return fullName;
    }
    
    // Fallback na string field
    if (attachment.nahrano_uzivatel) {
      return attachment.nahrano_uzivatel;
    }
    
    // Staré klíče (pro kompatibilitu)
    if (attachment.nahrano_jmeno && attachment.nahrano_prijmeni) {
      const titulPred = attachment.nahrano_titul_pred || '';
      const titulZa = attachment.nahrano_titul_za || '';
      return `${titulPred} ${attachment.nahrano_jmeno} ${attachment.nahrano_prijmeni} ${titulZa}`.trim();
    }
    
    if (attachment.uploaded_by_name && attachment.uploaded_by_surname) {
      return `${attachment.uploaded_by_name} ${attachment.uploaded_by_surname}`.trim();
    }
    
    if (attachment.user_jmeno && attachment.user_prijmeni) {
      return `${attachment.user_jmeno} ${attachment.user_prijmeni}`.trim();
    }
    
    return 'System';
  };

  const handleOpenInViewer = async (attachment) => {
    if (!attachment.id) return;
    
    try {
      // Import download funkce
      const { downloadInvoiceAttachment25 } = await import('../../services/api25invoices');
      
      if (!token || !username) {
        console.error('Chybí přihlašovací údaje');
        return;
      }
      
      // Stáhnout soubor jako blob
      const blobData = await downloadInvoiceAttachment25({
        token,
        username,
        faktura_id: attachment.faktura_id,
        priloha_id: attachment.id,
        objednavka_id: attachment.objednavka_id
      });
      
      const filename = getFileName(attachment);
      const ext = filename.toLowerCase().split('.').pop();

      // Check if file type is supported for preview
      const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const isPreviewable = previewableTypes.includes(ext);

      // ✅ Použít blob přímo z API (už má správný MIME type z responseType: 'blob')
      // ❌ NETVOŘIT nový Blob([blob]) - korumpuje binární data!
      let imageSrc = null;
      if (isPreviewable && ext !== 'pdf') {
        imageSrc = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blobData); // ✅ Použít původní blob z API
        });
      }

      // Otevřít ve vieweru (nepodporované typy zobrazí hlášku + download)
      if (onView) {
        onView({
          ...attachment,
          // ✅ Pokud máme imageSrc (data URL pro obrázky), NEPOSLAT blob (způsobuje problémy)
          // Pro PDF poslat blob (potřebný pro iframe)
          blob: (ext === 'pdf') ? blobData : null,
          imageSrc: imageSrc || null,
          filename: filename,
          fileType: ext === 'pdf' ? 'pdf' : (isPreviewable ? 'image' : 'other')
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
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>• {getUserName(attachment)}</span>
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

export default InvoiceAttachmentsTooltip;
