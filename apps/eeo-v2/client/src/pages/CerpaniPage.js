import React, { useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBill, faFileContract, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import LimitovanePrislibyManager from '../components/LimitovanePrislibyManager';
import SmlouvyTab from '../components/dictionaries/tabs/SmlouvyTab';

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 2rem 1rem;
`;

const PageContainer = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1rem;
  color: white;
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const PageTitle = styled.h1`
  font-size: 2.1rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: white;
  }
`;

const PageSubtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.98rem;
`;

const TabsContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  flex: 1;
  min-width: 220px;
  padding: 0.9rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;

  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' : '#f3f4f6'};
    color: ${props => props.$active ? 'white' : '#1f2937'};
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 14px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
`;

const ContentArea = styled.div`
  width: 100%;
`;

const PlaceholderBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
  text-align: center;
`;

const PlaceholderTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
`;

const PlaceholderText = styled.p`
  margin: 0;
  color: #4b5563;
  max-width: 520px;
`;

const TabContent = ({ title, description, children }) => {
  if (children) {
    return <ContentArea>{children}</ContentArea>;
  }

  return (
    <ContentCard>
      <PlaceholderBox>
        <FontAwesomeIcon icon={faCircleInfo} size="2x" color="#2563eb" />
        <PlaceholderTitle>{title}</PlaceholderTitle>
        <PlaceholderText>{description}</PlaceholderText>
      </PlaceholderBox>
    </ContentCard>
  );
};

export default function CerpaniPage() {
  const tabs = useMemo(() => ([
    {
      id: 'contracts',
      label: 'Čerpání smluv',
      icon: faFileContract,
      title: 'Čerpání smluv',
      description: 'Sekce se připravuje.',
      render: () => <SmlouvyTab readOnly />
    },
    {
      id: 'limited-promises',
      label: 'Čerpání limitovaných příslibů',
      icon: faMoneyBill,
      title: 'Čerpání limitovaných příslibů',
      description: 'Sekce se připravuje.',
      render: () => <LimitovanePrislibyManager />
    }
  ]), []);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('cerpani_active_tab') || tabs[0].id;
    } catch {
      return tabs[0].id;
    }
  });
  const active = tabs.find(tab => tab.id === activeTab) || tabs[0];

  return (
    <PageWrapper>
      <PageContainer>
        <PageHeader>
          <TitleGroup>
            <PageTitle>
              <FontAwesomeIcon icon={faMoneyBill} /> Čerpání
            </PageTitle>
            <PageSubtitle>Nová sekce v přípravě.</PageSubtitle>
          </TitleGroup>
        </PageHeader>

        <TabsContainer>
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              type="button"
              $active={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                try {
                  localStorage.setItem('cerpani_active_tab', tab.id);
                } catch {}
              }}
            >
              <FontAwesomeIcon icon={tab.icon} />
              {tab.label}
            </TabButton>
          ))}
        </TabsContainer>

        <TabContent title={active.title} description={active.description}>
          {active.render ? active.render() : null}
        </TabContent>
      </PageContainer>
    </PageWrapper>
  );
}
