import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faCircleInfo } from '@fortawesome/free-solid-svg-icons';

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
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1rem;
  color: white;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
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

const Card = styled.div`
  background: white;
  border-radius: 14px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
`;

const PlaceholderBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
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

export default function MajetekOverviewPage() {
  return (
    <PageWrapper>
      <PageContainer>
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faList} /> Přehled majetku
          </PageTitle>
        </PageHeader>

        <Card>
          <PlaceholderBox>
            <FontAwesomeIcon icon={faCircleInfo} size="2x" color="#4f46e5" />
            <PlaceholderTitle>Sekce se připravuje</PlaceholderTitle>
            <PlaceholderText>
              Přehled majetku bude doplněn v další fázi.
            </PlaceholderText>
          </PlaceholderBox>
        </Card>
      </PageContainer>
    </PageWrapper>
  );
}
