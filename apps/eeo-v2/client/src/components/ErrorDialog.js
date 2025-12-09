import React from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { AlertCircle, X } from 'lucide-react';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100003;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Dialog = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #dc2626, #991b1b);
  color: white;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  flex-shrink: 0;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const Content = styled.div`
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
`;

const Message = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ErrorDetails = styled.details`
  margin-top: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #6b7280;
  cursor: pointer;

  summary {
    font-weight: 600;
    user-select: none;
    outline: none;
  }

  pre {
    margin-top: 8px;
    padding: 8px;
    background: #1f2937;
    color: #f3f4f6;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.75rem;
    line-height: 1.4;
  }
`;

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  
  ${props => props.primary ? `
    background: #dc2626;
    color: white;
    
    &:hover {
      background: #b91c1c;
    }
  ` : `
    background: #f3f4f6;
    color: #374151;
    
    &:hover {
      background: #e5e7eb;
    }
  `}
`;

const ErrorDialog = ({ 
  isOpen, 
  title = 'Chyba', 
  message, 
  details = null,
  onClose,
  onConfirm = null,
  confirmText = 'OK',
  cancelText = 'Zrušit'
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <Overlay onClick={handleOverlayClick}>
      <Dialog>
        <Header>
          <IconWrapper>
            <AlertCircle size={24} />
          </IconWrapper>
          <Title>{title}</Title>
          <CloseButton onClick={onClose}>
            <X size={18} />
          </CloseButton>
        </Header>
        
        <Content>
          <Message>{message}</Message>
          
          {details && (
            <ErrorDetails>
              <summary>Technické detaily</summary>
              <pre>{details}</pre>
            </ErrorDetails>
          )}
        </Content>
        
        <Footer>
          {onConfirm ? (
            <>
              <Button onClick={onClose}>{cancelText}</Button>
              <Button primary onClick={onConfirm}>{confirmText}</Button>
            </>
          ) : (
            <Button primary onClick={onClose}>{confirmText}</Button>
          )}
        </Footer>
      </Dialog>
    </Overlay>,
    document.body
  );
};

export default ErrorDialog;
