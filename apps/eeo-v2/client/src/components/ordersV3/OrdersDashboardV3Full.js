/**
 * OrdersDashboardV3Full.js
 * 
 * Plný dashboard pro Orders V3 s možností:
 * - PLNĚ: Všechny dlaždice
 * - DYNAMICKÉ: Pouze dlaždice s hodnotou > 0
 * - KOMPAKTNÍ: Pouze celková cena + počet
 * 
 * Optimalizováno pro širokoúhlé monitory
 */

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt,
  faCheckCircle,
  faHourglassHalf,
  faTimesCircle,
  faFileContract,
  faTruck,
  faXmark,
  faBoltLightning,
  faUser,
  faFileInvoice,
  faPaperclip,
  faTableColumns,
  faTimes,
  faList,
  faShield,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const DashboardPanel = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;

  h3 {
    font-size: 1.3rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const DashboardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.85rem;
  background: ${props => props.$active ? '#3b82f6' : '#ffffff'};
  color: ${props => props.$active ? '#ffffff' : '#475569'};
  border: 1px solid ${props => props.$active ? '#2563eb' : '#cbd5e1'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f1f5f9'};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(380px, 420px) repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LargeStatCard = styled.div`
  background: linear-gradient(145deg, #ffffff, #f9fafb);
  border-radius: 16px;
  padding: 1.75rem;
  border-left: 6px solid ${props => props.$color || '#3b82f6'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  grid-row: span 2;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 1200px) {
    grid-row: span 1;
  }
`;

const LargeStatValue = styled.div`
  font-size: 2.25rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.5rem;
  font-family: 'Inter', -apple-system, sans-serif;
  letter-spacing: -0.02em;
`;

const LargeStatLabel = styled.div`
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
  line-height: 1.4;
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
`;

const SummaryItem = styled.div`
  background: ${props => props.$bg || 'rgba(100, 116, 139, 0.08)'};
  border-radius: 8px;
  padding: 0.75rem;
  border-left: 3px solid ${props => props.$color || '#64748b'};
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  color: ${props => props.$color || '#64748b'};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 0.25rem;
`;

const SummaryValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  font-family: 'Courier New', monospace;
`;

const StatCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: 0.75rem 1rem;
  min-height: 85px;
  border-left: 4px solid ${props => props.$color || '#3b82f6'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  ${props => props.$clickable && `
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.06);
      border-left-width: 5px;
    }
  `}

  ${props => props.$isActive && `
    border-left-width: 6px;
  `}
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  font-family: 'Inter', -apple-system, sans-serif;
`;

const StatIcon = styled.div`
  font-size: 1.5rem;
  color: ${props => props.$color || '#64748b'};
  opacity: 0.8;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  line-height: 1.3;
`;

// ============================================================================
// STATUS COLORS (z Orders25List.js)
// ============================================================================

const STATUS_COLORS = {
  TOTAL: { light: '#e0f2fe', dark: '#0369a1', bg: '#f0f9ff' },
  NOVA: { light: '#dbeafe', dark: '#1e40af', bg: '#eff6ff' },
  KE_SCHVALENI: { light: '#fee2e2', dark: '#dc2626', bg: '#fef2f2' },
  SCHVALENA: { light: '#fed7aa', dark: '#ea580c', bg: '#fff7ed' },
  ZAMITNUTA: { light: '#e5e7eb', dark: '#6b7280', bg: '#f9fafb' },
  ROZPRACOVANA: { light: '#fef3c7', dark: '#f59e0b', bg: '#fffbeb' },
  ODESLANA: { light: '#e0e7ff', dark: '#6366f1', bg: '#eef2ff' },
  POTVRZENA: { light: '#ddd6fe', dark: '#7c3aed', bg: '#f5f3ff' },
  K_UVEREJNENI_DO_REGISTRU: { light: '#ccfbf1', dark: '#0d9488', bg: '#f0fdfa' },
  UVEREJNENA: { light: '#d1fae5', dark: '#059669', bg: '#ecfdf5' },
  CEKA_POTVRZENI: { light: '#fed7aa', dark: '#ea580c', bg: '#fff7ed' },
  CEKA_SE: { light: '#fef3c7', dark: '#f59e0b', bg: '#fffbeb' },
  FAKTURACE: { light: '#ddd6fe', dark: '#7c3aed', bg: '#f5f3ff' },
  VECNA_SPRAVNOST: { light: '#d1fae5', dark: '#10b981', bg: '#ecfdf5' },
  DOKONCENA: { light: '#d1fae5', dark: '#059669', bg: '#ecfdf5' },
  ZRUSENA: { light: '#fecaca', dark: '#dc2626', bg: '#fef2f2' },
  SMAZANA: { light: '#e5e7eb', dark: '#6b7280', bg: '#f9fafb' },
  ARCHIVOVANO: { light: '#e5e7eb', dark: '#6b7280', bg: '#f9fafb' },
  WITH_INVOICES: { light: '#e0e7ff', dark: '#6366f1', bg: '#eef2ff' },
  WITH_ATTACHMENTS: { light: '#ddd6fe', dark: '#8b5cf6', bg: '#f5f3ff' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OrdersDashboardV3Full - Plný dashboard s možností PLNĚ/DYNAMICKÉ/KOMPAKTNÍ
 * 
 * @param {Object} stats - Statistiky objednávek (total, nova, ke_schvaleni, ...)
 * @param {number} totalAmount - Celková částka s DPH
 * @param {Function} onStatusClick - Handler pro kliknutí na status kartu
 * @param {string} activeStatus - Aktivní status filter
 * @param {Function} onHide - Handler pro skrytí dashboardu
 */
const OrdersDashboardV3Full = ({
  stats = {},
  totalAmount = 0,
  filteredTotalAmount = 0,
  filteredCount = 0,
  hasActiveFilters = false,
  onStatusClick,
  activeStatus,
  onHide,
  mode = 'full', // 'full' | 'dynamic' | 'compact'
  onModeChange,
}) => {
  const [dashboardMode, setDashboardMode] = useState(mode);

  useEffect(() => {
    setDashboardMode(mode);
  }, [mode]);

  const handleModeChange = (newMode) => {
    setDashboardMode(newMode);
    onModeChange?.(newMode);
  };

  // Určení, zda zobrazit dlaždici (pro dynamický režim)
  const shouldShowTile = (count) => {
    if (dashboardMode === 'full') return true;
    if (dashboardMode === 'dynamic') return count > 0;
    return false;
  };

  // Kompaktní režim - pouze celková cena + počet + dynamické stavové karty s hodnotou > 0
  if (dashboardMode === 'compact') {
    return (
      <DashboardPanel>
        <DashboardHeader>
          <h3>
            📊 Dashboard (kompaktní)
          </h3>
          <DashboardActions>
            <ActionButton onClick={() => handleModeChange('full')}>
              <FontAwesomeIcon icon={faTableColumns} />
              Plný
            </ActionButton>
            <ActionButton onClick={() => handleModeChange('dynamic')}>
              <FontAwesomeIcon icon={faList} />
              Dynamické
            </ActionButton>
            <ActionButton $active onClick={() => handleModeChange('compact')}>
              <FontAwesomeIcon icon={faFileInvoice} />
              Kompaktní
            </ActionButton>
            <ActionButton onClick={onHide}>
              <FontAwesomeIcon icon={faTimes} />
              Skrýt
            </ActionButton>
          </DashboardActions>
        </DashboardHeader>
        
        <DashboardGrid>
          {/* Celková cena - vždy */}
          <StatCard $color={STATUS_COLORS.TOTAL.dark}>
            <div style={{ width: '100%' }}>
              <StatValue style={{ fontSize: '1.5rem' }}>
                {Math.round(totalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
              </StatValue>
              <StatLabel>Celková cena s DPH za období ({stats.total || 0})</StatLabel>
              
              {hasActiveFilters && filteredCount < (stats.total || 0) && (
                <div style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(100, 116, 139, 0.2)'
                }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#f59e0b',
                  }}>
                    {Math.round(filteredTotalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#f59e0b',
                    marginTop: '0.25rem'
                  }}>
                    Celková cena s DPH za vybrané ({filteredCount})
                  </div>
                </div>
              )}
            </div>
          </StatCard>

          {/* Počet objednávek - vždy */}
          <StatCard $color="#2196f3">
            <StatHeader>
              <StatValue>{stats.total || 0}</StatValue>
              <StatIcon $color="#2196f3">
                <FontAwesomeIcon icon={faFileAlt} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Počet objednávek</StatLabel>
          </StatCard>

          {/* Dynamické stavové karty - pouze s hodnotou > 0 */}
          {(stats.ke_schvaleni || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.KE_SCHVALENI.dark}
              $clickable
              $isActive={activeStatus === 'ke_schvaleni'}
              onClick={() => onStatusClick?.('ke_schvaleni')}
            >
              <StatHeader>
                <StatValue>{stats.ke_schvaleni || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.KE_SCHVALENI.dark}>
                  <FontAwesomeIcon icon={faHourglassHalf} />
                </StatIcon>
              </StatHeader>
              <StatLabel>Ke schválení</StatLabel>
            </StatCard>
          )}

          {(stats.schvalena || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.SCHVALENA.dark}
              $clickable
              $isActive={activeStatus === 'schvalena'}
              onClick={() => onStatusClick?.('schvalena')}
            >
              <StatHeader>
                <StatValue>{stats.schvalena || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.SCHVALENA.dark}>
                  <FontAwesomeIcon icon={faShield} />
                </StatIcon>
              </StatHeader>
              <StatLabel>Schválená</StatLabel>
            </StatCard>
          )}

          {(stats.rozpracovana || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.ROZPRACOVANA.dark}
              $clickable
              $isActive={activeStatus === 'rozpracovana'}
              onClick={() => onStatusClick?.('rozpracovana')}
            >
              <StatHeader>
                <StatValue>{stats.rozpracovana || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.ROZPRACOVANA.dark}>
                  ⚙️
                </StatIcon>
              </StatHeader>
              <StatLabel>Rozpracovaná</StatLabel>
            </StatCard>
          )}

          {(stats.dokoncena || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.DOKONCENA.dark}
              $clickable
              $isActive={activeStatus === 'dokoncena'}
              onClick={() => onStatusClick?.('dokoncena')}
            >
              <StatHeader>
                <StatValue>{stats.dokoncena || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.DOKONCENA.dark}>
                  🎯
                </StatIcon>
              </StatHeader>
              <StatLabel>Dokončená</StatLabel>
            </StatCard>
          )}
        </DashboardGrid>
      </DashboardPanel>
    );
  }

  // Plný nebo dynamický režim
  return (
    <DashboardPanel>
      <DashboardHeader>
        <h3>
          📊 Dashboard {dashboardMode === 'full' ? '(plný)' : '(dynamický)'}
        </h3>
        <DashboardActions>
          <ActionButton $active={dashboardMode === 'full'} onClick={() => handleModeChange('full')}>
            <FontAwesomeIcon icon={faTableColumns} />
            Plný
          </ActionButton>
          <ActionButton $active={dashboardMode === 'dynamic'} onClick={() => handleModeChange('dynamic')}>
            <FontAwesomeIcon icon={faList} />
            Dynamické
          </ActionButton>
          <ActionButton onClick={() => handleModeChange('compact')}>
            <FontAwesomeIcon icon={faFileInvoice} />
            Kompaktní
          </ActionButton>
          <ActionButton onClick={onHide}>
            <FontAwesomeIcon icon={faTimes} />
            Skrýt
          </ActionButton>
        </DashboardActions>
      </DashboardHeader>
      
      <DashboardGrid>
        {/* Velká karta - celková cena (vždy) */}
        <LargeStatCard $color={STATUS_COLORS.TOTAL.dark}>
          <div>
            <LargeStatValue>
              {Math.round(totalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
            </LargeStatValue>
            <LargeStatLabel>
              Celková cena s DPH za období ({stats.total || 0})
            </LargeStatLabel>
            
            {hasActiveFilters && filteredCount < (stats.total || 0) && (
              <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(100, 116, 139, 0.2)'
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#f59e0b',
                  textAlign: 'center',
                  marginBottom: '0.25rem'
                }}>
                  {Math.round(filteredTotalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#f59e0b',
                  textAlign: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.2)'
                }}>
                  Celková cena s DPH za vybrané ({filteredCount})
                </div>
              </div>
            )}
          </div>

          <SummaryRow>
            <SummaryItem $color="#d97706" $bg="rgba(217, 119, 6, 0.08)">
              <SummaryLabel $color="#92400e">ROZPRACOVANÉ</SummaryLabel>
              <SummaryValue style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                {Math.round(stats.rozpracovanaAmount || 0).toLocaleString('cs-CZ')}&nbsp;Kč
              </SummaryValue>
              <SummaryValue style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.8 }}>
                {/* Rozpracované = celkem - dokončené - zrušené - smazané */}
                {(
                  (stats.total || 0) -
                  (stats.dokoncena || 0) -
                  (stats.zrusena || 0) -
                  (stats.smazana || 0)
                ).toLocaleString('cs-CZ')} obj
              </SummaryValue>
            </SummaryItem>

            <SummaryItem $color="#059669" $bg="rgba(5, 150, 105, 0.08)">
              <SummaryLabel $color="#065f46">DOKONČENÉ</SummaryLabel>
              <SummaryValue style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                {Math.round(stats.dokoncenaAmount || 0).toLocaleString('cs-CZ')}&nbsp;Kč
              </SummaryValue>
              <SummaryValue style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.8 }}>
                {(stats.dokoncena || 0).toLocaleString('cs-CZ')} obj
              </SummaryValue>
            </SummaryItem>
          </SummaryRow>
        </LargeStatCard>

        {/* Počet objednávek - vždy */}
        <StatCard $color="#2196f3">
          <StatHeader>
            <StatValue>{stats.total || 0}</StatValue>
            <StatIcon $color="#2196f3">
              <FontAwesomeIcon icon={faFileAlt} />
            </StatIcon>
          </StatHeader>
          <StatLabel>Počet objednávek</StatLabel>
        </StatCard>

        {/* Stavové dlaždice */}
        {shouldShowTile(stats.nova || 0) && (
          <StatCard
            $color={STATUS_COLORS.NOVA.dark}
            $clickable
            $isActive={activeStatus === 'nova'}
            onClick={() => onStatusClick?.('nova')}
          >
            <StatHeader>
              <StatValue>{stats.nova || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.NOVA.dark}>📝</StatIcon>
            </StatHeader>
            <StatLabel>Nová / Koncept</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.ke_schvaleni || 0) && (
          <StatCard
            $color={STATUS_COLORS.KE_SCHVALENI.dark}
            $clickable
            $isActive={activeStatus === 'ke_schvaleni'}
            onClick={() => onStatusClick?.('ke_schvaleni')}
          >
            <StatHeader>
              <StatValue>{stats.ke_schvaleni || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.KE_SCHVALENI.dark}>
                <FontAwesomeIcon icon={faHourglassHalf} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Ke schválení</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.schvalena || 0) && (
          <StatCard
            $color={STATUS_COLORS.SCHVALENA.dark}
            $clickable
            $isActive={activeStatus === 'schvalena'}
            onClick={() => onStatusClick?.('schvalena')}
          >
            <StatHeader>
              <StatValue>{stats.schvalena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.SCHVALENA.dark}>
                <FontAwesomeIcon icon={faShield} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Schválená</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.zamitnuta || 0) && (
          <StatCard
            $color={STATUS_COLORS.ZAMITNUTA.dark}
            $clickable
            $isActive={activeStatus === 'zamitnuta'}
            onClick={() => onStatusClick?.('zamitnuta')}
          >
            <StatHeader>
              <StatValue>{stats.zamitnuta || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ZAMITNUTA.dark}>
                <FontAwesomeIcon icon={faTimesCircle} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zamítnutá</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.rozpracovana || 0) && (
          <StatCard
            $color={STATUS_COLORS.ROZPRACOVANA.dark}
            $clickable
            $isActive={activeStatus === 'rozpracovana'}
            onClick={() => onStatusClick?.('rozpracovana')}
          >
            <StatHeader>
              <StatValue>{stats.rozpracovana || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ROZPRACOVANA.dark}>⚙️</StatIcon>
            </StatHeader>
            <StatLabel>Rozpracovaná</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.odeslana || 0) && (
          <StatCard
            $color={STATUS_COLORS.ODESLANA.dark}
            $clickable
            $isActive={activeStatus === 'odeslana'}
            onClick={() => onStatusClick?.('odeslana')}
          >
            <StatHeader>
              <StatValue>{stats.odeslana || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ODESLANA.dark}>📤</StatIcon>
            </StatHeader>
            <StatLabel>Odeslaná dodavateli</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.potvrzena || 0) && (
          <StatCard
            $color={STATUS_COLORS.POTVRZENA.dark}
            $clickable
            $isActive={activeStatus === 'potvrzena'}
            onClick={() => onStatusClick?.('potvrzena')}
          >
            <StatHeader>
              <StatValue>{stats.potvrzena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.POTVRZENA.dark}>✅</StatIcon>
            </StatHeader>
            <StatLabel>Potvrzená dodavatelem</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.k_uverejneni_do_registru || 0) && (
          <StatCard
            $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}
            $clickable
            $isActive={activeStatus === 'k_uverejneni_do_registru'}
            onClick={() => onStatusClick?.('k_uverejneni_do_registru')}
          >
            <StatHeader>
              <StatValue>{stats.k_uverejneni_do_registru || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}>📋</StatIcon>
            </StatHeader>
            <StatLabel>Ke zveřejnění</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.uverejnena || 0) && (
          <StatCard
            $color={STATUS_COLORS.UVEREJNENA.dark}
            $clickable
            $isActive={activeStatus === 'uverejnena'}
            onClick={() => onStatusClick?.('uverejnena')}
          >
            <StatHeader>
              <StatValue>{stats.uverejnena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.UVEREJNENA.dark}>
                <FontAwesomeIcon icon={faFileContract} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zveřejněno</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.ceka_potvrzeni || 0) && (
          <StatCard
            $color={STATUS_COLORS.CEKA_POTVRZENI.dark}
            $clickable
            $isActive={activeStatus === 'ceka_potvrzeni'}
            onClick={() => onStatusClick?.('ceka_potvrzeni')}
          >
            <StatHeader>
              <StatValue>{stats.ceka_potvrzeni || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.CEKA_POTVRZENI.dark}>⏰</StatIcon>
            </StatHeader>
            <StatLabel>Čeká na potvrzení</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.ceka_se || 0) && (
          <StatCard
            $color={STATUS_COLORS.CEKA_SE.dark}
            $clickable
            $isActive={activeStatus === 'ceka_se'}
            onClick={() => onStatusClick?.('ceka_se')}
          >
            <StatHeader>
              <StatValue>{stats.ceka_se || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.CEKA_SE.dark}>
                <FontAwesomeIcon icon={faClock} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Čeká se</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.fakturace || 0) && (
          <StatCard
            $color={STATUS_COLORS.FAKTURACE.dark}
            $clickable
            $isActive={activeStatus === 'fakturace'}
            onClick={() => onStatusClick?.('fakturace')}
          >
            <StatHeader>
              <StatValue>{stats.fakturace || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.FAKTURACE.dark}>💰</StatIcon>
            </StatHeader>
            <StatLabel>Fakturace</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.vecna_spravnost || 0) && (
          <StatCard
            $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}
            $clickable
            $isActive={activeStatus === 'vecna_spravnost'}
            onClick={() => onStatusClick?.('vecna_spravnost')}
          >
            <StatHeader>
              <StatValue>{stats.vecna_spravnost || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}>
                <FontAwesomeIcon icon={faCheckCircle} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Věcná správnost</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.dokoncena || 0) && (
          <StatCard
            $color={STATUS_COLORS.DOKONCENA.dark}
            $clickable
            $isActive={activeStatus === 'dokoncena'}
            onClick={() => onStatusClick?.('dokoncena')}
          >
            <StatHeader>
              <StatValue>{stats.dokoncena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.DOKONCENA.dark}>🎯</StatIcon>
            </StatHeader>
            <StatLabel>Dokončená</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.zrusena || 0) && (
          <StatCard
            $color={STATUS_COLORS.ZRUSENA.dark}
            $clickable
            $isActive={activeStatus === 'zrusena'}
            onClick={() => onStatusClick?.('zrusena')}
          >
            <StatHeader>
              <StatValue>{stats.zrusena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ZRUSENA.dark}>
                <FontAwesomeIcon icon={faXmark} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zrušená</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.smazana || 0) && (
          <StatCard
            $color={STATUS_COLORS.SMAZANA.dark}
            $clickable
            $isActive={activeStatus === 'smazana'}
            onClick={() => onStatusClick?.('smazana')}
          >
            <StatHeader>
              <StatValue>{stats.smazana || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.SMAZANA.dark}>🗑️</StatIcon>
            </StatHeader>
            <StatLabel>Smazaná</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.archivovano || 0) && (
          <StatCard
            $color={STATUS_COLORS.ARCHIVOVANO.dark}
            $clickable
            $isActive={activeStatus === 'archivovano'}
            onClick={() => onStatusClick?.('archivovano')}
          >
            <StatHeader>
              <StatValue>{stats.archivovano || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ARCHIVOVANO.dark}>📦</StatIcon>
            </StatHeader>
            <StatLabel>Archivováno / Import</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.withInvoices || 0) && (
          <StatCard
            $color={STATUS_COLORS.WITH_INVOICES.dark}
            $clickable
            $isActive={activeStatus === 's_fakturou'}
            onClick={() => onStatusClick?.('s_fakturou')}
          >
            <StatHeader>
              <StatValue>{stats.withInvoices || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.WITH_INVOICES.dark}>
                <FontAwesomeIcon icon={faFileInvoice} />
              </StatIcon>
            </StatHeader>
            <StatLabel>S fakturou</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.withAttachments || 0) && (
          <StatCard
            $color={STATUS_COLORS.WITH_ATTACHMENTS.dark}
            $clickable
            $isActive={activeStatus === 's_prilohami'}
            onClick={() => onStatusClick?.('s_prilohami')}
          >
            <StatHeader>
              <StatValue>{stats.withAttachments || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.WITH_ATTACHMENTS.dark}>
                <FontAwesomeIcon icon={faPaperclip} />
              </StatIcon>
            </StatHeader>
            <StatLabel>S přílohami</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.mimoradneUdalosti || 0) && (
          <StatCard
            $color="#dc2626"
            $clickable
            $isActive={activeStatus === 'mimoradne_udalosti'}
            onClick={() => onStatusClick?.('mimoradne_udalosti')}
          >
            <StatHeader>
              <StatValue>{stats.mimoradneUdalosti || 0}</StatValue>
              <StatIcon $color="#dc2626">
                <FontAwesomeIcon icon={faBoltLightning} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Mimořádné události</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.mojeObjednavky || 0) && (
          <StatCard
            $color="#7c3aed"
            $clickable
            $isActive={activeStatus === 'moje_objednavky'}
            onClick={() => onStatusClick?.('moje_objednavky')}
          >
            <StatHeader>
              <StatValue>{stats.mojeObjednavky || 0}</StatValue>
              <StatIcon $color="#7c3aed">
                <FontAwesomeIcon icon={faUser} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Moje objednávky</StatLabel>
          </StatCard>
        )}
      </DashboardGrid>
    </DashboardPanel>
  );
};

export default OrdersDashboardV3Full;
