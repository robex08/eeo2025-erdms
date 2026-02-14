import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faEyeSlash, faCheck, faChevronDown } from '@fortawesome/free-solid-svg-icons';

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
  max-width: 1200px;
  width: 70%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideIn 0.3s ease-out;
  
  /* Extra velké obrazovky (1600px+) */
  @media (min-width: 1600px) {
    width: 65%;
    max-width: 1400px;
    max-height: 86vh;
  }
  
  /* Velké obrazovky (1400px-1599px) */
  @media (min-width: 1400px) and (max-width: 1599px) {
    width: 70%;
    max-width: 1200px;
    max-height: 80vh;
  }
  
  /* Střední obrazovky (1024px-1399px) */
  @media (min-width: 1024px) and (max-width: 1399px) {
    width: 75%;
    max-width: 1000px;
    max-height: 78vh;
  }
  
  /* Malé desktop (768px-1023px) */
  @media (min-width: 768px) and (max-width: 1023px) {
    width: 85%;
    max-width: 800px;
    max-height: 86vh;
  }
  
  /* Tablet (481px-767px) */
  @media (min-width: 481px) and (max-width: 767px) {
    width: 90%;
    max-width: 600px;
    max-height: 92vh;
  }
  
  /* Mobile (≤480px) */
  @media (max-width: 480px) {
    width: 95%;
    max-width: 420px;
    max-height: 96vh;
    border-radius: 12px;
  }
  
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
  padding: 0.9rem 1.2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  flex-shrink: 0;
  
  /* Responzivní padding */
  @media (min-width: 1600px) {
    padding: 1.2rem 1.5rem;
    gap: 1.5rem;
  }
  
  @media (min-width: 1024px) and (max-width: 1599px) {
    padding: 1.05rem 1.35rem;
    gap: 1.25rem;
  }
  
  @media (max-width: 767px) {
    padding: 0.75rem 0.9rem;
    gap: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.6rem;
    gap: 0.5rem;
  }
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
  font-size: 1.25rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  line-height: 1.3;
  
  /* Responzivní velikost */
  @media (min-width: 1600px) {
    font-size: 1.4rem;
  }
  
  @media (min-width: 768px) and (max-width: 1023px) {
    font-size: 1.2rem;
  }
  
  @media (max-width: 767px) {
    font-size: 1.1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;



const Content = styled.div`
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  
  /* Responzivní padding podle velikosti obrazovky */
  @media (min-width: 1600px) {
    padding: 2.5rem;
  }
  
  @media (min-width: 1024px) and (max-width: 1599px) {
    padding: 2.25rem;
  }
  
  @media (min-width: 768px) and (max-width: 1023px) {
    padding: 2rem;
  }
  
  @media (max-width: 767px) {
    padding: 1.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
  }
  
  /* Vlastní scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    transition: background 0.2s ease;
    
    &:hover {
      background: #94a3b8;
    }
  }
  
  &::-webkit-scrollbar-thumb:active {
    background: #64748b;
  }
  
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
  justify-content: space-between;
  flex-shrink: 0;
  
  /* Responzivní padding a layout */
  @media (min-width: 1600px) {
    padding: 2rem 2.5rem;
    gap: 1.5rem;
  }
  
  @media (min-width: 1024px) and (max-width: 1599px) {
    padding: 1.75rem 2.25rem;
    gap: 1.25rem;
  }
  
  @media (max-width: 767px) {
    padding: 1.25rem 1.5rem;
    flex-direction: column-reverse;
    gap: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    gap: 0.5rem;
  }
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

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  &:disabled:hover {
    transform: none;
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

  &:disabled {
    background: #ffffff;
    border-color: #e5e7eb;
    color: #9ca3af;
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

  &:disabled {
    background: #93c5fd;
    border-color: #93c5fd;
    color: #ffffff;
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

  const contentRef = useRef(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  // Tolerance pro "doscrollováno na konec" (px)
  const scrollBottomThreshold = 6;

  const evaluateReachedEnd = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    // Pokud obsah není scrollovatelný, považovat za dočtené
    if (el.scrollHeight <= el.clientHeight + 1) {
      setHasReachedEnd(true);
      return;
    }

    const isAtBottom = (el.scrollTop + el.clientHeight) >= (el.scrollHeight - scrollBottomThreshold);
    if (isAtBottom) {
      setHasReachedEnd(true);
    }
  }, []);

  const handleScroll = useCallback(() => {
    evaluateReachedEnd();
  }, [evaluateReachedEnd]);

  // Reset stavu při otevření (každé nové zobrazení)
  useEffect(() => {
    if (!isOpen) return;
    setHasReachedEnd(false);

    // Po renderu zkontrolovat, jestli je potřeba scroll
    const t = setTimeout(() => {
      evaluateReachedEnd();
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, htmlContent, evaluateReachedEnd]);

  const scrollOnePageDown = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const page = Math.max(80, Math.floor(el.clientHeight * 0.92));
    const nextTop = Math.min(el.scrollTop + page, el.scrollHeight - el.clientHeight);
    el.scrollTo({ top: nextTop, behavior: 'smooth' });

    // Po scrollu znovu vyhodnotit
    setTimeout(() => {
      evaluateReachedEnd();
    }, 250);
  }, [evaluateReachedEnd]);

  const handlePrimaryAction = useCallback(() => {
    if (hasReachedEnd) {
      onClose?.();
    } else {
      scrollOnePageDown();
    }
  }, [hasReachedEnd, onClose, scrollOnePageDown]);

  const primaryButtonLabel = useMemo(() => (
    hasReachedEnd ? 'OK' : 'Číst dál'
  ), [hasReachedEnd]);

  const primaryButtonIcon = useMemo(() => (
    hasReachedEnd ? faCheck : faChevronDown
  ), [hasReachedEnd]);
  
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
        </Header>
        
        <Content ref={contentRef} onScroll={handleScroll}>
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
        </Content>
        
        <Actions>
          <DontShowAgainButton onClick={onDontShowAgain} disabled={!hasReachedEnd}>
            <FontAwesomeIcon icon={faEyeSlash} />
            Příště nezobrazovat
          </DontShowAgainButton>
          <OkButton onClick={handlePrimaryAction}>
            <FontAwesomeIcon icon={primaryButtonIcon} />
            {primaryButtonLabel}
          </OkButton>
        </Actions>
      </Dialog>
    </Overlay>,
    document.body
  );
};

export default PostLoginModal;