import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faCalculator,
  faTimes,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const ForceRenumberDialog = ({ isOpen, onClose, assignment, onConfirm }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [resultData, setResultData] = useState(null); // ✨ Uložení výsledku přepočtu

  const handleConfirm = async (e) => {
    console.log('🔘 KLIKNUTO NA PROVÉST PŘEPOČET - handleConfirm() volán');

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // ✅ Reset všech stavů (včetně předchozí chyby)
    setIsProcessing(true);
    setIsCompleted(false);
    setError(null);
    setResultData(null);
    setProgress({ current: 0, total: 0, phase: 'Inicializace...' });

    try {
      // Simulace progressu (backend zatím nevrací progress)
      setProgress({ current: 1, total: 4, phase: 'Načítání dat pokladny...' });

      // ✅ PO ZMĚNĚ (commit 945cc8e): Používá se pokladna_id místo assignment.id
      const pokladnaId = assignment.pokladna_id;
      console.log('🔧 Force přepočet START:', { pokladnaId, year });

      const result = await onConfirm(pokladnaId, year);

      console.log('🔧 Force přepočet RESPONSE:', result);

      if (result && result.status === 'ok') {
        // Úspěch - zobraz finální progress
        setProgress({
          current: 4,
          total: 4,
          phase: `Hotovo! Přečíslováno ${result.data.total_renumbered} položek`
        });

        // ✅ Ulož CELÝ result (včetně debug) pro zobrazení
        setResultData({
          ...result.data,
          debug: result.debug || null  // Přidej debug data pokud existují
        });

        // Nastav completed state - dialog zůstane otevřený
        setIsCompleted(true);
        setIsProcessing(false);
      } else {
        // Backend vrátil error nebo neexistující response
        const errorMsg = result?.message || 'Backend endpoint /cashbook-force-renumber ještě není implementován';
        console.error('❌ Force přepočet ERROR:', errorMsg, result);
        setError(errorMsg);
        setProgress({ current: 0, total: 0, phase: '' });
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('❌ Force přepočet EXCEPTION:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      let errorMsg = 'Chyba při komunikaci se serverem';

      if (err.response?.status === 404) {
        errorMsg = 'Backend endpoint /cashbook-force-renumber ještě není implementován (404)';
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      setProgress({ current: 0, total: 0, phase: '' });
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    console.log('🚪 ZAVÍRÁM DIALOG - handleClose() volán');
    // Reset state při zavírání
    setIsProcessing(false);
    setIsCompleted(false);
    setError(null);
    setProgress({ current: 0, total: 0, phase: '' });
    setResultData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Overlay>
      <DialogBox onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <WarningIconLarge>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </WarningIconLarge>
          <h2>⚠️ FORCE PŘEPOČET DOKLADŮ</h2>
          <CloseButton onClick={handleClose} disabled={isProcessing}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </DialogHeader>

        <DialogContent>
          {/* ✅ LEVÝ SLOUPEC - Varování a popis */}
          <LeftColumn>
            <WarningBox>
              <h3>🚨 KRITICKÁ OPERACE</h3>
              <p>
                Tato funkce <strong>přečísluje všechny doklady</strong> v daném roce
                včetně <strong>uzavřených a zamčených měsíců</strong>!
              </p>
            </WarningBox>

            <InfoSection>
              <h4>📋 Pokladna:</h4>
              <InfoGrid>
                <InfoRow>
                  <InfoLabel>Číslo:</InfoLabel>
                  <InfoValue>{assignment.cislo_pokladny}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>VPD řada:</InfoLabel>
                  <InfoValue>
                    {assignment.ciselna_rada_vpd} <small>(od {assignment.vpd_od_cislo || 1})</small>
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>PPD řada:</InfoLabel>
                  <InfoValue>
                    {assignment.ciselna_rada_ppd} <small>(od {assignment.ppd_od_cislo || 1})</small>
                  </InfoValue>
                </InfoRow>
              </InfoGrid>
            </InfoSection>

            <RisksList>
              <h4>⚠️ Důsledky:</h4>
              <ul>
                <li>🔄 Změní se <strong>všechna čísla dokladů</strong> v roce</li>
                <li>🔓 Ignoruje stav měsíců (aktivní, uzavřené, zamčené)</li>
                <li>📝 PDF dokumenty budou mít <strong>jiná čísla než DB</strong></li>
                <li>⏪ Operaci <strong>nelze vrátit zpět</strong></li>
              </ul>
            </RisksList>
          </LeftColumn>

          {/* ✅ PRAVÝ SLOUPEC - Rok, Progress a výsledky */}
          <RightColumn>
            {/* ✅ Input pro rok - PŘESUNUT DO PRAVÉHO SLOUPCE */}
            <YearInput>
              <label>📅 Rok pro přepočet:</label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                disabled={isProcessing || isCompleted}
              />
            </YearInput>
            {(isProcessing || isCompleted) && progress.phase && (
              <ProgressBox $completed={isCompleted}>
                <ProgressLabel $completed={isCompleted}>
                  {isCompleted ? (
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                  ) : (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  )}
                  {progress.phase}
                </ProgressLabel>
                {progress.total > 0 && (
                  <ProgressBarContainer>
                    <ProgressBarFill
                      $completed={isCompleted}
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </ProgressBarContainer>
                )}
              </ProgressBox>
            )}

            {isCompleted && resultData && (
              <>
                <ResultBox>
                  <ResultHeader>
                    <span>✅</span>
                    <h3>Přepočet dokončen!</h3>
                  </ResultHeader>
                  <ResultGrid>
                    <ResultItem $highlight>
                      <ResultLabel>Celkem přečíslováno:</ResultLabel>
                      <ResultValue>{resultData.total_renumbered} položek</ResultValue>
                    </ResultItem>
                    <ResultItem>
                      <ResultLabel>Rok:</ResultLabel>
                      <ResultValue>{resultData.year}</ResultValue>
                    </ResultItem>
                    <ResultItem>
                      <ResultLabel>📤 Výdaje (VPD):</ResultLabel>
                      <ResultValue>{resultData.vpd_renumbered} položek</ResultValue>
                    </ResultItem>
                    <ResultItem>
                      <ResultLabel>📥 Příjmy (PPD):</ResultLabel>
                      <ResultValue>{resultData.ppd_renumbered} položek</ResultValue>
                    </ResultItem>
                  </ResultGrid>
                </ResultBox>

                {/* ✅ ZOBRAZENÍ DEBUG INFORMACÍ Z BE */}
                {resultData.debug && (
                  <DebugBox>
                    <DebugHeader>
                      🔍 Debug informace z backendu
                    </DebugHeader>
                    <DebugContent>
                      <pre>{JSON.stringify(resultData.debug, null, 2)}</pre>
                    </DebugContent>
                  </DebugBox>
                )}
              </>
            )}

            {error && (
              <ErrorBox>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {error}
              </ErrorBox>
            )}

            {/* ✅ Placeholder pokud ještě nic neběží */}
            {!isProcessing && !isCompleted && !error && (
              <PlaceholderBox>
                <PlaceholderIcon>
                  <FontAwesomeIcon icon={faCalculator} />
                </PlaceholderIcon>
                <p>Výsledky přepočtu se zobrazí zde po spuštění operace.</p>
              </PlaceholderBox>
            )}
          </RightColumn>
        </DialogContent>

        <DialogFooter>
          {/* ✅ Tlačítko Zrušit - viditelné vždy když není dokončeno úspěšně */}
          {!isCompleted && (
            <CancelButton onClick={handleClose} disabled={isProcessing} type="button">
              {error ? 'Zavřít' : 'Zrušit'}
            </CancelButton>
          )}

          {/* ✅ Úspěch: Tlačítko "Hotovo" */}
          {isCompleted ? (
            <ConfirmButton
              onClick={handleClose}
              $variant="success"
              type="button"
            >
              <FontAwesomeIcon icon={faCalculator} />
              Hotovo
            </ConfirmButton>
          ) : (
            /* ✅ V procesu nebo připraveno: Tlačítko "Provést přepočet" / "Zkusit znovu" */
            <ConfirmButton
              onClick={handleConfirm}
              disabled={isProcessing}
              type="button"
            >
              {isProcessing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Přepočítávám...
                </>
              ) : error ? (
                <>
                  <FontAwesomeIcon icon={faCalculator} />
                  Zkusit znovu
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCalculator} />
                  Provést přepočet
                </>
              )}
            </ConfirmButton>
          )}
        </DialogFooter>
      </DialogBox>
    </Overlay>
  );
};

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const DialogBox = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 1000px;  /* ✅ Širší dialog */
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const DialogHeader = styled.div`
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 16px 16px 0 0;
  position: relative;
  text-align: center;

  h2 {
    margin: 0.5rem 0 0 0;
    font-size: 1.5rem;
  }
`;

const WarningIconLarge = styled.div`
  font-size: 3rem;
  color: #fbbf24;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 rgba(251, 191, 36, 0));
    }
    50% {
      transform: scale(1.1);
      filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.5));
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.2rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DialogContent = styled.div`
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;  /* ✅ Dva sloupce */
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;  /* Na mobilu jeden sloupec */
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const WarningBox = styled.div`
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #dc2626;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);

  h3 {
    color: #991b1b;
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    color: #7f1d1d;
    line-height: 1.6;
  }
`;

const InfoSection = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;

  h4 {
    margin: 0 0 1rem 0;
    color: #374151;
    font-size: 0.95rem;
    font-weight: 600;
  }
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const InfoLabel = styled.div`
  font-weight: 600;
  color: #6b7280;
  min-width: 80px;
  font-size: 0.9rem;
`;

const InfoValue = styled.div`
  color: #111827;
  font-family: 'Courier New', monospace;
  font-weight: 500;

  small {
    color: #6b7280;
    font-size: 0.85rem;
    margin-left: 0.5rem;
  }
`;

const RisksList = styled.div`
  margin-bottom: 1.5rem;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  border-radius: 12px;
  padding: 1.25rem;

  h4 {
    color: #dc2626;
    margin: 0 0 0.75rem 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  ul {
    margin: 0;
    padding-left: 1.5rem;

    li {
      margin: 0.5rem 0;
      color: #78350f;
      line-height: 1.5;
    }
  }
`;

const YearInput = styled.div`
  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #374151;
    font-size: 0.95rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 1.1rem;
    font-family: 'Courier New', monospace;
    font-weight: 600;
    text-align: center;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
      opacity: 0.6;
    }
  }
`;

const ProgressBox = styled.div`
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: ${props =>
    props.$completed
      ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
      : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
  };
  border: 2px solid ${props => props.$completed ? '#10b981' : '#3b82f6'};
  border-radius: 12px;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ProgressLabel = styled.div`
  color: ${props => props.$completed ? '#047857' : '#1e40af'};
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;

  svg {
    color: ${props => props.$completed ? '#10b981' : '#3b82f6'};
    font-size: 1.1rem;
  }
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: ${props =>
    props.$completed
      ? 'rgba(16, 185, 129, 0.2)'
      : 'rgba(59, 130, 246, 0.2)'
  };
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: ${props =>
    props.$completed
      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
      : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
  };
  border-radius: 4px;
  transition: width 0.3s ease;
  box-shadow: ${props =>
    props.$completed
      ? '0 0 10px rgba(16, 185, 129, 0.5)'
      : '0 0 10px rgba(59, 130, 246, 0.5)'
  };
`;

const ResultBox = styled.div`
  margin-top: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border: 2px solid #10b981;
  border-radius: 8px;
  animation: fadeIn 0.3s ease-in;
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;

  span {
    font-size: 1.5rem;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #065f46;
    font-weight: 600;
  }
`;

const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`;

const ResultItem = styled.div`
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  ${props => props.$highlight && `
    grid-column: 1 / -1;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid #10b981;
  `}
`;

const ResultLabel = styled.span`
  font-size: 0.85rem;
  color: #047857;
  font-weight: 500;
`;

const ResultValue = styled.span`
  font-size: 1.1rem;
  color: #065f46;
  font-weight: 700;
`;

const ErrorBox = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border: 2px solid #ef4444;
  border-radius: 8px;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;

  svg {
    color: #dc2626;
    font-size: 1.2rem;
    flex-shrink: 0;
  }
`;

const PlaceholderBox = styled.div`
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 2px dashed #9ca3af;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  color: #6b7280;

  p {
    margin: 0.5rem 0 0 0;
    font-size: 0.95rem;
  }
`;

const PlaceholderIcon = styled.div`
  font-size: 3rem;
  color: #9ca3af;
  margin-bottom: 1rem;
`;

// ✅ Debug komponenty pro zobrazení backend debug dat
const DebugBox = styled.div`
  background: #1f2937;
  border: 2px solid #374151;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const DebugHeader = styled.div`
  background: #374151;
  color: #9ca3af;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-bottom: 1px solid #4b5563;
`;

const DebugContent = styled.div`
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;

  pre {
    margin: 0;
    color: #d1d5db;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #111827;
  }

  &::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
`;

const DialogFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 2px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props =>
    props.$variant === 'success'
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
  };
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  box-shadow: ${props =>
    props.$variant === 'success'
      ? '0 2px 8px rgba(16, 185, 129, 0.2)'
      : '0 2px 8px rgba(220, 38, 38, 0.2)'
  };

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${props =>
      props.$variant === 'success'
        ? '0 4px 12px rgba(16, 185, 129, 0.3)'
        : '0 4px 12px rgba(220, 38, 38, 0.3)'
    };
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

export default ForceRenumberDialog;
