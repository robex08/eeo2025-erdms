import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/**
 * ConfirmDialog - Univerzální modální dialog pro potvrzení akcí (GRADIENT-MODERN style)
 *
 * @param {boolean} isOpen - Zobrazit/skrýt dialog
 * @param {function} onClose - Callback při zavření (klik na overlay nebo Zrušit)
 * @param {function} onConfirm - Callback při potvrzení
 * @param {string} title - Titulek dialogu
 * @param {React.ReactNode} children - Obsah dialogu (text, warning boxy, atd.)
 * @param {string|React.ReactNode} message - Alternativa k children (pro jednoduchý text nebo JSX)
 * @param {object} icon - FontAwesome ikona (např. faExclamationTriangle)
 * @param {string} variant - 'danger' (červená), 'warning' (oranžová) nebo 'success' (zelená)
 * @param {string} cancelText - Text tlačítka Zrušit (výchozí: "Zrušit")
 * @param {string} confirmText - Text tlačítka Potvrdit (výchozí: "Potvrdit")
 * @param {boolean} showCancel - Zobrazit tlačítko Zrušit (výchozí: true)
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
  animation: fadeIn 0.2s ease-out;
  
  /* 🔥 KRITICKÉ: Zachyť VŠECHNY eventy! */
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
  max-width: 900px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: slideUp 0.3s ease;
  
  /* 🔥 KRITICKÉ: Dialog musí zachytit všechny eventy */
  pointer-events: auto;
  position: relative;
  z-index: 1;

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

const Header = styled.div`
  background: ${props => {
    if (props.$variant === 'danger') return 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
    if (props.$variant === 'warning') return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  }};
  border-bottom: ${props => {
    if (props.$variant === 'danger') return '3px solid #991b1b';
    if (props.$variant === 'warning') return '3px solid #b45309';
    return '3px solid #047857';
  }};
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const IconWrapper = styled.div`
  font-size: 1.5rem;
  color: white;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
`;

const Title = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.25rem;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  flex: 1;
`;

const Content = styled.div`
  padding: 2rem 2rem 1.75rem 2rem;
`;

const Body = styled.div`
  margin-bottom: ${props => props.$hasActions ? '1.75rem' : '0'};
  font-size: 1rem;
  line-height: 1.7;
  color: #374151;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  border-top: 2px solid #f3f4f6;
  padding-top: 1.75rem;
`;

const Button = styled.button`
  padding: 0.875rem 1.75rem;
  border: ${props => props.$variant === 'primary'
    ? 'none'
    : '2px solid #d1d5db'
  };
  border-radius: 10px;
  font-weight: 700;
  background: ${props => {
    if (props.$variant === 'primary') {
      if (props.$color === 'danger') return 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
      if (props.$color === 'warning') return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }
    return 'white';
  }};
  color: ${props => props.$variant === 'primary' ? 'white' : '#6b7280'};
  cursor: pointer;
  font-size: 0.9375rem;
  box-shadow: ${props => {
    if (props.$variant === 'primary') {
      if (props.$color === 'danger') return '0 4px 12px rgba(220, 38, 38, 0.4)';
      if (props.$color === 'warning') return '0 4px 12px rgba(245, 158, 11, 0.4)';
      return '0 4px 12px rgba(16, 185, 129, 0.4)';
    }
    return 'none';
  }};
  transition: all 0.2s ease;
  pointer-events: auto;
  position: relative;
  z-index: 10;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => {
      if (props.$variant === 'primary') {
        if (props.$color === 'danger') return '0 6px 16px rgba(220, 38, 38, 0.5)';
        if (props.$color === 'warning') return '0 6px 16px rgba(245, 158, 11, 0.5)';
        return '0 6px 16px rgba(16, 185, 129, 0.5)';
      }
      return '0 2px 8px rgba(0, 0, 0, 0.1)';
    }};
  }

  &:active {
    transform: translateY(0);
    background: ${props => {
      if (props.$variant === 'primary') {
        if (props.$color === 'danger') return '#b91c1c';
        if (props.$color === 'warning') return '#d97706';
        return '#059669';
      }
      return '#e5e7eb';
    }};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel, // Volitelný custom handler pro cancel tlačítko (fallback na onClose)
  title,
  children,
  message, // Podpora pro message prop (alternativa k children)
  icon,
  variant = 'danger', // 'danger' nebo 'success'
  cancelText = 'Zrušit',
  confirmText = 'Potvrdit',
  showCancel = true
}) => {
  // 🔥 KRITICKÉ: Když je dialog otevřený, zablokuj scroll a všechny eventy
  useEffect(() => {
    if (isOpen) {
      // Ulož původní overflow
      const originalOverflow = document.body.style.overflow;
      const originalPointerEvents = document.body.style.pointerEvents;
      
      // Zablokuj scroll
      document.body.style.overflow = 'hidden';
      
      // Cleanup při zavření
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  // Pokud je message definován, použij ho místo children
  const content = message || children;

  const handleOverlayClick = (e) => {
    // 🔥 KRITICKÉ: Zastavit VŠECHNY eventy na overlay!
    e.preventDefault();
    e.stopPropagation();
    // Nezavíráme dialog - jen zastavíme propagaci
  };
  
  const handleDialogClick = (e) => {
    // 🔥 KRITICKÉ: Zastavit propagaci na Dialog!
    e.preventDefault();
    e.stopPropagation();
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation(); // 🔥 EXTRA OCHRANA
    
    try {
      onConfirm();
    } catch (error) {
      console.error('ConfirmDialog - Chyba v onConfirm:', error);
    }
  };
  
  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation(); // 🔥 EXTRA OCHRANA
    
    try {
      if (onCancel) {
        onCancel();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('ConfirmDialog - Chyba v onCancel/onClose:', error);
    }
  };

  return createPortal(
    <Overlay 
      onClick={handleOverlayClick}
      onMouseDown={handleOverlayClick}
      onMouseUp={handleOverlayClick}
      onTouchStart={handleOverlayClick}
      onTouchEnd={handleOverlayClick}
    >
      <Dialog 
        onClick={handleDialogClick}
        onMouseDown={handleDialogClick}
        onMouseUp={handleDialogClick}
      >
        <Header $variant={variant}>
          {icon && (
            <IconWrapper>
              <FontAwesomeIcon icon={icon} />
            </IconWrapper>
          )}
          <Title>{title}</Title>
        </Header>

        <Content>
          <Body $hasActions={true}>
            {content}
          </Body>

          <Actions>
            {showCancel && (
              <Button
                type="button"
                onClick={handleCancel}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="button"
              $variant="primary"
              $color={variant}
              onClick={handleConfirm}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {confirmText}
            </Button>
          </Actions>
        </Content>
      </Dialog>
    </Overlay>,
    document.body
  );
};

export default ConfirmDialog;
