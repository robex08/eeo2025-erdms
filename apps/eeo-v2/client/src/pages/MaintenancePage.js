import React, { useState, useEffect, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTools, faSignOutAlt, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { getMaintenanceMessage } from '../services/globalSettingsApi';

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 40px,
      rgba(255, 193, 7, 0.1) 40px,
      rgba(255, 193, 7, 0.1) 80px
    );
    animation: slide 30s linear infinite;
  }
  
  @keyframes slide {
    0% { transform: translate(0, 0); }
    100% { transform: translate(80px, 80px); }
  }
`;

const ContentBox = styled.div`
  background: white;
  border-radius: 1.5rem;
  padding: 3rem 2.5rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const LogoWrapper = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
  
  img {
    width: 200px;
    height: auto;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
  }
`;

const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const IconWrapper = styled.div`
  font-size: 2.5rem;
  color: #ffc107;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  color: #1a1a1a;
  margin: 0;
  font-weight: 700;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #64748b;
  margin-bottom: 2rem;
  line-height: 1.4;
`;

const WarningBox = styled.div`
  background: #fff8e1;
  border-left: 4px solid #ffc107;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  margin: 2rem 0;
  text-align: left;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const WarningIcon = styled.div`
  color: #ffc107;
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
`;

const WarningText = styled.div`
  color: #78350f;
  font-size: 0.875rem;
  line-height: 1.5;

  strong {
    display: inline;
    font-weight: 600;
    margin-right: 0.5rem;
  }
`;const LogoutButton = styled.button`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 1.125rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const InfoBox = styled.div`
  background: #e0f2fe;
  border-left: 4px solid #0284c7;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  margin: 1.5rem 0;
  text-align: left;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const InfoIcon = styled.div`
  color: #0284c7;
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
`;

const InfoContent = styled.div`
  color: #075985;
  font-size: 0.9375rem;
  line-height: 1.6;
  white-space: pre-line;
`;

const InfoText = styled.p`
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 1.5rem;
  font-style: italic;
`;

const MaintenancePage = () => {
  const { logout, token, username } = useContext(AuthContext);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Systém je momentálně v údržbě. Omlouváme se za komplikace.');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadMessage = async () => {
      try {
        if (token && username) {
          const message = await getMaintenanceMessage(token, username);
          if (message) {
            setMaintenanceMessage(message);
          }
        }
      } catch (error) {
        console.error('Chyba při načítání údržbové zprávy:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessage();
  }, [token, username]);
  
  return (
    <PageContainer>
      <ContentBox>
        <LogoWrapper>
          <img src={`${process.env.PUBLIC_URL}/logo_zzs_main.png`} alt="ZZS Logo" />
        </LogoWrapper>
        
        <TitleWrapper>
          <IconWrapper>
            <FontAwesomeIcon icon={faTools} />
          </IconWrapper>
          <Title>Systém je v údržbě</Title>
        </TitleWrapper>
        
        {!loading && maintenanceMessage && (
          <InfoBox>
            <InfoIcon>
              <FontAwesomeIcon icon={faInfoCircle} />
            </InfoIcon>
            <InfoContent>{maintenanceMessage}</InfoContent>
          </InfoBox>
        )}
        
        {loading && <Subtitle>Načítání...</Subtitle>}
        
        <WarningBox>
          <WarningIcon>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </WarningIcon>
          <WarningText>
            <strong>Omlouváme se za způsobené komplikace.</strong> Pracujeme na vylepšení systému a brzy budeme zpět v provozu. Děkujeme za trpělivost a pochopení.
          </WarningText>
        </WarningBox>
        
        <LogoutButton onClick={() => logout()}>
          <FontAwesomeIcon icon={faSignOutAlt} />
          Odhlásit se
        </LogoutButton>
        
        <InfoText>
          Systém je momentálně v režimu údržby a není dostupný pro běžné uživatele.
        </InfoText>
      </ContentBox>
    </PageContainer>
  );
};

export default MaintenancePage;
