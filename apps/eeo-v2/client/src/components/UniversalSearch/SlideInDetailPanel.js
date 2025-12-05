/**
 * Slide-in Detail Panel Component
 * 
 * Univerzální slide-in panel zprava pro zobrazení detailů entity.
 * Používá React Portal, aby se nevložil do DOM struktury Layout komponenty.
 * 
 * Features:
 * - Slide-in animace zprava
 * - Tmavý overlay s možností zavřít
 * - ESC klávesa zavře panel
 * - Responsive (na mobilu celá šířka)
 * - Loading state
 * - Dynamic content podle typu entity
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faSpinner,
  faUser,
  faBox,
  faFileContract,
  faFileInvoice,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 10000;
  opacity: ${props => props.$isOpen ? 1 : 0};
  transition: opacity 0.3s ease;
  cursor: pointer;
  pointer-events: auto;
`;

const PanelContainer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 600px;
  max-width: 90vw;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 10001;
  transform: translateX(${props => props.$isOpen ? '0' : '100%'});
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 100vw;
    max-width: 100vw;
  }
`;

const PanelHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const HeaderIcon = styled.div`
  font-size: 1.25rem;
  opacity: 0.9;
`;

const HeaderTitleText = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  
  sup {
    font-size: 0.6em;
    color: rgba(255, 255, 255, 0.75);
    font-weight: 400;
    margin-left: 0.3em;
  }
`;

const HeaderSubtitle = styled.div`
  font-size: 0.875rem;
  opacity: 0.9;
  font-weight: 500;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #64748b;
`;

const LoadingSpinner = styled.div`
  font-size: 3rem;
  color: #3b82f6;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-size: 1rem;
  font-weight: 500;
`;

// Ikony pro typy entit
const getEntityIcon = (type) => {
  const icons = {
    users: faUser,
    orders_2025: faBox,
    orders_legacy: faBox,
    contracts: faFileContract,
    invoices: faFileInvoice,
    suppliers: faBuilding
  };
  return icons[type] || faBox;
};

// Názvy kategorií
const getCategoryLabel = (type) => {
  const labels = {
    users: 'Uživatel',
    orders_2025: 'Objednávka',
    orders_legacy: 'Objednávka',
    contracts: 'Smlouva',
    invoices: 'Faktura',
    suppliers: 'Dodavatel'
  };
  return labels[type] || 'Detail';
};

/**
 * Slide-in Detail Panel
 */
const SlideInDetailPanel = ({ 
  isOpen, 
  onClose, 
  entityType, 
  entityId, 
  loading,
  children
}) => {
  const panelRef = useRef(null);

  /**
   * Handle ESC key
   */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when panel is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const icon = getEntityIcon(entityType);
  const categoryLabel = getCategoryLabel(entityType);

  const handleOverlayClick = (e) => {
    // IGNORUJ kliknutí pouze pokud je otevřený ConfirmDialog
    // ConfirmDialog má vlastní overlay s vyšším z-indexem (10000000 vs 10000)
    // Pokud je dialog otevřený, tento event se NESPUSTÍ (dialog overlay zachytí klik)
    
    // Pokud není dialog otevřený, standardně zavři panel
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <>
      <Overlay $isOpen={isOpen} onClick={handleOverlayClick} data-slide-panel />
      <PanelContainer $isOpen={isOpen} ref={panelRef} data-slide-panel>
        <PanelHeader>
          <HeaderContent>
            <HeaderTitle>
              <HeaderIcon>
                <FontAwesomeIcon icon={icon} />
              </HeaderIcon>
              <HeaderTitleText>
                {categoryLabel}
                {entityId && <sup>#{entityId}</sup>}
              </HeaderTitleText>
            </HeaderTitle>
          </HeaderContent>
          <CloseButton onClick={onClose} title="Zavřít (ESC)">
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </PanelHeader>

        <PanelContent>
          {loading ? (
            <LoadingContainer>
              <LoadingSpinner>
                <FontAwesomeIcon icon={faSpinner} />
              </LoadingSpinner>
              <LoadingText>Načítám detail...</LoadingText>
            </LoadingContainer>
          ) : (
            children
          )}
        </PanelContent>
      </PanelContainer>
    </>,
    document.body
  );
};

export default SlideInDetailPanel;
