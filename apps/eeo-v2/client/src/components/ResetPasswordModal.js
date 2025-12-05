/** @jsxImportSource @emotion/react */
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { css } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const overlayStyle = css`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999999;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const dialogStyle = css`
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(2, 6, 23, 0.25);
  max-width: 92%;
  width: 500px;
  box-sizing: border-box;
  font-family: var(--app-font-family, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Inter', 'Helvetica Neue', Arial, sans-serif);
`;

const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 2px solid #eef2f7;
  margin-bottom: 16px;
`;

const titleStyle = css`
  font-size: 18px;
  font-weight: 700;
  color: #111827;
`;

const closeBtnStyle = css`
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 6px;
  border-radius: 6px;
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const formGroupStyle = css`
  margin-bottom: 20px;
`;

const labelStyle = css`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
`;

const inputWrapperStyle = css`
  position: relative;
  display: flex;
  align-items: center;
`;

const inputStyle = css`
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &.error {
    border-color: #dc2626;
  }

  &.success {
    border-color: #16a34a;
  }
`;

const toggleButtonStyle = css`
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 6px;
  display: flex;
  align-items: center;

  &:hover {
    color: #374151;
  }
`;

const requirementsStyle = css`
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const requirementsTitleStyle = css`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const requirementItemStyle = css`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;

  &.valid {
    color: #16a34a;
  }

  &.invalid {
    color: #dc2626;
  }
`;

const errorMessageStyle = css`
  color: #dc2626;
  font-size: 13px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
  border: 1px solid #fecaca;
`;

const userInfoStyle = css`
  background: #eff6ff;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #bfdbfe;
`;

const userInfoLabelStyle = css`
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const userInfoValueStyle = css`
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
`;

const buttonsStyle = css`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
`;

const cancelButtonStyle = css`
  background: white;
  color: #374151;
  border: 2px solid #d1d5db;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: #f8fafc;
    border-color: #9ca3af;
  }
`;

const confirmButtonStyle = css`
  background: #3b82f6;
  color: white;
  border: 2px solid #3b82f6;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    border-color: #9ca3af;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const validatePassword = (password) => {
  return {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
};

const ResetPasswordModal = ({ isOpen, onClose, onConfirm, userData }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ password: false, confirm: false });

  useEffect(() => {
    if (!isOpen) {
      // Reset při zavření
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError('');
      setTouched({ password: false, confirm: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validation = validatePassword(password);
  const isPasswordValid = Object.values(validation).every(v => v);
  const doPasswordsMatch = password === confirmPassword;
  const isFormValid = isPasswordValid && doPasswordsMatch && password.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Prosím opravte chyby ve formuláři');
      return;
    }

    onConfirm(password);
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
  };

  const handleConfirmBlur = () => {
    setTouched(prev => ({ ...prev, confirm: true }));
  };

  const getInputClassName = (field) => {
    if (!touched[field]) return '';

    if (field === 'password') {
      return isPasswordValid ? 'success' : 'error';
    }

    if (field === 'confirm') {
      return doPasswordsMatch && confirmPassword.length > 0 ? 'success' : 'error';
    }

    return '';
  };

  return ReactDOM.createPortal(
    <div css={overlayStyle} role="dialog" aria-modal="true">
      <div css={dialogStyle}>
        <div css={headerStyle}>
          <div css={titleStyle}>Reset hesla</div>
          <button aria-label="Zavřít" css={closeBtnStyle} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {userData && (
          <div css={userInfoStyle}>
            <div css={userInfoLabelStyle}>Uživatel:</div>
            <div css={userInfoValueStyle} style={{ fontSize: '16px', fontWeight: 700 }}>
              {userData.fullName || `${userData.surname || ''} ${userData.name || ''}`.trim() || userData.username}
              {userData.username && (
                <span style={{ fontWeight: 500, color: '#64748b', marginLeft: '8px' }}>
                  ({userData.username})
                </span>
              )}
            </div>
            {userData.email && userData.email !== 'N/A' && (
              <div css={userInfoValueStyle} style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 400 }}>
                {userData.email}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div css={formGroupStyle}>
            <label css={labelStyle}>Nové heslo *</label>
            <div css={inputWrapperStyle}>
              <input
                css={inputStyle}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                placeholder="Zadejte nové heslo"
                className={getInputClassName('password')}
                autoComplete="new-password"
              />
              <button
                type="button"
                css={toggleButtonStyle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>

            <div css={requirementsStyle}>
              <div css={requirementsTitleStyle}>Požadavky na heslo:</div>
              <div css={requirementItemStyle} className={validation.minLength ? 'valid' : 'invalid'}>
                <FontAwesomeIcon icon={validation.minLength ? faCheckCircle : faTimesCircle} />
                Minimálně 8 znaků
              </div>
              <div css={requirementItemStyle} className={validation.hasUpperCase ? 'valid' : 'invalid'}>
                <FontAwesomeIcon icon={validation.hasUpperCase ? faCheckCircle : faTimesCircle} />
                Alespoň jedno velké písmeno (A-Z)
              </div>
              <div css={requirementItemStyle} className={validation.hasLowerCase ? 'valid' : 'invalid'}>
                <FontAwesomeIcon icon={validation.hasLowerCase ? faCheckCircle : faTimesCircle} />
                Alespoň jedno malé písmeno (a-z)
              </div>
              <div css={requirementItemStyle} className={validation.hasNumber ? 'valid' : 'invalid'}>
                <FontAwesomeIcon icon={validation.hasNumber ? faCheckCircle : faTimesCircle} />
                Alespoň jedna číslice (0-9)
              </div>
              <div css={requirementItemStyle} className={validation.hasSpecialChar ? 'valid' : 'invalid'}>
                <FontAwesomeIcon icon={validation.hasSpecialChar ? faCheckCircle : faTimesCircle} />
                Alespoň jeden speciální znak (!@#$%^&*...)
              </div>
            </div>
          </div>

          <div css={formGroupStyle}>
            <label css={labelStyle}>Potvrdit heslo *</label>
            <div css={inputWrapperStyle}>
              <input
                css={inputStyle}
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={handleConfirmBlur}
                placeholder="Zadejte heslo znovu"
                className={getInputClassName('confirm')}
                autoComplete="new-password"
              />
              <button
                type="button"
                css={toggleButtonStyle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {touched.confirm && !doPasswordsMatch && confirmPassword.length > 0 && (
              <div css={errorMessageStyle}>
                Hesla se neshodují
              </div>
            )}
          </div>

          {error && (
            <div css={errorMessageStyle}>
              {error}
            </div>
          )}

          <div css={buttonsStyle}>
            <button type="button" css={cancelButtonStyle} onClick={onClose}>
              Zrušit
            </button>
            <button type="submit" css={confirmButtonStyle} disabled={!isFormValid}>
              Resetovat heslo
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ResetPasswordModal;
