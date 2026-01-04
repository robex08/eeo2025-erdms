import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { X, Save, AlertCircle, Check, Calendar, Hash, User as UserIcon } from 'lucide-react';
import cashbookAPI from '../../services/cashbookService';
import { fetchAllUsers } from '../../services/api2auth';
import { AuthContext } from '../../context/AuthContext';

// ============================================================================
// ANIMACE
// ============================================================================

const slideInUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 92vh;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  animation: ${slideInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem 0.75rem 1.5rem;
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.05"><circle cx="30" cy="30" r="1"/></g></svg>');
    pointer-events: none;
  }
`;

const ModalHeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
`;

const ModalSubtitle = styled.p`
  margin: 0.375rem 0 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8125rem;
  font-weight: 400;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  padding: 0.625rem;
  border-radius: 10px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModalBody = styled.div`
  max-height: calc(92vh - 180px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f8fafc;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const FormSection = styled.div`
  padding: 1.25rem 1.5rem;
  background: white;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 1.25rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  grid-column: ${props => props.$fullWidth ? 'span 2' : 'span 1'};

  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.8125rem;
  color: #374151;
  margin-bottom: 0.375rem;
  display: block;

  &::after {
    content: ${props => props.required ? '" *"' : '""'};
    color: #dc2626;
    margin-left: 2px;
  }
`;

const InputWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg {
    position: absolute;
    left: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 15px !important;
    height: 15px !important;
  }
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.625rem 0.625rem 0.625rem 2.25rem' : '0.625rem'};
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  background: ${props => props.hasError ? '#fef2f2' : '#ffffff'};

  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  font-weight: ${props => {
    if (props.disabled) return '400';
    return props.value && props.value !== '' ? '600' : '400';
  }};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:focus + svg {
    color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #9ca3af;
    opacity: 1;
    font-weight: 400;
  }
`;

const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.625rem 0.625rem 0.625rem 2.25rem' : '0.625rem'};
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  background: ${props => props.hasError ? '#fef2f2' : '#ffffff'};
  cursor: pointer;

  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  font-weight: ${props => {
    if (props.disabled) return '400';
    return props.value && props.value !== '' ? '600' : '400';
  }};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:focus + svg {
    color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  /* Placeholder style pro prázdnou hodnotu */
  option[value=""] {
    color: #9ca3af;
  }
`;

const ErrorText = styled.span`
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem;
  background: #dcfce7;
  border: 2px solid #86efac;
  border-radius: 8px;
  color: #166534;
  font-weight: 500;
  font-size: 0.8125rem;
  margin-bottom: 0.875rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  font-weight: 500;
  margin-bottom: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8125rem;
`;

const ModalFooter = styled.div`
  padding: 1.25rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #64748b;
`;

const FooterRight = styled.div`
  display: flex;
  gap: 0.875rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.cancel {
    background: white;
    color: #64748b;
    border: 2px solid #e2e8f0;

    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
  }

  &.primary {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
    }

    &:disabled {
      background: #e2e8f0;
      color: #64748b;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }

  &.success {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    color: white;
    border: 2px solid transparent;
    animation: successPulse 0.5s ease-out;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4);
    }
  }

  @keyframes successPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const HintText = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.375rem;
  line-height: 1.4;
`;

// ============================================================================
// KOMPONENTA
// ============================================================================

const AddAssignmentDialog = ({
  isOpen,
  onClose,
  onSuccess,
  existingAssignments = [] // Pro kontrolu duplicit
}) => {
  const { token, user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    uzivatel_id: '',
    cislo_pokladny: '',
    vpd_cislo: '',
    vpd_od_cislo: 1,
    ppd_cislo: '',
    ppd_od_cislo: 1,
    platne_od: '',
    platne_do: ''
  });

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Načíst seznam uživatelů při otevření dialogu
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen || !token || !user?.username) return;

      setLoadingUsers(true);
      try {
        const usersData = await fetchAllUsers({
          token,
          username: user.username,
          show_inactive: false // Pouze aktivní uživatelé
        });
        setUsers(usersData || []);
      } catch (error) {
        console.error('Chyba při načítání uživatelů:', error);
        setErrorMessage('Nepodařilo se načíst seznam uživatelů');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isOpen, token, user?.username]);

  // Reset při otevření dialogu
  useEffect(() => {
    if (isOpen) {
      setFormData({
        uzivatel_id: '',
        cislo_pokladny: '',
        vpd_cislo: '',
        vpd_od_cislo: 1,
        ppd_cislo: '',
        ppd_od_cislo: 1,
        platne_od: '',
        platne_do: ''
      });
      setErrors({});
      setSuccessMessage('');
      setErrorMessage('');
      setIsClosing(false);
    }
  }, [isOpen]);

  // Esc key handler
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Vyčistit chybu pro toto pole
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Uživatel je povinný
    if (!formData.uzivatel_id) {
      newErrors.uzivatel_id = 'Vyberte uživatele';
    }

    // Číslo pokladny je povinné
    if (!formData.cislo_pokladny || formData.cislo_pokladny.trim() === '') {
      newErrors.cislo_pokladny = 'Číslo pokladny je povinné';
    } else {
      // Kontrola duplicity - už existuje přiřazení pro tuto kombinaci uživatel + pokladna?
      const duplicate = existingAssignments.find(
        a => a.uzivatel_id === parseInt(formData.uzivatel_id) &&
             a.cislo_pokladny === formData.cislo_pokladny
      );

      if (duplicate) {
        const userName = [duplicate.uzivatel_jmeno, duplicate.uzivatel_prijmeni]
          .filter(Boolean)
          .join(' ');
        newErrors.cislo_pokladny = `Pokladna ${formData.cislo_pokladny} je již přiřazena uživateli ${userName}`;
      }
    }

    // VPD je povinné
    if (!formData.vpd_cislo || formData.vpd_cislo.trim() === '') {
      newErrors.vpd_cislo = 'VPD číslo je povinné';
    }

    // VPD od čísla je povinné a musí být >= 1
    const vpdOdCislo = parseInt(formData.vpd_od_cislo);
    if (!formData.vpd_od_cislo || isNaN(vpdOdCislo) || vpdOdCislo < 1) {
      newErrors.vpd_od_cislo = 'VPD od čísla musí být >= 1';
    }

    // PPD je povinné
    if (!formData.ppd_cislo || formData.ppd_cislo.trim() === '') {
      newErrors.ppd_cislo = 'PPD číslo je povinné';
    }

    // PPD od čísla je povinné a musí být >= 1
    const ppdOdCislo = parseInt(formData.ppd_od_cislo);
    if (!formData.ppd_od_cislo || isNaN(ppdOdCislo) || ppdOdCislo < 1) {
      newErrors.ppd_od_cislo = 'PPD od čísla musí být >= 1';
    }

    // Kontrola datumů
    if (formData.platne_od && formData.platne_do) {
      const dateFrom = new Date(formData.platne_od);
      const dateTo = new Date(formData.platne_do);

      if (dateTo < dateFrom) {
        newErrors.platne_do = 'Datum do nemůže být před datem od';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const assignmentData = {
        uzivatel_id: parseInt(formData.uzivatel_id),
        cislo_pokladny: formData.cislo_pokladny,
        vpd_cislo: formData.vpd_cislo,
        vpd_od_cislo: parseInt(formData.vpd_od_cislo),
        ppd_cislo: formData.ppd_cislo,
        ppd_od_cislo: parseInt(formData.ppd_od_cislo),
        platne_od: formData.platne_od || null,
        platne_do: formData.platne_do || null
      };

      const result = await cashbookAPI.createAssignment(assignmentData);

      if (result.status === 'ok') {
        setSuccessMessage('✓ Přiřazení bylo úspěšně vytvořeno');
        setIsClosing(true);

        // Zobrazit success stav 1.5 sekundy, pak zavřít
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(result.message || 'Nepodařilo se vytvořit přiřazení');
      }
    } catch (error) {
      console.error('❌ Chyba při vytváření přiřazení:', error);
      setErrorMessage(error.message || 'Nepodařilo se vytvořit přiřazení');
    } finally {
      if (!isClosing) {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  // Příprava options pro CustomSelect
  const userOptions = Array.isArray(users) ? users.map(user => ({
    id: user.id,
    value: user.id,
    label: `${user.prijmeni || ''} ${user.jmeno || ''}${user.username ? ` (${user.username})` : ''}`.trim() || 'Bez jména'
  })) : [];

  return ReactDOM.createPortal(
    <ModalOverlay onClick={!loading ? onClose : undefined}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalHeaderContent>
            <HeaderLeft>
              <ModalTitle>Přidat nové přiřazení pokladny</ModalTitle>
              <ModalSubtitle>
                Přiřaďte pokladnu uživateli a nastavte čísla dokladů
              </ModalSubtitle>
            </HeaderLeft>
            <CloseButton onClick={onClose} disabled={loading}>
              <X size={20} />
            </CloseButton>
          </ModalHeaderContent>
        </ModalHeader>

        <ModalBody>
          <FormSection>
            {successMessage && (
              <SuccessMessage>
                <Check size={20} />
                {successMessage}
              </SuccessMessage>
            )}

            {errorMessage && (
              <ErrorMessage>
                <AlertCircle size={20} />
                <div>{errorMessage}</div>
              </ErrorMessage>
            )}

            <FormGrid>
              <FormGroup $fullWidth>
                <Label required>Uživatel</Label>
                <InputWithIcon>
                  <UserIcon size={16} />
                  <Select
                    hasIcon
                    value={formData.uzivatel_id}
                    onChange={(e) => handleChange('uzivatel_id', e.target.value)}
                    disabled={loadingUsers || loading}
                    hasError={!!errors.uzivatel_id}
                  >
                    <option value="">
                      {loadingUsers ? 'Načítám uživatele...' : 'Vyberte uživatele...'}
                    </option>
                    {userOptions.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </Select>
                </InputWithIcon>
                {errors.uzivatel_id && (
                  <ErrorText>
                    <AlertCircle size={12} />
                    {errors.uzivatel_id}
                  </ErrorText>
                )}
              </FormGroup>

              <FormGroup>
                <Label required>Číslo pokladny</Label>
                <InputWithIcon>
                  <Hash size={16} />
                  <Input
                    hasIcon
                    value={formData.cislo_pokladny}
                    onChange={(e) => handleChange('cislo_pokladny', e.target.value)}
                    placeholder="1"
                    hasError={!!errors.cislo_pokladny}
                    disabled={loading}
                  />
                </InputWithIcon>
                {errors.cislo_pokladny && (
                  <ErrorText>
                    <AlertCircle size={12} />
                    {errors.cislo_pokladny}
                  </ErrorText>
                )}
              </FormGroup>

              <FormGroup>
                <Label required>VPD číslo</Label>
                <InputWithIcon>
                  <Hash size={16} />
                  <Input
                    hasIcon
                    value={formData.vpd_cislo}
                    onChange={(e) => handleChange('vpd_cislo', e.target.value)}
                    placeholder="599"
                    hasError={!!errors.vpd_cislo}
                    disabled={loading}
                  />
                </InputWithIcon>
                {errors.vpd_cislo && (
                  <ErrorText>
                    <AlertCircle size={12} />
                    {errors.vpd_cislo}
                  </ErrorText>
                )}
              </FormGroup>

              <FormGroup>
                <Label required>VPD od čísla</Label>
                <InputWithIcon>
                  <Hash size={16} />
                  <Input
                    hasIcon
                    type="number"
                    min="1"
                    value={formData.vpd_od_cislo}
                    onChange={(e) => handleChange('vpd_od_cislo', e.target.value)}
                    placeholder="1"
                    hasError={!!errors.vpd_od_cislo}
                    disabled={loading}
                  />
                </InputWithIcon>
                {errors.vpd_od_cislo && (
                  <ErrorText>
                    <AlertCircle size={12} />
                    {errors.vpd_od_cislo}
                  </ErrorText>
                )}
                <HintText>Počáteční číslo pro výdaje (např. 1, 50, 100)</HintText>
              </FormGroup>

              <FormGroup>
                <Label required>PPD číslo</Label>
                <InputWithIcon>
                  <Hash size={16} />
                  <Input
                    hasIcon
                    value={formData.ppd_cislo}
                    onChange={(e) => handleChange('ppd_cislo', e.target.value)}
                    placeholder="699"
                    hasError={!!errors.ppd_cislo}
                    disabled={loading}
                  />
                </InputWithIcon>
                {errors.ppd_cislo && (
                  <ErrorText>
                    <AlertCircle size={12} />
                    {errors.ppd_cislo}
                  </ErrorText>
                )}
              </FormGroup>

              <FormGroup>
                <Label required>PPD od čísla</Label>
                <InputWithIcon>
                  <Hash size={16} />
                  <Input
                    hasIcon
                    type="number"
                    min="1"
                    value={formData.ppd_od_cislo}
                    onChange={(e) => handleChange('ppd_od_cislo', e.target.value)}
                    placeholder="1"
                    hasError={!!errors.ppd_od_cislo}
                    disabled={loading}
                  />
                </InputWithIcon>
                {errors.ppd_od_cislo && (
                  <ErrorText>
                    <AlertCircle size={12} />
                    {errors.ppd_od_cislo}
                  </ErrorText>
                )}
                <HintText>Počáteční číslo pro příjmy (např. 1, 25, 100)</HintText>
              </FormGroup>

              <FormGroup>
                <Label>Platné od</Label>
                <InputWithIcon>
                  <Calendar size={16} />
                  <Input
                    hasIcon
                    type="date"
                    value={formData.platne_od}
                    onChange={(e) => handleChange('platne_od', e.target.value)}
                    disabled={loading}
                  />
                </InputWithIcon>
              </FormGroup>

              <FormGroup>
                <Label>Platné do</Label>
                <InputWithIcon>
                  <Calendar size={16} />
                  <Input
                    hasIcon
                    type="date"
                    value={formData.platne_do}
                    onChange={(e) => handleChange('platne_do', e.target.value)}
                    hasError={!!errors.platne_do}
                    disabled={loading}
                  />
                </InputWithIcon>
                {errors.platne_do && (
                  <ErrorText>
                    <AlertCircle size={12} />
                    {errors.platne_do}
                  </ErrorText>
                )}
              </FormGroup>
            </FormGrid>
            <HintText style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              Nepovinné - ponechte prázdné pro neomezenou platnost
            </HintText>
          </FormSection>
        </ModalBody>

        <ModalFooter>
          <FooterLeft>
            <AlertCircle size={16} />
            Všechna pole označená * jsou povinná
          </FooterLeft>
          <FooterRight>
            <Button
              className="cancel"
              onClick={onClose}
              disabled={loading}
            >
              <X size={16} />
              Zrušit
            </Button>
            <Button
              className={successMessage ? 'success' : 'primary'}
              onClick={handleSave}
              disabled={loading || isClosing || loadingUsers}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  Vytvářím...
                </>
              ) : successMessage ? (
                <>
                  <Check size={16} />
                  Vytvořeno!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Vytvořit přiřazení
                </>
              )}
            </Button>
          </FooterRight>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

export default AddAssignmentDialog;
