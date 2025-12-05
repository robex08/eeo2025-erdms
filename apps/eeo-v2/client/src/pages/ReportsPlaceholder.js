import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faFileExcel, faFilePdf, faCalendarAlt, faCog } from '@fortawesome/free-solid-svg-icons';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--app-fixed-offset, 140px));
  padding: 2rem;
  background: #f8f9fa;
  color: #333;
`;

const IconWrapper = styled.div`
  font-size: 6rem;
  margin-bottom: 2rem;
  color: #667eea;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
  color: #2d3748;
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  margin-bottom: 3rem;
  text-align: center;
  color: #718096;
  max-width: 600px;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  max-width: 900px;
  width: 100%;
  margin-top: 2rem;
`;

const FeatureCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    border-color: #667eea;
  }
`;

const FeatureIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #667eea;
`;

const FeatureTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2d3748;
`;

const FeatureDesc = styled.p`
  font-size: 0.9rem;
  color: #718096;
  line-height: 1.4;
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: 500;
  margin-top: 2rem;
  border: 1px solid #e2e8f0;
  color: #718096;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
`;

const ReportsPlaceholder = () => {
  return (
    <Container>
      <IconWrapper>
        <FontAwesomeIcon icon={faChartBar} />
      </IconWrapper>
      
      <Title>📊 Reporty</Title>
      
      <Subtitle>
        Komplexní systém pro generování, správu a export reportů z objednávek, financí a dalších oblastí aplikace.
      </Subtitle>
      
      <FeatureGrid>
        <FeatureCard>
          <FeatureIcon>
            <FontAwesomeIcon icon={faChartBar} />
          </FeatureIcon>
          <FeatureTitle>Kontrolní reporty</FeatureTitle>
          <FeatureDesc>
            Kontrola stavu objednávek, registrů a workflow
          </FeatureDesc>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>
            <FontAwesomeIcon icon={faFileExcel} />
          </FeatureIcon>
          <FeatureTitle>Export dat</FeatureTitle>
          <FeatureDesc>
            Export do CSV, Excel, PDF formátů
          </FeatureDesc>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>
            <FontAwesomeIcon icon={faCalendarAlt} />
          </FeatureIcon>
          <FeatureTitle>Časové filtry</FeatureTitle>
          <FeatureDesc>
            Filtrování podle období, dat a časových úseků
          </FeatureDesc>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureIcon>
            <FontAwesomeIcon icon={faCog} />
          </FeatureIcon>
          <FeatureTitle>Vlastní šablony</FeatureTitle>
          <FeatureDesc>
            Vytváření vlastních reportů dle potřeb
          </FeatureDesc>
        </FeatureCard>
      </FeatureGrid>
      
      <StatusBadge>
        <FontAwesomeIcon icon={faCog} spin />
        Sekce v přípravě - plánované dokončení Q1 2026
      </StatusBadge>
    </Container>
  );
};

export default ReportsPlaceholder;
