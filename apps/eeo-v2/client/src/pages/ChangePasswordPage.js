import React, { useState, useContext } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Lock, Eye, EyeOff, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { changePasswordApi2 } from '../services/api2auth';

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

const PageContainer = styled.div`
  position: fixed;
  inset: 0;
  height: 100dvh;
  width: 100vw;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const PasswordCard = styled.div`
  max-width: 500px;
  width: 100%;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  animation: ${slideInUp} 0.6s ease-out;
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 1.4rem 1.6rem;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
`;

const HeaderIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  border: 3px solid rgba(255,255,255,0.35);
  position: relative;
  z-index: 1;
  color: #ffffff;
`;

const CardTitle = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  position: relative;
  z-index: 1;
  color: #ffffff;
`;

const CardSubtitle = styled.p`
  margin: 0;
  font-size: 1rem;
  color: rgba(255,255,255,0.9);
  position: relative;
  z-index: 1;
`;

const CardContent = styled.div`
  padding: 1.25rem 1.4rem 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InputContainer = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 3rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: #f8fafc;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &.error {
    border-color: #ef4444;
    background: #fef2f2;
  }

  &.success {
    border-color: #10b981;
    background: #f0fdf4;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: #374151;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const PasswordStrength = styled.div`
  margin-top: 0.5rem;
`;

const StrengthBar = styled.div`
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const StrengthFill = styled.div`
  height: 100%;
  background: ${props => {
    switch (props.strength) {
      case 'weak': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'strong': return '#10b981';
      default: return '#e5e7eb';
    }
  }};
  width: ${props => {
    switch (props.strength) {
      case 'weak': return '33%';
      case 'medium': return '66%';
      case 'strong': return '100%';
      default: return '0%';
    }
  }};
  transition: all 0.3s ease;
`;

const StrengthText = styled.div`
  font-size: 0.75rem;
  color: ${props => {
    switch (props.strength) {
      case 'weak': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'strong': return '#10b981';
      default: return '#6b7280';
    }
  }};
  font-weight: 500;
`;

const RequirementsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0.75rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Requirement = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${props => props.met ? '#10b981' : '#6b7280'};
`;

const SubmitButton = styled.button`
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
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
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  ${css`animation: ${spinAnimation} 1s linear infinite;`}
`;

const ChangePasswordPage = () => {
  const { token, username, logout } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return null;

    let score = 0;

    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character types
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  };

  const getPasswordRequirements = (password) => {
    return [
      { text: 'Alespoň 8 znaků', met: password.length >= 8 },
      { text: 'Obsahuje malé písmeno', met: /[a-z]/.test(password) },
      { text: 'Obsahuje velké písmeno', met: /[A-Z]/.test(password) },
      { text: 'Obsahuje číslo', met: /[0-9]/.test(password) },
      { text: 'Obsahuje speciální znak', met: /[^A-Za-z0-9]/.test(password) }
    ];
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Současné heslo je povinné';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Nové heslo je povinné';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Heslo musí mít alespoň 8 znaků';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Potvrzení hesla je povinné';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Hesla se neshodují';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'Nové heslo musí být odlišné od současného';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await changePasswordApi2({
        token,
        username,
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (showToast) {
        showToast('Heslo bylo úspěšně změněno', 'success');
      }

      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Optional: logout user to force re-login with new password
      // logout();

    } catch (error) {

      if (showToast) {
        showToast('Chyba při změně hesla: ' + error.message, 'error');
      }

      if (error.message.includes('současné heslo')) {
        setErrors({ currentPassword: 'Nesprávné současné heslo' });
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);
  const passwordRequirements = getPasswordRequirements(formData.newPassword);

  return (
    <PageContainer>
      <PasswordCard>
        <CardHeader>
          <HeaderIcon>
            <Lock size={28} />
          </HeaderIcon>
          <CardTitle>Změna hesla</CardTitle>
          <CardSubtitle>Zabezpečte svůj účet novým silným heslem</CardSubtitle>
        </CardHeader>

        <CardContent>
          <Form onSubmit={handleSubmit}>
            {/* Current Password */}
            <FormGroup>
              <Label>
                <Shield size={16} />
                Současné heslo
              </Label>
              <InputContainer>
                <Input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  className={errors.currentPassword ? 'error' : ''}
                  placeholder="Zadejte současné heslo"
                />
                <ToggleButton
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </ToggleButton>
              </InputContainer>
              {errors.currentPassword && (
                <ErrorMessage>
                  <XCircle size={16} />
                  {errors.currentPassword}
                </ErrorMessage>
              )}
            </FormGroup>

            {/* New Password */}
            <FormGroup>
              <Label>
                <Lock size={16} />
                Nové heslo
              </Label>
              <InputContainer>
                <Input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className={errors.newPassword ? 'error' : (passwordStrength === 'strong' ? 'success' : '')}
                  placeholder="Zadejte nové heslo"
                />
                <ToggleButton
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </ToggleButton>
              </InputContainer>

              {formData.newPassword && (
                <PasswordStrength>
                  <StrengthBar>
                    <StrengthFill strength={passwordStrength} />
                  </StrengthBar>
                  <StrengthText strength={passwordStrength}>
                    Síla hesla: {
                      passwordStrength === 'weak' ? 'Slabé' :
                      passwordStrength === 'medium' ? 'Střední' :
                      passwordStrength === 'strong' ? 'Silné' : ''
                    }
                  </StrengthText>

                  <RequirementsList>
                    {passwordRequirements.map((req, index) => (
                      <Requirement key={index} met={req.met}>
                        {req.met ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {req.text}
                      </Requirement>
                    ))}
                  </RequirementsList>
                </PasswordStrength>
              )}

              {errors.newPassword && (
                <ErrorMessage>
                  <XCircle size={16} />
                  {errors.newPassword}
                </ErrorMessage>
              )}
            </FormGroup>

            {/* Confirm Password */}
            <FormGroup>
              <Label>
                <CheckCircle size={16} />
                Potvrzení hesla
              </Label>
              <InputContainer>
                <Input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={
                    errors.confirmPassword ? 'error' :
                    (formData.confirmPassword && formData.newPassword === formData.confirmPassword ? 'success' : '')
                  }
                  placeholder="Potvrďte nové heslo"
                />
                <ToggleButton
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </ToggleButton>
              </InputContainer>
              {errors.confirmPassword && (
                <ErrorMessage>
                  <XCircle size={16} />
                  {errors.confirmPassword}
                </ErrorMessage>
              )}
            </FormGroup>

            <SubmitButton
              type="submit"
              disabled={loading || passwordStrength !== 'strong' || formData.newPassword !== formData.confirmPassword}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  Měním heslo...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Změnit heslo
                </>
              )}
            </SubmitButton>
          </Form>
        </CardContent>
      </PasswordCard>
    </PageContainer>
  );
};

export default ChangePasswordPage;