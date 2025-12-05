
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import MD5 from 'crypto-js/md5';

// Modern animations
const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Emotion styled komponenty mimo funkci Login
const Wrapper = styled.div`
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  height: 100dvh; /* avoid mobile browser UI issues */
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden; /* no outer scrollbars for login */

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const Container = styled.div`
  background: white;
  border-radius: 15px; /* změnšeno z 20px */
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1); /* změnšeno z 20px 40px */
  overflow: hidden;
  /* Zmenšeno o 25% */
  width: min(378px, 50vw); /* změnšeno z 504px */
  min-height: 155px; /* změnšeno z 206px */
  animation: ${slideInUp} 0.6s ease-out;
  border: 1px solid #e2e8f0;

  @media (max-width: 768px) {
    width: 64vw;
    min-height: 191px; /* změnšeno z 255px */
  }
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  padding: 0.94rem 1.13rem; /* změnšeno o 25% z 1.25rem 1.5rem */
  text-align: center;
`;

const Title = styled.h1`
  margin: 0 0 0.26rem 0; /* změnšeno z 0.35rem */
  font-size: 1.4rem; /* mírně změnšeno z 1.65rem pro čitelnost */
  font-weight: 700;
  position: relative;
  z-index: 1;
`;

const Subtitle = styled.p`
  margin: 0;
  opacity: 0.9;
  font-size: 0.85rem; /* mírně změnšeno z 0.95rem */
  position: relative;
  z-index: 1;
`;

const CardBody = styled.div`
  padding: 0.94rem 1.13rem 1.13rem; /* změnšeno o 25% */
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.13rem; /* změnšeno z 1.5rem */
`;

const InputGroup = styled.div`
  margin-bottom: 0.75rem; /* změnšeno z 1rem */
  position: relative;
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: 0.3rem; /* změnšeno z 0.4rem */
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem; /* mírně změnšeno z 0.85rem */
`;

const InputWrapper = styled.div`
  position: relative;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 0.75rem; /* změnšeno z 1rem */
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 1;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;

  &:hover {
    color: #667eea;
  }

  &:focus {
    outline: none;
    color: #667eea;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.59rem 0.68rem 0.59rem 2.5rem; /* sladeno s OrderForm25.js - zvětšen padding-left */
  border: 2px solid #e5e7eb;
  border-radius: 8px; /* změnšeno z 10px */
  font-size: 0.95rem; /* mírně změnšeno z 1rem pro čitelnost */
  transition: all 0.2s ease;
  background: #ffffff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.94rem; /* změnšeno z 1.25rem */
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 9px; /* změnšeno z 12px */
  font-size: 1.05rem; /* mírně změnšeno z 1.1rem */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.38rem; /* změnšeno z 0.5rem */
  margin-top: 1.5rem; /* změnšeno z 2rem */

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  ${css`animation: ${spinAnimation} 1s linear infinite;`}
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem; /* zmenšeno z 1rem */
  border-radius: 6px; /* zmenšeno z 8px */
  margin-top: 0.75rem; /* zmenšeno z 1rem */
  display: flex;
  align-items: center;
  gap: 0.38rem; /* zmenšeno z 0.5rem */
  font-size: 0.8rem; /* mírně zmenšeno z 0.875rem */
`;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error } = useContext(AuthContext);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      await login(username, password); // Nové API2 očekává raw password, hashování řeší backend
    } catch (err) {
      // Error was normalized and set in AuthContext; no raw message logging here to avoid showing English/technical text to user.
    } finally {
      setLoading(false);
    }
  };
  return (
    <Wrapper>
      <Container>
        <CardHeader>
          <Title>Přihlášení</Title>
          <Subtitle>Zadejte své přihlašovací údaje</Subtitle>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit}>
            <InputGroup>
              <InputLabel>Uživatelské jméno</InputLabel>
              <InputWrapper>
                <InputIcon>
                  <User size={20} />
                </InputIcon>
                <Input
                  type="text"
                  placeholder="Zadejte uživatelské jméno"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </InputWrapper>
            </InputGroup>

            <InputGroup>
              <InputLabel>Heslo</InputLabel>
              <InputWrapper>
                <InputIcon>
                  <Lock size={20} />
                </InputIcon>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Zadejte heslo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: '2.5rem' }}
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  title={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </PasswordToggle>
              </InputWrapper>
            </InputGroup>

            <Button type="submit" disabled={loading || !username || !password}>
              {loading ? (
                <>
                  <LoadingSpinner />
                  Přihlašuje se...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Přihlásit se
                </>
              )}
            </Button>

            {error && (
              <ErrorMessage>
                <AlertCircle size={16} />
                {error}
              </ErrorMessage>
            )}
          </form>
        </CardBody>
      </Container>
    </Wrapper>
  );
};

export default Login;
