import React from 'react';
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';

// Animace pro spinner
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// Styled components
const SplashContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1f2a57 0%, #2c3e7a 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${fadeIn} 0.2s ease-in;
  
  &.hidden {
    animation: ${fadeOut} 0.3s ease-out forwards;
  }
`;

const LogoContainer = styled.div`
  margin-bottom: 2rem;
  animation: ${fadeIn} 0.5s ease-in;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const LogoImage = styled.img`
  width: 225px;
  height: 225px;
  object-fit: contain;
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3));
  animation: ${fadeIn} 0.6s ease-in;
`;

const Logo = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  letter-spacing: 3px;
  text-shadow: 0 4px 20px rgba(37, 99, 235, 0.5);
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-top: 0.5rem;
  letter-spacing: 1px;
`;

const SpinnerContainer = styled.div`
  margin: 2rem 0;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid #ffffff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  margin-top: 1.5rem;
  animation: ${pulse} 1.5s ease-in-out infinite;
  letter-spacing: 0.5px;
`;

const VersionText = styled.div`
  position: absolute;
  bottom: 2rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
`;

/**
 * SplashScreen - Zobrazuje se POUZE při cold start (první načtení v novém tabu/okně)
 * 🎯 OPTIMALIZACE: Při F5/reload se NEzobrazuje (řízeno v index.js pomocí sessionStorage)
 * @param {Object} props
 * @param {string} [props.message] - Volitelná zpráva pro zobrazení
 */
const SplashScreen = ({ message = 'Spouštění aplikace...' }) => {
  return (
    <SplashContainer>
      <LogoContainer>
        <LogoImage src={`${process.env.PUBLIC_URL}/logo512.png`} alt="ZZS Logo" />
        <Logo>ERDMS</Logo>
        <Subtitle>Systém správy a workflow objednávek</Subtitle>
      </LogoContainer>

      <SpinnerContainer>
        <Spinner />
      </SpinnerContainer>

      <LoadingText>{message}</LoadingText>

      <VersionText>verze {process.env.REACT_APP_VERSION || '1.86.V2.08122025 (LP financování fix, DatePicker portal fix, UI cleanup)'}</VersionText>
    </SplashContainer>
  );
};

export default SplashScreen;
