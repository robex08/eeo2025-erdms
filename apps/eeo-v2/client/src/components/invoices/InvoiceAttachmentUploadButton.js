import React, { useRef, useState } from 'react';
import styled from '@emotion/styled';
import { Upload, File, AlertCircle, CheckCircle } from 'lucide-react';
import {
  isAllowedInvoiceFileType,
  isAllowedInvoiceFileSize,
  isISDOCFile,
  formatFileSize
} from '../../services/api25invoices';

/**
 * InvoiceAttachmentUploadButton Component
 *
 * Upload button s podporou drag & drop pro přílohy faktur
 * Validuje typ a velikost souboru před uploadem
 * Zobrazí progress během nahrávání
 */

const UploadContainer = styled.div`
  position: relative;
  width: 100%;
`;

const UploadArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  border: 2px dashed ${props => {
    if (props.error) return '#fca5a5';
    if (props.isDragging) return '#3b82f6';
    return '#cbd5e1';
  }};
  border-radius: 8px;
  background: ${props => {
    if (props.error) return '#fef2f2';
    if (props.isDragging) return '#eff6ff';
    return '#f8fafc';
  }};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.error ? '#f87171' : '#3b82f6'};
    background: ${props => props.error ? '#fee2e2' : '#eff6ff'};
  }

  ${props => props.uploading && `
    opacity: 0.7;
    pointer-events: none;
  `}
`;

const UploadIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => {
    if (props.error) return '#fee2e2';
    if (props.isDragging) return '#dbeafe';
    return '#e0e7ff';
  }};
  color: ${props => {
    if (props.error) return '#dc2626';
    if (props.isDragging) return '#3b82f6';
    return '#4f46e5';
  }};

  svg {
    width: 24px;
    height: 24px;
  }
`;

const UploadText = styled.div`
  text-align: center;
`;

const MainText = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.error ? '#dc2626' : '#1f2937'};
  margin-bottom: 4px;
`;

const SubText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 12px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

const Message = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-top: 12px;
  background: ${props => props.type === 'error' ? '#fef2f2' : '#f0fdf4'};
  border: 1px solid ${props => props.type === 'error' ? '#fecaca' : '#bbf7d0'};
  color: ${props => props.type === 'error' ? '#dc2626' : '#16a34a'};

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const InvoiceAttachmentUploadButton = ({
  onUpload,
  disabled = false,
  maxFileSize = 10 * 1024 * 1024, // 10 MB
  acceptedTypes = ['pdf', 'isdoc', 'jpg', 'jpeg', 'png', 'xml']
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Validace souboru
  const validateFile = (file) => {
    // Reset messages
    setError(null);
    setSuccess(null);

    // Validace typu
    if (!isAllowedInvoiceFileType(file.name)) {
      const allowed = acceptedTypes.join(', ').toUpperCase();
      throw new Error(`Nepodporovaný formát souboru. Povolené: ${allowed}`);
    }

    // Validace velikosti
    if (!isAllowedInvoiceFileSize(file.size)) {
      const maxSizeFormatted = formatFileSize(maxFileSize);
      throw new Error(`Soubor je příliš velký (max ${maxSizeFormatted})`);
    }

    return true;
  };

  // Zpracování uploadu
  const handleFileUpload = async (file) => {
    try {
      validateFile(file);

      setUploading(true);
      setProgress(0);
      setError(null);
      setSuccess(null);

      // Detekce ISDOC
      const isISDOC = isISDOCFile(file.name);

      // Simulace progressu (reálný progress by byl z axios onUploadProgress)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Volání parent callback
      if (onUpload) {
        await onUpload(file, isISDOC);
      }

      clearInterval(progressInterval);
      setProgress(100);

      // Success message
      const fileName = file.name;
      const successMsg = isISDOC
        ? `ISDOC soubor "${fileName}" byl úspěšně nahrán`
        : `Soubor "${fileName}" byl úspěšně nahrán`;

      setSuccess(successMsg);

      // Auto-hide success message
      setTimeout(() => {
        setSuccess(null);
        setProgress(0);
        setUploading(false);
      }, 3000);

    } catch (err) {
      setError(err.message || 'Chyba při nahrávání souboru');
      setUploading(false);
      setProgress(0);
    }
  };

  // Click handler
  const handleClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  // File input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <UploadContainer>
      <UploadArea
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        isDragging={isDragging}
        uploading={uploading}
        error={!!error}
      >
        <UploadIcon isDragging={isDragging} error={!!error}>
          {error ? <AlertCircle /> : <Upload />}
        </UploadIcon>

        <UploadText>
          <MainText error={!!error}>
            {error ? 'Chyba při nahrávání' :
             isDragging ? 'Pusťte soubor zde' :
             uploading ? 'Nahrávám...' :
             'Klikněte nebo přetáhněte soubor'}
          </MainText>

          {!error && (
            <SubText>
              {uploading
                ? `Nahrávání ${progress}%...`
                : `Podporované formáty: ${acceptedTypes.join(', ').toUpperCase()} (max ${formatFileSize(maxFileSize)})`
              }
            </SubText>
          )}
        </UploadText>

        {uploading && (
          <ProgressBar>
            <ProgressFill progress={progress} />
          </ProgressBar>
        )}
      </UploadArea>

      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.map(ext => `.${ext}`).join(',')}
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {error && (
        <Message type="error">
          <AlertCircle />
          {error}
        </Message>
      )}

      {success && (
        <Message type="success">
          <CheckCircle />
          {success}
        </Message>
      )}
    </UploadContainer>
  );
};

export default InvoiceAttachmentUploadButton;
