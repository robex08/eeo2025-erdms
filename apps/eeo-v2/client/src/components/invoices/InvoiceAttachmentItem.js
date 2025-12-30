import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FileText, Download, Trash2, AlertCircle } from 'lucide-react';
import ISDOCDetectionBadge from './ISDOCDetectionBadge';
import { formatFileSize } from '../../services/api25invoices';
import { prettyDate } from '../../utils/format';

/**
 * InvoiceAttachmentItem Component
 *
 * Jednotlivá položka v seznamu příloh faktury
 * Zobrazí název, velikost, datum, ISDOC badge a akce (download, delete)
 */

const ItemContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${props => props.deleting ? '#fef2f2' : '#ffffff'};
  border: 1px solid ${props => props.deleting ? '#fecaca' : '#e5e7eb'};
  border-radius: 8px;
  transition: all 0.2s ease;
  gap: 12px;

  &:hover {
    ${props => !props.deleting && `
      border-color: #cbd5e1;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    `}
  }

  ${props => props.deleting && `
    opacity: 0.6;
    pointer-events: none;
  `}
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`;

const FileIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 8px;
  color: #ffffff;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const FileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
`;

const FileName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #6b7280;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '•';
    margin-right: 4px;

    &:first-of-type {
      display: none;
    }
  }

  &:first-of-type::before {
    display: none;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: ${props => props.variant === 'danger' ? '#fef2f2' : '#f3f4f6'};
  color: ${props => props.variant === 'danger' ? '#dc2626' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: ${props => props.variant === 'danger' ? '#fee2e2' : '#e5e7eb'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 8px;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const InvoiceAttachmentItem = ({
  attachment,
  onDownload,
  onDelete,
  readOnly = false,
  showUploader = true
}) => {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Zpracování downloadu
  const handleDownload = async () => {
    if (downloading || !onDownload) return;

    setDownloading(true);
    setError(null);

    try {
      await onDownload(attachment);
    } catch (err) {
      setError(err.message || 'Chyba při stahování souboru');
    } finally {
      setDownloading(false);
    }
  };

  // Zpracování smazání
  const handleDelete = async () => {
    if (!onDelete) return;

    // ČESKÉ NÁZVY 1:1 Z DB
    const fileName = attachment.originalni_nazev_souboru || 'tento soubor';
    const confirmMessage = `Opravdu chcete smazat přílohu "${fileName}"?`;
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    setError(null);

    try {
      await onDelete(attachment);
    } catch (err) {
      setError(err.message || 'Chyba při mazání souboru');
      setDeleting(false);
    }
  };

  // Získání názvu souboru - ČESKÉ NÁZVY 1:1 Z DB
  const fileName = attachment.originalni_nazev_souboru || 'Neznámý soubor';

  // Formátování velikosti - ČESKÉ NÁZVY 1:1 Z DB
  const fileSize = formatFileSize(attachment.velikost_souboru_b || 0);

  // Datum vytvoření
  const uploadDate = attachment.dt_vytvoreni
    ? prettyDate(attachment.dt_vytvoreni)
    : null;

  // Uživatel který nahrál
  const uploader = attachment.nahrano_uzivatel
    ? `${attachment.nahrano_uzivatel.prijmeni || ''} ${attachment.nahrano_uzivatel.jmeno || ''}`.trim()
    : null;

  return (
    <>
      <ItemContainer deleting={deleting}>
        <LeftSection>
          <FileIcon>
            <FileText />
          </FileIcon>

          <FileInfo>
            <FileName title={fileName}>
              {fileName}
            </FileName>

            <FileMeta>
              <MetaItem>{fileSize}</MetaItem>

              {uploadDate && (
                <MetaItem>{uploadDate}</MetaItem>
              )}

              {showUploader && uploader && (
                <MetaItem>{uploader}</MetaItem>
              )}
            </FileMeta>
          </FileInfo>
        </LeftSection>

        <RightSection>
          <ISDOCDetectionBadge
            detected={attachment.je_isdoc === 1 || attachment.je_isdoc === true}
            parsed={attachment.isdoc_parsed === 1 || attachment.isdoc_parsed === true}
          />

          <ActionButton
            onClick={handleDownload}
            disabled={downloading}
            title="Stáhnout soubor"
          >
            <Download />
          </ActionButton>

          {!readOnly && (
            <ActionButton
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              title="Smazat soubor"
            >
              <Trash2 />
            </ActionButton>
          )}
        </RightSection>
      </ItemContainer>

      {error && (
        <ErrorMessage>
          <AlertCircle />
          {error}
        </ErrorMessage>
      )}
    </>
  );
};

export default InvoiceAttachmentItem;
