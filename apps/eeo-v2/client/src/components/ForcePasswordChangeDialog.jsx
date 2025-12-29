import React, { useState, useContext } from 'react';
import styled from '@emotion/styled';
import { AuthContext } from '../context/AuthContext';
import { Key, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import PasswordStrengthValidator, { validatePasswordStrength } from './PasswordStrengthValidator';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const Dialog = styled.div`
  width: min(450px, 92vw);
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  padding: 2rem;
  color: #0f172a;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f2b5a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: ${props => props.hasError ? '#fef2f2' : '#ffffff'};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const EyeButton = styled.button`
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: #374151;
    background: #f3f4f6;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ErrorText = styled.div`
  color: #dc2626;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;

  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: 2px solid transparent;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const InfoBox = styled.div`
  background: #fef3cd;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;

  p {
    margin: 0;
    color: #92400e;
    font-size: 0.875rem;
    line-height: 1.4;
  }
`;

const ForcePasswordChangeDialog = () => {
  const { changeForcePassword, error, user } = useContext(AuthContext);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validace
    if (!password) {
      setLocalError('Heslo je povinné');
      return;
    }

    if (password.length < 8) {
      setLocalError('Heslo musí mít alespoň 8 znaků');
      return;
    }

    if (!validatePasswordStrength(password)) {
      setLocalError('Heslo musí obsahovat alespoň 8 znaků, malé a velké písmeno, číslo a speciální znak');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Hesla se neshodují');
      return;
    }

    try {
      setLoading(true);
      await changeForcePassword(password);
    } catch (err) {
      setLocalError(err.message || 'Chyba při změně hesla');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = password && confirmPassword && password === confirmPassword && validatePasswordStrength(password);

  return (
    <Backdrop>
      <Dialog role="dialog" aria-modal="true">
        <Header>
          <Title>
            <Key />
            Nutná změna hesla
          </Title>
          <Subtitle>
            Váš administrátor vyžaduje změnu hesla před pokračováním do systému.
          </Subtitle>
        </Header>

        <InfoBox>
          <p>
            <strong>Uživatel:</strong> {user?.username}<br />
            Pro pokračování do systému je nutné nastavit nové bezpečné heslo.
          </p>
        </InfoBox>

        <Form onSubmit={handleSubmit}>
          <Field>
            <Label>Nové heslo</Label>
            <InputWrapper>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Zadejte nové heslo"
                hasError={!!localError}
                autoComplete="new-password"
              />
              <EyeButton 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </EyeButton>
            </InputWrapper>
          </Field>

          <Field>
            <Label>Potvrzení hesla</Label>
            <InputWrapper>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Potvrďte nové heslo"
                hasError={!!localError}
                autoComplete="new-password"
              />
              <EyeButton 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </EyeButton>
            </InputWrapper>
          </Field>

          {password && (
            <PasswordStrengthValidator
              password={password}
              showRequirements={true}
            />
          )}

          {(localError || error) && (
            <ErrorText>
              <AlertCircle />
              {localError || error}
            </ErrorText>
          )}

          <Button type="submit" disabled={!canSubmit || loading}>
            <Save />
            {loading ? 'Ukládám heslo...' : 'Změnit heslo a pokračovat'}
          </Button>
        </Form>
      </Dialog>
    </Backdrop>
  );
};

export default ForcePasswordChangeDialog;