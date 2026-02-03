/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInfoCircle,
  faBox,
  faFileInvoice,
  faPaperclip,
  faProjectDiagram,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faFileAlt,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFileImage,
  faFileArchive,
  faFile,
  faDownload,
  faSync,
  faFilePen,
  faClock,
  faShield,
  faFileContract,
  faTruck,
  faXmark,
  faCircleNotch,
  faHourglassHalf
} from '@fortawesome/free-solid-svg-icons';

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
`;

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const ExpandedRow = styled.tr`
  animation: ${fadeIn} 0.2s ease-out;
`;

const ExpandedCell = styled.td`
  padding: 0 !important;
  background: #f9fafb;
  border-top: 2px solid #e5e7eb;
  border-bottom: 2px solid #000000;
`;

const ExpandedContent = styled.div`
  padding: 1rem;
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);

  &:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 0.875rem;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 0.875rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
`;

const CardTitle = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #3b82f6;
    font-size: 0.875rem;
  }
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0 1rem;
  align-items: start;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.4;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.div`
  font-weight: 500;
  color: #64748b;
`;

const InfoValue = styled.div`
  color: #1e293b;
  word-break: break-word;

  &.empty {
    color: #94a3b8;
    font-style: italic;
  }

  &.highlight {
    font-weight: 600;
    color: #1e40af;
  }

  &.currency {
    font-weight: 600;
    color: #059669;
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    const colors = {
      NOVA: 'rgba(219, 234, 254, 0.4)',
      ODESLANA_KE_SCHVALENI: 'rgba(254, 226, 226, 0.4)',
      SCHVALENA: 'rgba(254, 215, 170, 0.4)',
      ZAMITNUTA: 'rgba(229, 231, 235, 0.4)',
      ROZPRACOVANA: 'rgba(254, 243, 199, 0.4)',
      ODESLANA: 'rgba(224, 231, 255, 0.4)',
      POTVRZENA: 'rgba(221, 214, 254, 0.4)',
      K_UVEREJNENI_DO_REGISTRU: 'rgba(204, 251, 241, 0.4)',
      UVEREJNENA: 'rgba(209, 250, 229, 0.4)',
      DOKONCENA: 'rgba(209, 250, 229, 0.4)',
      ZRUSENA: 'rgba(254, 202, 202, 0.4)',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || 'rgba(241, 245, 249, 0.4)';
  }};
  color: ${props => {
    const colors = {
      NOVA: '#1e40af',
      ODESLANA_KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZRUSENA: '#dc2626',
      EMPTY: '#64748b',
    };
    return colors[props.$status] || '#64748b';
  }};
  border: 1.5px solid ${props => {
    const colors = {
      NOVA: '#1e40af',
      ODESLANA_KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZRUSENA: '#dc2626',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || '#94a3b8';
  }};
`;

// Loading States
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.875rem;
  gap: 0.5rem;

  svg {
    animation: ${spin} 1s linear infinite;
  }
`;

const SkeletonLine = styled.div`
  height: ${props => props.$height || '18px'};
  background: linear-gradient(to right, #f1f5f9 0%, #e2e8f0 20%, #f1f5f9 40%, #f1f5f9 100%);
  background-size: 936px 100%;
  animation: ${shimmer} 1.5s linear infinite;
  border-radius: 4px;
  margin-bottom: ${props => props.$marginBottom || '0.5rem'};
`;

// Error State
const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;

  svg {
    flex-shrink: 0;
    font-size: 1.25rem;
  }
`;

const RetryButton = styled.button`
  margin-left: auto;
  padding: 0.375rem 0.75rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #b91c1c;
  }
`;

// Items Table
const ItemsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  margin-top: 0.5rem;
`;

const ItemsTh = styled.th`
  text-align: left;
  padding: 0.5rem;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #475569;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ItemsTd = styled.td`
  padding: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;

  &.numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &.currency {
    font-weight: 500;
    color: #059669;
  }
`;

// Invoices
const InvoiceItem = styled.div`
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InvoiceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const InvoiceNumber = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
`;

const InvoiceAmount = styled.div`
  font-weight: 600;
  color: #059669;
  font-size: 0.875rem;
`;

const InvoiceDetail = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
`;

const InvoiceStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  background: ${props => props.$success ? '#dcfce7' : props.$warning ? '#fef3c7' : '#dbeafe'};
  color: ${props => props.$success ? '#166534' : props.$warning ? '#854d0e' : '#1e40af'};
  border: 1px solid ${props => props.$success ? '#86efac' : props.$warning ? '#fde047' : '#93c5fd'};

  svg {
    font-size: 0.75rem;
  }
`;

const AttachmentTypeBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
`;

// Attachments
const AttachmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const AttachmentItem = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateX(2px);
  }
`;

const AttachmentIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$bg || '#e0e7ff'};
  color: ${props => props.$color || '#3b82f6'};
  border-radius: 6px;
  flex-shrink: 0;
  font-size: 0.875rem;
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AttachmentName = styled.div`
  font-weight: 500;
  font-size: 0.8125rem;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AttachmentMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
`;

const AttachmentDownload = styled.div`
  color: #3b82f6;
  font-size: 0.875rem;
`;

// Workflow Steps
const WorkflowSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const WorkflowStep = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.625rem;
  background: #f8fafc;
  border-left: 3px solid ${props => {
    if (props.$status === 'completed') return '#10b981';
    if (props.$status === 'current') return '#3b82f6';
    if (props.$status === 'rejected') return '#ef4444';
    return '#e5e7eb';
  }};
  border-radius: 4px;
`;

const WorkflowIcon = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${props => {
    if (props.$status === 'completed') return '#d1fae5';
    if (props.$status === 'current') return '#dbeafe';
    if (props.$status === 'rejected') return '#fee2e2';
    return '#f1f5f9';
  }};
  color: ${props => {
    if (props.$status === 'completed') return '#059669';
    if (props.$status === 'current') return '#2563eb';
    if (props.$status === 'rejected') return '#dc2626';
    return '#94a3b8';
  }};
  font-size: 0.75rem;
  flex-shrink: 0;
`;

const WorkflowContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const WorkflowTitle = styled.div`
  font-weight: 500;
  font-size: 0.8125rem;
  color: #1e293b;
`;

const WorkflowMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
`;

const EmptyState = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.8125rem;
  font-style: italic;
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getFileIcon = (fileName) => {
  if (!fileName) return faFile;
  
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (['pdf'].includes(ext)) return faFilePdf;
  if (['doc', 'docx'].includes(ext)) return faFileWord;
  if (['xls', 'xlsx'].includes(ext)) return faFileExcel;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return faFileImage;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return faFileArchive;
  
  return faFileAlt;
};

const getFileIconColor = (fileName) => {
  if (!fileName) return { bg: '#e5e7eb', color: '#64748b' };
  
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (['pdf'].includes(ext)) return { bg: '#fee2e2', color: '#dc2626' };
  if (['doc', 'docx'].includes(ext)) return { bg: '#dbeafe', color: '#2563eb' };
  if (['xls', 'xlsx'].includes(ext)) return { bg: '#d1fae5', color: '#059669' };
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return { bg: '#fef3c7', color: '#f59e0b' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { bg: '#e0e7ff', color: '#6366f1' };
  
  return { bg: '#e5e7eb', color: '#64748b' };
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '---';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
};

// Formátování pouze data (bez času)
const formatDateOnly = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
};

// Formátování pouze času
const formatTimeOnly = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch {
    return '';
  }
};

// Získání lidsky čitelného stavu objednávky
const getOrderDisplayStatus = (order) => {
  // Backend vrací sloupec 'stav_objednavky' který už obsahuje čitelný český název
  return order?.stav_objednavky || '---';
};

// Mapování lidského stavu na systémový kód pro barvy
const mapUserStatusToSystemCode = (userStatus) => {
  if (userStatus && typeof userStatus === 'string') {
    if (userStatus.startsWith('Zamítnut')) return 'ZAMITNUTA';
    if (userStatus.startsWith('Schválen')) return 'SCHVALENA';
    if (userStatus.startsWith('Dokončen')) return 'DOKONCENA';
    if (userStatus.startsWith('Zrušen')) return 'ZRUSENA';
    if (userStatus.startsWith('Archivován')) return 'ARCHIVOVANO';
  }
  
  const mapping = {
    'Ke schválení': 'ODESLANA_KE_SCHVALENI',
    'Nová': 'NOVA',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Má být zveřejněna': 'K_UVEREJNENI_DO_REGISTRU',
    'Uveřejněná': 'UVEREJNENA',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Čeká se': 'CEKA_SE',
    'Fakturace': 'FAKTURACE',
    'Věcná správnost': 'VECNA_SPRAVNOST',
    'Zkontrolována': 'ZKONTROLOVANA',
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA',
  };
  return mapping[userStatus] || 'DEFAULT';
};

// Formátování data s časem
const formatDateTime = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
};

// Formátování jména s titulem
const formatUserName = (jmeno, prijmeni, titulPred, titulZa) => {
  const parts = [];
  
  if (titulPred) parts.push(titulPred);
  if (jmeno) parts.push(jmeno);
  if (prijmeni) parts.push(prijmeni);
  if (titulZa) parts.push(titulZa);
  
  return parts.length > 0 ? parts.join(' ') : '---';
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const OrderExpandedRowV3 = ({ order, detail, loading, error, onRetry, onForceRefresh, colSpan }) => {
  // Error State (nejvyšší priorita)
  if (error) {
    return (
      <ExpandedRow>
        <ExpandedCell colSpan={colSpan}>
          <ExpandedContent>
            <ErrorContainer>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  Nepodařilo se načíst detail objednávky
                </div>
                <div>{error}</div>
              </div>
              {onRetry && (
                <RetryButton onClick={onRetry}>
                  Zkusit znovu
                </RetryButton>
              )}
            </ErrorContainer>
          </ExpandedContent>
        </ExpandedCell>
      </ExpandedRow>
    );
  }

  // Loading State (priorita před "no data")
  if (loading || !detail) {
    return (
      <ExpandedRow>
        <ExpandedCell colSpan={colSpan}>
          <LoadingContainer>
            <FontAwesomeIcon icon={faSpinner} />
            Načítání detailů objednávky...
          </LoadingContainer>
        </ExpandedCell>
      </ExpandedRow>
    );
  }

  // Detail data
  const polozky = detail.polozky || [];
  const faktury = detail.faktury || [];
  const prilohy = detail.prilohy || [];
  const workflow = detail.workflow_kroky || [];

  return (
    <ExpandedRow>
      <ExpandedCell colSpan={colSpan}>
        <ExpandedContent>
          <Grid>
            {/* 1⃣ ZÁKLADNÍ ÚDAJE OBJEDNÁVKY */}
            <Card>
              <CardTitle>
                {onForceRefresh ? (
                  <FontAwesomeIcon 
                    icon={faSync} 
                    style={{ cursor: 'pointer', color: '#3b82f6' }}
                    onClick={onForceRefresh}
                    title="Znovu načíst data z databáze"
                  />
                ) : (
                  <FontAwesomeIcon icon={faInfoCircle} />
                )}
                Základní údaje objednávky
              </CardTitle>

              {/* Číslo objednávky s ID */}
              <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7em', color: '#64748b', marginBottom: '0.25rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Číslo objednávky
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1em', color: '#0f172a' }}>
                  {detail.cislo_objednavky || '---'}
                  <sup style={{ fontSize: '0.6em', color: '#94a3b8', fontWeight: 400, marginLeft: '0.3em' }}>
                    #{detail.id || '?'}
                  </sup>
                </div>
              </div>

              <InfoRow>
                <InfoLabel>Předmět:</InfoLabel>
                <InfoValue style={{ fontWeight: 500 }}>{detail.predmet || '---'}</InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Stav:</InfoLabel>
                <InfoValue>
                  <StatusBadge $status={mapUserStatusToSystemCode(getOrderDisplayStatus(detail))}>
                    <FontAwesomeIcon 
                      icon={
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'NOVA' ? faFilePen :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ODESLANA_KE_SCHVALENI' ? faClock :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'SCHVALENA' ? faShield :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'POTVRZENA' ? faCheckCircle :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'UVEREJNENA' ? faFileContract :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'DOKONCENA' ? faTruck :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ZRUSENA' ? faXmark :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ZAMITNUTA' ? faXmark :
                        mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ODESLANA' ? faCheckCircle :
                        faCircleNotch
                      } 
                      style={{ fontSize: '12px' }} 
                    />
                    <span>{getOrderDisplayStatus(detail)}</span>
                  </StatusBadge>
                </InfoValue>
              </InfoRow>

              {(detail.schvaleni_komentar || detail.odeslani_storno_duvod) && (
                <InfoRow>
                  <InfoLabel>Stav komentář:</InfoLabel>
                  <InfoValue style={{ color: '#64748b' }}>
                    {[detail.schvaleni_komentar, detail.odeslani_storno_duvod].filter(Boolean).join(', ')}
                  </InfoValue>
                </InfoRow>
              )}

              <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0' }} />

              <InfoRow>
                <InfoLabel>Datum vytvoření:</InfoLabel>
                <InfoValue>{formatDate(detail.dt_vytvoreni)}</InfoValue>
              </InfoRow>

              {detail.dt_schvaleni && (
                <InfoRow>
                  <InfoLabel>Datum schválení:</InfoLabel>
                  <InfoValue style={{ color: '#059669', fontWeight: 500 }}>{formatDate(detail.dt_schvaleni)}</InfoValue>
                </InfoRow>
              )}

              {detail.dt_predpokladany_termin_dodani && (
                <InfoRow>
                  <InfoLabel>Termín dodání:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500 }}>{formatDate(detail.dt_predpokladany_termin_dodani)}</InfoValue>
                </InfoRow>
              )}

              {detail.dt_potvrzeni_vecne_spravnosti && (
                <InfoRow>
                  <InfoLabel>Potvrzení věc. správnosti:</InfoLabel>
                  <InfoValue style={{ color: '#0891b2', fontWeight: 500 }}>{formatDate(detail.dt_potvrzeni_vecne_spravnosti)}</InfoValue>
                </InfoRow>
              )}

              {detail.dt_dokonceni && (
                <InfoRow>
                  <InfoLabel>Datum dokončení:</InfoLabel>
                  <InfoValue style={{ color: '#16a34a', fontWeight: 600 }}>{formatDate(detail.dt_dokonceni)}</InfoValue>
                </InfoRow>
              )}

              <InfoRow>
                <InfoLabel>Poslední změna:</InfoLabel>
                <InfoValue>{formatDate(detail.dt_aktualizace)}</InfoValue>
              </InfoRow>

              <div style={{ borderTop: '1px solid #d1d5db', margin: '0.75rem 0' }} />

              {/* Uveřejnění v registru - placeholder */}
              <InfoRow>
                <InfoLabel>Uveřejněno v registru:</InfoLabel>
                <InfoValue style={{ fontWeight: 500, color: '#6b7280' }}>
                  {detail.registr_iddt ? 'Ano' : detail.zverejnit ? 'Čeká se' : 'Ne'}
                </InfoValue>
              </InfoRow>
              {detail.dt_zverejneni && (
                <InfoRow>
                  <InfoLabel>Datum zveřejnění:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500, color: '#059669' }}>{formatDate(detail.dt_zverejneni)}</InfoValue>
                </InfoRow>
              )}
              {detail.registr_iddt && (
                <InfoRow>
                  <InfoLabel>Kód IDDS:</InfoLabel>
                  <InfoValue style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.95em', color: '#0891b2' }}>
                    {detail.registr_iddt}
                  </InfoValue>
                </InfoRow>
              )}
            </Card>

            {/* 2⃣ FINANČNÍ ÚDAJE */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
                Finanční údaje
              </CardTitle>

              {/* Střediska */}
              {(detail.strediska_nazvy || detail.strediska_kod) && (
                <InfoRow>
                  <InfoLabel>Střediska:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {detail.strediska_nazvy || detail.strediska_kod}
                  </InfoValue>
                </InfoRow>
              )}

              {/* Způsob financování */}
              {(detail.financovani_display || detail.financovani) && (
                <>
                  <InfoRow>
                    <InfoLabel>Způsob financování:</InfoLabel>
                    <InfoValue style={{ fontWeight: 600, color: '#7c3aed' }}>
                      {detail.financovani_display || detail.financovani}
                    </InfoValue>
                  </InfoRow>

                  {/* LP kódy s detaily - zobrazit POD způsobem financování */}
                  {detail.financovani?.lp_nazvy && Array.isArray(detail.financovani.lp_nazvy) && detail.financovani.lp_nazvy.length > 0 && (
                    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                      {detail.financovani.lp_nazvy.map((lp, index) => (
                        <div key={index} style={{
                          fontSize: '0.9em',
                          marginBottom: '0.25rem',
                          paddingLeft: '0.5rem',
                          borderLeft: '3px solid #7c3aed',
                          backgroundColor: '#faf5ff',
                          padding: '0.4rem 0.5rem',
                          borderRadius: '0 4px 4px 0'
                        }}>
                          <span style={{ fontWeight: 600, color: '#7c3aed' }}>
                            {lp.cislo_lp || lp.kod || '---'}
                          </span>
                          {lp.nazev && (
                            <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                              – {lp.nazev}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Další dynamická data financování */}
              {detail.financovani && typeof detail.financovani === 'object' && (() => {
                const fin = detail.financovani;
                const skipKeys = ['typ', 'typ_nazev', 'nazev', 'lp_kody', 'lp_nazvy', 'kod_stavu', 'nazev_stavu', 'label'];
                const extraKeys = Object.keys(fin).filter(key => !skipKeys.includes(key) && fin[key] != null);

                return extraKeys.map(key => {
                  const value = fin[key];
                  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                  const labelMap = {
                    'cislo': 'Číslo',
                    'poznamka': 'Poznámka',
                    'lp_poznamka': 'Poznámka k LP',
                    'cislo_smlouvy': 'Číslo smlouvy',
                    'smlouva_cislo': 'Číslo smlouvy',
                    'poznamka_smlouvy': 'Poznámka smlouvy',
                    'cislo_pojistne_udalosti': 'Číslo pojistné události',
                    'poznamka_pojistne_udalosti': 'Poznámka',
                    'individualni_schvaleni': 'Číslo schválení',
                    'individualni_poznamka': 'Poznámka',
                    'individualni_schvaleni_poznamka': 'Poznámka',
                    'pokladna_cislo': 'Číslo',
                    'pokladna_poznamka': 'Poznámka',
                    'castka': 'Částka',
                    'datum': 'Datum',
                    'schvalovaci_osoba': 'Schvalující osoba'
                  };
                  const label = labelMap[key] || key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

                  return (
                    <InfoRow key={key}>
                      <InfoLabel>{label}:</InfoLabel>
                      <InfoValue style={{ fontSize: '0.9em' }}>
                        {displayValue}
                      </InfoValue>
                    </InfoRow>
                  );
                });
              })()}

              <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0' }} />

              <InfoRow>
                <InfoLabel>Max. cena s DPH:</InfoLabel>
                <InfoValue style={{ fontWeight: 700, color: '#059669', fontSize: '1.1em' }}>
                  {formatCurrency(detail.max_cena_s_dph)}
                </InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Druh objednávky:</InfoLabel>
                <InfoValue style={{ fontWeight: 500, fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{detail.druh_objednavky_nazev || detail.druh_objednavky_kod || '---'}</span>
                  {(() => {
                    // Debug log
                    console.log('🔍 Druh objednávky DEBUG:', {
                      druh_objednavky_nazev: detail.druh_objednavky_nazev,
                      druh_objednavky_kod: detail.druh_objednavky_kod,
                      druh_objednavky_atribut: detail.druh_objednavky_atribut,
                      _enriched_druh: detail._enriched?.druh_objednavky,
                      full_detail: detail
                    });
                    
                    const isMajetek = detail.druh_objednavky_atribut === 1 || 
                                     detail._enriched?.druh_objednavky?.atribut_objektu === 1;
                    
                    return isMajetek ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em'
                      }}>
                        Majetek
                      </span>
                    ) : null;
                  })()}
                </InfoValue>
              </InfoRow>

              {polozky.length > 0 && (
                <>
                  <InfoRow>
                    <InfoLabel>Počet položek:</InfoLabel>
                    <InfoValue style={{ fontWeight: 500 }}>{polozky.length} ks</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Položky (s DPH):</InfoLabel>
                    <InfoValue style={{ fontWeight: 600, color: '#3b82f6' }}>
                      {formatCurrency(detail.polozky_celkova_cena_s_dph)}
                    </InfoValue>
                  </InfoRow>
                </>
              )}

              <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0' }} />

              {faktury.length > 0 && (
                <>
                  <InfoRow>
                    <InfoLabel>Počet faktur:</InfoLabel>
                    <InfoValue style={{ fontWeight: 500 }}>{faktury.length} ks</InfoValue>
                  </InfoRow>
                </>
              )}

              <div style={{ borderTop: '2px solid #7c3aed', margin: '0.75rem 0' }} />

              {/* DODAVATEL - v rámci Finančních údajů */}
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faTruck} style={{ color: '#ea580c' }} />
                Dodavatel
              </div>

              <InfoRow>
                <InfoLabel>Název:</InfoLabel>
                <InfoValue style={{ fontWeight: 600, color: '#ea580c' }}>
                  {detail.dodavatel_nazev || '---'}
                </InfoValue>
              </InfoRow>

              {detail.dodavatel_ico && (
                <InfoRow>
                  <InfoLabel>IČO:</InfoLabel>
                  <InfoValue>{detail.dodavatel_ico}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_dic && (
                <InfoRow>
                  <InfoLabel>DIČ:</InfoLabel>
                  <InfoValue>{detail.dodavatel_dic}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_adresa && (
                <InfoRow>
                  <InfoLabel>Adresa:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.85em' }}>{detail.dodavatel_adresa}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_jmeno && (
                <InfoRow>
                  <InfoLabel>Kontakt:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.85em' }}>{detail.dodavatel_kontakt_jmeno}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_email && (
                <InfoRow>
                  <InfoLabel>Email:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.8em', color: '#6b7280' }}>{detail.dodavatel_kontakt_email}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_telefon && (
                <InfoRow>
                  <InfoLabel>Telefon:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.85em' }}>{detail.dodavatel_kontakt_telefon}</InfoValue>
                </InfoRow>
              )}
            </Card>

            {/* 3⃣ ODPOVĚDNÉ OSOBY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
                Odpovědné osoby
              </CardTitle>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
                Odpovědné osoby
              </CardTitle>

              {/* Objednatel */}
              {(detail.objednatel_jmeno || detail.objednatel_prijmeni || detail.uzivatel_jmeno || detail.uzivatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    {/* Label role */}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Objednatel
                    </div>
                    {/* Celé jméno s titulem */}
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {detail.objednatel_jmeno && detail.objednatel_prijmeni
                        ? formatUserName(detail.objednatel_jmeno, detail.objednatel_prijmeni, detail.objednatel_titul_pred, detail.objednatel_titul_za)
                        : formatUserName(detail.uzivatel_jmeno, detail.uzivatel_prijmeni, detail.uzivatel_titul_pred, detail.uzivatel_titul_za)}
                    </div>
                    {/* Email zarovnaný doprava ve druhém sloupci */}
                    {(detail.objednatel_email || detail.uzivatel_email) && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.objednatel_email || detail.uzivatel_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Garant */}
              {(detail.garant_jmeno || detail.garant_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Garant
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.garant_jmeno, detail.garant_prijmeni, detail.garant_titul_pred, detail.garant_titul_za)}
                    </div>
                    {detail.garant_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.garant_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Příkazce */}
              {(detail.prikazce_jmeno || detail.prikazce_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Příkazce
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.prikazce_jmeno, detail.prikazce_prijmeni, detail.prikazce_titul_pred, detail.prikazce_titul_za)}
                    </div>
                    {detail.prikazce_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.prikazce_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Schvalovatel */}
              {(detail.schvalovatel_jmeno || detail.schvalovatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Schvalovatel
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.schvalovatel_jmeno, detail.schvalovatel_prijmeni, detail.schvalovatel_titul_pred, detail.schvalovatel_titul_za)}
                    </div>
                    {detail.schvalovatel_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.schvalovatel_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Odesílatel */}
              {(detail.odesilatel_jmeno || detail.odesilatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Odesílatel
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.odesilatel_jmeno, detail.odesilatel_prijmeni, detail.odesilatel_titul_pred, detail.odesilatel_titul_za)}
                    </div>
                    {detail.odesilatel_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.odesilatel_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dodavatel potvrdil */}
              {(detail.dodavatel_potvrdil_jmeno || detail.dodavatel_potvrdil_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Dodavatel potvrdil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.dodavatel_potvrdil_jmeno, detail.dodavatel_potvrdil_prijmeni, detail.dodavatel_potvrdil_titul_pred, detail.dodavatel_potvrdil_titul_za)}
                    </div>
                    {detail.dodavatel_potvrdil_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.dodavatel_potvrdil_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Zveřejnil */}
              {(detail.zverejnil_jmeno || detail.zverejnil_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Zveřejnil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.zverejnil_jmeno, detail.zverejnil_prijmeni, detail.zverejnil_titul_pred, detail.zverejnil_titul_za)}
                    </div>
                    {detail.zverejnil_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.zverejnil_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fakturant */}
              {(detail.fakturant_jmeno || detail.fakturant_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Fakturant
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#7c3aed' }}>
                      {formatUserName(detail.fakturant_jmeno, detail.fakturant_prijmeni, detail.fakturant_titul_pred, detail.fakturant_titul_za)}
                    </div>
                    {detail.fakturant_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.fakturant_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Potvrdil věcnou správnost */}
              {(detail.potvrdil_vecnou_spravnost_jmeno || detail.potvrdil_vecnou_spravnost_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Potvrdil věcnou správnost
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.potvrdil_vecnou_spravnost_jmeno, detail.potvrdil_vecnou_spravnost_prijmeni, detail.potvrdil_vecnou_spravnost_titul_pred, detail.potvrdil_vecnou_spravnost_titul_za)}
                    </div>
                    {detail.potvrdil_vecnou_spravnost_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.potvrdil_vecnou_spravnost_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dokončil objednávku */}
              {(detail.dokoncil_jmeno || detail.dokoncil_prijmeni) && (
                <div style={{ marginBottom: '0rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Dokončil objednávku
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>
                      {formatUserName(detail.dokoncil_jmeno, detail.dokoncil_prijmeni, detail.dokoncil_titul_pred, detail.dokoncil_titul_za)}
                    </div>
                    {detail.dokoncil_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.dokoncil_email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* 4⃣ WORKFLOW KROKY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faProjectDiagram} />
                Workflow
              </CardTitle>

              {/* 1. Vytvořil/Objednatel */}
              {(detail.objednatel_jmeno || detail.objednatel_prijmeni || detail.uzivatel_jmeno || detail.uzivatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#3b82f6' }}>
                      1. {detail.objednatel_jmeno ? 'Objednatel' : 'Vytvořil'}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {detail.objednatel_jmeno && detail.objednatel_prijmeni 
                        ? formatUserName(detail.objednatel_jmeno, detail.objednatel_prijmeni, detail.objednatel_titul_pred, detail.objednatel_titul_za)
                        : formatUserName(detail.uzivatel_jmeno, detail.uzivatel_prijmeni, detail.uzivatel_titul_pred, detail.uzivatel_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_vytvoreni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        🕒 {formatDateTime(detail.dt_vytvoreni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Schválil */}
              {(detail.schvalovatel_jmeno || detail.schvalovatel_prijmeni) && detail.dt_schvaleni && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#059669' }}>
                      2. Schválil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.schvalovatel_jmeno, detail.schvalovatel_prijmeni, detail.schvalovatel_titul_pred, detail.schvalovatel_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_schvaleni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        🕒 {formatDateTime(detail.dt_schvaleni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Odeslal dodavateli */}
              {(detail.odesilatel_jmeno || detail.odesilatel_prijmeni || detail.dt_odeslani) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#0891b2' }}>
                      3. Odeslal dodavateli
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {(detail.odesilatel_jmeno || detail.odesilatel_prijmeni) 
                        ? formatUserName(detail.odesilatel_jmeno, detail.odesilatel_prijmeni, detail.odesilatel_titul_pred, detail.odesilatel_titul_za)
                        : '---'}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_odeslani && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {formatDateOnly(detail.dt_odeslani)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Dodavatel potvrdil */}
              {(detail.dodavatel_potvrdil_jmeno || detail.dodavatel_potvrdil_prijmeni || detail.dt_akceptace) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#7c3aed' }}>
                      4. Dodavatel potvrdil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {(detail.dodavatel_potvrdil_jmeno || detail.dodavatel_potvrdil_prijmeni) 
                        ? formatUserName(detail.dodavatel_potvrdil_jmeno, detail.dodavatel_potvrdil_prijmeni, detail.dodavatel_potvrdil_titul_pred, detail.dodavatel_potvrdil_titul_za)
                        : '---'}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_akceptace && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {formatDateOnly(detail.dt_akceptace)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Zveřejnil */}
              {(detail.zverejnil_jmeno || detail.zverejnil_prijmeni) && detail.dt_zverejneni && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#f59e0b' }}>
                      5. Zveřejnil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.zverejnil_jmeno, detail.zverejnil_prijmeni, detail.zverejnil_titul_pred, detail.zverejnil_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_zverejneni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        🕒 {formatDateTime(detail.dt_zverejneni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6.-7. Přidání faktur, ověření věcné správnosti */}
              {detail.faktury && detail.faktury.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#ea580c', marginBottom: '0.5rem' }}>
                    6.-7. Přidání faktur, ověření věcné správnosti
                  </div>
                  {detail.faktury
                    .filter(f => f.dt_vytvoreni)
                    .sort((a, b) => new Date(a.dt_vytvoreni) - new Date(b.dt_vytvoreni))
                    .map((faktura, index) => (
                      <div key={faktura.id || index} style={{ marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #ea580c', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                        {/* Řádek faktury */}
                        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start', marginBottom: '0.25rem' }}>
                          <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>
                            FA VS: {faktura.fa_cislo_vema || 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                            {faktura.vytvoril_jmeno && faktura.vytvoril_prijmeni 
                              ? formatUserName(faktura.vytvoril_jmeno, faktura.vytvoril_prijmeni, faktura.vytvoril_titul_pred, faktura.vytvoril_titul_za)
                              : detail.fakturant_jmeno && detail.fakturant_prijmeni
                              ? formatUserName(detail.fakturant_jmeno, detail.fakturant_prijmeni, detail.fakturant_titul_pred, detail.fakturant_titul_za)
                              : 'Neznámý'}
                          </div>
                          
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            🕒 {formatDateTime(faktura.dt_vytvoreni)}
                          </div>
                          <div></div>
                        </div>
                        
                        {/* Věcná správnost */}
                        {faktura.dt_potvrzeni_vecne_spravnosti && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                              <div style={{ fontSize: '0.75rem', color: '#0891b2', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>✓</span>
                                <span>Věcná správnost</span>
                              </div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                {faktura.potvrdil_vecnou_spravnost_jmeno && faktura.potvrdil_vecnou_spravnost_prijmeni
                                  ? formatUserName(faktura.potvrdil_vecnou_spravnost_jmeno, faktura.potvrdil_vecnou_spravnost_prijmeni, faktura.potvrdil_vecnou_spravnost_titul_pred, faktura.potvrdil_vecnou_spravnost_titul_za)
                                  : detail.potvrdil_vecnou_spravnost_jmeno && detail.potvrdil_vecnou_spravnost_prijmeni
                                  ? formatUserName(detail.potvrdil_vecnou_spravnost_jmeno, detail.potvrdil_vecnou_spravnost_prijmeni, detail.potvrdil_vecnou_spravnost_titul_pred, detail.potvrdil_vecnou_spravnost_titul_za)
                                  : '---'}
                              </div>
                              
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                🕒 {formatDateTime(faktura.dt_potvrzeni_vecne_spravnosti)}
                              </div>
                              <div></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* 7. Dokončil objednávku */}
              {(detail.dokoncil_jmeno || detail.dokoncil_prijmeni) && detail.dt_dokonceni && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#16a34a' }}>
                      7. Dokončil objednávku
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.dokoncil_jmeno, detail.dokoncil_prijmeni, detail.dokoncil_titul_pred, detail.dokoncil_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_dokonceni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        🕒 {formatDateTime(detail.dt_dokonceni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* POSLEDNÍ ZMĚNA - BEZ ČÍSLA */}
              {(detail.uzivatel_aktualizace_jmeno || detail.uzivatel_aktualizace_prijmeni) && detail.dt_aktualizace && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Datum */}
                    <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Poslední změna
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>
                      {formatDateOnly(detail.dt_aktualizace)}
                    </div>
                    
                    {/* Řádek 2: Celé jméno | Čas */}
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                      {formatUserName(detail.uzivatel_aktualizace_jmeno, detail.uzivatel_aktualizace_prijmeni, detail.uzivatel_aktualizace_titul_pred, detail.uzivatel_aktualizace_titul_za)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                      {formatTimeOnly(detail.dt_aktualizace)}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Grid>

          {/* Bottom Section: Items, Invoices, Attachments */}
          <Grid>
            {/* 6⃣ POLOŽKY OBJEDNÁVKY */}
            <Card style={{ gridColumn: 'span 2' }}>
              <CardTitle>
                <FontAwesomeIcon icon={faBox} />
                Položky objednávky ({polozky.length})
              </CardTitle>
              {polozky.length === 0 ? (
                <EmptyState>Žádné položky</EmptyState>
              ) : (
                <ItemsTable>
                  <thead>
                    <tr>
                      <ItemsTh style={{ textAlign: 'left' }}>Popis</ItemsTh>
                      <ItemsTh style={{ textAlign: 'left' }}>Úsek / Budova / Místnost</ItemsTh>
                      <ItemsTh className="numeric">Cena bez DPH</ItemsTh>
                      <ItemsTh className="numeric">Sazba DPH</ItemsTh>
                      <ItemsTh className="numeric">Cena s DPH</ItemsTh>
                    </tr>
                  </thead>
                  <tbody>
                    {polozky.map((item, index) => (
                      <tr key={index}>
                        <ItemsTd style={{ textAlign: 'left' }}>{item.popis || '---'}</ItemsTd>
                        <ItemsTd style={{ textAlign: 'left', fontSize: '0.75rem', color: '#64748b' }}>
                          {[item.usek_nazev, item.budova_nazev, item.mistnost_nazev].filter(Boolean).join(' / ') || '---'}
                        </ItemsTd>
                        <ItemsTd className="numeric currency">
                          {formatCurrency(item.cena_bez_dph)}
                        </ItemsTd>
                        <ItemsTd className="numeric">
                          {item.sazba_dph ? `${item.sazba_dph}%` : '---'}
                        </ItemsTd>
                        <ItemsTd className="numeric currency">
                          {formatCurrency(item.cena_s_dph)}
                        </ItemsTd>
                      </tr>
                    ))}
                  </tbody>
                </ItemsTable>
              )}
            </Card>

            {/* 7⃣ FAKTURY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faFileInvoice} />
                Faktury ({faktury.length})
              </CardTitle>
              {faktury.length === 0 ? (
                <EmptyState>Žádné faktury</EmptyState>
              ) : (
                faktury.map((invoice, index) => {
                  // Debug log pro první fakturu
                  if (index === 0) {
                    console.log('📋 Faktura data v podřádku:', {
                      id: invoice.id,
                      fa_cislo_vema: invoice.fa_cislo_vema,
                      fa_datum_doruceni: invoice.fa_datum_doruceni,
                      fa_datum_vystaveni: invoice.fa_datum_vystaveni,
                      fa_datum_splatnosti: invoice.fa_datum_splatnosti,
                      full_invoice: invoice
                    });
                  }
                  
                  return (
                  <InvoiceItem key={index}>
                    <InvoiceHeader>
                      <InvoiceNumber>
                        FA VS: {invoice.fa_cislo_vema || invoice.id || 'N/A'}
                      </InvoiceNumber>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <InvoiceAmount>
                          {formatCurrency(invoice.fa_castka)}
                        </InvoiceAmount>
                        {invoice.stav && (
                          <InvoiceStatusBadge 
                            $success={invoice.stav === 'ZAPLACENA'}
                            $warning={invoice.stav === 'NEZAPLACENA' || invoice.stav === 'VECNA_SPRAVNOST' || invoice.stav === 'NOVA'}
                          >
                            {invoice.stav === 'ZAPLACENA' && <FontAwesomeIcon icon={faCheckCircle} />}
                            {(invoice.stav === 'NEZAPLACENA' || invoice.stav === 'VECNA_SPRAVNOST' || invoice.stav === 'NOVA') && <FontAwesomeIcon icon={faHourglassHalf} />}
                            {(() => {
                              const stavMap = {
                                'VECNA_SPRAVNOST': 'Věcná správnost',
                                'NOVA': 'Nová',
                                'ZAPLACENA': 'Zaplacena',
                                'NEZAPLACENA': 'Nezaplacena',
                                'STORNO': 'Storno'
                              };
                              return stavMap[invoice.stav] || invoice.stav;
                            })()}
                          </InvoiceStatusBadge>
                        )}
                      </div>
                    </InvoiceHeader>
                    {(invoice.vytvoril_jmeno || invoice.vytvoril_prijmeni) && (
                      <InvoiceDetail style={{ fontWeight: 500 }}>
                        <span style={{ color: '#6b7280', fontWeight: 600 }}>Evidoval:</span> <span style={{ color: '#1e293b', fontWeight: 600 }}>{formatUserName(invoice.vytvoril_jmeno, invoice.vytvoril_prijmeni, invoice.vytvoril_titul_pred, invoice.vytvoril_titul_za)}</span>
                      </InvoiceDetail>
                    )}
                    {(invoice.fa_datum_doruceni || invoice.fa_datum_vystaveni || invoice.fa_datum_splatnosti) && (
                      <InvoiceDetail>
                        {invoice.fa_datum_doruceni && (
                          <span>Doručeno: {formatDate(invoice.fa_datum_doruceni)}</span>
                        )}
                        {invoice.fa_datum_doruceni && invoice.fa_datum_vystaveni && (
                          <span> | </span>
                        )}
                        {invoice.fa_datum_vystaveni && (
                          <span>Vystaveno: {formatDate(invoice.fa_datum_vystaveni)}</span>
                        )}
                        {invoice.fa_datum_vystaveni && invoice.fa_datum_splatnosti && (
                          <span> | </span>
                        )}
                        {!invoice.fa_datum_vystaveni && invoice.fa_datum_doruceni && invoice.fa_datum_splatnosti && (
                          <span> | </span>
                        )}
                        {invoice.fa_datum_splatnosti && (
                          <span>Splatnost: {formatDate(invoice.fa_datum_splatnosti)}</span>
                        )}
                      </InvoiceDetail>
                    )}
                    {invoice.dt_potvrzeni_vecne_spravnosti && (
                      <InvoiceDetail>
                        <span style={{ color: '#0891b2', fontWeight: 600 }}>Věcná správnost:</span> <span style={{ color: '#64748b' }}>{formatDateTime(invoice.dt_potvrzeni_vecne_spravnosti)}</span>
                        {(invoice.potvrdil_vecnou_spravnost_jmeno || invoice.potvrdil_vecnou_spravnost_prijmeni) && (
                          <span style={{ color: '#0891b2', fontWeight: 500 }}> - {formatUserName(invoice.potvrdil_vecnou_spravnost_jmeno, invoice.potvrdil_vecnou_spravnost_prijmeni, invoice.potvrdil_vecnou_spravnost_titul_pred, invoice.potvrdil_vecnou_spravnost_titul_za)}</span>
                        )}
                      </InvoiceDetail>
                    )}
                  </InvoiceItem>
                  );
                })
              )}
            </Card>

            {/* 8⃣ PŘÍLOHY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faPaperclip} />
                Přílohy objednávky ({prilohy.length})
              </CardTitle>
              {prilohy.length === 0 ? (
                <EmptyState>Žádné přílohy</EmptyState>
              ) : (
                <AttachmentsList>
                  {prilohy.map((attachment, index) => {
                    const fileName = attachment.originalni_nazev_souboru || 'Příloha';
                    const icon = getFileIcon(fileName);
                    const colors = getFileIconColor(fileName);
                    
                    // Debug log
                    if (index === 0) {
                      console.log('⚡ Příloha data:', attachment);
                    }
                    
                    return (
                      <AttachmentItem
                        key={index}
                        as="a"
                        href={attachment.systemova_cesta || '#'}
                        download={fileName}
                        onClick={(e) => {
                          if (!attachment.systemova_cesta) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <AttachmentIcon $bg={colors.bg} $color={colors.color}>
                          <FontAwesomeIcon icon={icon} />
                        </AttachmentIcon>
                        <AttachmentInfo>
                          <AttachmentName>
                            {fileName}
                            {attachment.typ_prilohy && (
                              <AttachmentTypeBadge style={{ marginLeft: '8px' }}>
                                {attachment.typ_prilohy}
                              </AttachmentTypeBadge>
                            )}
                          </AttachmentName>
                          <AttachmentMeta>
                            {(attachment.nahral_jmeno || attachment.nahral_prijmeni) ? (
                              <span>{formatUserName(attachment.nahral_jmeno, attachment.nahral_prijmeni, attachment.nahral_titul_pred, attachment.nahral_titul_za)}</span>
                            ) : attachment.nahrano_uzivatel_id ? (
                              <span>Uživatel #{attachment.nahrano_uzivatel_id}</span>
                            ) : (
                              <span>Neznámý uživatel</span>
                            )}
                            {attachment.velikost_souboru_b && (
                              <span> • {Math.round(attachment.velikost_souboru_b / 1024)} KB</span>
                            )}
                          </AttachmentMeta>
                        </AttachmentInfo>
                        {attachment.systemova_cesta && (
                          <AttachmentDownload>
                            <FontAwesomeIcon icon={faDownload} />
                          </AttachmentDownload>
                        )}
                      </AttachmentItem>
                    );
                  })}
                </AttachmentsList>
              )}
            </Card>
          </Grid>

          {/* Workflow (pokud existuje) */}
          {workflow && workflow.length > 0 && (
            <Card style={{ marginTop: '0.75rem' }}>
              <CardTitle>
                <FontAwesomeIcon icon={faProjectDiagram} />
                Průběh workflow ({workflow.length} kroků)
              </CardTitle>
              <WorkflowSteps>
                {workflow.map((step, index) => {
                  const status = step.stav === 'schvaleno' 
                    ? 'completed' 
                    : step.stav === 'zamitnuto' 
                    ? 'rejected' 
                    : step.je_aktualni 
                    ? 'current' 
                    : 'pending';
                  
                  return (
                    <WorkflowStep key={index} $status={status}>
                      <WorkflowIcon $status={status}>
                        <FontAwesomeIcon 
                          icon={
                            status === 'completed' ? faCheckCircle :
                            status === 'rejected' ? faTimesCircle :
                            status === 'current' ? faSpinner :
                            faInfoCircle
                          }
                        />
                      </WorkflowIcon>
                      <WorkflowContent>
                        <WorkflowTitle>
                          {step.nazev_kroku || `Krok ${index + 1}`}
                        </WorkflowTitle>
                        {step.schvalil_uzivatel && (
                          <WorkflowMeta>
                            {step.schvalil_uzivatel} • {formatDate(step.datum_schvaleni)}
                          </WorkflowMeta>
                        )}
                        {step.poznamka && (
                          <WorkflowMeta style={{ marginTop: '0.25rem' }}>
                            {step.poznamka}
                          </WorkflowMeta>
                        )}
                      </WorkflowContent>
                    </WorkflowStep>
                  );
                })}
              </WorkflowSteps>
            </Card>
          )}
        </ExpandedContent>
      </ExpandedCell>
    </ExpandedRow>
  );
};

export default OrderExpandedRowV3;
