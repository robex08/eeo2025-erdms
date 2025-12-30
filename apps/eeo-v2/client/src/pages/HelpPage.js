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
import { listManuals, downloadManual } from '../services/api25manuals';

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
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
  gap: 2rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const HeaderTitle = styled.div`
  flex: 1;
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

const ContactBox = styled.div`
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

  // Načtení seznamu manuálů
  useEffect(() => {
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

    if (token && username) {
      loadManuals();
    }
  }, [token, username, showToast]);

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
  const handleDeleteManual = async (manual) => {
    if (!window.confirm(`Opravdu chcete smazat manuál "${manual.title || manual.filename}"?`)) {
      return;
    }

    try {
      // TODO: Implementovat delete API endpoint
      console.log('Deleting manual:', manual.filename);
      if (showToast) {
        showToast('Manuál byl smazán', { type: 'success' });
      }
      // Re-load manuals
      // loadManuals();
    } catch (err) {
      console.error('Error deleting manual:', err);
      if (showToast) {
        showToast('Nepodařilo se smazat manuál', { type: 'error' });
      }
    }
  };

  // Admin funkce - upload manuálu
  const handleUploadManual = async (file) => {
    try {
      setUploading(true);
      // TODO: Implementovat upload API endpoint
      console.log('Uploading manual:', file.name);
      
      if (showToast) {
        showToast(`Manuál "${file.name}" byl nahrán`, { type: 'success' });
      }
      // Re-load manuals
      // loadManuals();
    } catch (err) {
      console.error('Error uploading manual:', err);
      if (showToast) {
        showToast('Nepodařilo se nahrát manuál', { type: 'error' });
      }
    } finally {
      setUploading(false);
    }
  };

  // Drag & drop handling
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      if (showToast) {
        showToast('Pouze PDF soubory jsou podporovány', { type: 'error' });
      }
      return;
    }
    
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
          Časté dotazy
        </SectionTitle>
        
        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 0} 
            onClick={() => toggleFaq(0)}
          >
            Aplikace se chová podezřele nebo nereaguje správně
            <FontAwesomeIcon icon={expandedFaq === 0 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 0}>
            <p>Pokud aplikace nereaguje správně, nejdříve zkuste <strong>obnovit stránku</strong>:</p>
            <p>• Stiskněte <kbd>F5</kbd> pro základní obnovení<br />
            • Stiskněte <kbd>Ctrl+Shift+R</kbd> pro úplné obnovení s vyčištěním cache</p>
            <p>Toto řeší většinu problémů s načítáním dat nebo zobrazením stránek.</p>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 1} 
            onClick={() => toggleFaq(1)}
          >
            Formulář objednávky se chová nekorektně
            <FontAwesomeIcon icon={expandedFaq === 1 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 1}>
            <p>Pokud máte problémy s formulářem objednávky (nenačítá se, nejdou uložit data, chybí pole):</p>
            <p><strong>1.</strong> Zavřete aktuální formulář kliknutím na tlačítko ZAVŘÍT<br />
            <strong>2.</strong> Vraťte se zpět na seznam objednávek<br />
            <strong>3.</strong> Znovu otevřete objednávku</p>
            <p>Toto resetuje stav formuláře a obvykle vyřeší problémy s načítáním nebo uložením dat.</p>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 2} 
            onClick={() => toggleFaq(2)}
          >
            Nelze uložit změny v objednávce
            <FontAwesomeIcon icon={expandedFaq === 2 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 2}>
            <p>Pokud se vám nedaří uložit změny:</p>
            <p><strong>1.</strong> Zkontrolujte, zda jsou vyplněna všechna povinná pole (označená červenou hvězdičkou)<br />
            <strong>2.</strong> Zkontrolujte, zda máte oprávnění k úpravám této objednávky<br />
            <strong>3.</strong> Zkuste obnovit stránku a změny zadejte znovu</p>
            <p>Pokud problém přetrvává, kontaktujte nás na tím podpory.</p>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 3} 
            onClick={() => toggleFaq(3)}
          >
            Nevidím objednávky nebo faktury
            <FontAwesomeIcon icon={expandedFaq === 3 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 3}>
            <p>Pokud nevidíte očekávané objednávky nebo faktury:</p>
            <p><strong>1.</strong> Zkontrolujte nastavení filtrů (datum, stav, organizace)<br />
            <strong>2.</strong> Klikněte na červené tlačítko "Vymazat filtry" - často to vyřeší problém<br />
            <strong>3.</strong> Zkontrolujte, zda jste přihlášeni pod správným účtem<br />
            <strong>4.</strong> Zkuste vyhledat podle čísla objednávky v globálním vyhledávání</p>
            <p>Můžete vidět pouze objednávky, ke kterým máte přístup na základě vašich oprávnění a organizace.</p>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 4} 
            onClick={() => toggleFaq(4)}
          >
            Jak nahrát přílohu k objednávce nebo faktuře?
            <FontAwesomeIcon icon={expandedFaq === 4 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 4}>
            <p><strong>Pro objednávky:</strong></p>
            <p>1. Otevřete detail objednávky<br />
            2. Najděte sekci "Přílohy"<br />
            3. Klikněte na "Nahrát přílohu" nebo přetáhněte soubor do oblasti</p>
            <p><strong>Pro faktury:</strong></p>
            <p>1. V detailu objednávky přejděte na záložku "Faktury"<br />
            2. Otevřete detail faktury<br />
            3. Nahrávejte přílohy stejným způsobem</p>
            <p><strong>Podporované formáty:</strong> PDF, JPG, PNG, ISDOC (max. 10 MB)</p>
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion 
            $expanded={expandedFaq === 5} 
            onClick={() => toggleFaq(5)}
          >
            Zapomněl jsem heslo nebo nejde přihlášení
            <FontAwesomeIcon icon={expandedFaq === 5 ? faChevronUp : faChevronDown} />
          </FaqQuestion>
          <FaqAnswer $expanded={expandedFaq === 5}>
            <p>Přihlášení do systému EEO probíhá prostřednictvím <strong>Microsoft Azure</strong>. Používejte stejné přihlašovací údaje jako pro ostatní pracovní aplikace.</p>
            <p>Pokud jste zapomněli heslo:</p>
            <p>1. Klikněte na "Zapomněl jsem heslo" na přihlašovací stránce<br />
            2. Postupujte podle pokynů pro obnovení<br />
            3. Nebo kontaktujte IT podporu</p>
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
      </ContentWrapper>
    </PageContainer>
  );
};

export default HelpPage;
