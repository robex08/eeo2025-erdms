/**
 * DocxUploadAnalyzer - Komponenta pro upload a analýzu DOCX souborů
 * @date 2025-10-21
 */

import React, { useState, useRef, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileWord, faUpload, faSpinner, faCheck, faTimes,
  faInfoCircle, faDownload, faEye, faExclamationTriangle,
  faCode, faCalendar, faUser, faHashtag
} from '@fortawesome/free-solid-svg-icons';
import { extractDocxFields, validateDocxFile } from '../../utils/docx/docxProcessor';
import { ToastContext } from '../../context/ToastContext';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const UploadArea = styled.div`
  border: 2px dashed ${props => props.$dragOver ? '#3b82f6' : '#d1d5db'};
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  background: ${props => props.$dragOver ? '#f0f9ff' : '#fafbfc'};
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  color: ${props => props.$dragOver ? '#3b82f6' : '#9ca3af'};
  margin-bottom: 1rem;
`;

const UploadText = styled.div`
  color: #374151;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const UploadSubtext = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ProcessingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 10;
`;

const ProcessingText = styled.div`
  margin-top: 1rem;
  color: #374151;
  font-weight: 500;
`;

const ResultsContainer = styled.div`
  margin-top: 2rem;
`;

const FileInfo = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const FileInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FileInfoLabel = styled.span`
  font-weight: 500;
  color: #475569;
`;

const FileInfoValue = styled.span`
  color: #1e293b;
`;

const TabContainer = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
`;

const TabHeaders = styled.div`
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const TabHeader = styled.button`
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#1e40af' : '#64748b'};
  font-weight: ${props => props.$active ? '600' : '500'};
  border-bottom: ${props => props.$active ? '2px solid #1e40af' : 'none'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;

  &:hover {
    background: ${props => props.$active ? 'white' : '#f1f5f9'};
  }
`;

const TabContent = styled.div`
  padding: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
`;

const FieldsList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const FieldItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
`;

const FieldInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const FieldIcon = styled.div`
  width: 2rem;
  height: 2rem;
  background: ${props => {
    switch (props.$type) {
      case 'mergefield': return '#dbeafe';
      case 'bookmark': return '#dcfce7';
      case 'contentcontrol': return '#fef3c7';
      case 'custom': return '#fce7f3';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'mergefield': return '#1e40af';
      case 'bookmark': return '#166534';
      case 'contentcontrol': return '#92400e';
      case 'custom': return '#be185d';
      default: return '#374151';
    }
  }};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
`;

const FieldDetails = styled.div``;

const FieldName = styled.div`
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const FieldType = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const MetadataItem = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1rem;
`;

const MetadataLabel = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`;

const MetadataValue = styled.div`
  font-weight: 600;
  color: #1e293b;
  word-break: break-word;
`;

const ErrorContainer = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ErrorText = styled.div`
  color: #dc2626;
  font-weight: 500;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.$primary ? `
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  ` : `
    background: white;
    border-color: #d1d5db;
    color: #374151;

    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const DocxUploadAnalyzer = ({ onAnalysisComplete, onCancel }) => {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('fields');
  const fileInputRef = useRef(null);
  const { addToast } = useContext(ToastContext);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const validation = validateDocxFile(file);

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        addToast(error, 'error');
      });
      return;
    }

    setProcessing(true);
    setAnalysisResult(null);

    try {
      const result = await extractDocxFields(file);

      if (result.success) {
        setAnalysisResult(result);
        addToast(`Úspěšně analyzováno ${result.fields.length} polí`, 'success');
      } else {
        addToast(`Chyba při analýze: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Chyba při zpracování souboru:', error);
      addToast('Nastala neočekávaná chyba při zpracování souboru', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleAnalysisComplete = () => {
    onAnalysisComplete?.(analysisResult);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFieldIcon = (type) => {
    switch (type) {
      case 'mergefield': return faCode;
      case 'bookmark': return faHashtag;
      case 'contentcontrol': return faEye;
      case 'custom': return faUser;
      default: return faInfoCircle;
    }
  };

  return (
    <Container>
      <div style={{ position: 'relative' }}>
        {!analysisResult && (
          <UploadArea
            $dragOver={dragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon $dragOver={dragOver}>
              <FontAwesomeIcon icon={faFileWord} />
            </UploadIcon>
            <UploadText>
              {dragOver ? 'Přetáhněte DOCX soubor sem' : 'Klikněte nebo přetáhněte DOCX soubor'}
            </UploadText>
            <UploadSubtext>
              Podporované formáty: DOCX (max. 10MB)
            </UploadSubtext>

            <HiddenInput
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInputChange}
            />
          </UploadArea>
        )}

        {processing && (
          <ProcessingOverlay>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '2rem', color: '#3b82f6' }} />
            <ProcessingText>Analyzuji DOCX soubor...</ProcessingText>
          </ProcessingOverlay>
        )}

        {analysisResult && (
          <ResultsContainer>
            <FileInfo>
              <FileInfoRow>
                <FileInfoLabel>Název souboru:</FileInfoLabel>
                <FileInfoValue>{analysisResult.fileName}</FileInfoValue>
              </FileInfoRow>
              <FileInfoRow>
                <FileInfoLabel>Velikost:</FileInfoLabel>
                <FileInfoValue>{formatFileSize(analysisResult.fileSize)}</FileInfoValue>
              </FileInfoRow>
              <FileInfoRow>
                <FileInfoLabel>Poslední úprava:</FileInfoLabel>
                <FileInfoValue>{analysisResult.lastModified.toLocaleString('cs-CZ')}</FileInfoValue>
              </FileInfoRow>
              <FileInfoRow>
                <FileInfoLabel>Nalezená pole:</FileInfoLabel>
                <FileInfoValue>
                  <strong>{analysisResult.fields.length}</strong>
                  {analysisResult.fields.length === 0 && (
                    <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                      Žádná pole nenalezena
                    </span>
                  )}
                </FileInfoValue>
              </FileInfoRow>
            </FileInfo>

            <TabContainer>
              <TabHeaders>
                <TabHeader
                  $active={activeTab === 'fields'}
                  onClick={() => setActiveTab('fields')}
                >
                  <FontAwesomeIcon icon={faCode} />
                  Programová pole ({analysisResult.fields.length})
                </TabHeader>
                <TabHeader
                  $active={activeTab === 'metadata'}
                  onClick={() => setActiveTab('metadata')}
                >
                  <FontAwesomeIcon icon={faInfoCircle} />
                  Metadata dokumentu
                </TabHeader>
              </TabHeaders>

              <TabContent>
                {activeTab === 'fields' && (
                  <FieldsList>
                    {analysisResult.fields.length === 0 ? (
                      <ErrorContainer>
                        <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#dc2626' }} />
                        <ErrorText>
                          V dokumentu nebyla nalezena žádná programová pole.
                          Zkontrolujte, zda dokument obsahuje merge fields, bookmarks nebo content controls.
                        </ErrorText>
                      </ErrorContainer>
                    ) : (
                      analysisResult.fields.map((field, index) => (
                        <FieldItem key={index}>
                          <FieldInfo>
                            <FieldIcon $type={field.type}>
                              <FontAwesomeIcon icon={getFieldIcon(field.type)} />
                            </FieldIcon>
                            <FieldDetails>
                              <FieldName>{field.name}</FieldName>
                              <FieldType>{field.type}</FieldType>
                            </FieldDetails>
                          </FieldInfo>
                        </FieldItem>
                      ))
                    )}
                  </FieldsList>
                )}

                {activeTab === 'metadata' && (
                  <MetadataGrid>
                    {Object.entries(analysisResult.metadata).map(([key, value]) => (
                      <MetadataItem key={key}>
                        <MetadataLabel>{key}</MetadataLabel>
                        <MetadataValue>{value || 'Není k dispozici'}</MetadataValue>
                      </MetadataItem>
                    ))}
                  </MetadataGrid>
                )}
              </TabContent>
            </TabContainer>

            <ActionButtons>
              <ActionButton onClick={onCancel}>
                <FontAwesomeIcon icon={faTimes} />
                Zrušit
              </ActionButton>
              <ActionButton
                $primary
                onClick={handleAnalysisComplete}
                disabled={analysisResult.fields.length === 0}
              >
                <FontAwesomeIcon icon={faCheck} />
                Pokračovat k mapování
              </ActionButton>
            </ActionButtons>
          </ResultsContainer>
        )}
      </div>
    </Container>
  );
};

export default DocxUploadAnalyzer;