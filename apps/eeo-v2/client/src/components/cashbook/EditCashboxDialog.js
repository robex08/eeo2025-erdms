import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { X, Save, AlertTriangle, User, Calendar, Hash, Building, Plus, Trash2, ChevronDown, Search, DollarSign } from 'lucide-react';
import cashbookAPI from '../../services/cashbookService';
import { getUsekyList } from '../../services/apiv2Dictionaries';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import DatePicker from '../DatePicker';

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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
  animation: fadeIn 0.15s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: ${slideInUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  letter-spacing: -0.01em;

  svg {
    width: 20px;
    height: 20px;
    opacity: 0.9;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: calc(75vh - 140px);
  padding: 1.25rem 1.5rem;
`;

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const LeftSection = styled.div`
  padding-right: 0.75rem;
  border-right: 2px solid #e2e8f0;
`;

const RightSection = styled.div`
  padding-left: 0.75rem;
`;

const BottomSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e2e8f0;
`;

const BottomLeftColumn = styled.div`
  padding-right: 0.75rem;
  border-right: 2px solid #e2e8f0;
`;

const BottomRightColumn = styled.div`
  padding-left: 0.75rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  svg {
    width: 14px;
    height: 14px;
    color: #64748b;
  }
`;

const WarningBox = styled.div`
  background: linear-gradient(135deg, #fef2f2 0%, #fff 100%);
  border-left: 3px solid #ef4444;
  border-radius: 8px;
  padding: 0.875rem 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  svg {
    width: 18px;
    height: 18px;
    color: #ef4444;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }
`;

const WarningText = styled.div`
  font-size: 0.8125rem;
  color: #7f1d1d;
  line-height: 1.5;

  strong {
    font-weight: 600;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 0.875rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.375rem;
  font-weight: 500;
  font-size: 0.8125rem;
  color: #1e293b;

  svg {
    width: 13px;
    height: 13px;
    color: #64748b;
    margin-right: 0.375rem;
    vertical-align: middle;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.$error ? '#f87171' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 0.8125rem;
  transition: all 0.15s;
  font-family: inherit;
  background: white;

  &:hover:not(:disabled) {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  }

  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const InputWithCurrency = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CurrencyInput = styled(Input)`
  padding-right: 2.5rem;
  
  /* Odstranění spin tlačítek */
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;

const CurrencySuffix = styled.span`
  position: absolute;
  right: 0.75rem;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  pointer-events: none;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${props => props.$error ? '#f87171' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.15s;
  font-family: inherit;
  background: white;
  resize: vertical;
  min-height: 60px;

  &:hover:not(:disabled) {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  }

  &:disabled {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

const HelpText = styled.div`
  color: #64748b;
  font-size: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f1f5f9;
  border-radius: 4px;
  line-height: 1.4;
`;

const UsersList = styled.div`
  flex: 1;
  min-height: auto;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.15s;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex: 1;
`;

const UserIcon = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
`;

const UserName = styled.span`
  font-weight: 600;
  color: #0f172a;
  font-size: 0.8125rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const UserMeta = styled.span`
  font-size: 0.7rem;
  color: #64748b;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
`;

const MainBadge = styled.span`
  padding: 0.125rem 0.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
`;

const UserActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
`;

const ToggleMainButton = styled.button`
  background: ${props => props.$isMain ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white'};
  border: 1px solid ${props => props.$isMain ? '#10b981' : '#e2e8f0'};
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  color: ${props => props.$isMain ? 'white' : '#64748b'};
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;

  &:hover {
    border-color: ${props => props.$isMain ? '#059669' : '#cbd5e1'};
    transform: translateY(-1px);
  }
`;

const RemoveButton = styled.button`
  background: white;
  border: 1px solid #e2e8f0;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-color: #ef4444;
    color: #ef4444;
    transform: translateY(-1px);
  }

  svg {
    width: 15px;
    height: 15px;
  }
`;

const EditDateButton = styled.button`
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-color: #3b82f6;
    color: #3b82f6;
    transform: translateY(-1px);
  }

  svg {
    width: 13px;
    height: 13px;
  }
`;

const EditModeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const EditDateInputs = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const EditDateLabel = styled.label`
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
`;

const EditDatePickerWrapper = styled.div`
  min-width: 140px;

  /* Přepis stylů DatePickeru pro menší velikost */
  button {
    padding: 0.375rem 0.5rem !important;
    font-size: 0.75rem !important;
    border-radius: 4px !important;
  }
`;

const EditModeButtons = styled.div`
  display: flex;
  gap: 0.375rem;
  justify-content: flex-end;
  margin-top: 0.25rem;
`;

const SaveEditButton = styled.button`
  padding: 0.375rem 0.75rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
  }
`;

const CancelEditButton = styled.button`
  padding: 0.375rem 0.75rem;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #e2e8f0;
  }
`;

const AddUserSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
`;

const AddUserRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: center;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
  cursor: pointer;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    cursor: pointer;
  }
`;

const Select = styled.select`
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.15s;
  font-family: inherit;
  background: white;

  &:hover {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  }
`;

const CustomSelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SelectIcon = styled.div`
  position: absolute;
  right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const UsekDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 0.8125rem;
`;

const UsekBadge = styled.span`
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.01em;
`;

const UsekName = styled.span`
  color: #1e40af;
  font-weight: 500;
  flex: 1;
`;

const AddButton = styled.button`
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const EmptyUsers = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;
  font-size: 0.875rem;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 0.75rem;
    opacity: 0.3;
  }
`;

const ModalFooter = styled.div`
  padding: 1.25rem 2rem;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
`;

const Button = styled.button`
  padding: 0.625rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;

  svg {
    width: 15px;
    height: 15px;
  }
`;

const CancelButton = styled(Button)`
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  z-index: 10001;
  min-width: 400px;
  max-width: 500px;
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
`;

const ConfirmTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #dc2626;
  }
`;

const ConfirmMessage = styled.p`
  margin: 0 0 1.5rem 0;
  color: #64748b;
  line-height: 1.6;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmCancelButton = styled(ConfirmButton)`
  background: white;
  color: #64748b;
  border: 2px solid #e2e8f0;

  &:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
`;

const ConfirmDeleteButton = styled(ConfirmButton)`
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }
`;

// =============================================================================
// SEARCHABLE SELECT COMPONENTS
// =============================================================================

const SearchableSelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchableSelectButton = styled.div`
  width: 100%;
  padding: 0.625rem 2.25rem 0.625rem ${props => props.$hasIcon ? '2.5rem' : '0.75rem'};
  border: 1px solid ${props => props.$error ? '#f87171' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 0.875rem;
  background: ${props => props.disabled ? '#f1f5f9' : 'white'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  color: ${props => props.$isEmpty ? '#94a3b8' : '#1e293b'};
  font-weight: ${props => props.$isEmpty ? '400' : '600'};
  display: flex;
  align-items: center;
  gap: 0.625rem;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: #cbd5e1;
  }

  ${props => props.$isOpen && `
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  `}

  .icon {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
  }
`;

const SearchableDropdown = styled.div`
  position: fixed;
  max-height: 280px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
  border: none;
  font-size: 0.875rem;
  outline: none;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    background: #f8fafc;
  }
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #475569;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 2.25rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  z-index: 1;

  &:hover {
    color: #475569;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const DropdownOptions = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const DropdownOption = styled.div`
  padding: 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f1f5f9;
  }

  ${props => props.$selected && `
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #1e40af;
    font-weight: 600;
  `}
`;

const NoResults = styled.div`
  padding: 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
`;

// SearchableSelect Component
const SearchableSelect = ({ value, onChange, options, placeholder, disabled, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Kontrola, zda klik není na tlačítku nebo v dropdownu
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <SearchableSelectWrapper ref={wrapperRef}>
      <SearchableSelectButton
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={disabled}
        $isEmpty={!selectedOption}
        $isOpen={isOpen}
        $hasIcon={!!icon}
      >
        {icon && <span className="icon">{icon}</span>}
        <span style={{ flex: 1 }}>{selectedOption ? selectedOption.label : placeholder}</span>
        {selectedOption && !disabled && (
          <ClearButton onClick={handleClear}>
            <X size={14} />
          </ClearButton>
        )}
        <ChevronDown size={16} style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </SearchableSelectButton>

      {isOpen && ReactDOM.createPortal(
        <SearchableDropdown
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <SearchInputWrapper>
            <Search size={16} />
            <SearchInput
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hledat..."
            />
            {searchTerm && (
              <SearchClearButton onClick={() => setSearchTerm('')}>
                <X size={14} />
              </SearchClearButton>
            )}
          </SearchInputWrapper>
          <DropdownOptions>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <DropdownOption
                  key={option.value}
                  $selected={option.value === value}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </DropdownOption>
              ))
            ) : (
              <NoResults>Žádné výsledky</NoResults>
            )}
          </DropdownOptions>
        </SearchableDropdown>,
        document.body
      )}
    </SearchableSelectWrapper>
  );
};

// =============================================================================
// KOMPONENTA
// =============================================================================

const EditCashboxDialog = ({ isOpen, onClose, onSuccess, cashbox }) => {
  const { token, user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [formData, setFormData] = useState({
    nazev: '',
    kod_pracoviste: '',
    nazev_pracoviste: '',
    pocatecni_stav_rok: '', // 🆕 Počáteční stav pro nový rok
    ciselna_rada_vpd: '',
    vpd_od_cislo: 1,
    ciselna_rada_ppd: '',
    ppd_od_cislo: 1,
    poznamka: '',
  });

  const [useky, setUseky] = useState([]);
  const [selectedUsek, setSelectedUsek] = useState(null);
  const [users, setUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [isMainUser, setIsMainUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUseky, setLoadingUseky] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState({ show: false, assignmentId: null, userName: '' });
  const [editingUserId, setEditingUserId] = useState(null); // ID uživatele který se edituje
  const [editValues, setEditValues] = useState({ platne_od: '', platne_do: '' }); // Editační hodnoty

  // Hlavní useEffect - načíst vše při otevření dialogu
  useEffect(() => {
    if (isOpen && cashbox && token && user?.username) {
      // Naplnit formulář daty pokladny
      setFormData({
        nazev: cashbox.nazev || '',
        kod_pracoviste: cashbox.kod_pracoviste || '',
        nazev_pracoviste: cashbox.nazev_pracoviste || '',
        pocatecni_stav_rok: cashbox.pocatecni_stav_rok !== null && cashbox.pocatecni_stav_rok !== undefined ? cashbox.pocatecni_stav_rok : '',
        ciselna_rada_vpd: cashbox.ciselna_rada_vpd || '',
        vpd_od_cislo: cashbox.vpd_od_cislo || 1,
        ciselna_rada_ppd: cashbox.ciselna_rada_ppd || '',
        ppd_od_cislo: cashbox.ppd_od_cislo || 1,
        poznamka: cashbox.poznamka || '',
      });

      // Načíst přiřazené uživatele - filtrovat jen aktivní (platne_do NULL nebo v budoucnosti)
      const allUsers = cashbox.uzivatele || [];
      const today = new Date().toISOString().split('T')[0];
      const activeUsers = allUsers.filter(user => {
        if (!user.platne_do) return true; // NULL = aktivní navždy
        return user.platne_do > today; // Budoucí datum = ještě aktivní
      });
      setUsers(activeUsers);

      // Načíst dostupné uživatele a úseky
      loadAvailableUsers();
      loadUseky();
    }
  }, [isOpen, cashbox, token, user?.username]);

  const loadUseky = async () => {
    if (!token || !user?.username) return;

    try {
      setLoadingUseky(true);
      const usekyData = await getUsekyList({
        token: token,
        username: user.username,
        show_inactive: false
      });
      setUseky(usekyData || []);

      // Pokud je nastaven kod_pracoviste, najít odpovídající úsek
      if (cashbox?.kod_pracoviste && usekyData) {
        const matchedUsek = usekyData.find(u => u.usek_zkr === cashbox.kod_pracoviste);
        if (matchedUsek) {
          setSelectedUsek(matchedUsek);
        }
      }
    } catch (err) {
      // Error handling
    } finally {
      setLoadingUseky(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!cashbox?.id) return;

    try {
      setLoading(true);
      const result = await cashbookAPI.getAvailableUsers(cashbox.id);
      setAvailableUsers(result.data.uzivatele || []);
    } catch (err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleUsekChange = (usekId) => {
    if (!usekId) {
      // Prázdný výběr - vyčistit
      setSelectedUsek(null);
      setFormData(prev => ({
        ...prev,
        kod_pracoviste: '',
        nazev_pracoviste: ''
      }));
      setError('');
      return;
    }

    const usek = useky.find(u => String(u.id) === String(usekId));
    setSelectedUsek(usek || null);

    if (usek) {
      // Automaticky vyplnit kód a název pracoviště
      setFormData(prev => ({
        ...prev,
        kod_pracoviste: usek.usek_zkr || '',
        nazev_pracoviste: usek.usek_nazev || ''
      }));
    }
    setError('');
  };

  const handleSave = async () => {
    // Validace
    if (!formData.ciselna_rada_vpd) {
      setError('Vyplňte číselnou řadu VPD');
      return;
    }
    if (!formData.ciselna_rada_ppd) {
      setError('Vyplňte číselnou řadu PPD');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // 1. Uložit parametry pokladny
      await cashbookAPI.updateCashbox(cashbox.id, formData);

      // 2. Synchronizovat uživatele (smazat všechny + přidat jen ty co jsou v users state)
      const usersPayload = users.map(u => ({
        uzivatel_id: u.uzivatel_id,
        je_hlavni: u.je_hlavni === 1 || u.je_hlavni === '1' ? 1 : 0,
        platne_od: u.platne_od || new Date().toISOString().split('T')[0],
        platne_do: u.platne_do || null,
        poznamka: u.poznamka || ''
      }));

      await cashbookAPI.syncCashboxUsers(cashbox.id, usersPayload);

      showToast('Pokladna a uživatelé úspěšně uloženi', 'success');

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Nepodařilo se uložit změny');
      showToast('Chyba při ukládání pokladny', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser) return;

    try {
      // isMainUser checkbox znamená "Zástupce", takže musíme invertovat
      // checked (true) = zástupce (0), unchecked (false) = hlavní (1)
      const jeHlavni = isMainUser ? 0 : 1;

      const result = await cashbookAPI.assignUserToCashbox({
        pokladna_id: cashbox.id,
        uzivatel_id: parseInt(selectedUser),
        je_hlavni: jeHlavni,
        platne_od: new Date().toISOString().split('T')[0],
        platne_do: null,
        poznamka: ''
      });

      if (result.status === 'ok') {
        // Reload users list from server
        const cashboxResult = await cashbookAPI.getCashboxList(true, true);
        const updatedCashbox = cashboxResult.data.pokladny.find(p => p.id === cashbox.id);
        if (updatedCashbox) {
          setUsers(updatedCashbox.uzivatele || []);
        }

        setSelectedUser('');
        setIsMainUser(false);
        await loadAvailableUsers();

        // Find added user name for toast
        const addedUser = availableUsers.find(u => u.id === parseInt(selectedUser));
        showToast(`Uživatel "${addedUser?.name || 'Uživatel'}" byl úspěšně přiřazen k pokladně`, 'success');

        // DON'T call onSuccess() - it would reload entire dialog
      } else {
        showToast(result.message || 'Chyba při přiřazování uživatele', 'error');
      }
    } catch (err) {
      console.error('Chyba při přidávání uživatele:', err);
      showToast('Chyba při přiřazování uživatele k pokladně', 'error');
    }
  };

  const handleToggleMain = async (assignmentId, currentStatus, userName) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;

      const result = await cashbookAPI.updateUserMainStatus(assignmentId, newStatus);

      if (result.status === 'ok') {
        // Reload users list from server
        const cashboxResult = await cashbookAPI.getCashboxList(true, true);
        const updatedCashbox = cashboxResult.data.pokladny.find(p => p.id === cashbox.id);
        if (updatedCashbox) {
          setUsers(updatedCashbox.uzivatele || []);
        }

        const newStatusText = newStatus === 1 ? 'Hlavní' : 'Zástupce';
        showToast(`Status uživatele "${userName}" změněn na ${newStatusText}`, 'success');

        // DON'T call onSuccess() - it would reload entire dialog
      } else {
        showToast(result.message || 'Chyba při změně statusu', 'error');
      }
    } catch (err) {
      console.error('Chyba při změně statusu:', err);
      showToast('Chyba při změně statusu uživatele', 'error');
    }
  };

  const handleEditUserClick = (user) => {
    setEditingUserId(user.uzivatel_id);
    setEditValues({
      platne_od: user.platne_od || new Date().toISOString().split('T')[0],
      platne_do: user.platne_do || ''
    });
  };

  const handleSaveUserDates = (userId) => {
    setUsers(prev => prev.map(u => {
      if (u.uzivatel_id === userId) {
        return {
          ...u,
          platne_od: editValues.platne_od,
          platne_do: editValues.platne_do || null
        };
      }
      return u;
    }));

    setEditingUserId(null);
    setEditValues({ platne_od: '', platne_do: '' });
    showToast('Platnost přiřazení změněna (uložte dialog pro potvrzení)', 'info');
  };

  const handleCancelEditDates = () => {
    setEditingUserId(null);
    setEditValues({ platne_od: '', platne_do: '' });
  };

  const handleRemoveUserClick = (assignmentId, userName) => {
    setConfirmRemove({ show: true, assignmentId, userName });
  };

  const handleRemoveUserConfirm = async () => {
    const { assignmentId, userName } = confirmRemove;
    setConfirmRemove({ show: false, assignmentId: null, userName: '' });

    try {
      const result = await cashbookAPI.unassignUserFromCashbox(assignmentId);

      if (result.status === 'ok') {
        // Kontrola affected_rows - pokud je 0, záznam nebyl aktualizován
        const affectedRows = result?.data?.affected_rows;

        if (affectedRows === 0 || affectedRows === '0') {
          showToast(`VAROVÁNÍ: Uživatel "${userName}" nebyl odebrán - záznam už neexistuje nebo byl již deaktivován`, 'warning');
          // I tak refreshneme data, ať vidíme aktuální stav
          await loadAvailableUsers();
          return;
        }

        // Reload users - remove from local state
        setUsers(prev => prev.filter(u => u.prirazeni_id !== assignmentId));

        // Reload available users
        await loadAvailableUsers();

        // Show success toast
        showToast(`Uživatel "${userName}" byl úspěšně odebrán z pokladny`, 'success');

      } else {
        showToast(result.message || 'Chyba při odebírání uživatele', 'error');
      }
    } catch (err) {
      console.error('Chyba při odebírání:', err);
      
      // Detekce Foreign Key Constraint chyby
      const errorMsg = err?.message || err?.response?.data?.message || '';
      if (errorMsg.includes('Integrity constraint violation') || 
          errorMsg.includes('foreign key constraint fails') ||
          errorMsg.includes('fk_knihy_prirazeni')) {
        showToast(
          `Uživatel "${userName}" nelze odebrat - má aktivní pokladní knihy. Nejprve je musíte ukončit nebo přiřadit jinému uživateli.`,
          'error'
        );
      } else {
        showToast('Chyba při odebírání uživatele z pokladny', 'error');
      }
    }
  };

  const handleRemoveUserCancel = () => {
    setConfirmRemove({ show: false, assignmentId: null, userName: '' });
  };

  if (!isOpen) return null;

  return (
    <>
      {ReactDOM.createPortal(
        <ModalOverlay onClick={(e) => e.stopPropagation()}>
          <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Building />
            Úprava pokladny {cashbox?.cislo_pokladny}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* HORNÍ SEKCE - DVOUSLOUPCOVÝ LAYOUT */}
          <TopSection>
            {/* LEVÁ ČÁST - Základní informace */}
            <LeftSection>
              <SectionTitle>
                <Building size={14} />
                Základní informace
              </SectionTitle>

              {error && (
                <ErrorMessage>
                  <AlertTriangle />
                  {error}
                </ErrorMessage>
              )}

              <FormGroup>
                <Label>
                  <Hash />
                  Číslo pokladny
                </Label>
                <Input
                  type="number"
                  value={cashbox?.cislo_pokladny || ''}
                  disabled
                />
              </FormGroup>

              <FormGroup>
                <Label>Název pokladny</Label>
                <Input
                  type="text"
                  value={formData.nazev}
                  onChange={e => handleChange('nazev', e.target.value)}
                  placeholder="Pokladna IT oddělení..."
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <Building />
                  Úsek (zkratka)
                </Label>
                <SearchableSelect
                  value={selectedUsek?.id || ''}
                  onChange={(val) => handleUsekChange(val)}
                  options={useky.map(usek => ({
                    value: usek.id,
                    label: `${usek.usek_zkr} - ${usek.usek_nazev}`
                  }))}
                  placeholder="Vyberte úsek..."
                  disabled={loadingUseky}
                  icon={<Building size={14} />}
                />

                {selectedUsek && (
                  <UsekDisplay>
                    <UsekBadge>{selectedUsek.usek_zkr}</UsekBadge>
                    <UsekName>{selectedUsek.usek_nazev}</UsekName>
                  </UsekDisplay>
                )}
              </FormGroup>

              <FormGroup>
                <Label>Poznámka</Label>
                <Textarea
                  value={formData.poznamka}
                  onChange={e => handleChange('poznamka', e.target.value)}
                  placeholder="Volitelná poznámka..."
                  rows={2}
                />
              </FormGroup>
            </LeftSection>

            {/* PRAVÁ ČÁST - Uživatelé */}
            <RightSection>
              <SectionTitle>
                <User size={14} />
                Přiřazení uživatelé ({users.length})
              </SectionTitle>

              {/* Seznam přiřazených uživatelů */}
              <UsersList style={{ marginBottom: 0 }}>
              {users.length === 0 ? (
                <EmptyUsers>
                  <User size={48} />
                  <div>Žádní přiřazení uživatelé</div>
                </EmptyUsers>
              ) : (
                users.map(user => {
                  const isEditing = editingUserId === user.uzivatel_id;

                  return (
                    <UserItem key={user.prirazeni_id || user.uzivatel_id}>
                      <UserInfo>
                        <UserIcon>
                          <User size={16} />
                        </UserIcon>
                        <UserDetails>
                          <UserName>
                            {user.uzivatel_cele_jmeno}
                            {(user.je_hlavni === 1 || user.je_hlavni === '1') ? (
                              <MainBadge>Hlavní</MainBadge>
                            ) : (
                              <MainBadge style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>Zástupce</MainBadge>
                            )}
                          </UserName>

                          {isEditing ? (
                            <EditModeContainer>
                              <EditDateInputs>
                                <EditDateLabel>Přiřazena od:</EditDateLabel>
                                <EditDatePickerWrapper>
                                  <DatePicker
                                    value={editValues.platne_od}
                                    onChange={(newValue) => {
                                      setEditValues(prev => {
                                        const newState = { ...prev, platne_od: newValue };

                                        // Pokud je datum "do" vyplněné a je menší než nové datum "od",
                                        // nastav datum "do" na nové datum "od"
                                        if (newState.platne_do && newValue && newState.platne_do < newValue) {
                                          newState.platne_do = newValue;
                                        }

                                        return newState;
                                      });
                                    }}
                                    placeholder="Vyberte datum"
                                  />
                                </EditDatePickerWrapper>
                                <EditDateLabel>do:</EditDateLabel>
                                <EditDatePickerWrapper>
                                  <DatePicker
                                    value={editValues.platne_do}
                                    onChange={(newValue) => {
                                      setEditValues(prev => {
                                        // Pokud je nové datum "do" menší než datum "od", nastav na datum "od"
                                        if (newValue && prev.platne_od && newValue < prev.platne_od) {
                                          return { ...prev, platne_do: prev.platne_od };
                                        }
                                        return { ...prev, platne_do: newValue };
                                      });
                                    }}
                                    placeholder="Nevyplnit = navždy"
                                  />
                                </EditDatePickerWrapper>
                              </EditDateInputs>
                              <EditModeButtons>
                                <SaveEditButton onClick={() => handleSaveUserDates(user.uzivatel_id)}>
                                  ✓ Uložit
                                </SaveEditButton>
                                <CancelEditButton onClick={handleCancelEditDates}>
                                  ✕ Zrušit
                                </CancelEditButton>
                              </EditModeButtons>
                            </EditModeContainer>
                          ) : (
                            <UserMeta>
                              {user.username}
                              {user.platne_od && ` • Přiřazena od: ${user.platne_od}`}
                              {user.platne_do ? ` • do: ${user.platne_do}` : ' • navždy'}
                            </UserMeta>
                          )}
                        </UserDetails>
                      </UserInfo>

                      {!isEditing && (
                        <UserActions>
                          <EditDateButton
                            onClick={() => handleEditUserClick(user)}
                            title="Editovat platnost přiřazení"
                          >
                            <Calendar size={13} />
                            Přiřazená
                          </EditDateButton>
                          <RemoveButton
                            onClick={() => handleRemoveUserClick(user.prirazeni_id, user.uzivatel_cele_jmeno)}
                            title="Odebrat uživatele"
                          >
                            <Trash2 />
                          </RemoveButton>
                        </UserActions>
                      )}
                    </UserItem>
                  );
                })
              )}
            </UsersList>

            <AddUserSection>
              <AddUserRow>
                <SearchableSelect
                  value={selectedUser}
                  onChange={(val) => setSelectedUser(val)}
                  options={availableUsers.map(user => ({
                    value: user.id,
                    label: `${user.cele_jmeno} (${user.username})`
                  }))}
                  placeholder="Vyberte uživatele..."
                  disabled={loading}
                  icon={<User size={14} />}
                />
                <AddButton
                  onClick={handleAddUser}
                  disabled={!selectedUser || loading}
                >
                  <Plus />
                  Přidat
                </AddButton>
              </AddUserRow>

              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={isMainUser}
                  onChange={e => setIsMainUser(e.target.checked)}
                  disabled={loading}
                />
                Zástupce (výchozí je hlavní)
              </CheckboxLabel>
            </AddUserSection>
          </RightSection>
          </TopSection>

          {/* SPODNÍ SEKCE - DVOUSLOUPCOVÝ LAYOUT */}
          <BottomSection>
            {/* LEVÝ SLOUPEC - Prefixy VPD/PPD */}
            <BottomLeftColumn>
              <SectionTitle>
                <Hash size={14} />
                Prefixy dokladů
              </SectionTitle>

              <FormRow>
                <FormGroup style={{ marginBottom: 0 }}>
                  <Label>
                    <Hash />
                    VPD prefix *
                  </Label>
                  <Input
                    type="text"
                    value={formData.ciselna_rada_vpd}
                    onChange={e => handleChange('ciselna_rada_vpd', e.target.value)}
                    placeholder="599"
                    $error={!formData.ciselna_rada_vpd}
                  />
                </FormGroup>

                <FormGroup style={{ marginBottom: 0 }}>
                  <Label>VPD od čísla</Label>
                  <Input
                    type="number"
                    value={formData.vpd_od_cislo}
                    onChange={e => handleChange('vpd_od_cislo', parseInt(e.target.value) || 1)}
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup style={{ marginBottom: 0 }}>
                  <Label>
                    <Hash />
                    PPD prefix *
                  </Label>
                  <Input
                    type="text"
                    value={formData.ciselna_rada_ppd}
                    onChange={e => handleChange('ciselna_rada_ppd', e.target.value)}
                    placeholder="499"
                    $error={!formData.ciselna_rada_ppd}
                  />
                </FormGroup>

                <FormGroup style={{ marginBottom: 0 }}>
                  <Label>PPD od čísla</Label>
                  <Input
                    type="number"
                    value={formData.ppd_od_cislo}
                    onChange={e => handleChange('ppd_od_cislo', parseInt(e.target.value) || 1)}
                  />
                </FormGroup>
              </FormRow>
            </BottomLeftColumn>

            {/* PRAVÝ SLOUPEC - Počáteční stav roku */}
            <BottomRightColumn>
              <SectionTitle>
                <DollarSign size={14} />
                Počáteční stav roku
              </SectionTitle>

              <FormGroup>
                <Label>
                  <DollarSign />
                  Počáteční stav 1. ledna (nový rok)
                </Label>
                <InputWithCurrency>
                  <CurrencyInput
                    type="number"
                    step="0.01"
                    value={formData.pocatecni_stav_rok}
                    onChange={e => handleChange('pocatecni_stav_rok', e.target.value)}
                    placeholder="Ponechte prázdné pro převod z prosince"
                  />
                  <CurrencySuffix>Kč</CurrencySuffix>
                </InputWithCurrency>
                <HelpText>
                  ⓘ <strong>Použije se při vytvoření knihy pro leden každého nového roku:</strong><br/>
                  Zadejte hodnotu (včetně 0) = použije se jako počáteční stav | Ponechte prázdné = převezme se koncový stav z prosince předchozího roku.
                </HelpText>
              </FormGroup>
            </BottomRightColumn>
          </BottomSection>
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose}>
            <X />
            Zrušit
          </CancelButton>
          <SaveButton onClick={handleSave} disabled={saving}>
            <Save />
            {saving ? 'Ukládám...' : 'Uložit změny'}
          </SaveButton>
        </ModalFooter>
          </ModalContainer>
        </ModalOverlay>,
        document.body
      )}

      {/* Confirm Dialog for User Removal */}
      {confirmRemove.show && ReactDOM.createPortal(
        <>
          <ConfirmOverlay onClick={handleRemoveUserCancel} />
          <ConfirmDialog>
            <ConfirmTitle>
              <AlertTriangle size={24} />
              Odebrat uživatele?
            </ConfirmTitle>
            <ConfirmMessage>
              Opravdu chcete odebrat uživatele <strong>{confirmRemove.userName}</strong> z této pokladny?
            </ConfirmMessage>
            <ConfirmButtons>
              <ConfirmCancelButton onClick={handleRemoveUserCancel}>
                Zrušit
              </ConfirmCancelButton>
              <ConfirmDeleteButton onClick={handleRemoveUserConfirm}>
                <Trash2 size={16} />
                Odebrat
              </ConfirmDeleteButton>
            </ConfirmButtons>
          </ConfirmDialog>
        </>,
        document.body
      )}
    </>
  );
};

export default EditCashboxDialog;
