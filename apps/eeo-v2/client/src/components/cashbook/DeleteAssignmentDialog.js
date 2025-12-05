import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { X, Trash2, AlertCircle, Check } from 'lucide-react';
import cashbookAPI from '../../services/cashbookService';

// ============================================================================
// ANIMACE
// ============================================================================

const slideInUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  animation: ${slideInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem 0.75rem 1.5rem;
  background: linear-gradient(135deg, #dc2626 0%, #ef4444 70%, #dc2626 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.05"><circle cx="30" cy="30" r="1"/></g></svg>');
    pointer-events: none;
  }
`;

const ModalHeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
`;

const ModalSubtitle = styled.p`
  margin: 0.375rem 0 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8125rem;
  font-weight: 400;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  padding: 0.625rem;
  border-radius: 10px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem 1.5rem;
  background: white;
`;

const WarningBox = styled.div`
  padding: 1rem;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #fca5a5;
  border-radius: 10px;
  margin-bottom: 1.25rem;

  .warning-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-weight: 700;
    color: #991b1b;
    font-size: 0.9375rem;
    margin-bottom: 0.625rem;
  }

  .warning-text {
    font-size: 0.8125rem;
    color: #7f1d1d;
    line-height: 1.5;
  }
`;

const InfoBox = styled.div`
  padding: 0.875rem 1rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 1.25rem;

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0;

    &:not(:last-child) {
      border-bottom: 1px solid #e2e8f0;
    }
  }

  .info-label {
    font-weight: 600;
    color: #64748b;
    font-size: 0.8125rem;
  }

  .info-value {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.8125rem;
  }
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem;
  background: #dcfce7;
  border: 2px solid #86efac;
  border-radius: 8px;
  color: #166534;
  font-weight: 500;
  font-size: 0.8125rem;
  margin-bottom: 0.875rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  font-weight: 500;
  margin-bottom: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8125rem;
`;

const ModalFooter = styled.div`
  padding: 1.25rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.875rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.cancel {
    background: white;
    color: #64748b;
    border: 2px solid #e2e8f0;

    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
  }

  &.danger {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(220, 38, 38, 0.3);
    }

    &:disabled {
      background: #e2e8f0;
      color: #64748b;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }

  &.success {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    color: white;
    border: 2px solid transparent;
    animation: successPulse 0.5s ease-out;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4);
    }
  }

  @keyframes successPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ============================================================================
// KOMPONENTA
// ============================================================================

const DeleteAssignmentDialog = ({
  isOpen,
  onClose,
  assignment,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Reset při otevření
  useEffect(() => {
    if (isOpen) {
      setSuccessMessage('');
      setErrorMessage('');
      setIsClosing(false);
    }
  }, [isOpen]);

  // Esc key handler
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  const handleDelete = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await cashbookAPI.deleteAssignment(assignment.id);

      if (result.status === 'ok') {
        setSuccessMessage('✓ Přiřazení bylo úspěšně smazáno');
        setIsClosing(true);

        // Zobrazit success stav 1.5 sekundy, pak zavřít
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(result.message || 'Nepodařilo se smazat přiřazení');
      }
    } catch (error) {
      console.error('❌ Chyba při mazání přiřazení:', error);
      setErrorMessage(error.message || 'Nepodařilo se smazat přiřazení');
    } finally {
      if (!isClosing) {
        setLoading(false);
      }
    }
  };

  if (!isOpen || !assignment) return null;

  const fullName = [assignment.uzivatel_jmeno, assignment.uzivatel_prijmeni]
    .filter(Boolean)
    .join(' ');

  return ReactDOM.createPortal(
    <ModalOverlay onClick={!loading ? onClose : undefined}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalHeaderContent>
            <HeaderLeft>
              <ModalTitle>Smazat přiřazení pokladny?</ModalTitle>
              <ModalSubtitle>
                Tato akce je nevratná
              </ModalSubtitle>
            </HeaderLeft>
            <CloseButton onClick={onClose} disabled={loading}>
              <X size={20} />
            </CloseButton>
          </ModalHeaderContent>
        </ModalHeader>

        <ModalBody>
          {successMessage && (
            <SuccessMessage>
              <Check size={20} />
              {successMessage}
            </SuccessMessage>
          )}

          {errorMessage && (
            <ErrorMessage>
              <AlertCircle size={20} />
              <div>{errorMessage}</div>
            </ErrorMessage>
          )}

          {!successMessage && (
            <>
              <WarningBox>
                <div className="warning-header">
                  <AlertCircle size={20} />
                  Opravdu chcete smazat toto přiřazení?
                </div>
                <div className="warning-text">
                  Uživatel ztratí přístup k pokladně a nebude moci vytvářet nové doklady.
                  Existující doklady zůstanou zachovány.
                </div>
              </WarningBox>

              <InfoBox>
                <div className="info-row">
                  <span className="info-label">Uživatel:</span>
                  <span className="info-value">{fullName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Pokladna:</span>
                  <span className="info-value">{assignment.cislo_pokladny}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">VPD:</span>
                  <span className="info-value">{assignment.vpd_cislo || '–'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">PPD:</span>
                  <span className="info-value">{assignment.ppd_cislo || '–'}</span>
                </div>
              </InfoBox>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            className="cancel"
            onClick={onClose}
            disabled={loading}
          >
            <X size={16} />
            Zrušit
          </Button>
          <Button
            className={successMessage ? 'success' : 'danger'}
            onClick={handleDelete}
            disabled={loading || isClosing}
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Mažu...
              </>
            ) : successMessage ? (
              <>
                <Check size={16} />
                Smazáno!
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Ano, smazat
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

export default DeleteAssignmentDialog;
