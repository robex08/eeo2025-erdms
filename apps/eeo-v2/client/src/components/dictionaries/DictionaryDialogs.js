/**
 * Dialogy pro editaci číselníků
 * Moderní modální dialogy pro CRUD operace
 *
 * @author Frontend Team
 * @date 2025-10-19
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { X, Save, AlertTriangle, Check, Building, MapPin, Users, FileText, Truck } from 'lucide-react';
import CustomSelect from './CustomSelect';

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

const DialogContainer = styled.div`
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: ${props => props.$large ? '1000px' : '650px'};
  max-height: 90vh;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  animation: ${slideInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DialogHeader = styled.div`
  padding: 2rem 2rem 1rem 2rem;
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

const DialogHeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
`;

const DialogTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RequiredStar = styled.span`
  color: #dc2626;
  font-weight: 700;
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
  background: ${props => props.$hasError ? '#fef2f2' : 'white'};

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
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
// LOKALITA DIALOG
// =============================================================================

export const LokalitaDialog = ({ isOpen, onClose, onSave, editData = null, allLokality = [] }) => {
  const [formData, setFormData] = useState({
    nazev: '',
    typ: '',
    parent_id: null,
    aktivni: true,
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        nazev: editData.nazev || '',
        typ: editData.typ || '',
        parent_id: editData.parent_id || null,
        aktivni: editData.aktivni !== undefined ? editData.aktivni : true,
      });
    } else {
      setFormData({
        nazev: '',
        typ: '',
        parent_id: null,
        aktivni: true,
      });
    }
    setErrors({});
  }, [editData, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.nazev?.trim()) newErrors.nazev = 'Název je povinný';
    if (!formData.typ?.trim()) newErrors.typ = 'Typ je povinný';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Parent options (filtrované - nesmí vybrat sám sebe)
  const parentOptions = allLokality
    .filter(l => !editData || l.id !== editData.id)
    .map(l => ({ value: l.id, label: l.nazev }));

  return ReactDOM.createPortal(
    <DialogOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <DialogContainer onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogHeaderContent>
            <DialogTitle>
              <Building size={28} />
              {editData ? 'Upravit lokalitu' : 'Nová lokalita'}
            </DialogTitle>
            <CloseButton onClick={onClose}>
              <X size={20} color="white" />
            </CloseButton>
          </DialogHeaderContent>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            <FormRow $columns="1fr 1fr">
              <FormGroup>
                <Label>
                  Název <RequiredStar>*</RequiredStar>
                </Label>
                <Input
                  value={formData.nazev}
                  onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
                  $hasError={!!errors.nazev}
                  placeholder="Zadejte název lokality"
                />
                {errors.nazev && (
                  <ErrorMessage>
                    <AlertTriangle size={16} />
                    {errors.nazev}
                  </ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <Label>
                  Typ <RequiredStar>*</RequiredStar>
                </Label>
                <Input
                  value={formData.typ}
                  onChange={(e) => setFormData({ ...formData, typ: e.target.value })}
                  $hasError={!!errors.typ}
                  placeholder="Zadejte typ"
                />
                {errors.typ && (
                  <ErrorMessage>
                    <AlertTriangle size={16} />
                    {errors.typ}
                  </ErrorMessage>
                )}
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <Label>Nadřazená lokalita</Label>
                <CustomSelect
                  value={formData.parent_id}
                  onChange={(value) => setFormData({ ...formData, parent_id: value })}
                  options={[
                    { value: null, label: '-- Žádná --' },
                    ...parentOptions
                  ]}
                  placeholder="Vyberte nadřazenou lokalitu"
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={formData.aktivni}
                  onChange={(e) => setFormData({ ...formData, aktivni: e.target.checked })}
                />
                <span>Aktivní</span>
              </CheckboxWrapper>
            </FormRow>

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

// =============================================================================
// POZICE DIALOG
// =============================================================================

export const PoziceDialog = ({ isOpen, onClose, onSave, editData = null, allPozice = [] }) => {
  const [formData, setFormData] = useState({
    nazev_pozice: '',
    parent_id: null,
    aktivni: true,
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        nazev_pozice: editData.nazev_pozice || '',
        parent_id: editData.parent_id || null,
        aktivni: editData.aktivni !== undefined ? editData.aktivni : true,
      });
    } else {
      setFormData({
        nazev_pozice: '',
        parent_id: null,
        aktivni: true,
      });
    }
    setErrors({});
  }, [editData, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.nazev_pozice?.trim()) newErrors.nazev_pozice = 'Název pozice je povinný';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const parentOptions = allPozice
    .filter(p => !editData || p.id !== editData.id)
    .map(p => ({ value: p.id, label: p.nazev_pozice }));

  return ReactDOM.createPortal(
    <DialogOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <DialogContainer onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogHeaderContent>
            <DialogTitle>
              <Users size={28} />
              {editData ? 'Upravit pozici' : 'Nová pozice'}
            </DialogTitle>
            <CloseButton onClick={onClose}>
              <X size={20} color="white" />
            </CloseButton>
          </DialogHeaderContent>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            <FormRow>
              <FormGroup>
                <Label>
                  Název pozice <RequiredStar>*</RequiredStar>
                </Label>
                <Input
                  value={formData.nazev_pozice}
                  onChange={(e) => setFormData({ ...formData, nazev_pozice: e.target.value })}
                  $hasError={!!errors.nazev_pozice}
                  placeholder="Zadejte název pozice"
                />
                {errors.nazev_pozice && (
                  <ErrorMessage>
                    <AlertTriangle size={16} />
                    {errors.nazev_pozice}
                  </ErrorMessage>
                )}
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <Label>Nadřazená pozice</Label>
                <CustomSelect
                  value={formData.parent_id}
                  onChange={(value) => setFormData({ ...formData, parent_id: value })}
                  options={[
                    { value: null, label: '-- Žádná --' },
                    ...parentOptions
                  ]}
                  placeholder="Vyberte nadřazenou pozici"
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={formData.aktivni}
                  onChange={(e) => setFormData({ ...formData, aktivni: e.target.checked })}
                />
                <span>Aktivní</span>
              </CheckboxWrapper>
            </FormRow>

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

// Exportovat další dialogy... (UsekDialog, OrganizaceDialog, DodavatelDialog budou pokračovat v dalším souboru)
