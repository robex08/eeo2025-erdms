import React from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const DialogOverlay = styled.div`
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

const DialogContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: ${slideInUp} 0.3s ease-out;
  overflow: hidden;
`;

const DialogHeader = styled.div`
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const IconContainer = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  flex-shrink: 0;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const DialogTitle = styled.h2`
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
`;

const DialogDescription = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`;

const DialogContent = styled.div`
  padding: 0 1.5rem 1rem 1.5rem;
`;

const ContactInfo = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ContactName = styled.div`
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const ContactDetails = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const WarningIcon = styled.div`
  color: #92400e;
  flex-shrink: 0;
  margin-top: 0.125rem;
`;

const WarningText = styled.div`
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const DialogFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;

  &.cancel {
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;

    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #1e293b;
    }
  }

  &.danger {
    background: #dc2626;
    color: white;
    border: none;

    &:hover {
      background: #b91c1c;
    }

    &:disabled {
      background: #fca5a5;
      cursor: not-allowed;
    }
  }
`;

const ContactDeleteDialog = ({
  isOpen,
  onClose,
  contact,
  onConfirm,
  loading = false
}) => {
  if (!isOpen || !contact) return null;

  const handleConfirm = () => {
    if (onConfirm && !loading) {
      onConfirm(contact);
    }
  };

  return ReactDOM.createPortal(
    <DialogOverlay onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <DialogContainer>
        <DialogHeader>
          <IconContainer>
            <AlertTriangle size={24} />
          </IconContainer>
          <HeaderContent>
            <DialogTitle>Smazat kontakt</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat tento kontakt? Tato akce je nevratná.
            </DialogDescription>
          </HeaderContent>
          <CloseButton onClick={onClose} disabled={loading}>
            <X size={20} />
          </CloseButton>
        </DialogHeader>

        <DialogContent>
          <ContactInfo>
            <ContactName>{contact.nazev || contact.name}</ContactName>
            <ContactDetails>
              IČO: {contact.ico}
              {contact.dic && <> • DIČ: {contact.dic}</>}
              {contact.adresa && (
                <>
                  <br />
                  {contact.adresa}
                </>
              )}
            </ContactDetails>
          </ContactInfo>

          <WarningBox>
            <WarningIcon>
              <AlertTriangle size={16} />
            </WarningIcon>
            <WarningText>
              <strong>Upozornění:</strong> Smazání kontaktu je nevratná operace.
              Kontakt bude odstraněn z adresáře a nebude již dostupný pro výběr
              v objednávkách.
            </WarningText>
          </WarningBox>
        </DialogContent>

        <DialogFooter>
          <Button className="cancel" onClick={onClose} disabled={loading}>
            Zrušit
          </Button>
          <Button
            className="danger"
            onClick={handleConfirm}
            disabled={loading}
          >
            <Trash2 size={16} />
            {loading ? 'Mazání...' : 'Smazat kontakt'}
          </Button>
        </DialogFooter>
      </DialogContainer>
    </DialogOverlay>,
    document.body
  );
};

export default ContactDeleteDialog;