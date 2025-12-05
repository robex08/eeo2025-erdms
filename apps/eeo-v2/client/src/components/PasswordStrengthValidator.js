import React from 'react';
import styled from '@emotion/styled';
import { CheckCircle, XCircle } from 'lucide-react';

const ValidatorContainer = styled.div`
  margin-top: 0.75rem;
`;

const StrengthBar = styled.div`
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
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
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const RequirementsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Requirement = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: ${props => props.met ? '#10b981' : '#6b7280'};
  transition: color 0.2s ease;
`;

/**
 * Výpočet síly hesla
 * @param {string} password - Heslo k validaci
 * @returns {string|null} - 'weak', 'medium', 'strong' nebo null
 */
export const getPasswordStrength = (password) => {
  if (!password) return null;

  let score = 0;

  // Délka
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Typy znaků
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
};

/**
 * Získání požadavků na heslo a jejich splnění
 * @param {string} password - Heslo k validaci
 * @returns {Array} - Pole požadavků s informací o splnění
 */
export const getPasswordRequirements = (password) => {
  return [
    { text: 'Alespoň 8 znaků', met: password.length >= 8 },
    { text: 'Obsahuje malé písmeno', met: /[a-z]/.test(password) },
    { text: 'Obsahuje velké písmeno', met: /[A-Z]/.test(password) },
    { text: 'Obsahuje číslo', met: /[0-9]/.test(password) },
    { text: 'Obsahuje speciální znak', met: /[^A-Za-z0-9]/.test(password) }
  ];
};

/**
 * Validace hesla - vrací true pokud je heslo dostatečně silné
 * @param {string} password - Heslo k validaci
 * @returns {boolean} - True pokud heslo splňuje minimální požadavky
 */
export const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) return false;

  const requirements = getPasswordRequirements(password);
  // Heslo musí splňovat alespoň první požadavek (8 znaků) a alespoň 3 další
  const metCount = requirements.filter(r => r.met).length;
  return metCount >= 4; // 8 znaků + 3 z dalších požadavků
};

/**
 * Komponenta pro zobrazení síly hesla a požadavků
 */
const PasswordStrengthValidator = ({ password, showRequirements = true }) => {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const requirements = getPasswordRequirements(password);
  const isValid = validatePasswordStrength(password);

  const strengthLabels = {
    weak: 'Síla hesla: Slabé',
    medium: 'Síla hesla: Střední',
    strong: 'Síla hesla: Silné'
  };

  return (
    <ValidatorContainer>
      <StrengthBar>
        <StrengthFill strength={strength} />
      </StrengthBar>

      <StrengthText strength={strength}>
        {strengthLabels[strength]}
      </StrengthText>

      {/* Zobrazit požadavky pouze pokud heslo není validní */}
      {showRequirements && !isValid && (
        <RequirementsList>
          {requirements.map((req, index) => (
            <Requirement key={index} met={req.met}>
              {req.met ? (
                <CheckCircle size={14} />
              ) : (
                <XCircle size={14} />
              )}
              {req.text}
            </Requirement>
          ))}
        </RequirementsList>
      )}
    </ValidatorContainer>
  );
};

export default PasswordStrengthValidator;
