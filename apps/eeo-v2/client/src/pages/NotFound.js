import React from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faArrowLeft, faHome } from '@fortawesome/free-solid-svg-icons';
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
  color: #f59e0b;
  margin-bottom: 2rem;
  animation: bounce 2s ease-in-out infinite;

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;

const ErrorCode = styled.div`
  font-size: 6rem;
  font-weight: 700;
  color: #e5e7eb;
  line-height: 1;
  margin-bottom: 1rem;
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

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <ErrorCode>404</ErrorCode>
      
      <IconWrapper>
        <FontAwesomeIcon icon={faExclamationTriangle} />
      </IconWrapper>
      
      <Title>Stránka nenalezena</Title>
      
      <Message>
        Omlouváme se, ale stránka kterou hledáte neexistuje nebo byla přesunuta.
        Zkontrolujte prosím adresu nebo se vraťte na hlavní stránku.
      </Message>

      <ButtonGroup>
        <Button className="primary" onClick={() => {
          const homepage = getDefaultHomepageSync();
          navigate(homepage);
        }}>
          <FontAwesomeIcon icon={faHome} />
          Hlavní stránka
        </Button>
        <Button className="secondary" onClick={() => navigate(-1)}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Zpět
        </Button>
      </ButtonGroup>
    </Container>
  );
};

export default NotFound;
