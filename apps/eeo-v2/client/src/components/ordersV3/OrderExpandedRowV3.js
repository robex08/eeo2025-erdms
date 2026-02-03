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
  faSync
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
          {/* Header s Refresh tlačítkem */}
          <ContentHeader>
            <div style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FontAwesomeIcon icon={faInfoCircle} style={{ color: '#3b82f6' }} />
              Detail objednávky #{order.id}
            </div>
            {onForceRefresh && (
              <RefreshButton 
                onClick={onForceRefresh}
                title="Znovu načíst data z databáze"
              >
                <FontAwesomeIcon icon={faSync} />
                Obnovit z DB
              </RefreshButton>
            )}
          </ContentHeader>

          <Grid>
            {/* 1⃣ ZÁKLADNÍ ÚDAJE OBJEDNÁVKY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
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
                <InfoValue style={{ fontWeight: 600, color: detail.stav_workflow_barva || '#1e40af' }}>
                  {detail.stav_workflow_nazev || detail.stav_objednavky || '---'}
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
                <InfoRow>
                  <InfoLabel>Způsob financování:</InfoLabel>
                  <InfoValue style={{ fontWeight: 600, color: '#7c3aed' }}>
                    {detail.financovani_display || detail.financovani}
                  </InfoValue>
                </InfoRow>
              )}

              <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0' }} />

              <InfoRow>
                <InfoLabel>Max. cena s DPH:</InfoLabel>
                <InfoValue style={{ fontWeight: 700, color: '#059669', fontSize: '1.1em' }}>
                  {formatCurrency(detail.max_cena_s_dph)}
                </InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Druh objednávky:</InfoLabel>
                <InfoValue style={{ fontWeight: 500, fontSize: '0.9em' }}>
                  {detail.druh_objednavky_nazev || detail.druh_objednavky_kod || '---'}
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
            </Card>

            {/* 3⃣ ODPOVĚDNÉ OSOBY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
                Odpovědné osoby
              </CardTitle>

              {/* Objednatel */}
              {(detail.objednatel_jmeno || detail.objednatel_prijmeni || detail.uzivatel_jmeno || detail.uzivatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
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
                <FontAwesomeIcon icon={faInfoCircle} />
                Workflow kroky
              </CardTitle>

              {/* 1. Vytvořil/Objednatel */}
              {(detail.objednatel_jmeno || detail.objednatel_prijmeni || detail.uzivatel_jmeno || detail.uzivatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
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
                            FA#{faktura.fa_cislo_vema || 'N/A'}
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
                          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
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
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
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

            {/* 5⃣ DODAVATEL */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
                Dodavatel
              </CardTitle>

              <InfoRow>
                <InfoLabel>Název:</InfoLabel>
                <InfoValue style={{ fontWeight: 600 }}>
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
                  <InfoValue>{detail.dodavatel_adresa}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_zastoupeny && (
                <InfoRow>
                  <InfoLabel>Zastoupený:</InfoLabel>
                  <InfoValue>{detail.dodavatel_zastoupeny}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_jmeno && (
                <InfoRow>
                  <InfoLabel>Kontakt:</InfoLabel>
                  <InfoValue>{detail.dodavatel_kontakt_jmeno}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_email && (
                <div style={{ textAlign: 'right', fontSize: '0.85em', color: '#6b7280', marginTop: '-0.3rem', marginBottom: '0.5rem' }}>
                  {detail.dodavatel_kontakt_email}
                </div>
              )}

              {detail.dodavatel_kontakt_telefon && (
                <InfoRow>
                  <InfoLabel>Telefon:</InfoLabel>
                  <InfoValue>{detail.dodavatel_kontakt_telefon}</InfoValue>
                </InfoRow>
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
                      <ItemsTh className="numeric">Cena bez DPH</ItemsTh>
                      <ItemsTh className="numeric">Sazba DPH</ItemsTh>
                      <ItemsTh className="numeric">Cena s DPH</ItemsTh>
                    </tr>
                  </thead>
                  <tbody>
                    {polozky.map((item, index) => (
                      <tr key={index}>
                        <ItemsTd style={{ textAlign: 'left' }}>{item.popis || '---'}</ItemsTd>
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
                faktury.map((invoice, index) => (
                  <InvoiceItem key={index}>
                    <InvoiceHeader>
                      <InvoiceNumber>
                        {invoice.fa_cislo_vema || `Faktura #${invoice.id}`}
                      </InvoiceNumber>
                      <InvoiceAmount>
                        {formatCurrency(invoice.fa_castka)}
                      </InvoiceAmount>
                    </InvoiceHeader>
                    {invoice.fa_datum_vystaveni && (
                      <InvoiceDetail>
                        Vystaveno: {formatDate(invoice.fa_datum_vystaveni)}
                      </InvoiceDetail>
                    )}
                    {invoice.fa_datum_splatnosti && (
                      <InvoiceDetail>
                        Splatnost: {formatDate(invoice.fa_datum_splatnosti)}
                      </InvoiceDetail>
                    )}
                    {invoice.stav && (
                      <InvoiceDetail>
                        Stav: {invoice.stav}
                      </InvoiceDetail>
                    )}
                  </InvoiceItem>
                ))
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
                    
                    return (
                      <AttachmentItem
                        key={index}
                        href={attachment.systemova_cesta || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
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
                          </AttachmentName>
                          <AttachmentMeta>
                            {attachment.typ_prilohy && `${attachment.typ_prilohy}`}
                            {attachment.velikost_souboru_b && ` • ${Math.round(attachment.velikost_souboru_b / 1024)} KB`}
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
