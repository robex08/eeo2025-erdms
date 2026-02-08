import React from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { getDefaultHomepageSync } from '../utils/homepageHelper';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 2rem;
  text-align: center;
`;

const IconWrapper = styled.div`
  font-size: 5rem;
  color: #dc2626;
  margin-bottom: 2rem;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #1f2937;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const Message = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 2rem;
  max-width: 500px;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &.primary {
    background: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
  }

  &.secondary {
    background: #e5e7eb;
    color: #374151;

    &:hover {
      background: #d1d5db;
      transform: translateY(-1px);
    }
  }
`;

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <IconWrapper>
        <FontAwesomeIcon icon={faLock} />
      </IconWrapper>
      
      <Title>Přístup zamítnut</Title>
      
      <Message>
        Nemáte oprávnění k zobrazení této stránky. 
        Pro získání přístupu kontaktujte svého správce systému nebo se vraťte na hlavní stránku.
      </Message>

      <ButtonGroup>
        <Button className="primary" onClick={() => {
          const homepage = getDefaultHomepageSync();
          navigate(homepage);
        }}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Přejít na objednávky
        </Button>
        <Button className="secondary" onClick={() => navigate(-1)}>
          Zpět
        </Button>
      </ButtonGroup>
    </Container>
  );
};

export default AccessDenied;
