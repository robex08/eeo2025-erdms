/**
 * Univerzální dialog pro editaci číselníků
 * Dynamický formulář podle konfigurace pole
 *
 * @author Frontend Team
 * @date 2025-10-19
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';

// =============================================================================
// ANIMATIONS
// =============================================================================

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

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
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

const DialogContainer = styled.div`
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: ${props => props.$large ? '1000px' : '700px'};
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: ${slideInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DialogHeader = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DialogTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const DialogBody = styled.div`
  padding: 2rem;
  max-height: calc(90vh - 200px);
  overflow-y: auto;
`;

const DialogFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: #f9fafb;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: 1.5rem;
  margin-bottom: 1.5rem;
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
`;

const RequiredStar = styled.span`
  color: #dc2626;
  margin-left: 0.25rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid ${props => props.$hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;
  background: ${props => props.$hasError ? '#fef2f2' : 'white'};

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid ${props => props.$hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const ErrorMessage = styled.div`
  font-size: 0.875rem;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const SecondaryButton = styled(Button)`
  background: #f3f4f6;
  color: #374151;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

// =============================================================================
// UNIVERZÁLNÍ DIALOG KOMPONENTA
// =============================================================================

/**
 * Univerzální dialog pro všechny číselníky
 *
 * @param {boolean} isOpen - Je dialog otevřený?
 * @param {function} onClose - Callback pro zavření
 * @param {function} onSave - Callback pro uložení (async)
 * @param {object} editData - Data pro editaci (null = nový záznam)
 * @param {string} title - Nadpis dialogu
 * @param {React.Component} icon - Ikona v hlavičce
 * @param {Array} fields - Konfigurace polí formuláře
 * @param {Array} selectOptions - Data pro selecty (např. parent options)
 */
const UniversalDictionaryDialog = ({
  isOpen,
  onClose,
  onSave,
  editData = null,
  title,
  icon: Icon,
  fields = [],
  selectOptions = {},
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Inicializace formuláře
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // Při editaci normalizuj checkbox hodnoty (1/0 -> true/false)
        const normalized = { ...editData };
        fields.forEach(field => {
          if (field.type === 'checkbox' && normalized[field.name] !== undefined) {
            normalized[field.name] = !!normalized[field.name];
          }
        });
        setFormData(normalized);
      } else {
        // Nový záznam - inicializuj default hodnoty
        const defaults = {};
        fields.forEach(field => {
          if (field.default !== undefined) {
            defaults[field.name] = field.default;
          } else if (field.type === 'checkbox') {
            defaults[field.name] = true;
          } else {
            defaults[field.name] = '';
          }
        });
        setFormData(defaults);
      }
      setErrors({});
    }
  }, [editData, isOpen, fields]);

  // Validace
  const validate = () => {
    const newErrors = {};
    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.name];
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
          newErrors[field.name] = field.errorMessage || `${field.label} je povinné pole`;
        }
      }
      // Vlastní validace
      if (field.validate && formData[field.name]) {
        const validationError = field.validate(formData[field.name]);
        if (validationError) {
          newErrors[field.name] = validationError;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Uložení
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Chyba při ukládání' });
    } finally {
      setIsSaving(false);
    }
  };

  // Změna hodnoty
  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Vyčisti chybu pro toto pole
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  // Render pole
  const renderField = (field) => {
    const hasError = !!errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            $hasError={hasError}
            disabled={field.disabled}
          />
        );

      case 'textarea':
        return (
          <TextArea
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            $hasError={hasError}
          />
        );

      case 'select':
        return (
          <CustomSelect
            value={formData[field.name]}
            onChange={(value) => handleChange(field.name, value)}
            options={selectOptions[field.name] || []}
            placeholder={field.placeholder}
            hasError={hasError}
          />
        );

      case 'checkbox':
        return (
          <CheckboxWrapper>
            <Checkbox
              type="checkbox"
              checked={!!formData[field.name]}
              onChange={(e) => handleChange(field.name, e.target.checked)}
            />
            <span>{field.checkboxLabel || field.label}</span>
          </CheckboxWrapper>
        );

      default:
        return null;
    }
  };

  return ReactDOM.createPortal(
    <DialogOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <DialogContainer onClick={(e) => e.stopPropagation()} $large={fields.length > 6}>
        <DialogHeader>
          <DialogTitle>
            {Icon && <Icon size={28} />}
            {title}
          </DialogTitle>
          <CloseButton onClick={onClose}>
            <X size={20} color="white" />
          </CloseButton>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            {fields.reduce((rows, field, index) => {
              if (field.row !== undefined) {
                if (!rows[field.row]) rows[field.row] = [];
                rows[field.row].push(field);
              } else {
                // Auto layout - 2 fieldy vedle sebe pokud je to text/email, jinak samostatně
                const rowIndex = Math.floor(index / (field.type === 'textarea' ? 1 : 2));
                if (!rows[rowIndex]) rows[rowIndex] = [];
                rows[rowIndex].push(field);
              }
              return rows;
            }, []).map((rowFields, rowIndex) => (
              <FormRow key={rowIndex} $columns={rowFields.length === 1 ? '1fr' : '1fr 1fr'}>
                {rowFields.map(field => (
                  <FormGroup key={field.name}>
                    <Label>
                      {field.label}
                      {field.required && <RequiredStar>*</RequiredStar>}
                    </Label>
                    {renderField(field)}
                    {errors[field.name] && (
                      <ErrorMessage>
                        <AlertTriangle size={16} />
                        {errors[field.name]}
                      </ErrorMessage>
                    )}
                  </FormGroup>
                ))}
              </FormRow>
            ))}

            {errors.submit && (
              <ErrorMessage>
                <AlertTriangle size={16} />
                {errors.submit}
              </ErrorMessage>
            )}
          </DialogBody>

          <DialogFooter>
            <SecondaryButton type="button" onClick={onClose}>
              <X size={16} />
              Zrušit
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Ukládám...' : 'Uložit'}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContainer>
    </DialogOverlay>,
    document.body
  );
};

export default UniversalDictionaryDialog;
