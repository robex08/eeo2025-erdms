import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faTimes, faEyeSlash, faCheck } from '@fortawesome/free-solid-svg-icons';

/**
 * PostLoginModal - Modal dialog zobrazený po přihlášení
 * 
 * Vlastnosti:
 * - Konfigurovatelný přes globální nastavení
 * - GUID systém pro resetování "Příště nezobrazovat"
 * - Časová platnost (od-do)
 * - HTML obsah z databáze notifikací
 * - Per-user localStorage persistence
 */

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000000;
  animation: fadeIn 0.3s ease-out;
  
  pointer-events: auto;
  touch-action: none;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Dialog = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideIn 0.3s ease-out;
  
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
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
`;

const IconContainer = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
`;

const Title = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

const Content = styled.div`
  padding: 2rem;
  max-height: 400px;
  overflow-y: auto;
  
  /* Styling pro HTML obsah */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1f2937;
  }
  
  p {
    margin-bottom: 1rem;
    line-height: 1.6;
    color: #4b5563;
  }
  
  ul, ol {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
    color: #4b5563;
  }
  
  strong {
    color: #1f2937;
    font-weight: 600;
  }
  
  a {
    color: #3b82f6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
  }
  
  blockquote {
    border-left: 4px solid #3b82f6;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: #6b7280;
  }
`;

const Actions = styled.div`
  padding: 1.5rem 2rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DontShowAgainButton = styled(Button)`
  border: 2px solid #d1d5db;
  background: white;
  color: #6b7280;
  
  &:hover {
    border-color: #9ca3af;
    background: #f9fafb;
    color: #4b5563;
  }
`;

const OkButton = styled(Button)`
  border: 2px solid #3b82f6;
  background: #3b82f6;
  color: white;
  
  &:hover {
    background: #2563eb;
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const ValidityInfo = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PostLoginModal = ({
  isOpen,
  onClose,
  onDontShowAgain,
  title = "Upozornění",
  htmlContent = "",
  validFrom = null,
  validTo = null,
  modalGuid = null
}) => {
  
  // Modal je resistentní - escape klávesa neuzavírá modal
  // Uživatel musí kliknout na tlačítko OK nebo "Příště nezobrazovat"

  // Zabránit scrollování pozadí
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Formátování data pro zobrazení
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Modal je resistentní proti kliknutí mimo - pouze tlačítka ho mohou zavřít
  const handleOverlayClick = (e) => {
    // Zabránit zavření při kliknutí mimo
    e.stopPropagation();
  };

  return createPortal(
    <Overlay onClick={handleOverlayClick}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Header>
          <IconContainer>
            <FontAwesomeIcon icon={faInfoCircle} />
          </IconContainer>
          <Title>{title}</Title>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </Header>
        
        <Content>
          {(validFrom || validTo) && (
            <ValidityInfo>
              <FontAwesomeIcon icon={faInfoCircle} />
              <div>
                {validFrom && validTo && (
                  <span>Platí od {formatDate(validFrom)} do {formatDate(validTo)}</span>
                )}
                {validFrom && !validTo && (
                  <span>Platí od {formatDate(validFrom)}</span>
                )}
                {!validFrom && validTo && (
                  <span>Platí do {formatDate(validTo)}</span>
                )}
              </div>
            </ValidityInfo>
          )}
          
          <div 
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
          
          {modalGuid && process.env.NODE_ENV === 'development' && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '0.5rem', 
              background: '#f3f4f6', 
              borderRadius: '4px', 
              fontSize: '0.75rem', 
              color: '#6b7280',
              fontFamily: 'monospace'
            }}>
              Debug: GUID {modalGuid}
            </div>
          )}
        </Content>
        
        <Actions>
          <DontShowAgainButton onClick={onDontShowAgain}>
            <FontAwesomeIcon icon={faEyeSlash} />
            Příště nezobrazovat
          </DontShowAgainButton>
          <OkButton onClick={onClose}>
            <FontAwesomeIcon icon={faCheck} />
            OK
          </OkButton>
        </Actions>
      </Dialog>
    </Overlay>,
    document.body
  );
};

export default PostLoginModal;