import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faWrench } from '@fortawesome/free-solid-svg-icons';

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ContentBox = styled.div`
  background: white;
  border-radius: 1.5rem;
  padding: 4rem 3rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  text-align: center;
`;

const IconWrapper = styled.div`
  font-size: 5rem;
  color: ${({theme}) => theme.colors.primary};
  margin-bottom: 2rem;
  animation: rotate 3s linear infinite;
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: ${({theme}) => theme.colors.primary};
  margin-bottom: 1rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 1rem;
  margin-top: 2rem;
  font-size: 1rem;
  line-height: 1.5;
`;

const AppSettings = () => {
  return (
    <PageContainer>
      <ContentBox>
        <IconWrapper>
          <FontAwesomeIcon icon={faCog} />
        </IconWrapper>
        <Title>Nastavení aplikace</Title>
        <Subtitle>
          Tato sekce je momentálně ve vývoji. Brzy zde budete moci spravovat globální nastavení aplikace.
        </Subtitle>
        <InfoBox>
          <FontAwesomeIcon icon={faWrench} style={{marginRight: '0.5rem'}} />
          Připravujeme pro vás pokročilé možnosti konfigurace systému, správu oprávnění a další nástroje pro administraci.
        </InfoBox>
      </ContentBox>
    </PageContainer>
  );
};

export default AppSettings;
