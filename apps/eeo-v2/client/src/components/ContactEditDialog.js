import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { X, Save, RotateCw, AlertTriangle, Building, User, Globe, Phone, Mail, UserCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { createSupplier, updateSupplierByIco, fetchUseky } from '../services/api2auth';

// 🎨 MODERNÍ ANIMACE
const spinAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

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

// 🏗️ DIALOG STRUKTURA
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
  max-width: 1200px;
  max-height: 95vh;
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

const HeaderLeft = styled.div`
  flex: 1;
`;

const DialogTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
`;

const DialogSubtitle = styled.p`
  margin: 0.5rem 0 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  font-weight: 400;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 12px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const DialogContent = styled.div`
  max-height: calc(95vh - 200px);
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

// 📝 FORM KOMPONENTY
const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
`;

const FullWidthSection = styled.div`
  grid-column: 1 / -1;
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
`;

const FormSection = styled.div`
  padding: 2rem;
  background: white;

  &:not(:last-child) {
    border-bottom: 1px solid #f1f5f9;
  }

  &.left-column {
    border-right: 1px solid #f1f5f9;

    @media (max-width: 900px) {
      border-right: none;
    }
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
`;

const SectionIcon = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: #1e293b;
  font-size: 1.125rem;
  font-weight: 600;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 1.5rem;

  &.two-columns {
    grid-template-columns: 1fr 1fr;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s;
  background: white;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  &.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
  }

  &:disabled {
    background: #f8fafc;
    color: #64748b;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  background: white;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
`;

const ErrorMessage = styled.div`
  margin-top: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: ${spinAnimation} 1s linear infinite;
`;

const AresButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background: #e2e8f0;
    color: #64748b;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

// ️ ÚSEKY KOMPONENTY
const DepartmentSection = styled.div`
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
`;

const DepartmentTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #374151;
`;

const DepartmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
`;

const DepartmentItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: ${props => props.selected ? '#eff6ff' : 'white'};
  border: 2px solid ${props => props.selected ? '#3b82f6' : '#e2e8f0'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: ${props => props.selected ? '#dbeafe' : '#f8fafc'};
    border-color: ${props => props.selected ? '#2563eb' : '#cbd5e1'};
    transform: translateY(-1px);
  }

  input {
    margin: 0;
    width: 1.125rem;
    height: 1.125rem;
  }
`;

const DepartmentInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const DepartmentCode = styled.span`
  font-weight: 700;
  color: #1e293b;
  font-size: 0.875rem;
`;

const DepartmentName = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
`;

const InfoMessage = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #92400e;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
`;

// 🔘 FOOTER KOMPONENTY
const DialogFooter = styled.div`
  padding: 2rem;
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
  font-size: 0.875rem;
  color: #64748b;
`;

const FooterRight = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s;

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
`;

// 🎯 HLAVNÍ KOMPONENTA
const ContactEditDialog = ({ isOpen, onClose, contact, permissionLevel, userDetail, showToast, onSave }) => {
  const { token, username, user_id } = useContext(AuthContext);

  // 📊 STATE
  const [formData, setFormData] = useState({
    ico: '',
    nazev: '',
    adresa: '',
    dic: '',
    zastoupeny: '',
    kontakt_jmeno: '',
    kontakt_telefon: '',
    kontakt_email: '',
    visibility: 'user',
    usek_zkr: []
  });

  const [aresData, setAresData] = useState(null);
  const [aresLoading, setAresLoading] = useState(false);
  const [aresError, setAresError] = useState('');

  const [useky, setUseky] = useState([]);
  const [usekyLoading, setUsekyLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // 🔐 OPRÁVNĚNÍ
  const canManageDepartments = permissionLevel === 'MANAGE';
  const currentUserDepartment = userDetail?.usek_zkr || userDetail?.department || userDetail?.usek || '';

  // 🔄 INICIALIZACE
  useEffect(() => {
    if (isOpen) {
      loadUseky();

      if (contact) {
        // Parsování usek_zkr ze stringu na array
        let usekArray = [];
        try {
          if (typeof contact.usek_zkr === 'string' && contact.usek_zkr.trim() !== '') {
            usekArray = JSON.parse(contact.usek_zkr);
          } else if (Array.isArray(contact.usek_zkr)) {
            usekArray = contact.usek_zkr;
          }
        } catch (error) {
        }

        setFormData({
          ico: contact.ico || '',
          nazev: contact.nazev || contact.name || '',
          adresa: contact.adresa || '',
          dic: contact.dic || '',
          zastoupeny: contact.zastoupeny || '',
          kontakt_jmeno: contact.kontakt_jmeno || '',
          kontakt_telefon: contact.kontakt_telefon || '',
          kontakt_email: contact.kontakt_email || '',
          visibility: getContactVisibility(contact),
          usek_zkr: usekArray
        });
      } else {
        setFormData({
          ico: '',
          nazev: '',
          adresa: '',
          dic: '',
          zastoupeny: '',
          kontakt_jmeno: '',
          kontakt_telefon: '',
          kontakt_email: '',
          visibility: 'user',
          usek_zkr: []
        });
      }

      setAresData(null);
      setAresError('');
      setErrors({});
    }
  }, [contact, isOpen]);

  // NAČÍTÁNÍ ÚSEKŮ
  const loadUseky = async () => {
    setUsekyLoading(true);
    try {
      const response = await fetchUseky({ token, username });

      // fetchUseky už vrací přímo data (ne response.data.data)
      if (Array.isArray(response)) {
        setUseky(response);
      } else if (response?.data && Array.isArray(response.data)) {
        setUseky(response.data);
      } else {
        setUseky([]);
      }
    } catch (error) {
      setUseky([]);
    }
    setUsekyLoading(false);
  };

  // 🔍 DETEKCE VISIBILITY
  const getContactVisibility = (contact) => {
    if (!contact) return 'user';

    // Pokud existuje něco v usek_zkr, je to kontakt úseků (má prioritu)
    if (contact.usek_zkr && contact.usek_zkr !== '' && contact.usek_zkr !== '[]') {
      return 'department';
    }

    // Pokud user_id je 0, je to globální kontakt
    if (contact.user_id === 0 || contact.user_id === '0') {
      return 'global';
    }

    // Jinak je to osobní kontakt
    return 'user';
  };

  // 📝 FORM HANDLERS
  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Pro běžné uživatele: při přepnutí na "department" automaticky nastavit jejich úsek
      if (field === 'visibility' && value === 'department' && !canManageDepartments && currentUserDepartment) {
        newData.usek_zkr = [currentUserDepartment];
      }

      return newData;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleUsekToggle = (usekCode) => {
    setFormData(prev => ({
      ...prev,
      usek_zkr: prev.usek_zkr.includes(usekCode)
        ? prev.usek_zkr.filter(code => code !== usekCode)
        : [...prev.usek_zkr, usekCode]
    }));
  };

  // 🔍 ARES VYHLEDÁVÁNÍ
  const handleAresSearch = async () => {
    if (!formData.ico || formData.ico.length < 8) {
      setAresError('IČO musí mít alespoň 8 znaků');
      return;
    }

    setAresLoading(true);
    setAresError('');
    setAresData(null);

    try {
      const url = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${formData.ico.trim()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        // ARES endpoint pro konkrétní IČO vrací přímo objekt subjektu, ne pole
        if (data.ico && data.obchodniJmeno) {
          const adresa = data.sidlo?.textovaAdresa ||
                        `${data.sidlo?.nazevUlice || ''} ${data.sidlo?.cisloDomovni || ''}, ${data.sidlo?.psc || ''} ${data.sidlo?.nazevObce || ''}`.trim();

          setAresData({
            nazev: data.obchodniJmeno,
            adresa: adresa,
            dic: data.dic || ''
          });

          // Automatické vyplnění formuláře
          setFormData(prev => ({
            ...prev,
            nazev: data.obchodniJmeno,
            adresa: adresa,
            dic: data.dic || prev.dic
          }));
        } else {
          setAresError('Subjekt s tímto IČO nebyl v ARES databázi nalezen');
        }
      } else {
        setAresError('Subjekt s tímto IČO nebyl v ARES databázi nalezen');
      }
    } catch (error) {
      setAresError('Chyba při komunikaci s ARES databází');
    }

    setAresLoading(false);
  };

  // ✅ VALIDACE
  const validateForm = () => {
    const newErrors = {};

    if (!formData.ico.trim()) {
      newErrors.ico = 'IČO je povinné';
    } else if (!/^\d{8}$/.test(formData.ico.trim())) {
      newErrors.ico = 'IČO musí obsahovat přesně 8 číslic';
    }

    if (!formData.nazev.trim()) {
      newErrors.nazev = 'Název je povinný';
    }

    // Validace kontaktů úseků
    if (formData.visibility === 'department') {
      if (canManageDepartments && formData.usek_zkr.length === 0) {
        newErrors.usek_zkr = 'Pro kontakt úseků musíte vybrat alespoň jeden úsek';
      } else if (!canManageDepartments && !currentUserDepartment) {
        newErrors.usek_zkr = 'Nemáte přiřazen žádný úsek';
      }
    }

    // Validace emailu
    if (formData.kontakt_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.kontakt_email)) {
      newErrors.kontakt_email = 'Neplatný formát emailu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💾 ULOŽENÍ
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const supplierData = {
        ico: formData.ico.trim(),
        nazev: formData.nazev.trim(),
        adresa: formData.adresa.trim() || '',
        dic: formData.dic.trim() || '',
        zastoupeny: formData.zastoupeny.trim() || '',
        kontakt_jmeno: formData.kontakt_jmeno.trim() || '',
        kontakt_telefon: formData.kontakt_telefon.trim() || '',
        kontakt_email: formData.kontakt_email.trim() || ''
      };

      // Add visibility parameters based on selected visibility
      if (formData.visibility === 'user') {
        supplierData.user_id = user_id;
        supplierData.usek_zkr = '';
      } else if (formData.visibility === 'department') {
        supplierData.user_id = 0;
        const usekyToSave = formData.usek_zkr.length > 0 ? formData.usek_zkr : [currentUserDepartment];
        supplierData.usek_zkr = JSON.stringify(usekyToSave);
      } else if (formData.visibility === 'global') {
        supplierData.user_id = 0;
        supplierData.usek_zkr = '';
      }

      let result;
      if (contact) {
        result = await updateSupplierByIco({
          ...supplierData,
          token,
          username
        });
      } else {
        result = await createSupplier({
          ...supplierData,
          token,
          username
        });
      }

      if (result) {
        if (showToast) {
          showToast(
            contact ? 'Kontakt byl úspěšně aktualizován' : 'Kontakt byl úspěšně vytvořen',
            'success'
          );
        }
        if (onSave) {
          onSave();
        }
        onClose();
      }
    } catch (error) {
      if (showToast) {
        showToast('Chyba při ukládání kontaktu: ' + error.message, 'error');
      }
    }

    setSaving(false);
  };

  // 🎯 VISIBILITY OPTIONS
  const getVisibilityOptions = () => {
    const options = [
      { value: 'user', label: 'Osobní kontakt', icon: <User size={14} /> }
    ];

    if (currentUserDepartment) {
      options.push({
        value: 'department',
        label: 'Kontakty úseku',
        icon: <Building size={14} />
      });
    }

    if (canManageDepartments) {
      options.push({
        value: 'global',
        label: 'Globální kontakt',
        icon: <Globe size={14} />
      });
    }

    return options;
  };

  if (!isOpen) return null;

  const isEditMode = !!contact;
  const visibilityOptions = getVisibilityOptions();

  return ReactDOM.createPortal(
    <DialogOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <DialogContainer>
        <DialogHeader>
          <DialogHeaderContent>
            <HeaderLeft>
              <DialogTitle>
                {isEditMode ? 'Upravit kontakt' : 'Přidat nový kontakt'}
              </DialogTitle>
              <DialogSubtitle>
                {isEditMode ? 'Aktualizujte informace o dodavateli' : 'Vytvořte nový kontakt dodavatele'}
              </DialogSubtitle>
            </HeaderLeft>
            <CloseButton onClick={onClose}>
              <X size={20} />
            </CloseButton>
          </DialogHeaderContent>
        </DialogHeader>

        <DialogContent>
          <MainContent>
            {/* 🏢 LEVÝ SLOUPEC - ZÁKLADNÍ ÚDAJE */}
            <FormSection className="left-column">
              <SectionHeader>
                <SectionIcon>
                  <Building size={16} />
                </SectionIcon>
                <SectionTitle>Základní údaje společnosti</SectionTitle>
              </SectionHeader>

              <FormGrid className="two-columns">
                <FormGroup>
                  <Label>
                    <span>IČO *</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.ico}
                    onChange={(e) => handleFieldChange('ico', e.target.value)}
                    placeholder="12345678"
                    className={errors.ico ? 'error' : ''}
                    maxLength={8}
                  />
                  {errors.ico && (
                    <ErrorMessage>
                      <AlertTriangle size={14} />
                      {errors.ico}
                    </ErrorMessage>
                  )}
                </FormGroup>

                <FormGroup>
                  <Label>Viditelnost</Label>
                  <Select
                    value={formData.visibility}
                    onChange={(e) => handleFieldChange('visibility', e.target.value)}
                  >
                    {visibilityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              </FormGrid>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                background: aresData ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${aresData ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: '6px',
                fontSize: '0.8rem'
              }}>
                <AresButton
                  onClick={handleAresSearch}
                  disabled={aresLoading || !formData.ico || formData.ico.length < 8}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                >
                  {aresLoading ? <LoadingSpinner /> : <RotateCw size={14} />}
                  Vyhledat v ARES
                </AresButton>
                <div style={{ flex: 1, color: aresData ? '#166534' : aresError ? '#dc2626' : '#6b7280' }}>
                  {aresData ? (
                    `✅ ${aresData.nazev}`
                  ) : aresError ? (
                    `❌ ${aresError}`
                  ) : (
                    'Zadejte IČO a klikněte na tlačítko'
                  )}
                </div>
              </div>

              <FormGrid style={{ marginTop: '2rem' }}>
                <FormGroup>
                  <Label>Název *</Label>
                  <Input
                    type="text"
                    value={formData.nazev}
                    onChange={(e) => handleFieldChange('nazev', e.target.value)}
                    placeholder="Název společnosti"
                    className={errors.nazev ? 'error' : ''}
                  />
                  {errors.nazev && (
                    <ErrorMessage>
                      <AlertTriangle size={14} />
                      {errors.nazev}
                    </ErrorMessage>
                  )}
                </FormGroup>

                <FormGroup>
                  <Label>Adresa</Label>
                  <Input
                    type="text"
                    value={formData.adresa}
                    onChange={(e) => handleFieldChange('adresa', e.target.value)}
                    placeholder="Ulice, město, PSČ"
                  />
                </FormGroup>
              </FormGrid>

              <FormGrid className="two-columns" style={{ marginTop: '1.5rem' }}>
                <FormGroup>
                  <Label>DIČ</Label>
                  <Input
                    type="text"
                    value={formData.dic}
                    onChange={(e) => handleFieldChange('dic', e.target.value)}
                    placeholder="CZ12345678"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Zastoupený</Label>
                  <Input
                    type="text"
                    value={formData.zastoupeny}
                    onChange={(e) => handleFieldChange('zastoupeny', e.target.value)}
                    placeholder="Jméno zastoupené osoby"
                  />
                </FormGroup>
              </FormGrid>
            </FormSection>

            {/* 👤 PRAVÝ SLOUPEC - KONTAKTNÍ OSOBA + ÚSEKY */}
            <div>
              <FormSection>
                <SectionHeader>
                  <SectionIcon>
                    <UserCheck size={16} />
                  </SectionIcon>
                  <SectionTitle>Kontaktní osoba</SectionTitle>
                </SectionHeader>

                <FormGroup>
                  <Label>Jméno kontaktní osoby</Label>
                  <Input
                    type="text"
                    value={formData.kontakt_jmeno}
                    onChange={(e) => handleFieldChange('kontakt_jmeno', e.target.value)}
                    placeholder="Jan Novák"
                  />
                </FormGroup>

                <FormGrid className="two-columns" style={{ marginTop: '1.5rem' }}>
                  <FormGroup>
                    <Label>
                      <Phone size={14} />
                      Telefon
                    </Label>
                    <Input
                      type="tel"
                      value={formData.kontakt_telefon}
                      onChange={(e) => handleFieldChange('kontakt_telefon', e.target.value)}
                      placeholder="+420 123 456 789"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>
                      <Mail size={14} />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={formData.kontakt_email}
                      onChange={(e) => handleFieldChange('kontakt_email', e.target.value)}
                      placeholder="kontakt@firma.cz"
                      className={errors.kontakt_email ? 'error' : ''}
                    />
                    {errors.kontakt_email && (
                      <ErrorMessage>
                        <AlertTriangle size={14} />
                        {errors.kontakt_email}
                      </ErrorMessage>
                    )}
                  </FormGroup>
                </FormGrid>
              </FormSection>
            </div>
          </MainContent>

          {/* 🏛️ ÚSEKY - FULL WIDTH NA SPODKU */}
          {formData.visibility === 'department' && (
            <FullWidthSection>
              <FormSection>
                <SectionHeader>
                  <SectionIcon>
                    <Building size={16} />
                  </SectionIcon>
                  <SectionTitle>Přiřazení k úsekům</SectionTitle>
                </SectionHeader>

                <DepartmentSection>
                  <DepartmentTitle>
                    {canManageDepartments ? 'Vyberte úseky:' : `Váš úsek: ${currentUserDepartment}`}
                  </DepartmentTitle>

                  {usekyLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
                      <LoadingSpinner />
                      <span>Načítám úseky...</span>
                    </div>
                  ) : useky.length === 0 ? (
                    <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
                      ❌ Žádné úseky nebyly načteny
                    </div>
                  ) : (
                    <DepartmentGrid>
                      {(canManageDepartments ? useky :
                        useky.filter(usek => usek.usek_zkr === currentUserDepartment)
                      ).map((usek, index) => {
                        return (
                          <DepartmentItem
                            key={usek.usek_zkr || index}
                            selected={formData.usek_zkr.includes(usek.usek_zkr)}
                            onClick={() => handleUsekToggle(usek.usek_zkr)}
                          >
                            <input
                              type="checkbox"
                              checked={formData.usek_zkr.includes(usek.usek_zkr)}
                              onChange={() => handleUsekToggle(usek.usek_zkr)}
                            />
                            <DepartmentInfo>
                              <DepartmentCode>{usek.usek_zkr || 'N/A'}</DepartmentCode>
                              <DepartmentName>{usek.usek_nazev || 'Název nenalezen'}</DepartmentName>
                            </DepartmentInfo>
                          </DepartmentItem>
                        );
                      })}
                    </DepartmentGrid>
                  )}

                  {formData.visibility === 'department' && formData.usek_zkr.length === 0 && !usekyLoading && (
                    <InfoMessage>
                      <AlertTriangle size={16} />
                      <div>
                        <strong>Vyberte alespoň jeden úsek</strong>
                        <br />
                        Kontakt bude viditelný pouze ve vybraných úsecích.
                      </div>
                    </InfoMessage>
                  )}
                </DepartmentSection>
              </FormSection>
            </FullWidthSection>
          )}
        </DialogContent>

        <DialogFooter>
          <FooterLeft>
            <Globe size={14} />
            <span>
              {formData.visibility === 'user' && 'Osobní kontakt'}
              {formData.visibility === 'department' && `Kontakt úseků (${formData.usek_zkr.length})`}
              {formData.visibility === 'global' && 'Globální kontakt'}
            </span>
          </FooterLeft>

          <FooterRight>
            <Button className="cancel" onClick={onClose}>
              Zrušit
            </Button>
            <Button
              className="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <LoadingSpinner /> : <Save size={16} />}
              {saving ? 'Ukládám...' : 'Uložit kontakt'}
            </Button>
          </FooterRight>
        </DialogFooter>
      </DialogContainer>
    </DialogOverlay>,
    document.body
  );
};

export default ContactEditDialog;