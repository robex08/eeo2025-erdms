/**
 * DocxMappingExpandableSection - Rozšířitelný blok pro mapování DOCX polí
 * Integrovaný do upload/edit modalu pro DOCX šablony
 * @date 2025-10-21
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileWord, faChevronDown, faChevronRight, faExchangeAlt,
  faCode, faHashtag, faEye, faUser, faInfoCircle, faCopy,
  faCheck, faTimes, faSpinner, faDownload, faSync
} from '@fortawesome/free-solid-svg-icons';
import { extractDocxFields, getOrderFieldsForMapping } from '../../utils/docx/docxProcessor';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const ExpandableSection = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: ${props => props.$expanded ? '#f8fafc' : '#fafbfc'};
  border-bottom: ${props => props.$expanded ? '1px solid #e5e7eb' : 'none'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
  }
`;

const SectionHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SectionIcon = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
`;

const SectionSubtitle = styled.p`
  margin: 0.25rem 0 0 0;
  color: #6b7280;
  font-size: 0.875rem;
`;

const ExpandIcon = styled.div`
  color: #6b7280;
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
`;

const SectionContent = styled.div`
  padding: 1.5rem;
  background: white;
  max-height: ${props => props.$expanded ? '800px' : '0'};
  opacity: ${props => props.$expanded ? '1' : '0'};
  transition: all 0.3s ease;
  overflow: hidden;
`;

const ProcessingOverlay = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
`;

const SpinnerIcon = styled.div`
  font-size: 2rem;
  color: #3b82f6;
  margin-bottom: 1rem;
`;

const MappingContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const FieldColumn = styled.div`
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 1rem;
  min-height: 300px;
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const FieldsList = styled.div`
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const FieldItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  cursor: ${props => props.$draggable ? 'grab' : 'default'};
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  &:active {
    cursor: ${props => props.$draggable ? 'grabbing' : 'default'};
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const FieldInfoSpaced = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const FieldTypeIcon = styled.div`
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

const FieldDetails = styled.div`
  flex: 1;
`;

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

const MappingConnector = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.5rem;
`;

const ConnectorIcon = styled.div`
  background: #3b82f6;
  color: white;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const DropZone = styled.div`
  min-height: 60px;
  border: 2px dashed ${props => props.$dragOver ? '#3b82f6' : '#cbd5e1'};
  border-radius: 6px;
  background: ${props => props.$dragOver ? '#f0f9ff' : '#f8fafc'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 0.875rem;
  transition: all 0.2s ease;
`;

const GroupSection = styled.div`
  margin-bottom: 1rem;
`;

// Nové kompaktní styled komponenty
const CompactMappingContainer = styled.div`
  padding: 1rem;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MappingGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  min-height: 400px;
  max-height: 500px;
`;

const DocxFieldsPanel = styled.div`
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DatabaseFieldsPanel = styled.div`
  background: #f0fdf4;
  border: 2px solid #d1fae5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
`;

const HeaderIcon = styled.div`
  color: #6366f1;
`;

const HeaderTitle = styled.div`
  font-size: 0.9rem;
`;

const FieldsScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  max-height: 450px;
`;

const DocxFieldCard = styled.div`
  background: white;
  border: 1px solid ${props => props.$mapped ? '#10b981' : '#d1d5db'};
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;

  ${props => props.$dragOver && `
    border-color: #3b82f6;
    background: #dbeafe;
  `}

  ${props => props.$mapped && `
    background: #f0fdf4;
    border-color: #10b981;
  `}
`;

const FieldHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
`;

const FieldNameLight = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
`;

const MappingZone = styled.div`
  padding: 0.5rem 0.75rem;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const MappedField = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const MappedFieldLabel = styled.div`
  color: #059669;
  font-weight: 500;
  font-size: 0.8rem;
  flex: 1;
`;

const UnmapButton = styled.button`
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;

  &:hover {
    background: #fee2e2;
  }
`;

const DropPlaceholder = styled.div`
  color: #9ca3af;
  font-size: 0.8rem;
  font-style: italic;
`;

const FieldGroup = styled.div`
  margin-bottom: 1rem;
`;

const GroupHeader = styled.div`
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
  margin-bottom: 0.5rem;
`;

const GroupFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DatabaseFieldCard = styled.div`
  background: white;
  border: 1px solid #d1fae5;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  cursor: grab;
  transition: all 0.2s ease;

  &:hover {
    background: #f0fdf4;
    border-color: #10b981;
    transform: translateY(-1px);
  }

  &:active {
    cursor: grabbing;
  }
`;

const FieldInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const FieldLabel = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 0.8rem;
  flex: 1;
`;

const FieldExample = styled.div`
  color: #059669;
  font-size: 0.75rem;
  font-style: italic;
  opacity: 0.8;
`;

const FieldTypeTag = styled.span`
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-weight: 500;
`;

const JsonEditorSection = styled.div`
  background: #1f2937;
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
  display: flex;
  flex-direction: column;
`;

const JsonEditorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #374151;
  border-bottom: 1px solid #4b5563;
`;

const JsonTitle = styled.h4`
  margin: 0;
  color: #f9fafb;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const JsonActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const JsonEditor = styled.div`
  flex: 1;
  overflow: hidden;
`;

const JsonTextarea = styled.textarea`
  width: 100%;
  height: 150px;
  background: #1f2937;
  color: #e5e7eb;
  border: none;
  padding: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  resize: none;
  outline: none;

  &::placeholder {
    color: #6b7280;
  }
`;

// Původní komponenty pro fallback
const GroupTitle = styled.div`
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
`;

const JsonSection = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
`;

const JsonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const JsonTitle_Old = styled.h4`
  margin: 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 50%;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
    color: #1f2937;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const JsonDisplay = styled.pre`
  background: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #374151;
  }

  &::-webkit-scrollbar-thumb {
    background: #6b7280;
    border-radius: 3px;
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;

  ${props => {
    if (props.$status === 'analyzing') {
      return `
        background: #fef3c7;
        color: #92400e;
      `;
    } else if (props.$status === 'ready') {
      return `
        background: #dcfce7;
        color: #166534;
      `;
    } else if (props.$status === 'error') {
      return `
        background: #fef2f2;
        color: #dc2626;
      `;
    }
    return `
      background: #f3f4f6;
      color: #374151;
    `;
  }}
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const DocxMappingExpandableSection = ({
  file,
  onMappingChange,
  initialMapping = {},
  shouldShow = true // Nový prop pro kontrolu zobrazení
}) => {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mapping, setMapping] = useState(initialMapping);
  const [draggedField, setDraggedField] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [copied, setCopied] = useState(false);
  const jsonSectionRef = useRef(null);

  const orderFields = getOrderFieldsForMapping();

  // Analýza souboru při jeho změně
  useEffect(() => {
    if (file && expanded && !analysisResult && shouldShow) {
      analyzeDocxFile();
    }
  }, [file, expanded, shouldShow]);

  // Pokud se nemá zobrazovat, vrať null
  if (!shouldShow) {
    return null;
  }

  const analyzeDocxFile = async () => {
    if (!file) return;

    setAnalyzing(true);
    try {
      const result = await extractDocxFields(file);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Chyba při analýze DOCX:', error);
      setAnalysisResult({ success: false, error: error.message, fields: [] });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  const handleDragStart = (e, field, source) => {
    setDraggedField({ ...field, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, target) => {
    e.preventDefault();
    setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (e, docxFieldName) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (draggedField && draggedField.source === 'order') {
      const newMapping = {
        ...mapping,
        [docxFieldName]: draggedField.key
      };
      setMapping(newMapping);
      onMappingChange?.(newMapping);
    }

    setDraggedField(null);
  };

  const handleRemoveMapping = (docxFieldName) => {
    const newMapping = { ...mapping };
    delete newMapping[docxFieldName];
    setMapping(newMapping);
    onMappingChange?.(newMapping);
  };

  const handleCopyJson = async () => {
    const jsonContent = JSON.stringify(mapping, null, 2);
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Chyba při kopírování:', error);
    }
  };

  const handleRefresh = async () => {
    if (!file || analyzing) return;

    console.log('🔄 Ruční refresh DOCX polí');
    await analyzeDocxFile(file);
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

  const getStatus = () => {
    if (!file) return { status: 'no-file', text: 'Nejdříve vyberte DOCX soubor' };
    if (analyzing) return { status: 'analyzing', text: 'Analyzuji DOCX soubor...' };
    if (analysisResult?.success === false) return { status: 'error', text: 'Chyba při analýze' };
    if (analysisResult?.fields.length === 0) return { status: 'no-fields', text: 'Žádná pole nenalezena' };
    if (analysisResult?.fields.length > 0) return { status: 'ready', text: `${analysisResult.fields.length} polí připraveno` };
    return { status: 'waiting', text: 'Rozbalte pro analýzu' };
  };

  const status = getStatus();

  return (
    <ExpandableSection>
      <SectionHeader $expanded={expanded} onClick={handleExpand}>
        <SectionHeaderLeft>
          <SectionIcon>
            <FontAwesomeIcon icon={faFileWord} />
          </SectionIcon>
          <div>
            <SectionTitle>DOCX Mapování polí</SectionTitle>
            <SectionSubtitle>
              Automatická extrakce a mapování programových polí
            </SectionSubtitle>
          </div>
        </SectionHeaderLeft>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <StatusBadge $status={status.status}>
            {status.status === 'analyzing' && <FontAwesomeIcon icon={faSpinner} spin />}
            {status.status === 'ready' && <FontAwesomeIcon icon={faCheck} />}
            {status.status === 'error' && <FontAwesomeIcon icon={faTimes} />}
            {status.text}
          </StatusBadge>

          {file && (
            <RefreshButton
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              disabled={analyzing}
              title="Obnovit detekci polí"
            >
              <FontAwesomeIcon
                icon={faSync}
                spin={analyzing}
              />
            </RefreshButton>
          )}

          <ExpandIcon $expanded={expanded}>
            <FontAwesomeIcon icon={faChevronDown} />
          </ExpandIcon>
        </div>
      </SectionHeader>

      <SectionContent $expanded={expanded}>
        {!file && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <FontAwesomeIcon icon={faFileWord} style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <p>Nejdříve nahrajte DOCX soubor pro analýzu programových polí</p>
          </div>
        )}

        {file && analyzing && (
          <ProcessingOverlay>
            <SpinnerIcon>
              <FontAwesomeIcon icon={faSpinner} spin />
            </SpinnerIcon>
            <p>Analyzuji DOCX soubor a hledám programová pole...</p>
          </ProcessingOverlay>
        )}

        {file && analysisResult && analysisResult.success && (
          <>
            <CompactMappingContainer>
              {/* Hlavní mapovací grid */}
              <MappingGrid>
                {/* Levý panel - DOCX pole */}
                <DocxFieldsPanel>
                  <PanelHeader>
                    <HeaderIcon><FontAwesomeIcon icon={faFileWord} /></HeaderIcon>
                    <HeaderTitle>DOCX Pole ({analysisResult.fields.length})</HeaderTitle>
                  </PanelHeader>

                  <FieldsScrollArea>
                    {analysisResult.fields.map((field, index) => (
                      <DocxFieldCard
                        key={index}
                        $mapped={!!mapping[field.name]}
                        $dragOver={dragOverTarget === field.name}
                        onDragOver={(e) => handleDragOver(e, field.name)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, field.name)}
                      >
                        <FieldHeader>
                          <FieldTypeIcon $type={field.type}>
                            <FontAwesomeIcon icon={getFieldIcon(field.type)} />
                          </FieldTypeIcon>
                          <FieldNameLight>{field.name}</FieldNameLight>
                        </FieldHeader>

                        <MappingZone $mapped={!!mapping[field.name]}>
                          {mapping[field.name] ? (
                            <MappedField>
                              <MappedFieldLabel>
                                {orderFields.flatMap(g => g.fields).find(f => f.key === mapping[field.name])?.label || mapping[field.name]}
                              </MappedFieldLabel>
                              <UnmapButton onClick={() => handleRemoveMapping(field.name)}>
                                <FontAwesomeIcon icon={faTimes} />
                              </UnmapButton>
                            </MappedField>
                          ) : (
                            <DropPlaceholder>Přetáhněte pole</DropPlaceholder>
                          )}
                        </MappingZone>
                      </DocxFieldCard>
                    ))}
                  </FieldsScrollArea>
                </DocxFieldsPanel>

                {/* Pravý panel - DB pole s enrich daty */}
                <DatabaseFieldsPanel>
                  <PanelHeader>
                    <HeaderIcon><FontAwesomeIcon icon={faDownload} /></HeaderIcon>
                    <HeaderTitle>Databázová pole</HeaderTitle>
                  </PanelHeader>

                  <FieldsScrollArea>
                    {orderFields.map(group => (
                      <FieldGroup key={group.group}>
                        <GroupHeader>{group.group}</GroupHeader>
                        <GroupFields>
                          {group.fields.map(field => (
                            <DatabaseFieldCard
                              key={field.key}
                              draggable
                              onDragStart={(e) => handleDragStart(e, field, 'order')}
                            >
                              <FieldInfoSpaced>
                                <FieldLabel>{field.label}</FieldLabel>
                                <FieldExample>{field.example}</FieldExample>
                              </FieldInfoSpaced>
                              <FieldTypeTag>{field.type}</FieldTypeTag>
                            </DatabaseFieldCard>
                          ))}
                        </GroupFields>
                      </FieldGroup>
                    ))}
                  </FieldsScrollArea>
                </DatabaseFieldsPanel>
              </MappingGrid>

              {/* Kompaktní JSON editor */}
              <JsonEditorSection>
                <JsonEditorHeader>
                  <JsonTitle>
                    <FontAwesomeIcon icon={faCode} />
                    JSON Mapování
                  </JsonTitle>
                  <JsonActions>
                    <CopyButton onClick={handleCopyJson}>
                      <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                      {copied ? 'Zkopírováno!' : 'Kopírovat'}
                    </CopyButton>
                  </JsonActions>
                </JsonEditorHeader>
                <JsonEditor>
                  <JsonTextarea
                    value={JSON.stringify(mapping, null, 2)}
                    onChange={(e) => {
                      try {
                        const newMapping = JSON.parse(e.target.value);
                        setMapping(newMapping);
                        onMappingChange?.(newMapping);
                      } catch (error) {
                        // Nevalidní JSON - ignorujeme
                      }
                    }}
                    placeholder="Prázdné mapování"
                  />
                </JsonEditor>
              </JsonEditorSection>
            </CompactMappingContainer>
          </>
        )}

        {file && analysisResult && !analysisResult.success && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
            <FontAwesomeIcon icon={faTimes} style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <p>Chyba při analýze DOCX souboru: {analysisResult.error}</p>
          </div>
        )}

        {file && analysisResult && analysisResult.success && analysisResult.fields.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#f59e0b' }}>
            <FontAwesomeIcon icon={faInfoCircle} style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <p>V DOCX souboru nebyla nalezena žádná programová pole.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Zkontrolujte, zda dokument obsahuje merge fields, bookmarks nebo content controls.
            </p>
          </div>
        )}
      </SectionContent>
    </ExpandableSection>
  );
};

export default DocxMappingExpandableSection;