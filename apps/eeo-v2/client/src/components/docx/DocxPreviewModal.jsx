/**
 * DocxPreviewModal - Náhled DOCX dokumentu s naplněnými daty z DB
 * @date 2025-10-21
 *
 * Použití mammoth.js pro konverzi DOCX → HTML v browseru
 * Zobrazuje preview s reálnými daty před stažením
 */

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faSpinner, faEye, faDownload,
  faExclamationTriangle, faFileWord, faCheckCircle,
  faPrint, faExpand
} from '@fortawesome/free-solid-svg-icons';
import mammoth from 'mammoth';
import { getOrderFieldsForMapping } from '../../utils/docx/docxProcessor';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 2rem;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
  width: 3rem;
  height: 3rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
`;

const HeaderTitle = styled.div`
  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  p {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    opacity: 0.9;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const IconButton = styled.button`
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const CloseButton = styled(IconButton)`
  &:hover {
    background: rgba(239, 68, 68, 0.8);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: #f9fafb;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
  text-align: center;
`;

const SpinnerIcon = styled.div`
  font-size: 3rem;
  color: #667eea;
  margin-bottom: 1.5rem;

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-size: 1.125rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const LoadingSubtext = styled.div`
  font-size: 0.875rem;
  color: #9ca3af;
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #dc2626;
  text-align: center;
`;

const ErrorIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: #ef4444;
`;

const ErrorTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const ErrorMessage = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  max-width: 500px;
`;

const PreviewContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 3rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  min-height: 400px;

  /* Styling pro DOCX HTML output */
  font-family: 'Calibri', 'Arial', sans-serif;
  line-height: 1.6;
  color: #1f2937;

  h1, h2, h3, h4, h5, h6 {
    color: #111827;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  p {
    margin-bottom: 1em;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;

    td, th {
      border: 1px solid #d1d5db;
      padding: 0.5rem;
    }

    th {
      background: #f3f4f6;
      font-weight: 600;
    }
  }

  /* Zvýraznění naplněných hodnot */
  .filled-value {
    background: #fef3c7;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-weight: 500;
    color: #92400e;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
`;

const FooterInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #059669;
  font-size: 0.875rem;
  font-weight: 500;
`;

const FooterActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DocxPreviewModal = ({
  isOpen,
  onClose,
  templateFile,
  templateName,
  mapping = {},
  sampleOrderId = null
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [filledFields, setFilledFields] = useState(0);

  useEffect(() => {
    if (isOpen && templateFile) {
      generatePreview();
    }
  }, [isOpen, templateFile, mapping]);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Generuji DOCX preview...');
      console.log('📄 Šablona:', templateName);
      console.log('🗺️ Mapování:', mapping);

      // 1. Načti DOCX soubor jako ArrayBuffer
      const arrayBuffer = await templateFile.arrayBuffer();

      // 2. Konvertuj DOCX na HTML pomocí mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      let html = result.value;

      console.log('📝 HTML před nahrazením:', html.substring(0, 200));

      // 3. Získej testovací data pro náhled
      const sampleData = getSampleData(mapping);
      console.log('🎲 Testovací data:', sampleData);

      // 4. Nahraď DocVariable pole reálnými daty
      let replacedCount = 0;
      Object.entries(sampleData).forEach(([docxField, value]) => {
        // Různé formáty DocVariable polí
        const patterns = [
          new RegExp(`\\{\\{${docxField}\\}\\}`, 'gi'),      // {{field}}
          new RegExp(`\\{${docxField}\\}`, 'gi'),            // {field}
          new RegExp(`«${docxField}»`, 'gi'),                // «field»
          new RegExp(`DOCVARIABLE\\s+"?${docxField}"?`, 'gi'), // DOCVARIABLE "field"
          new RegExp(`\\[${docxField}\\]`, 'gi'),            // [field]
        ];

        patterns.forEach(pattern => {
          if (pattern.test(html)) {
            html = html.replace(pattern, `<span class="filled-value">${value}</span>`);
            replacedCount++;
          }
        });
      });

      setFilledFields(replacedCount);
      console.log(`✅ Nahrazeno ${replacedCount} polí`);
      console.log('📝 HTML po nahrazení:', html.substring(0, 200));

      setHtmlPreview(html);

    } catch (err) {
      console.error('❌ Chyba při generování preview:', err);
      setError(err.message || 'Nepodařilo se vygenerovat náhled');
    } finally {
      setLoading(false);
    }
  };

  // Získání testovacích dat pro náhled
  const getSampleData = (mapping) => {
    const sampleData = {};
    const orderFields = getOrderFieldsForMapping();
    const allFields = orderFields.flatMap(g => g.fields);

    Object.entries(mapping).forEach(([docxField, dbFieldKey]) => {
      // Najdi definici DB pole
      const dbField = allFields.find(f => f.key === dbFieldKey);

      if (dbField) {
        // Použij example hodnotu z definice
        sampleData[docxField] = dbField.example || `[${docxField}]`;
      } else {
        // Fallback - použij klíč jako hodnotu
        sampleData[docxField] = `[${dbFieldKey}]`;
      }
    });

    return sampleData;
  };

  const handleDownload = () => {
    // TODO: Implementovat stažení naplněného DOCX
    console.log('📥 Stahování naplněného DOCX...');
    alert('Stahování bude implementováno v další verzi (vyžaduje backend API)');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Tisk: ${templateName}</title>
          <style>
            body { font-family: 'Calibri', Arial, sans-serif; padding: 2rem; }
            .filled-value { background: #fef3c7; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>${htmlPreview}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderLeft>
            <HeaderIcon>
              <FontAwesomeIcon icon={faEye} />
            </HeaderIcon>
            <HeaderTitle>
              <h2>Náhled dokumentu</h2>
              <p>{templateName}</p>
            </HeaderTitle>
          </HeaderLeft>

          <HeaderActions>
            <IconButton onClick={handlePrint} title="Tisk">
              <FontAwesomeIcon icon={faPrint} />
            </IconButton>
            <CloseButton onClick={onClose} title="Zavřít">
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </HeaderActions>
        </ModalHeader>

        <ModalBody>
          {loading && (
            <LoadingState>
              <SpinnerIcon>
                <FontAwesomeIcon icon={faSpinner} />
              </SpinnerIcon>
              <LoadingText>Generuji náhled...</LoadingText>
              <LoadingSubtext>Konvertuji DOCX na HTML a nahrazuji pole daty</LoadingSubtext>
            </LoadingState>
          )}

          {error && (
            <ErrorState>
              <ErrorIcon>
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </ErrorIcon>
              <ErrorTitle>Chyba při generování náhledu</ErrorTitle>
              <ErrorMessage>{error}</ErrorMessage>
            </ErrorState>
          )}

          {!loading && !error && htmlPreview && (
            <PreviewContainer
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          )}
        </ModalBody>

        <ModalFooter>
          <FooterInfo>
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>Naplněno {filledFields} polí testovacími daty</span>
          </FooterInfo>

          <FooterActions>
            <SecondaryButton onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
              Zavřít
            </SecondaryButton>
            <PrimaryButton onClick={handleDownload}>
              <FontAwesomeIcon icon={faDownload} />
              Stáhnout DOCX
            </PrimaryButton>
          </FooterActions>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default DocxPreviewModal;
