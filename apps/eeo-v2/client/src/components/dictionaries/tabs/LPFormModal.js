/**
 * LPFormModal - Dialog pro vytvoření/editaci LP kódu
 *
 * @author Frontend Team
 * @date 2026-05-22
 */

import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faCoins } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../../context/AuthContext';
import { getUsekyList, getRoleList } from '../../../services/apiv2Dictionaries';
import DatePicker from '../../DatePicker';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 1.25rem 1.5rem;
  border-radius: 12px 12px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.375rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.625rem;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

const Body = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;

  /* Custom Scrollbar - Green Theme */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
  }

  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: #10b981 #f3f4f6;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: 0.875rem;
  margin-bottom: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  ${props => props.$required && `
    &::after {
      content: '*';
      color: #dc2626;
      margin-left: 0.25rem;
    }
  `}
`;

const Input = styled.input`
  padding: 0.625rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 0.625rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  min-height: 70px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const Select = styled.select`
  padding: 0.625rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Footer = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  background: #fafafa;
`;

const Button = styled.button`
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => props.$primary ? `
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);

    &:hover {
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      transform: translateY(-1px);
    }
  ` : `
    background: white;
    color: #6b7280;
    border: 2px solid #e5e7eb;

    &:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const Hint = styled.div`
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

const SectionTitle = styled.div`
  font-size: 0.9375rem;
  font-weight: 700;
  color: #059669;
  margin: 1.25rem 0 0.875rem 0;
  padding-bottom: 0.375rem;
  border-bottom: 2px solid #d1fae5;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  
  &:first-of-type {
    margin-top: 0;
  }
`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LPFormModal = ({ isOpen, onClose, onSave, mode, initialData }) => {
  const { user, token } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    cislo_lp: '',
    cislo_uctu: '',
    nazev_uctu: '',
    vyuziti: '',
    usek_id: '',
    user_id: '',
    kategorie: '',
    vyse_financniho_kryti: '',
    platne_od: '',
    platne_do: ''
  });

  const [useky, setUseky] = useState([]);
  const [uzivatele, setUzivatele] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Načíst úseky pro select
  useEffect(() => {
    const fetchUseky = async () => {
      try {
        const data = await getUsekyList({ token, username: user.username });
        setUseky(data || []);
      } catch (error) {
        console.error('Chyba při načítání úseků:', error);
      }
    };

    if (token && user?.username) {
      fetchUseky();
    }
  }, [token, user]);

  // Načíst uživatele (příkazce) pro select
  useEffect(() => {
    const fetchUzivatele = async () => {
      try {
        const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        const [usersResponse, roles] = await Promise.all([
          fetch(`${apiBase}hierarchy/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, username: user?.username })
          }).then((response) => response.json()),
          getRoleList({ token, username: user?.username })
        ]);

        const users = usersResponse?.data || [];
        const normalize = (value) => (value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        const allowedRoles = new Set(
          (roles || [])
            .filter((role) => {
              const name = normalize(role.nazev_role);
              return name.includes('prikazce') || name.includes('spravce rozpoctu');
            })
            .map((role) => parseInt(role.id, 10))
        );

        const filteredUsers = users.filter((u) =>
          Array.isArray(u.roles) && u.roles.some((roleId) => allowedRoles.has(parseInt(roleId, 10)))
        );

        const normalized = filteredUsers.map((u) => ({
          id: u.id,
          jmeno: u.jmeno ?? u.name ?? '',
          prijmeni: u.prijmeni ?? u.surname ?? '',
          titul_pred: u.titul_pred ?? u.titul ?? ''
        }));

        normalized.sort((a, b) => {
          const aName = `${a.prijmeni || ''} ${a.jmeno || ''}`.trim();
          const bName = `${b.prijmeni || ''} ${b.jmeno || ''}`.trim();
          return aName.localeCompare(bName, 'cs');
        });
        setUzivatele(normalized);
      } catch (error) {
        console.error('❌ Chyba při načítání uživatelů:', error);
      }
    };

    if (token && user?.username) {
      fetchUzivatele();
    }
  }, [token, user]);

  // Inicializovat form data při otevření dialogu
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        cislo_lp: initialData.cislo_lp || '',
        cislo_uctu: initialData.cislo_uctu || '',
        nazev_uctu: initialData.nazev_uctu || '',
        vyuziti: initialData.vyuziti || '',
        usek_id: initialData.usek_id || '',
        user_id: initialData.user_id ? String(initialData.user_id) : '',
        kategorie: initialData.kategorie || '',
        vyse_financniho_kryti: initialData.vyse_financniho_kryti || '',
        platne_od: initialData.platne_od || '',
        platne_do: initialData.platne_do || ''
      });
    } else {
      // Reset form pro nový záznam
      setFormData({
        cislo_lp: '',
        cislo_uctu: '',
        nazev_uctu: '',
        vyuziti: '',
        usek_id: '',
        user_id: '',
        kategorie: '',
        vyse_financniho_kryti: '',
        platne_od: '',
        platne_do: ''
      });
    }
    setErrors({});
  }, [mode, initialData, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.cislo_lp || !formData.cislo_lp.toString().trim()) {
      newErrors.cislo_lp = 'Číslo LP je povinné';
    }

    if (!formData.usek_id) {
      newErrors.usek_id = 'Úsek je povinný';
    }

    if (formData.vyse_financniho_kryti && isNaN(parseFloat(formData.vyse_financniho_kryti))) {
      newErrors.vyse_financniho_kryti = 'Výše krytí musí být číslo';
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
      // Připravit data pro API
      const dataToSave = {
        cislo_lp: formData.cislo_lp.toString().trim(),
        cislo_uctu: formData.cislo_uctu.trim() || null,
        nazev_uctu: formData.nazev_uctu.trim() || null,
        vyuziti: formData.vyuziti.trim() || null,
        usek_id: parseInt(formData.usek_id, 10),
        user_id: formData.user_id ? parseInt(formData.user_id, 10) : null,
        kategorie: formData.kategorie.trim() || null,
        vyse_financniho_kryti: formData.vyse_financniho_kryti ? parseFloat(formData.vyse_financniho_kryti) : null,
        platne_od: formData.platne_od || null,
        platne_do: formData.platne_do || null
      };

      await onSave(dataToSave);
    } catch (error) {
      console.error('Chyba při ukládání:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <Header>
            <Title>
              <FontAwesomeIcon icon={faCoins} />
              {mode === 'create' ? 'Nový LP kód' : 'Upravit LP kód'}
            </Title>
            <CloseButton type="button" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </Header>

          <Body>
            <SectionTitle>Základní informace</SectionTitle>

            <FormRow $columns="1fr 1fr">
              <FormGroup>
                <Label $required>Číslo LP kódu</Label>
                <Input
                  type="text"
                  value={formData.cislo_lp}
                  onChange={(e) => handleChange('cislo_lp', e.target.value)}
                  placeholder="Např. 25101"
                  disabled={mode === 'edit'}
                />
                {errors.cislo_lp && <ErrorMessage>{errors.cislo_lp}</ErrorMessage>}
                {mode === 'edit' && <Hint>Číslo LP nelze měnit</Hint>}
              </FormGroup>

              <FormGroup>
                <Label $required>Úsek</Label>
                <Select
                  value={formData.usek_id}
                  onChange={(e) => handleChange('usek_id', e.target.value)}
                >
                  <option value="">-- Vyberte úsek --</option>
                  {useky.map(usek => (
                    <option key={usek.id} value={usek.id}>
                      {usek.usek_zkr} - {usek.usek_nazev}
                    </option>
                  ))}
                </Select>
                {errors.usek_id && <ErrorMessage>{errors.usek_id}</ErrorMessage>}
              </FormGroup>
            </FormRow>

            <FormRow $columns="1fr 1fr">
              <FormGroup>
                <Label>Příkazce (správce rozpočtu)</Label>
                <Select
                  value={formData.user_id}
                  onChange={(e) => handleChange('user_id', e.target.value)}
                >
                  <option value="">-- Vyberte příkazce --</option>
                  {uzivatele.map(uzivatel => {
                    const titul = uzivatel.titul_pred || '';
                    const prijmeni = uzivatel.prijmeni || '';
                    const jmeno = uzivatel.jmeno || '';
                    const displayName = [titul, prijmeni, jmeno].filter(Boolean).join(' ');
                    return (
                      <option key={uzivatel.id} value={String(uzivatel.id)}>
                        {displayName}
                      </option>
                    );
                  })}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Kategorie</Label>
                <Input
                  type="text"
                  value={formData.kategorie}
                  onChange={(e) => handleChange('kategorie', e.target.value)}
                  placeholder="Např. Provozní, Investiční..."
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label>Výše finančního krytí (Kč)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.vyse_financniho_kryti}
                onChange={(e) => handleChange('vyse_financniho_kryti', e.target.value)}
                placeholder="Např. 1000000"
              />
              {errors.vyse_financniho_kryti && <ErrorMessage>{errors.vyse_financniho_kryti}</ErrorMessage>}
            </FormGroup>

            <SectionTitle>Účetní údaje</SectionTitle>

            <FormRow $columns="1fr 2fr">
              <FormGroup>
                <Label>Číslo účtu</Label>
                <Input
                  type="text"
                  value={formData.cislo_uctu}
                  onChange={(e) => handleChange('cislo_uctu', e.target.value)}
                  placeholder="Např. 5222"
                />
              </FormGroup>

              <FormGroup>
                <Label>Název účtu</Label>
                <Input
                  type="text"
                  value={formData.nazev_uctu}
                  onChange={(e) => handleChange('nazev_uctu', e.target.value)}
                  placeholder="Např. Opravy a udržování"
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label>Využití (popis účelu použití)</Label>
              <TextArea
                value={formData.vyuziti}
                onChange={(e) => handleChange('vyuziti', e.target.value)}
                placeholder="Popište účel a způsob využití tohoto LP kódu..."
              />
              <Hint>Uveďte stručný popis pro jaké účely bude LP kód používán</Hint>
            </FormGroup>

            <SectionTitle>Platnost</SectionTitle>

            <FormRow $columns="1fr 1fr">
              <FormGroup>
                <Label>Platné od</Label>
                <DatePicker
                  value={formData.platne_od}
                  onChange={(value) => handleChange('platne_od', value)}
                  placeholder="Vyberte datum"
                />
              </FormGroup>

              <FormGroup>
                <Label>Platné do</Label>
                <DatePicker
                  value={formData.platne_do}
                  onChange={(value) => handleChange('platne_do', value)}
                  placeholder="Vyberte datum"
                />
              </FormGroup>
            </FormRow>
          </Body>

          <Footer>
            <Button type="button" onClick={onClose} disabled={loading}>
              Zrušit
            </Button>
            <Button type="submit" $primary disabled={loading}>
              <FontAwesomeIcon icon={faSave} />
              {loading ? 'Ukládám...' : mode === 'create' ? 'Vytvořit' : 'Uložit'}
            </Button>
          </Footer>
        </form>
      </Modal>
    </Overlay>,
    document.body
  );
};

export default LPFormModal;
