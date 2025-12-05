/**
 * DocxTemplateEditor - Hlavní komponenta pro editaci DOCX šablon
 * @date 2025-10-21
 */

import React, { useState, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileWord, faArrowLeft, faArrowRight, faSave,
  faCheckCircle, faUpload, faEdit, faDownload
} from '@fortawesome/free-solid-svg-icons';
import { ToastContext } from '../../context/ToastContext';
import DocxUploadAnalyzer from './DocxUploadAnalyzer';
import DocxFieldMapper from './DocxFieldMapper';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f3f4f6;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Title = styled.h2`
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 700;
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const StepItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => {
    if (props.$active) return '#1e40af';
    if (props.$completed) return '#059669';
    return '#6b7280';
  }};
  font-weight: ${props => props.$active ? '600' : '500'};
  font-size: 0.875rem;
`;

const StepDivider = styled.div`
  width: 1px;
  height: 1rem;
  background: #d1d5db;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
`;

const ContentArea = styled.div`
  min-height: 400px;
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const NavButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid;
  border-radius: 8px;
  font-weight: 600;
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

const SuccessMessage = styled.div`
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const SuccessIcon = styled.div`
  width: 4rem;
  height: 4rem;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
`;

const SuccessTitle = styled.h3`
  margin: 0;
  color: #065f46;
  font-size: 1.25rem;
  font-weight: 600;
`;

const SuccessText = styled.p`
  margin: 0;
  color: #047857;
  line-height: 1.5;
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const DocxTemplateEditor = ({
  template = null,
  onSave,
  onClose,
  mode = 'create' // 'create' | 'edit'
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const { addToast } = useContext(ToastContext);

  const steps = [
    { id: 1, label: 'Upload & Analýza', icon: faUpload },
    { id: 2, label: 'Mapování polí', icon: faEdit },
    { id: 3, label: 'Dokončení', icon: faCheckCircle }
  ];

  const handleAnalysisComplete = (result) => {
    setAnalysisResult(result);
    setCurrentStep(2);
  };

  const handleMappingChange = (mapping) => {
    setFieldMapping(mapping);
  };

  const handleMappingSave = (mapping) => {
    setFieldMapping(mapping);
    setCurrentStep(3);
  };

  const handleFinalSave = async () => {
    try {
      const templateData = {
        fileName: analysisResult.fileName,
        fields: analysisResult.fields,
        fieldMapping: fieldMapping,
        metadata: analysisResult.metadata,
        documentXml: analysisResult.documentXml
      };

      await onSave?.(templateData);
      setIsComplete(true);
      addToast('DOCX šablona byla úspěšně uložena', 'success');
    } catch (error) {
      console.error('Chyba při ukládání šablony:', error);
      addToast('Chyba při ukládání šablony', 'error');
    }
  };

  const handleStepBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepForward = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const canProceedToMapping = analysisResult && analysisResult.fields.length > 0;
  const canProceedToFinish = fieldMapping && Object.keys(fieldMapping).length > 0;

  if (isComplete) {
    return (
      <Container>
        <SuccessMessage>
          <SuccessIcon>
            <FontAwesomeIcon icon={faCheckCircle} />
          </SuccessIcon>
          <SuccessTitle>Šablona byla úspěšně vytvořena!</SuccessTitle>
          <SuccessText>
            DOCX šablona s {analysisResult?.fields.length || 0} namapovanými poli
            je připravena k použití v systému objednávek.
          </SuccessText>
          <NavButton $primary onClick={onClose}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Zpět na seznam šablon
          </NavButton>
        </SuccessMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <FontAwesomeIcon
            icon={faFileWord}
            style={{ color: '#2563eb', fontSize: '2rem' }}
          />
          <div>
            <Title>
              {mode === 'edit' ? 'Editace DOCX šablony' : 'Nová DOCX šablona'}
            </Title>
            {template && (
              <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Editace: {template.nazev}
              </div>
            )}
          </div>
        </HeaderLeft>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <StepIndicator>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <StepItem
                  $active={currentStep === step.id}
                  $completed={currentStep > step.id}
                >
                  <FontAwesomeIcon
                    icon={currentStep > step.id ? faCheckCircle : step.icon}
                  />
                  {step.label}
                </StepItem>
                {index < steps.length - 1 && <StepDivider />}
              </React.Fragment>
            ))}
          </StepIndicator>

          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Zrušit
          </CloseButton>
        </div>
      </Header>

      <ContentArea>
        {currentStep === 1 && (
          <DocxUploadAnalyzer
            onAnalysisComplete={handleAnalysisComplete}
            onCancel={onClose}
          />
        )}

        {currentStep === 2 && analysisResult && (
          <DocxFieldMapper
            docxFields={analysisResult.fields}
            initialMapping={fieldMapping}
            onMappingChange={handleMappingChange}
            onSave={handleMappingSave}
            onCancel={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <FontAwesomeIcon
              icon={faFileWord}
              style={{ fontSize: '4rem', color: '#3b82f6', marginBottom: '1.5rem' }}
            />
            <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>
              Šablona je připravena k uložení
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: 1.6 }}>
              DOCX šablona "{analysisResult?.fileName}" s {analysisResult?.fields.length || 0} namapovanými poli
              bude uložena do systému a bude k dispozici pro generování dokumentů z objednávek.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                Shrnutí mapování:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280' }}>
                {Object.entries(fieldMapping).filter(([, value]) => value).map(([docxField, orderField]) => (
                  <li key={docxField}>
                    <strong>{docxField}</strong> → {orderField}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </ContentArea>

      {currentStep < 3 && (
        <NavigationButtons>
          <NavButton
            onClick={handleStepBack}
            disabled={currentStep === 1}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Zpět
          </NavButton>

          <NavButton
            $primary
            onClick={handleStepForward}
            disabled={
              (currentStep === 1 && !canProceedToMapping) ||
              (currentStep === 2 && !canProceedToFinish)
            }
          >
            Další krok
            <FontAwesomeIcon icon={faArrowRight} />
          </NavButton>
        </NavigationButtons>
      )}

      {currentStep === 3 && (
        <NavigationButtons>
          <NavButton onClick={() => setCurrentStep(2)}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Zpět k mapování
          </NavButton>

          <NavButton $primary onClick={handleFinalSave}>
            <FontAwesomeIcon icon={faSave} />
            Uložit šablonu
          </NavButton>
        </NavigationButtons>
      )}
    </Container>
  );
};

export default DocxTemplateEditor;