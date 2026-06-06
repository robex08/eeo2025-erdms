import React, { useEffect, useState, useContext } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt, 
  faFilePdf, 
  faDownload, 
  faEye, 
  faBook,
  faLifeRing,
  faInfoCircle,
  faQuestionCircle,
  faChevronRight,
  faPhone,
  faUsers,
  faChevronDown,
  faChevronUp,
  faRefresh,
  faBug,
  faWrench,
  faKeyboard,
  faExclamationTriangle,
  faEdit,
  faTrash,
  faUpload,
  faPlus,
  faSave,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import AttachmentViewer from '../components/invoices/AttachmentViewer';
import ConfirmDialog from '../components/ConfirmDialog';
import { listManuals, downloadManual, uploadManual, deleteManual } from '../services/api25manuals';

// =============================================================================
// ANIMATIONS
// =============================================================================

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

const infoCtaColorPulse = keyframes`
  0% {
    color: #ffffff;
    text-shadow: 0 0 0 rgba(250, 204, 21, 0);
  }
  50% {
    color: #facc15; /* sytě žlutá */
    text-shadow: 0 0 12px rgba(250, 204, 21, 0.65);
  }
  100% {
    color: #ffffff;
    text-shadow: 0 0 0 rgba(250, 204, 21, 0);
  }
`;

const infoCtaFloat = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
  100% { transform: translateY(0); }
`;

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
  position: relative;
  z-index: 1;

  @media (min-width: 1400px) {
    padding: 2rem 3rem;
  }

  @media (min-width: 1800px) {
    padding: 2rem 4rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: none;
  margin: 0 auto;
`;

const ProfileCard = styled.div`
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: none;
  margin-bottom: 2rem;
  animation: ${slideInUp} 0.6s ease-out 0.1s both;
  overflow: hidden;
`;

const ProfileHeader = styled.div`
  color: #ffffff;
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 2rem;
  row-gap: 1rem;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
  }
`;

const HeaderTop = styled.div`
  /* Wrapper v JSX; layout řídí grid v ProfileHeader */
  display: contents;
`;

const HeaderTitle = styled.div`
  grid-column: 1;
  grid-row: 1;
`;

const PageTitle = styled.h1`
  margin: 0;
  color: #ffffff;
  font-size: 2.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PageSubtitle = styled.p`
  margin: 0.5rem 0 0 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
`;

const HeaderActions = styled.div`
  grid-column: 1;
  grid-row: 2;
  align-self: end;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const InfoDialogButton = styled.button`
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  font-size: 0.95rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);

  &:hover {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.55);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }

  /* Wrapper pro synchronní pohyb ikony + textu */
  .cta-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    will-change: transform;
    animation: ${infoCtaFloat} 1.8s ease-in-out infinite;
  }

  /* Jemné zvýraznění CTA – barva/text-shadow (bez pohybu) */
  .cta-label,
  .cta-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    animation: ${infoCtaColorPulse} 1.8s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .cta-wrap,
    .cta-label,
    .cta-icon {
      animation: none;
    }
  }
`;

const ContactBox = styled.div`
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: start;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  min-width: 280px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    min-width: auto;
    width: 100%;
    margin-top: 1rem;
  }
`;

const ContactTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    font-size: 0.875rem;
  }
`;

const ContactPerson = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  &:not(:last-child) {
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

const PersonName = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.01em;
`;

const PersonPhone = styled.a`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s ease;
  
  &:hover {
    color: #ffffff;
    text-decoration: underline;
  }
  
  svg {
    font-size: 0.75rem;
  }
`;

const ContactFooter = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  
  a {
    color: rgba(255, 255, 255, 0.9);
    text-decoration: underline;
    transition: color 0.2s ease;
    
    &:hover {
      color: #ffffff;
    }
  }
`;

const IntroSection = styled.div`
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-left: 4px solid #3b82f6;
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  animation: ${slideInUp} 0.6s ease-out 0.2s both;
`;

const IntroText = styled.p`
  margin: 0;
  color: #1e3a8a;
  font-size: 1.05rem;
  line-height: 1.6;
  letter-spacing: 0.01em;
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  color: #1e293b;
  margin: 2rem 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  letter-spacing: -0.01em;
  animation: ${slideInUp} 0.6s ease-out 0.3s both;

  svg {
    color: #3b82f6;
    font-size: 1.5rem;
  }
`;

const SectionTitleWithAdmin = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  color: #1e293b;
  margin: 2rem 0 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  letter-spacing: -0.01em;
  animation: ${slideInUp} 0.6s ease-out 0.3s both;

  .title-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  svg {
    color: #3b82f6;
    font-size: 1.5rem;
  }
`;

const AdminButton = styled.button`
  background: ${props => props.$active ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${props => props.$active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
  }

  svg {
    font-size: 1rem;
  }
`;

const UploadCard = styled.div`
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px dashed #3b82f6;
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: center;
  min-height: 300px;
  justify-content: center;
  align-items: center;

  &:hover {
    border-color: #2563eb;
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);

    div:first-child {
      transform: scale(1.1);
    }
  }

  &.dragover {
    border-color: #16a34a;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  }
`;

const UploadIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  svg {
    font-size: 2rem;
    color: white;
  }
`;

const UploadText = styled.div`
  color: #1e40af;
  font-weight: 600;
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
`;

const UploadSubtext = styled.div`
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const DeleteButton = styled.button`
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  }

  svg {
    font-size: 1rem;
  }
`;

const ManualsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
  animation: ${slideInUp} 0.6s ease-out 0.4s both;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ManualCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.75rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s ease;
  }

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);

    &::before {
      transform: scaleY(1);
      transform-origin: top;
    }

    .manual-icon {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      transform: scale(1.1) rotate(-5deg);

      svg {
        color: white;
      }
    }
  }
`;

const ManualHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const ManualIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;

  svg {
    font-size: 1.75rem;
    color: #1e40af;
    transition: color 0.3s ease;
  }
`;

const ManualSizeBox = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  .size-label {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  
  .size-value {
    font-size: 1rem;
    color: #475569;
    font-weight: 600;
  }
`;

const ManualTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.01em;
`;

const ManualDescription = styled.p`
  font-size: 0.95rem;
  color: #64748b;
  margin: 0 0 1.25rem 0;
  line-height: 1.5;
  letter-spacing: 0.01em;
  flex: 1;
`;

const ManualActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
`;

const ActionButton = styled.button`
  background: ${props => props.$primary 
    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
    : '#f1f5f9'};
  color: ${props => props.$primary ? 'white' : '#64748b'};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: ${props => props.$primary 
    ? '0 2px 8px rgba(59, 130, 246, 0.2)' 
    : 'none'};

  svg {
    font-size: 1rem;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.$primary 
      ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
      : '0 2px 6px rgba(0, 0, 0, 0.1)'};
    background: ${props => props.$primary 
      ? 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' 
      : '#e2e8f0'};
  }

  &:active {
    transform: translateY(0);
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #64748b;
  gap: 1rem;
`;

const ErrorState = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 2rem;
  color: #991b1b;
  text-align: center;
  margin: 2rem 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #94a3b8;

  svg {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: #64748b;
  }

  p {
    margin: 0;
    font-size: 1rem;
  }
`;

const QuickLinksSection = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 2rem;
  margin-top: 3rem;
  border: 1px solid #e2e8f0;
`;

const QuickLinksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`;

const QuickLinkCard = styled.a`
  background: white;
  padding: 1.25rem;
  border-radius: 10px;
  text-decoration: none;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};

  svg {
    color: ${props => props.$disabled ? '#9ca3af' : '#3b82f6'};
    font-size: 1.5rem;
    transition: transform 0.2s ease;
  }

  &:hover {
    transform: ${props => props.$disabled ? 'none' : 'translateX(4px)'};
    box-shadow: ${props => props.$disabled ? '0 1px 3px rgba(0, 0, 0, 0.05)' : '0 4px 12px rgba(59, 130, 246, 0.15)'};
    border-color: ${props => props.$disabled ? '#e2e8f0' : '#3b82f6'};

    svg {
      transform: ${props => props.$disabled ? 'none' : 'scale(1.1)'};
    }
  }
`;

const QuickLinkText = styled.div`
  flex: 1;

  h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: #64748b;
  }
`;

const FaqSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-top: 3rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const FaqItem = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  }
`;

const FaqQuestion = styled.button`
  width: 100%;
  padding: 1.25rem;
  background: ${props => props.$expanded ? '#f8fafc' : 'white'};
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f8fafc;
  }
  
  svg {
    color: #3b82f6;
    transition: transform 0.2s ease;
    transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const FaqAnswer = styled.div`
  padding: ${props => props.$expanded ? '0 1.25rem 1.25rem 1.25rem' : '0'};
  max-height: ${props => props.$expanded ? '500px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
  
  p {
    margin: 0;
    line-height: 1.6;
    color: #4b5563;
    
    &:not(:last-child) {
      margin-bottom: 1rem;
    }
  }
  
  strong {
    color: #1e293b;
    font-weight: 600;
  }
  
  kbd {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 0.125rem 0.375rem;
    font-family: monospace;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  }
`;

// =============================================================================
// COMPONENT
// =============================================================================

const HelpPage = () => {
  const { token, username, hasAdminRole } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext) || {};
  const [manuals, setManuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // State pro ConfirmDialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manualToDelete, setManualToDelete] = useState(null);

  // Otevřít informační dialog (stejný jako post-login modal) z nápovědy
  const handleOpenInfoDialog = async () => {
    try {
      if (!token || !username) {
        showToast?.('Nejste přihlášen(a) - nelze načíst obsah dialogu.', { type: 'error' });
        return;
      }

      const { getGlobalSettingsForDisplay } = await import('../services/globalSettingsApi');
      const globalSettings = await getGlobalSettingsForDisplay(token, username);

      // Kompatibilita: někde je hodnota přímo, někde jako objekt {hodnota}
      const getSettingValue = (key, defaultValue = null) => {
        const setting = globalSettings?.[key];
        if (setting && typeof setting === 'object' && 'hodnota' in setting) {
          return setting.hodnota;
        }
        return (setting ?? defaultValue);
      };

      const title = getSettingValue('post_login_modal_title', 'Informace') || 'Informace';
      const htmlContent = getSettingValue('post_login_modal_content', '') || '';

      if (!String(htmlContent || '').trim()) {
        showToast?.('Informační dialog nemá nastavený obsah.', { type: 'warning' });
        return;
      }

      const modalConfig = {
        // Důležité: App.js otevírá modal jen když enabled=true
        enabled: true,
        title,
        htmlContent,
        validFrom: getSettingValue('post_login_modal_valid_from', null) || null,
        validTo: getSettingValue('post_login_modal_valid_to', null) || null,
        modalGuid: getSettingValue('post_login_modal_guid', null) || null,
        messageId: getSettingValue('post_login_modal_message_id', null) || null,
        openedFrom: 'help'
      };

      window.dispatchEvent(new CustomEvent('show-post-login-modal', { detail: modalConfig }));
    } catch (e) {
      console.error('Chyba při otevírání info dialogu z nápovědy:', e);
      showToast?.('Nepodařilo se načíst informační dialog.', { type: 'error' });
    }
  };

  // Načtení seznamu manuálů (jako samostatná funkce pro re-použití)
  const loadManuals = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await listManuals(token, username);
      
      if (response.status === 'success') {
        setManuals(response.data || []);
      } else {
        throw new Error(response.message || 'Nepodařilo se načíst seznam manuálů');
      }
    } catch (err) {
      console.error('Error loading manuals:', err);
      setError(err.message || 'Chyba při načítání manuálů');
      if (showToast) {
        showToast('Nepodařilo se načíst seznam manuálů', { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Načtení seznamu manuálů při mount
  useEffect(() => {
    if (token && username) {
      loadManuals();
    }
  }, [token, username]);

  // Otevření PDF v prohlížeči
  const handleViewPdf = async (manual) => {
    try {
      const blob = await downloadManual(manual.filename, token, username);
      const url = URL.createObjectURL(blob);
      
      setSelectedPdf({
        blobUrl: url,  // AttachmentViewer očekává blobUrl, ne url
        filename: manual.title || manual.filename,
        fileType: 'pdf'  // Explicitně označit jako PDF
      });
    } catch (err) {
      console.error('Error viewing PDF:', err);
      if (showToast) {
        showToast('Nepodařilo se otevřít PDF', { type: 'error' });
      }
    }
  };

  // Stažení PDF
  const handleDownloadPdf = async (manual) => {
    try {
      const blob = await downloadManual(manual.filename, token, username);
      
      // Vytvoření URL z blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = manual.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Uvolnění URL objektu
      URL.revokeObjectURL(url);

      if (showToast) {
        showToast(`Stahování: ${manual.title || manual.filename}`, { type: 'info' });
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      if (showToast) {
        showToast('Nepodařilo se stáhnout PDF', { type: 'error' });
      }
    }
  };

  // Formátování velikosti souboru
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Získání popisu podle názvu souboru
  const getManualDescription = (filename) => {
    const descriptions = {
      'Jak poprvé pracovat s Pokladnou.pdf': 'Komplexní průvodce pro správu pokladní knihy, vedení příjmů a výdajů.',
      'Návod pro první spuštění.pdf': 'První kroky v systému EEO v2, nastavení účtu a základní orientace.',
      'Uživatelský manuál EEO 2.0.pdf': 'Detailní návod pro práci se systémem EEO v2.'
    };
    return descriptions[filename] || 'Detailní návod pro práci se systémem EEO v2.';
  };

  // Toggle FAQ expansion
  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Admin funkce - smazat manuál
  const handleDeleteManual = (manual) => {
    setManualToDelete(manual);
    setDeleteDialogOpen(true);
  };

  // Potvrzení smazání manuálu
  const confirmDeleteManual = async () => {
    if (!manualToDelete) return;

    try {
      const response = await deleteManual(manualToDelete.filename, token, username);
      
      if (response.success) {
        if (showToast) {
          showToast(`Manuál "${manualToDelete.title || manualToDelete.filename}" byl smazán`, { type: 'success' });
        }
        // Re-load seznamu manuálů
        await loadManuals();
      } else {
        throw new Error(response.error || 'Nepodařilo se smazat manuál');
      }
    } catch (err) {
      console.error('Error deleting manual:', err);
      if (showToast) {
        showToast(err.response?.data?.error || err.message || 'Nepodařilo se smazat manuál', { type: 'error' });
      }
    } finally {
      setDeleteDialogOpen(false);
      setManualToDelete(null);
    }
  };

  // Admin funkce - upload manuálu
  const handleUploadManual = async (file) => {
    // Validace - pouze PDF
    if (file.type !== 'application/pdf') {
      if (showToast) {
        showToast('Pouze PDF soubory jsou podporovány', { type: 'error' });
      }
      return;
    }

    // Validace velikosti (max 50 MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      if (showToast) {
        showToast('Soubor je příliš velký (max 50 MB)', { type: 'error' });
      }
      return;
    }

    try {
      setUploading(true);
      
      const response = await uploadManual(file, token, username);
      
      if (response.success) {
        if (showToast) {
          showToast(`Manuál "${file.name}" byl nahrán`, { type: 'success' });
        }
        // Re-load seznamu manuálů
        await loadManuals();
      } else {
        throw new Error(response.error || 'Nepodařilo se nahrát manuál');
      }
    } catch (err) {
      console.error('Error uploading manual:', err);
      if (showToast) {
        showToast(err.response?.data?.error || err.message || 'Nepodařilo se nahrát manuál', { type: 'error' });
      }
    } finally {
      setUploading(false);
    }
  };

  // Drag & drop handling
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Odstranit dragover třídu
    if (e.currentTarget) {
      e.currentTarget.classList.remove('dragover');
    }
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    // Osetřit případ, kdy uživatel nahraje obrázky místo PDF
    const nonPdfFiles = files.filter(file => file.type !== 'application/pdf');
    
    if (nonPdfFiles.length > 0 && pdfFiles.length === 0) {
      if (showToast) {
        showToast('Pouze PDF soubory jsou podporovány', { type: 'error' });
      }
      return;
    }
    
    if (nonPdfFiles.length > 0) {
      if (showToast) {
        showToast(`${nonPdfFiles.length} soubor(ů) bylo ignorováno - podporovány jsou pouze PDF`, { type: 'warning' });
      }
    }
    
    // Nahrát pouze validní PDF soubory
    pdfFiles.forEach(file => handleUploadManual(file));
  };

  // Je uživatel admin?
  const isAdmin = hasAdminRole();

  return (
    <PageContainer>
      <ContentWrapper>
        {/* Hlavní banner nápovědy */}
        <ProfileCard>
          <ProfileHeader>
            <HeaderTop>
              <HeaderTitle>
                <PageTitle>
                  <FontAwesomeIcon icon={faLifeRing} />
                  Nápověda a dokumentace
                </PageTitle>
                <PageSubtitle>
                  Kompletní manuály a návody pro efektivní práci se systémem <strong>EEO</strong><br />
                  Správy a workflow objednávek (<strong>E</strong>lektronická <strong>E</strong>vidence <strong>O</strong>bjednávek)
                </PageSubtitle>
              </HeaderTitle>
              <ContactBox>
                <ContactTitle>
                  <FontAwesomeIcon icon={faUsers} />
                  Nevíte si rady, zavolejte
                </ContactTitle>
                <ContactPerson>
                  <PersonName>Robert Holovský</PersonName>
                  <PersonPhone href="tel:+420731137077">
                    <FontAwesomeIcon icon={faPhone} />
                    +420 731 137 077
                  </PersonPhone>
                </ContactPerson>
                <ContactPerson>
                  <PersonName>Tereza Bezouškova</PersonName>
                  <PersonPhone href="tel:+420734673568">
                    <FontAwesomeIcon icon={faPhone} />
                    +420 734 673 568
                  </PersonPhone>
                </ContactPerson>
              </ContactBox>
            </HeaderTop>

            {/* Akce v hlavičce – dole pod horním řádkem */}
            <HeaderActions>
              <InfoDialogButton
                type="button"
                onClick={handleOpenInfoDialog}
                title="Otevře informační dialog (stejný jako po přihlášení)"
              >
                <span className="cta-wrap">
                  <span className="cta-icon"><FontAwesomeIcon icon={faInfoCircle} /></span>
                  <span className="cta-label">Zobrazit informační dialog</span>
                </span>
              </InfoDialogButton>
            </HeaderActions>
          </ProfileHeader>
        </ProfileCard>

      <IntroSection>
        <IntroText>
          Vítejte v sekci nápovědy! Zde naleznete podrobné návody a dokumentaci, 
          které vám pomohou s maximálním využitím všech funkcí systému <strong>EEO</strong>. 
          Můžete si manuály prohlédnout přímo v prohlížeči nebo stáhnout pro pozdější použití.
          <br /><br />
          💡 <strong>Tip:</strong> Tuto stránku můžete nastavit jako výchozí po přihlášení v{' '}
          <a href="/profile" style={{ color: '#1e40af', fontWeight: 600, textDecoration: 'underline' }}>
            nastavení uživatele → Výchozí sekce po přihlášení
          </a>.
        </IntroText>
      </IntroSection>

      <SectionTitleWithAdmin>
        <div className="title-content">
          <FontAwesomeIcon icon={faBook} />
          Dostupné manuály
        </div>
        {isAdmin && (
          <AdminButton 
            $active={isAdminMode}
            onClick={() => setIsAdminMode(!isAdminMode)}
          >
            {isAdminMode ? 'Ukončit úpravy' : 'Upravit'}
          </AdminButton>
        )}
      </SectionTitleWithAdmin>

      {loading && (
        <LoadingState>
          <FontAwesomeIcon icon={faBook} size="3x" spin />
          <p>Načítání manuálů...</p>
        </LoadingState>
      )}

      {error && (
        <ErrorState>
          <FontAwesomeIcon icon={faQuestionCircle} size="2x" />
          <h3>Chyba načítání</h3>
          <p>{error}</p>
        </ErrorState>
      )}

      {!loading && !error && manuals.length === 0 && (
        <EmptyState>
          <FontAwesomeIcon icon={faFileAlt} />
          <h3>Žádné manuály</h3>
          <p>V současnosti nejsou k dispozici žádné manuály.</p>
        </EmptyState>
      )}

      {!loading && !error && (
        <ManualsGrid>
          {/* Admin upload card */}
          {isAdmin && isAdminMode && (
            <UploadCard
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) handleUploadManual(file);
                };
                input.click();
              }}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('dragover');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('dragover');
              }}
            >
              <UploadIcon>
                <FontAwesomeIcon icon={uploading ? faRefresh : faPlus} spin={uploading} />
              </UploadIcon>
              <UploadText>
                {uploading ? 'Nahrávám...' : 'Přidat nový manuál'}
              </UploadText>
              <UploadSubtext>
                Klikněte nebo přetáhněte PDF soubor
              </UploadSubtext>
            </UploadCard>
          )}
          
          {manuals.map((manual, index) => (
            <ManualCard key={index}>
              <ManualHeader>
                <ManualIcon className="manual-icon">
                  <FontAwesomeIcon icon={faFilePdf} />
                </ManualIcon>
                <ManualSizeBox>
                  <div className="size-label">Velikost</div>
                  <div className="size-value">{manual.size_formatted || formatFileSize(manual.size)}</div>
                </ManualSizeBox>
              </ManualHeader>
              <ManualTitle>{manual.title || manual.filename}</ManualTitle>
              <ManualDescription>
                {manual.description || getManualDescription(manual.filename)}
              </ManualDescription>
              <ManualActions>
                {!isAdminMode ? (
                  <>
                    <ActionButton 
                      $primary 
                      onClick={() => handleViewPdf(manual)}
                      title="Zobrazit PDF v prohlížeči"
                    >
                      <FontAwesomeIcon icon={faEye} />
                      Zobrazit
                    </ActionButton>
                    <ActionButton 
                      onClick={() => handleDownloadPdf(manual)}
                      title="Stáhnout PDF"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      Stáhnout
                    </ActionButton>
                  </>
                ) : (
                  <DeleteButton 
                    onClick={() => handleDeleteManual(manual)}
                    title="Smazat manuál"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Smazat
                  </DeleteButton>
                )}
              </ManualActions>
            </ManualCard>
          ))}
        </ManualsGrid>
      )}

      <FaqSection>
        <SectionTitle>
          <FontAwesomeIcon icon={faQuestionCircle} />
          Nejčastější otázky a problémy
        </SectionTitle>
        
        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 0} 
            onClick={() => toggleFaq(0)}
          >
            🔍 Nevidím svou objednávku nebo fakturu
            <FontAwesomeIcon icon={expandedFaq === 0 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 0}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#334155' }}>
                <strong style={{ color: '#0f172a' }}>Nejčastější příčinou jsou aktivní filtry.</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎯</span>
                  <span style={{ color: '#64748b' }}>V přehledu objednávek → klikněte na <strong style={{ color: '#dc2626' }}>Zrušit filtr</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎯</span>
                  <span style={{ color: '#64748b' }}>V přehledu faktur → klikněte na <strong style={{ color: '#dc2626' }}>Zrušit filtr</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🔎</span>
                  <span style={{ color: '#64748b' }}>Použijte globální vyhledávání pro konkrétní objednávku</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '0.875rem', backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '6px' }}>
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>💡 Tip:</strong>
              <span style={{ color: '#78350f', fontSize: '0.95rem', marginLeft: '0.5rem' }}>
                První věc, kterou vyzkoušejte, je vždy smazání všech filtrů!
              </span>
            </div>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 1} 
            onClick={() => toggleFaq(1)}
          >
            🔄 EEO nereaguje nebo je stránka prázdná
            <FontAwesomeIcon icon={expandedFaq === 1 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 1}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: '600' }}>
                Vyzkoušejte obnovení stránky:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <kbd style={{ padding: '0.375rem 0.625rem', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>F5</kbd>
                  <span style={{ color: '#475569', fontSize: '0.9rem' }}>Základní obnovení stránky</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <kbd style={{ padding: '0.375rem 0.625rem', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Ctrl+Shift+R</kbd>
                  <span style={{ color: '#475569', fontSize: '0.9rem' }}>Úplné obnovení s vyčištěním cache</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '0.875rem', backgroundColor: '#dbeafe', borderLeft: '4px solid #3b82f6', borderRadius: '6px' }}>
              <strong style={{ color: '#1e40af', fontSize: '0.95rem' }}>ℹ️ Info:</strong>
              <span style={{ color: '#1e3a8a', fontSize: '0.95rem', marginLeft: '0.5rem' }}>
                Úplné obnovení vyřeší většinu problémů s načítáním nebo zobrazením.
              </span>
            </div>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 2} 
            onClick={() => toggleFaq(2)}
          >
            ⚠️ Nelze uložit objednávku nebo fakturu
            <FontAwesomeIcon icon={expandedFaq === 2 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 2}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: '600' }}>
                Postupujte následovně:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold', color: '#3b82f6', minWidth: '1.5rem' }}>1.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', fontWeight: '600' }}>Zkontrolujte povinná pole</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>Označena červenou hvězdičkou <span style={{ color: '#dc2626' }}>*</span></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold', color: '#3b82f6', minWidth: '1.5rem' }}>2.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', fontWeight: '600' }}>Obnovte stránku</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>Stiskněte <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', fontSize: '0.8rem' }}>F5</kbd></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold', color: '#3b82f6', minWidth: '1.5rem' }}>3.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', fontWeight: '600' }}>Zavřete a znovu otevřete formulář</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>Někdy pomůže "čerstvý start"</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '0.875rem', backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', borderRadius: '6px' }}>
              <strong style={{ color: '#991b1b', fontSize: '0.95rem' }}>⚠️ Stále problém?</strong>
              <span style={{ color: '#7f1d1d', fontSize: '0.95rem', marginLeft: '0.5rem' }}>
                Kontaktujte IT podporu a popište chybové hlášení.
              </span>
            </div>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 3} 
            onClick={() => toggleFaq(3)}
          >
            ⭐ Jak přidat EEO do oblíbených v prohlížeči?
            <FontAwesomeIcon icon={expandedFaq === 3 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 3}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: '600' }}>
                Podle vašeho prohlížeče:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🔷</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Chrome / Edge</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    Klikněte na <strong>★</strong> hvězdičku vpravo nahoře v adresním řádku<br />
                    Nebo stiskněte <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px' }}>Ctrl+D</kbd>
                  </div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🦊</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Firefox</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    Klikněte na <strong>★</strong> hvězdičku v adresním řádku<br />
                    Nebo stiskněte <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px' }}>Ctrl+D</kbd>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '0.875rem', backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '6px' }}>
              <strong style={{ color: '#166534', fontSize: '0.95rem' }}>✅ Doporučení:</strong>
              <span style={{ color: '#14532d', fontSize: '0.95rem', marginLeft: '0.5rem' }}>
                Pro rychlý přístup si vytvořte záložku nebo PIN na hlavní panel prohlížeče.
              </span>
            </div>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 4} 
            onClick={() => toggleFaq(4)}
          >
            📱 Jak nainstalovat EEO jako aplikaci (PWA)?
            <FontAwesomeIcon icon={expandedFaq === 4 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 4}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: '600' }}>
                EEO můžete nainstalovat jako samostatnou aplikaci:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>💻</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Na počítači (Chrome/Edge)</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    1. Klikněte na ikonu <strong>⊕</strong> (instalovat) v adresním řádku vpravo<br />
                    2. Nebo v menu (⋮) → "Nainstalovat EEO"<br />
                    3. Potvrďte instalaci
                  </div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📱</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Na mobilu (Android)</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    1. Otevřete menu (⋮) → "Přidat na plochu"<br />
                    2. Nebo klikněte na vyskakovací banner "Nainstalovat aplikaci"<br />
                    3. Ikona se objeví na domovské obrazovce
                  </div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🍎</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Na iPhone/iPad (Safari)</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    1. Klikněte na tlačítko "Sdílet" <strong>⎙</strong> (dole uprostřed)<br />
                    2. Vyberte "Přidat na plochu"<br />
                    3. Potvrďte název a klikněte "Přidat"
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '0.875rem', backgroundColor: '#ede9fe', borderLeft: '4px solid #a855f7', borderRadius: '6px' }}>
              <strong style={{ color: '#6b21a8', fontSize: '0.95rem' }}>🚀 Výhody PWA:</strong>
              <span style={{ color: '#581c87', fontSize: '0.95rem', marginLeft: '0.5rem' }}>
                Rychlejší spuštění, ikona na ploše, funguje i offline (částečně).
              </span>
            </div>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 5} 
            onClick={() => toggleFaq(5)}
          >
            📎 Jak nahrát přílohu?
            <FontAwesomeIcon icon={expandedFaq === 5 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 5}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📄</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Pro objednávky</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    Detail objednávky → sekce "Přílohy" → "Nahrát přílohu"<br />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(nebo přetáhněte soubor myší)</span>
                  </div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🧾</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Pro faktury</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                    Detail objednávky → záložka "Faktury" → detail faktury → nahrát přílohu
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '0.875rem', backgroundColor: '#f1f5f9', borderLeft: '4px solid #64748b', borderRadius: '6px' }}>
              <strong style={{ color: '#334155', fontSize: '0.95rem' }}>📋 Podporované formáty:</strong>
              <span style={{ color: '#475569', fontSize: '0.95rem', marginLeft: '0.5rem' }}>
                PDF, JPG, PNG, ISDOC (max. 10 MB)
              </span>
            </div>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 6} 
            onClick={() => toggleFaq(6)}
          >
            🔑 Zapomněl jsem heslo
            <FontAwesomeIcon icon={expandedFaq === 6 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 6}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#334155' }}>
                Pokud jste zapomněli heslo, kontaktujte prosím IT podporu.
              </p>
              <div style={{ padding: '0.875rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>📞</span>
                  <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Kontakt na IT podporu</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.6' }}>
                  IT podpora vám pomůže s resetováním hesla a zřízením nového přístupu.
                </div>
              </div>
            </div>
            <div style={{ padding: '0.875rem', backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '6px' }}>
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>💡 Tip:</strong>
              <span style={{ color: '#78350f', fontSize: '0.95rem', marginLeft: '0.5rem' }}>
                Pro rychlejší vyřízení mějte připravené své uživatelské jméno nebo email.
              </span>
            </div>
          </FaqAnswer>
        </FaqItem>
      </FaqSection>

      {/* PDF Viewer */}
      {selectedPdf && (
        <AttachmentViewer
          attachment={selectedPdf}
          onClose={() => {
            // Uvolnění URL objektu při zavření
            if (selectedPdf.blobUrl) {
              URL.revokeObjectURL(selectedPdf.blobUrl);
            }
            setSelectedPdf(null);
          }}
        />
      )}

      {/* Confirm Dialog pro smazání manuálu */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setManualToDelete(null);
        }}
        onConfirm={confirmDeleteManual}
        title="Smazat manuál"
        message={
          <>
            <p>Opravdu chcete smazat manuál <strong>"{manualToDelete?.title || manualToDelete?.filename}"</strong>?</p>
            <p style={{ marginTop: '0.5rem', color: '#dc2626', fontWeight: 600 }}>
              ⚠️ Tato akce je nevratná!
            </p>
          </>
        }
        icon={faTrash}
        variant="danger"
        confirmText="Smazat"
        cancelText="Zrušit"
      />
      </ContentWrapper>
    </PageContainer>
  );
};

export default HelpPage;
