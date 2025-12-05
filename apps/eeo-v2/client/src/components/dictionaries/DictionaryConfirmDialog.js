/**
 * Konfirmační dialog pro smazání záznamů
 * Jednoduchý dialog pro potvrzení nebezpečných akcí
 *
 * @author Frontend Team
 * @date 2025-10-19
 */

import React from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

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

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const DialogContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: ${slideInUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DialogHeader = styled.div`
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const IconWrapper = styled.div`
  background: #fee2e2;
  border-radius: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    color: #dc2626;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const DialogTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
`;

const DialogMessage = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
`;

const DialogFooter = styled.div`
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: #f3f4f6;
  color: #374151;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

const DangerButton = styled(Button)`
  background: #dc2626;
  color: white;

  &:hover:not(:disabled) {
    background: #b91c1c;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }
`;

/**
 * Konfirmační dialog
 *
 * @param {boolean} isOpen - Je otevřený?
 * @param {function} onClose - Callback pro zavření
 * @param {function} onConfirm - Callback pro potvrzení
 * @param {string} title - Nadpis
 * @param {string} message - Zpráva
 * @param {string} confirmText - Text tlačítka potvrzení
 * @param {boolean} loading - Probíhá akce?
 */
const DictionaryConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Potvrdit akci',
  message = 'Opravdu chcete provést tuto akci?',
  confirmText = 'Potvrdit',
  loading = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return ReactDOM.createPortal(
    <DialogOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <DialogContainer onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <IconWrapper>
            <AlertTriangle size={24} />
          </IconWrapper>
          <HeaderContent>
            <DialogTitle>{title}</DialogTitle>
            <DialogMessage>{message}</DialogMessage>
          </HeaderContent>
        </DialogHeader>

        <DialogFooter>
          <CancelButton onClick={onClose} disabled={loading}>
            <X size={16} />
            Zrušit
          </CancelButton>
          <DangerButton onClick={handleConfirm} disabled={loading}>
            <Trash2 size={16} />
            {loading ? 'Probíhá...' : confirmText}
          </DangerButton>
        </DialogFooter>
      </DialogContainer>
    </DialogOverlay>,
    document.body
  );
};

export default DictionaryConfirmDialog;
