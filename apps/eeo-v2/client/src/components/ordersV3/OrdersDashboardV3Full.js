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
  faCheckDouble,
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
  faComment,
  faCommentDots,
} from '@fortawesome/free-solid-svg-icons';
import { SmartTooltip } from '../../styles/SmartTooltip'; // ✅ Custom tooltip component

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
  display: flex;
  gap: 1rem;
  width: 100%;
  align-items: flex-start;

  @media (max-width: 1200px) {
    flex-direction: column;
  }
`;

const SmallCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 200px);
  gap: 1.5em;
  row-gap: 2em;
  flex: 1;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
`;

const LargeStatCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 16px;
  padding: 1.75rem;
  border-left: ${props => props.$isActive ? '8px' : '6px'} solid ${props => props.$color || '#3b82f6'};
  box-shadow: ${props => props.$isActive ?
    `0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40` :
    '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'};
  transition: all 0.3s ease;
  min-width: 380px;
  max-width: 420px;
  flex-shrink: 0;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  
  &:hover {
    transform: ${props => props.$clickable ? 'translateY(-3px)' : 'translateY(-1px)'};
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
    ${props => props.$clickable && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}25, ${props.$color || '#3b82f6'}15);
    `}
  }

  @media (max-width: 1200px) {
    min-width: auto;
    max-width: none;
    width: 100%;
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
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#64748b'}25, ${props.$color || '#64748b'}15)` :
    (props.$bg || 'rgba(100, 116, 139, 0.08)')};
  border-radius: 8px;
  padding: 0.75rem;
  border-left: ${props => props.$isActive ? '5px' : '3px'} solid ${props => props.$color || '#64748b'};
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  
  &:hover {
    ${props => props.$clickable && `
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      background: linear-gradient(145deg, ${props.$color || '#64748b'}30, ${props.$color || '#64748b'}20);
    `}
  }
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
  padding: 0.6rem 1rem;
  min-height: 95px;
  max-height: 95px;
  height: 95px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
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
  min-height: 42px;
  display: flex;
  align-items: center;
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
  margin-bottom: 0.4rem;
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
  ZKONTROLOVANA: { light: '#bfdbfe', dark: '#3b82f6', bg: '#dbeafe' },
  DOKONCENA: { light: '#d1fae5', dark: '#059669', bg: '#ecfdf5' },
  ZRUSENA: { light: '#fecaca', dark: '#dc2626', bg: '#fef2f2' },
  SMAZANA: { light: '#e5e7eb', dark: '#6b7280', bg: '#f9fafb' },
  ARCHIVOVANO: { light: '#e5e7eb', dark: '#6b7280', bg: '#f9fafb' },
  WITH_INVOICES: { light: '#e0e7ff', dark: '#6366f1', bg: '#eef2ff' },
  WITH_ATTACHMENTS: { light: '#ddd6fe', dark: '#8b5cf6', bg: '#f5f3ff' },
  WITHOUT_OBJ_ATTACHMENTS: { light: '#fef3c7', dark: '#f59e0b', bg: '#fffbeb' },
  WITH_COMMENTS: { light: '#bfdbfe', dark: '#3b82f6', bg: '#dbeafe' },
  WITH_MY_COMMENTS: { light: '#a5b4fc', dark: '#6366f1', bg: '#e0e7ff' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OrdersDashboardV3Full - Plný dashboard s možností PLNĚ/DYNAMICKÉ/KOMPAKTNÍ
 * 
 * @param {Object} stats - Celkové statistiky objednávek za období (pro modrou sekci)
 * @param {Object} filteredStats - Filtrované statistiky (pro malé dlaždice když je filtr)
 * @param {number} totalAmount - Celková částka s DPH za období
 * @param {number} filteredTotalAmount - Filtrovaná částka s DPH
 * @param {number} filteredCount - Počet filtrovaných objednávek
 * @param {boolean} hasActiveFilters - Jsou aktivní filtry?
 * @param {Function} onStatusClick - Handler pro kliknutí na status kartu
 * @param {string} activeStatus - Aktivní status filter
 * @param {Function} onHide - Handler pro skrytí dashboardu
 */
const OrdersDashboardV3Full = ({
  stats = {},
  filteredStats = null,
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
  
  // 🎯 KLÍČOVÁ LOGIKA: 
  // - Modrá sekce (totalAmount) VŽDY zobrazuje celkovou částku za období - NIKDY se nemění!
  // - Malé dlaždice používají filteredStats když je aktivní filtr A filteredStats existuje
  // - Pokud filteredStats je null (např. při sloupcových filtrech), použij stats jako fallback
  const displayStats = (hasActiveFilters && filteredStats) ? filteredStats : stats;
  
  // ✅ Pro výpočty: použij filteredTotalAmount pokud existuje, jinak totalAmount
  const displayTotalForCalculations = (filteredTotalAmount !== undefined && filteredTotalAmount !== null) 
    ? filteredTotalAmount 
    : totalAmount;
  
  // ✅ FIX: Zobrazit oranžovou sekci když jsou aktivní filtry
  // Pokud filteredTotalAmount nebo filteredCount nejsou definovány, zobrazíme totalAmount a stats.total jako fallback
  const showFilteredSection = hasActiveFilters;
  const displayFilteredAmount = (filteredTotalAmount !== undefined && filteredTotalAmount !== null) ? filteredTotalAmount : totalAmount;
  const displayFilteredCount = (filteredCount !== undefined && filteredCount !== null) ? filteredCount : stats.total;

  // ✅ Rozpracované (počet) = zbytek po odečtení stavů, které nechceme do „v běhu“ počítat.
  // Důvod: některé počitadla (např. uveřejnění/registr) nejsou čistě workflow a mohou se překrývat
  // s workflow stavy → prosté sčítání by dělalo nesoulad (přesně ten, co hlásíš na DEV).
  const excludedFromInProgressCount = (
    Number(displayStats.nove || 0) +
    Number(displayStats.ke_schvaleni || 0) +
    Number(displayStats.zamitnuta || 0) +
    Number(displayStats.zrusena || 0) +
    Number(displayStats.smazana || 0)
  );

  const totalCount = Number(displayStats.total || 0);
  const dokoncenaCount = Number(displayStats.dokoncena || 0);
  const inProgressOrDoneCount = Math.max(0, totalCount - excludedFromInProgressCount);
  const rozpracovaneCount = Math.max(0, inProgressOrDoneCount - dokoncenaCount);

  const rozpracovaneAmount = (displayStats.rozpracovaneAmount !== undefined && displayStats.rozpracovaneAmount !== null)
    ? displayStats.rozpracovaneAmount
    : (displayTotalForCalculations - (displayStats.dokoncenaAmount || (displayTotalForCalculations * (displayStats.dokoncena || 0) / (displayStats.total || 1))));

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
            <SmartTooltip text="Zobrazit všechny statistické karty" icon="info" preferredPosition="bottom">
              <ActionButton onClick={() => handleModeChange('full')}>
                <FontAwesomeIcon icon={faTableColumns} />
                Plný
              </ActionButton>
            </SmartTooltip>
            <SmartTooltip text="Zobrazit pouze karty s hodnotou > 0" icon="success" preferredPosition="bottom">
              <ActionButton onClick={() => handleModeChange('dynamic')}>
                <FontAwesomeIcon icon={faList} />
                Dynamické
              </ActionButton>
            </SmartTooltip>
            <SmartTooltip text="Kompaktní zobrazení se základními informacemi" icon="warning" preferredPosition="bottom">
              <ActionButton $active onClick={() => handleModeChange('compact')}>
                <FontAwesomeIcon icon={faFileInvoice} />
                Kompaktní
              </ActionButton>
            </SmartTooltip>
            <SmartTooltip text="Skrýt celý dashboard" icon="info" preferredPosition="bottom">
              <ActionButton onClick={onHide}>
                <FontAwesomeIcon icon={faTimes} />
                Skrýt
              </ActionButton>
            </SmartTooltip>
          </DashboardActions>
        </DashboardHeader>
        
        <DashboardGrid>
          {/* Celková cena - clickable pro reset filtrů */}
          <LargeStatCard 
            $color="#64748b" 
            $clickable={true}
            $isActive={false}
            onClick={() => onStatusClick?.(null)}
          >
            <div style={{ width: '100%' }}>
              <LargeStatValue style={{ fontSize: '1.5rem' }}>
                {Math.round(totalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
              </LargeStatValue>
              <LargeStatLabel>
                Celková cena s DPH za období ({stats.total || 0})
              </LargeStatLabel>
              
              {/* Oranžová sekce pro vybrané - zobrazit když jsou aktivní JAKÉKOLIV filtry A máme validní data */}
              {showFilteredSection && (
                <div style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(100, 116, 139, 0.2)'
                }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#d97706',
                  }}>
                    {Math.round(displayFilteredAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#d97706',
                    marginTop: '0.25rem'
                  }}>
                    Celková cena s DPH za vybrané ({displayFilteredCount})
                  </div>
                </div>
              )}
            </div>
            
            <SummaryRow>
              <SummaryItem 
                $color="#d97706" 
              $bg="rgba(217, 119, 6, 0.08)"
              $clickable={true}
              $isActive={activeStatus === 'rozpracovane_stavy'}
              onClick={() => onStatusClick?.('rozpracovane_stavy')}
            >
              <SummaryLabel $color="#92400e">ROZPRACOVANÉ</SummaryLabel>
              <SummaryValue style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                {Math.round(rozpracovaneAmount || 0).toLocaleString('cs-CZ')}&nbsp;Kč
              </SummaryValue>
              <SummaryValue style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.8 }}>
                {rozpracovaneCount.toLocaleString('cs-CZ')} obj
              </SummaryValue>
            </SummaryItem>

            <SummaryItem 
              $color="#059669" 
              $bg="rgba(5, 150, 105, 0.08)"
              $clickable={true}
              $isActive={activeStatus === 'dokoncena'}
              onClick={() => onStatusClick?.('dokoncena')}
            >
              <SummaryLabel $color="#065f46">DOKONČENÉ</SummaryLabel>
              <SummaryValue style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                {/* Pokud není dokoncenaAmount, zobrazit 0 nebo proporcional výpočet */}
                {Math.round(displayStats.dokoncenaAmount || (displayTotalForCalculations * (displayStats.dokoncena || 0) / (displayStats.total || 1)) || 0).toLocaleString('cs-CZ')}&nbsp;Kč
              </SummaryValue>
              <SummaryValue style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.8 }}>
                {(displayStats.dokoncena || 0).toLocaleString('cs-CZ')} obj
              </SummaryValue>
            </SummaryItem>
          </SummaryRow>
          </LargeStatCard>

            <SmallCardsGrid>
              {/* Počet objednávek - vždy */}
              <StatCard $color="#2196f3">
            <StatHeader>
              <StatValue>{displayStats.total || 0}</StatValue>
              <StatIcon $color="#2196f3">
                <FontAwesomeIcon icon={faFileAlt} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Počet objednávek</StatLabel>
          </StatCard>

          {/* Dynamické stavové karty - pouze s hodnotou > 0 */}
          {(displayStats.ke_schvaleni || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.KE_SCHVALENI.dark}
              $clickable
              $isActive={activeStatus === 'ke_schvaleni'}
              onClick={() => onStatusClick?.('ke_schvaleni')}
            >
              <StatHeader>
                <StatValue>{displayStats.ke_schvaleni || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.KE_SCHVALENI.dark}>
                  <FontAwesomeIcon icon={faHourglassHalf} />
                </StatIcon>
              </StatHeader>
              <StatLabel>Ke schválení</StatLabel>
            </StatCard>
          )}

          {(displayStats.schvalena || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.SCHVALENA.dark}
              $clickable
              $isActive={activeStatus === 'schvalena'}
              onClick={() => onStatusClick?.('schvalena')}
            >
              <StatHeader>
                <StatValue>{displayStats.schvalena || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.SCHVALENA.dark}>
                  <FontAwesomeIcon icon={faShield} />
                </StatIcon>
              </StatHeader>
              <StatLabel>Schválená</StatLabel>
            </StatCard>
          )}

          {(displayStats.rozpracovana || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.ROZPRACOVANA.dark}
              $clickable
              $isActive={activeStatus === 'rozpracovana'}
              onClick={() => onStatusClick?.('rozpracovana')}
            >
              <StatHeader>
                <StatValue>{displayStats.rozpracovana || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.ROZPRACOVANA.dark}>
                  ⚙️
                </StatIcon>
              </StatHeader>
              <StatLabel>Rozpracovaná</StatLabel>
            </StatCard>
          )}

          {(displayStats.dokoncena || 0) > 0 && (
            <StatCard
              $color={STATUS_COLORS.DOKONCENA.dark}
              $clickable
              $isActive={activeStatus === 'dokoncena'}
              onClick={() => onStatusClick?.('dokoncena')}
            >
              <StatHeader>
                <StatValue>{displayStats.dokoncena || 0}</StatValue>
                <StatIcon $color={STATUS_COLORS.DOKONCENA.dark}>
                  🎯
                </StatIcon>
              </StatHeader>
              <StatLabel>Dokončená</StatLabel>
            </StatCard>
          )}
          </SmallCardsGrid>
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
          <SmartTooltip text="Zobrazit všechny statistické karty" icon="info" preferredPosition="bottom">
            <ActionButton $active={dashboardMode === 'full'} onClick={() => handleModeChange('full')}>
              <FontAwesomeIcon icon={faTableColumns} />
              Plný
            </ActionButton>
          </SmartTooltip>
          <SmartTooltip text="Zobrazit pouze karty s hodnotou > 0" icon="success" preferredPosition="bottom">
            <ActionButton $active={dashboardMode === 'dynamic'} onClick={() => handleModeChange('dynamic')}>
              <FontAwesomeIcon icon={faList} />
              Dynamické
            </ActionButton>
          </SmartTooltip>
          <SmartTooltip text="Kompaktní zobrazení se základními informacemi" icon="warning" preferredPosition="bottom">
            <ActionButton onClick={() => handleModeChange('compact')}>
              <FontAwesomeIcon icon={faFileInvoice} />
              Kompaktní
            </ActionButton>
          </SmartTooltip>
          <SmartTooltip text="Skrýt celý dashboard" icon="info" preferredPosition="bottom">
            <ActionButton onClick={onHide}>
              <FontAwesomeIcon icon={faTimes} />
              Skrýt
            </ActionButton>
          </SmartTooltip>
        </DashboardActions>
      </DashboardHeader>
      
      <DashboardGrid>
        {/* Velká karta - celková cena (clickable pro reset filtrů) */}
        <LargeStatCard 
          $color="#64748b" 
          $clickable={true}
          $isActive={false}
          onClick={() => onStatusClick?.(null)}
        >
          <div>
            <LargeStatValue>
              {Math.round(totalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
            </LargeStatValue>
            <LargeStatLabel>
              Celková cena s DPH za období ({stats.total || 0})
            </LargeStatLabel>
            
            {/* Oranžová sekce pro vybrané - zobrazit když jsou aktivní JAKÉKOLIV filtry A máme validní data */}
            {showFilteredSection && (
              <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(100, 116, 139, 0.2)'
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#d97706',
                  textAlign: 'center',
                  marginBottom: '0.25rem'
                }}>
                  {Math.round(displayFilteredAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#d97706',
                  textAlign: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.2)'
                }}>
                  Celková cena s DPH za vybrané ({displayFilteredCount})
                </div>
              </div>
            )}
          </div>

          <SummaryRow>
            <SummaryItem 
              $color="#d97706" 
              $bg="rgba(217, 119, 6, 0.08)"
              $clickable={true}
              $isActive={activeStatus === 'rozpracovane_stavy'}
              onClick={() => onStatusClick?.('rozpracovane_stavy')}
            >
              <SummaryLabel $color="#92400e">ROZPRACOVANÉ</SummaryLabel>
              <SummaryValue style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                {Math.round(rozpracovaneAmount || 0).toLocaleString('cs-CZ')}&nbsp;Kč
              </SummaryValue>
              <SummaryValue style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.8 }}>
                {rozpracovaneCount.toLocaleString('cs-CZ')} obj
              </SummaryValue>
            </SummaryItem>

            <SummaryItem 
              $color="#059669" 
              $bg="rgba(5, 150, 105, 0.08)"
              $clickable={true}
              $isActive={activeStatus === 'dokoncena'}
              onClick={() => onStatusClick?.('dokoncena')}
            >
              <SummaryLabel $color="#065f46">DOKONČENÉ</SummaryLabel>
              <SummaryValue style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                {/* Pokud není dokoncenaAmount, zobrazit 0 nebo proporcional výpočet */}
                {Math.round(displayStats.dokoncenaAmount || (displayTotalForCalculations * (displayStats.dokoncena || 0) / (displayStats.total || 1)) || 0).toLocaleString('cs-CZ')}&nbsp;Kč
              </SummaryValue>
              <SummaryValue style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.8 }}>
                {(displayStats.dokoncena || 0).toLocaleString('cs-CZ')} obj
              </SummaryValue>
            </SummaryItem>
          </SummaryRow>
        </LargeStatCard>

        <SmallCardsGrid>
        {/* Počet objednávek - vždy */}
        <StatCard $color="#2196f3">
          <StatHeader>
            <StatValue>{displayStats.total || 0}</StatValue>
            <StatIcon $color="#2196f3">
              <FontAwesomeIcon icon={faFileAlt} />
            </StatIcon>
          </StatHeader>
          <StatLabel>Počet objednávek</StatLabel>
        </StatCard>

        {/* Stavové dlaždice */}
        {shouldShowTile(displayStats.nova || 0) && (
          <StatCard
            $color={STATUS_COLORS.NOVA.dark}
            $clickable
            $isActive={activeStatus === 'nova'}
            onClick={() => onStatusClick?.('nova')}
          >
            <StatHeader>
              <StatValue>{displayStats.nova || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.NOVA.dark}>📝</StatIcon>
            </StatHeader>
            <StatLabel>Nová / Koncept</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.ke_schvaleni || 0) && (
          <StatCard
            $color={STATUS_COLORS.KE_SCHVALENI.dark}
            $clickable
            $isActive={activeStatus === 'ke_schvaleni'}
            onClick={() => onStatusClick?.('ke_schvaleni')}
          >
            <StatHeader>
              <StatValue>{displayStats.ke_schvaleni || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.KE_SCHVALENI.dark}>
                <FontAwesomeIcon icon={faHourglassHalf} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Ke schválení</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.schvalena || 0) && (
          <StatCard
            $color={STATUS_COLORS.SCHVALENA.dark}
            $clickable
            $isActive={activeStatus === 'schvalena'}
            onClick={() => onStatusClick?.('schvalena')}
          >
            <StatHeader>
              <StatValue>{displayStats.schvalena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.SCHVALENA.dark}>
                <FontAwesomeIcon icon={faShield} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Schválená</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.zamitnuta || 0) && (
          <StatCard
            $color={STATUS_COLORS.ZAMITNUTA.dark}
            $clickable
            $isActive={activeStatus === 'zamitnuta'}
            onClick={() => onStatusClick?.('zamitnuta')}
          >
            <StatHeader>
              <StatValue>{displayStats.zamitnuta || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ZAMITNUTA.dark}>
                <FontAwesomeIcon icon={faTimesCircle} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zamítnutá</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.rozpracovana || 0) && (
          <StatCard
            $color={STATUS_COLORS.ROZPRACOVANA.dark}
            $clickable
            $isActive={activeStatus === 'rozpracovana'}
            onClick={() => onStatusClick?.('rozpracovana')}
          >
            <StatHeader>
              <StatValue>{displayStats.rozpracovana || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ROZPRACOVANA.dark}>⚙️</StatIcon>
            </StatHeader>
            <StatLabel>Rozpracovaná</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.odeslana || 0) && (
          <StatCard
            $color={STATUS_COLORS.ODESLANA.dark}
            $clickable
            $isActive={activeStatus === 'odeslana'}
            onClick={() => onStatusClick?.('odeslana')}
          >
            <StatHeader>
              <StatValue>{displayStats.odeslana || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ODESLANA.dark}>📤</StatIcon>
            </StatHeader>
            <StatLabel>Odeslaná dodavateli</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.potvrzena || 0) && (
          <StatCard
            $color={STATUS_COLORS.POTVRZENA.dark}
            $clickable
            $isActive={activeStatus === 'potvrzena'}
            onClick={() => onStatusClick?.('potvrzena')}
          >
            <StatHeader>
              <StatValue>{displayStats.potvrzena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.POTVRZENA.dark}>✅</StatIcon>
            </StatHeader>
            <StatLabel>Potvrzená dodavatelem</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.k_uverejneni_do_registru || 0) && (
          <StatCard
            $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}
            $clickable
            $isActive={activeStatus === 'k_uverejneni_do_registru'}
            onClick={() => onStatusClick?.('k_uverejneni_do_registru')}
          >
            <StatHeader>
              <StatValue>{displayStats.k_uverejneni_do_registru || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}>📋</StatIcon>
            </StatHeader>
            <StatLabel>Ke zveřejnění</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.uverejnena || 0) && (
          <StatCard
            $color={STATUS_COLORS.UVEREJNENA.dark}
            $clickable
            $isActive={activeStatus === 'uverejnena'}
            onClick={() => onStatusClick?.('uverejnena')}
          >
            <StatHeader>
              <StatValue>{displayStats.uverejnena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.UVEREJNENA.dark}>
                <FontAwesomeIcon icon={faFileContract} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zveřejněno</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.ceka_potvrzeni || 0) && (
          <StatCard
            $color={STATUS_COLORS.CEKA_POTVRZENI.dark}
            $clickable
            $isActive={activeStatus === 'ceka_potvrzeni'}
            onClick={() => onStatusClick?.('ceka_potvrzeni')}
          >
            <StatHeader>
              <StatValue>{displayStats.ceka_potvrzeni || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.CEKA_POTVRZENI.dark}>⏰</StatIcon>
            </StatHeader>
            <StatLabel>Čeká na potvrzení</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.ceka_se || 0) && (
          <StatCard
            $color={STATUS_COLORS.CEKA_SE.dark}
            $clickable
            $isActive={activeStatus === 'ceka_se'}
            onClick={() => onStatusClick?.('ceka_se')}
          >
            <StatHeader>
              <StatValue>{displayStats.ceka_se || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.CEKA_SE.dark}>
                <FontAwesomeIcon icon={faClock} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Čeká se</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.fakturace || 0) && (
          <StatCard
            $color={STATUS_COLORS.FAKTURACE.dark}
            $clickable
            $isActive={activeStatus === 'fakturace'}
            onClick={() => onStatusClick?.('fakturace')}
          >
            <StatHeader>
              <StatValue>{displayStats.fakturace || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.FAKTURACE.dark}>💰</StatIcon>
            </StatHeader>
            <StatLabel>Fakturace</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.vecna_spravnost || 0) && (
          <StatCard
            $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}
            $clickable
            $isActive={activeStatus === 'vecna_spravnost'}
            onClick={() => onStatusClick?.('vecna_spravnost')}
          >
            <StatHeader>
              <StatValue>{displayStats.vecna_spravnost || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}>
                <FontAwesomeIcon icon={faCheckCircle} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Věcná správnost</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.zkontrolovana || 0) && (
          <StatCard
            $color={STATUS_COLORS.ZKONTROLOVANA.dark}
            $clickable
            $isActive={activeStatus === 'zkontrolovana'}
            onClick={() => onStatusClick?.('zkontrolovana')}
          >
            <StatHeader>
              <StatValue>{displayStats.zkontrolovana || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ZKONTROLOVANA.dark}>
                <FontAwesomeIcon icon={faCheckDouble} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zkontrolováno</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.dokoncena || 0) && (
          <StatCard
            $color={STATUS_COLORS.DOKONCENA.dark}
            $clickable
            $isActive={activeStatus === 'dokoncena'}
            onClick={() => onStatusClick?.('dokoncena')}
          >
            <StatHeader>
              <StatValue>{displayStats.dokoncena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.DOKONCENA.dark}>🎯</StatIcon>
            </StatHeader>
            <StatLabel>Dokončená</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.zrusena || 0) && (
          <StatCard
            $color={STATUS_COLORS.ZRUSENA.dark}
            $clickable
            $isActive={activeStatus === 'zrusena'}
            onClick={() => onStatusClick?.('zrusena')}
          >
            <StatHeader>
              <StatValue>{displayStats.zrusena || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.ZRUSENA.dark}>
                <FontAwesomeIcon icon={faXmark} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Zrušená</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.smazana || 0) && (
          <StatCard
            $color={STATUS_COLORS.SMAZANA.dark}
            $clickable
            $isActive={activeStatus === 'smazana'}
            onClick={() => onStatusClick?.('smazana')}
          >
            <StatHeader>
              <StatValue>{displayStats.smazana || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.SMAZANA.dark}>🗑️</StatIcon>
            </StatHeader>
            <StatLabel>Smazaná</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(displayStats.archivovano || 0) && (
          <StatCard
            $color={STATUS_COLORS.ARCHIVOVANO.dark}
            $clickable
            $isActive={activeStatus === 'archivovano'}
            onClick={() => onStatusClick?.('archivovano')}
          >
            <StatHeader>
              <StatValue>{displayStats.archivovano || 0}</StatValue>
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

        {shouldShowTile(stats.withoutObjAttachments || 0) && (
          <StatCard
            $color={STATUS_COLORS.WITHOUT_OBJ_ATTACHMENTS.dark}
            $clickable
            $isActive={activeStatus === 'bez_obj_priloh'}
            onClick={() => onStatusClick?.('bez_obj_priloh')}
          >
            <StatHeader>
              <StatValue>{stats.withoutObjAttachments || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.WITHOUT_OBJ_ATTACHMENTS.dark}>
                <FontAwesomeIcon icon={faPaperclip} style={{ opacity: 0.3 }} />
              </StatIcon>
            </StatHeader>
            <StatLabel>Bez příloh</StatLabel>
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

        {shouldShowTile(stats.withComments || 0) && (
          <StatCard
            $color={STATUS_COLORS.WITH_COMMENTS.dark}
            $clickable
            $isActive={activeStatus === 's_komentari'}
            onClick={() => onStatusClick?.('s_komentari')}
          >
            <StatHeader>
              <StatValue>{stats.withComments || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.WITH_COMMENTS.dark}>
                <FontAwesomeIcon icon={faComment} />
              </StatIcon>
            </StatHeader>
            <StatLabel>S komentářem</StatLabel>
          </StatCard>
        )}

        {shouldShowTile(stats.withMyComments || 0) && (
          <StatCard
            $color={STATUS_COLORS.WITH_MY_COMMENTS.dark}
            $clickable
            $isActive={activeStatus === 's_mymi_komentari'}
            onClick={() => onStatusClick?.('s_mymi_komentari')}
          >
            <StatHeader>
              <StatValue>{stats.withMyComments || 0}</StatValue>
              <StatIcon $color={STATUS_COLORS.WITH_MY_COMMENTS.dark}>
                <FontAwesomeIcon icon={faCommentDots} />
              </StatIcon>
            </StatHeader>
            <StatLabel>S mými komentáři</StatLabel>
          </StatCard>
        )}
        </SmallCardsGrid>
      </DashboardGrid>
    </DashboardPanel>
  );
};

export default OrdersDashboardV3Full;
