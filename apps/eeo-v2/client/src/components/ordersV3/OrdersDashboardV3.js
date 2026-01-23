/**
 * OrdersDashboardV3.js
 * 
 * Dashboard komponenta pro Orders V3
 * Reuse styled components z Orders25List.js s optimalizacemi
 */

import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt,
  faCheckCircle,
  faPaperPlane,
  faArchive,
  faBan,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// STYLED COMPONENTS (z Orders25List.js)
// ============================================================================

const DashboardPanel = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(350px, 400px) repeat(auto-fit, minmax(180px, 220px));
  gap: clamp(0.8rem, 1.5vw, 1.65rem);
  margin-bottom: 1.5rem;
  align-items: start;
  justify-content: start;
  overflow-x: auto;

  @media (max-width: 1400px) {
    grid-template-columns: minmax(320px, 350px) repeat(auto-fit, minmax(160px, 200px));
  }

  @media (max-width: 1200px) {
    grid-template-columns: minmax(300px, 330px) repeat(auto-fit, minmax(150px, 180px));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const LargeStatCard = styled.div`
  background: linear-gradient(145deg, #ffffff, #f9fafb);
  border-radius: 16px;
  padding: clamp(1.25rem, 1.5vw, 1.75rem);
  border-left: 6px solid ${props => props.$color || '#3b82f6'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  grid-row: span 2;
  grid-column: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
  }

  ${props => props.$active && `
    background: linear-gradient(145deg, ${props.$color}15, ${props.$color}08);
    border-left-width: 8px;
  `}

  @media (max-width: 1200px) {
    grid-row: span 1;
    grid-column: span 2;
  }
  
  @media (max-width: 900px) {
    grid-column: span 1;
  }
`;

const StatCard = styled.div`
  background: ${props => props.$active ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: clamp(0.8rem, 1vw, 1rem);
  border-left: 4px solid ${props => props.$color || '#3b82f6'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  min-height: clamp(90px, 10vh, 120px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'translateY(-1px)'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
    ${props => props.$clickable && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}25, ${props.$color || '#3b82f6'}15);
    `}
  }

  ${props => props.$active && `
    border-left-width: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40;
  `}
`;

const StatIcon = styled.div`
  font-size: clamp(1.5rem, 2vw, 2rem);
  color: ${props => props.$color || '#3b82f6'};
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: clamp(1.25rem, 2.5vw, 1.875rem);
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
  color: #64748b;
  font-weight: 500;
  line-height: 1.4;
`;

const LargeStatValue = styled(StatValue)`
  font-size: clamp(2rem, 3.5vw, 3rem);
`;

const LargeStatLabel = styled(StatLabel)`
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  font-weight: 600;
  color: #475569;
`;

const SmallStatValue = styled.div`
  font-size: clamp(0.875rem, 1.3vw, 1rem);
  color: #64748b;
  margin-top: 0.5rem;
`;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Dashboard komponenta s přehlednými kartami
 * 
 * @param {Object} props
 * @param {Object} props.stats - Statistiky z BE
 * @param {string} props.activeFilter - Aktivní filtr ('NOVA', 'SCHVALENA', atd.)
 * @param {Function} props.onFilterChange - Callback pro změnu filtru
 */
function OrdersDashboardV3({ stats, activeFilter, onFilterChange }) {
  const {
    total = 0,
    nova = 0,
    schvalena = 0,
    odeslana = 0,
    archivovano = 0,
    storno = 0,
    total_amount = 0,
    nova_amount = 0,
    schvalena_amount = 0,
  } = stats;

  const formatCurrency = (amount) => {
    return Math.round(amount || 0).toLocaleString('cs-CZ') + ' Kč';
  };

  return (
    <DashboardPanel>
      <DashboardGrid>
        {/* Hlavní karta - Celkem */}
        <LargeStatCard
          $color="#4caf50"
          $active={!activeFilter}
          $clickable
          onClick={() => onFilterChange?.('')}
          title="Klikněte pro zobrazení všech objednávek"
        >
          <div>
            <StatIcon $color="#4caf50">
              <FontAwesomeIcon icon={faFileAlt} />
            </StatIcon>
            <LargeStatValue>
              {total.toLocaleString('cs-CZ')}
            </LargeStatValue>
            <LargeStatLabel>Celkem objednávek</LargeStatLabel>
          </div>
          <SmallStatValue>
            {formatCurrency(total_amount)}
          </SmallStatValue>
        </LargeStatCard>

        {/* Nové */}
        <StatCard
          $color="#3b82f6"
          $active={activeFilter === 'NOVA'}
          $clickable
          onClick={() => onFilterChange?.('NOVA')}
          title="Klikněte pro filtrování nových objednávek"
        >
          <StatIcon $color="#3b82f6">
            <FontAwesomeIcon icon={faFileAlt} />
          </StatIcon>
          <StatValue>{nova}</StatValue>
          <StatLabel>Nové</StatLabel>
          <SmallStatValue>{formatCurrency(nova_amount)}</SmallStatValue>
        </StatCard>

        {/* Schválené */}
        <StatCard
          $color="#10b981"
          $active={activeFilter === 'SCHVALENA'}
          $clickable
          onClick={() => onFilterChange?.('SCHVALENA')}
          title="Klikněte pro filtrování schválených objednávek"
        >
          <StatIcon $color="#10b981">
            <FontAwesomeIcon icon={faCheckCircle} />
          </StatIcon>
          <StatValue>{schvalena}</StatValue>
          <StatLabel>Schválené</StatLabel>
          <SmallStatValue>{formatCurrency(schvalena_amount)}</SmallStatValue>
        </StatCard>

        {/* Odeslané dodavateli */}
        <StatCard
          $color="#f59e0b"
          $active={activeFilter === 'ODESLANA_DODAVATELI'}
          $clickable
          onClick={() => onFilterChange?.('ODESLANA_DODAVATELI')}
          title="Klikněte pro filtrování odeslaných objednávek"
        >
          <StatIcon $color="#f59e0b">
            <FontAwesomeIcon icon={faPaperPlane} />
          </StatIcon>
          <StatValue>{odeslana}</StatValue>
          <StatLabel>Odeslané</StatLabel>
        </StatCard>

        {/* Archivované */}
        <StatCard
          $color="#6b7280"
          $active={activeFilter === 'ARCHIVOVANO'}
          $clickable
          onClick={() => onFilterChange?.('ARCHIVOVANO')}
          title="Klikněte pro filtrování archivovaných objednávek"
        >
          <StatIcon $color="#6b7280">
            <FontAwesomeIcon icon={faArchive} />
          </StatIcon>
          <StatValue>{archivovano}</StatValue>
          <StatLabel>Archivované</StatLabel>
        </StatCard>

        {/* Storno */}
        <StatCard
          $color="#ef4444"
          $active={activeFilter === 'STORNO'}
          $clickable
          onClick={() => onFilterChange?.('STORNO')}
          title="Klikněte pro filtrování stornovaných objednávek"
        >
          <StatIcon $color="#ef4444">
            <FontAwesomeIcon icon={faBan} />
          </StatIcon>
          <StatValue>{storno}</StatValue>
          <StatLabel>Storno</StatLabel>
        </StatCard>
      </DashboardGrid>
    </DashboardPanel>
  );
}

export default OrdersDashboardV3;
