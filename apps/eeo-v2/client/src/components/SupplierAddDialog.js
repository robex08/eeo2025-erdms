import React, { useState, useEffect, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck, faGlobe, faUser, faBuilding, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Building, MapPin, Hash, Mail, Phone, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { fetchUskyList } from '../services/api2auth';

// Styled Components
const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const DialogContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const DialogHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const DialogTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    font-size: 24px;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const DialogContent = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const InfoBox = styled.div`
  background: ${props => {
    if (props.type === 'update') return '#fff4e6';
    if (props.type === 'exists-own') return '#e6f7ff';
    if (props.type === 'exists-global') return '#fff0f6';
    return '#f0f9ff';
  }};
  border: 1px solid ${props => {
    if (props.type === 'update') return '#ffd591';
    if (props.type === 'exists-own') return '#91d5ff';
    if (props.type === 'exists-global') return '#ffadd2';
    return '#bae7ff';
  }};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  svg {
    font-size: 20px;
    margin-top: 2px;
    color: ${props => {
      if (props.type === 'update') return '#fa8c16';
      if (props.type === 'exists-own') return '#1890ff';
      if (props.type === 'exists-global') return '#eb2f96';
      return '#1890ff';
    }};
  }
`;

const InfoText = styled.div`
  flex: 1;

  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
    color: #262626;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #595959;
    line-height: 1.5;
  }
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || '1fr'};
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #595959;
  display: flex;
  align-items: center;
  gap: 6px;

  ${props => props.required && `
    &:after {
      content: '*';
      color: #ff4d4f;
      margin-left: 2px;
    }
  `}
`;

const InputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: #8c8c8c;
    pointer-events: none;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px 10px ${props => props.hasIcon ? '38px' : '12px'};
  border: 1px solid ${props => props.hasError ? '#ff4d4f' : '#d9d9d9'};
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  background: ${props => props.disabled ? '#f5f5f5' : 'white'};
  color: ${props => props.disabled ? '#8c8c8c' : '#262626'};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#ff4d4f' : '#40a9ff'};
    box-shadow: 0 0 0 2px ${props => props.hasError ? 'rgba(255,77,79,0.1)' : 'rgba(24,144,255,0.1)'};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const ScopeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.optionsCount}, 1fr);
  gap: 8px;
  margin-top: 8px;
`;

const ScopeOption = styled.button`
  padding: 12px;
  border: 2px solid ${props => props.selected ? '#667eea' : '#e5e7eb'};
  border-radius: 8px;
  background: ${props => props.selected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
  color: ${props => props.selected ? 'white' : '#595959'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  position: relative;

  &:hover:not(:disabled) {
    border-color: #667eea;
    background: ${props => props.selected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f9fafb'};
  }

  svg {
    font-size: 18px;
  }
`;

const ExistingIndicator = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: ${props => props.scope === 'global' ? '#10b981' : (props.scope === 'usek' ? '#3b82f6' : '#06b6d4')};
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  svg {
    font-size: 11px;
  }
`;

const UsekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin-top: 12px;
`;

const UsekItem = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 2px solid ${props => props.selected ? '#667eea' : '#e5e7eb'};
  border-radius: 6px;
  background: ${props => props.selected ? 'rgba(102, 126, 234, 0.05)' : 'white'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.selected ? '#667eea' : '#374151'};

  &:hover:not([disabled]) {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  }
`;

const UsekInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
`;

const UsekCode = styled.span`
  font-weight: 600;
  color: #667eea;
`;

const UsekName = styled.span`
  font-size: 11px;
  color: #6b7280;
`;

const ErrorText = styled.span`
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
`;

const DialogFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #fafafa;
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  ${props => props.variant === 'primary' && `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: white;
    color: #595959;
    border: 1px solid #d9d9d9;

    &:hover:not(:disabled) {
      border-color: #40a9ff;
      color: #40a9ff;
    }
  `}
`;

/**
 * Dialog pro přidání dodavatele do lokální databáze
 *
 * Props:
 * - isOpen: bool - zda je dialog otevřený
 * - onClose: func - callback pro zavření dialogu
 * - onSave: func(supplierData, scope) - callback po úspěšném uložení
 * - supplierData: obj - data dodavatele z formuláře
 * - existsInPersonal: obj|null - existující záznam v Personal scope
 * - existsInUsek: obj|null - existující záznam v Úsek scope
 * - existsInGlobal: obj|null - existující záznam v Global scope
 * - userPermissions: obj - uživatelská práva { canAddPersonal, canAddUsek, canAddGlobal }
 */
const SupplierAddDialog = ({
  isOpen,
  onClose,
  onSave,
  supplierData,
  existsInPersonal = null,
  existsInUsek = null,
  existsInGlobal = null,
  userPermissions = { canAddPersonal: true, canAddUsek: false, canAddGlobal: false }
}) => {
  const { token, username, userDetail } = useContext(AuthContext);
  const [editedData, setEditedData] = useState({});
  const [selectedScope, setSelectedScope] = useState('personal');
  const [selectedUseky, setSelectedUseky] = useState([]); // Vybrané úseky pro scope 'usek'
  const [availableUseky, setAvailableUseky] = useState([]); // Seznam všech úseků
  const [usekyLoading, setUsekyLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Inicializace dat při otevření dialogu
  useEffect(() => {
    if (isOpen && supplierData) {
      setEditedData({
        nazev: supplierData.dodavatel_nazev || '',
        adresa: supplierData.dodavatel_adresa || '',
        ico: supplierData.dodavatel_ico || '',
        dic: supplierData.dodavatel_dic || '',
        zastoupeny: supplierData.dodavatel_zastoupeny || '',
        kontakt_jmeno: supplierData.dodavatel_kontakt_jmeno || '',
        kontakt_email: supplierData.dodavatel_kontakt_email || '',
        kontakt_telefon: supplierData.dodavatel_kontakt_telefon || ''
      });

      // Výchozí scope podle toho, kde kontakt existuje
      // Priority: Personal > Úsek > Global (co má uživatel možnost upravit)
      if (existsInPersonal) {
        setSelectedScope('personal');
      } else if (existsInUsek) {
        setSelectedScope('usek');
        // Úseky se načtou a předvyplní v dalším useEffect
      } else if (existsInGlobal && userPermissions.canAddGlobal) {
        setSelectedScope('global');
      } else {
        setSelectedScope('personal');
      }

      setErrors({});
    }
  }, [isOpen, supplierData, existsInPersonal, existsInUsek, existsInGlobal, userPermissions.canAddGlobal]);

  // Načtení seznamu úseků při otevření dialogu
  useEffect(() => {
    const loadUseky = async () => {
      if (!isOpen || !userPermissions.canAddUsek) return;

      try {
        setUsekyLoading(true);
        const result = await fetchUskyList({ token, username });
        setAvailableUseky(result || []);
      } catch (error) {
      } finally {
        setUsekyLoading(false);
      }
    };

    loadUseky();
  }, [isOpen, userPermissions.canAddUsek, token, username]);

  // Předvyplnění úseků pokud existuje dodavatel v Úsek scope
  useEffect(() => {
    if (!isOpen) return;

    if (existsInUsek && existsInUsek.usek_zkr) {
      try {
        const usekArray = typeof existsInUsek.usek_zkr === 'string'
          ? JSON.parse(existsInUsek.usek_zkr)
          : existsInUsek.usek_zkr;
        if (Array.isArray(usekArray)) {
          setSelectedUseky(usekArray);
        }
      } catch (e) {
      }
    } else {
      // Pokud není existsInUsek, vymaž vybrané úseky
      setSelectedUseky([]);
    }
  }, [isOpen, existsInUsek]);

  const handleInputChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handler pro přepnutí výběru úseku
  const handleUsekToggle = (usekZkr) => {
    setSelectedUseky(prev => {
      if (prev.includes(usekZkr)) {
        return prev.filter(zkr => zkr !== usekZkr);
      } else {
        return [...prev, usekZkr];
      }
    });
  };

  const validateData = () => {
    const newErrors = {};

    if (!editedData.nazev?.trim()) {
      newErrors.nazev = 'Název je povinný';
    }

    if (!editedData.ico?.trim()) {
      newErrors.ico = 'IČO je povinné';
    } else if (!/^\d{8}$/.test(editedData.ico.trim())) {
      newErrors.ico = 'IČO musí mít 8 číslic';
    }

    if (editedData.kontakt_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedData.kontakt_email)) {
      newErrors.kontakt_email = 'Neplatný email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateData()) {
      return;
    }

    // Pokud je vybraný scope 'usek', ale žádné úseky nejsou zaškrtnuté,
    // použije se scope 'personal' (osobní)
    let finalScope = selectedScope;
    let finalUseky = null;

    if (selectedScope === 'usek') {
      if (selectedUseky.length === 0) {
        // Žádné úseky → přepnout na osobní
        finalScope = 'personal';
        finalUseky = null;
      } else {
        finalUseky = selectedUseky;
      }
    } else if (selectedScope === 'global') {
      // Global → user_id = 0, usek_zkr = prázdné
      finalUseky = null;
    }

    setIsSaving(true);

    try {
      await onSave(editedData, finalScope, finalUseky);
      onClose();
    } catch (error) {
      setErrors({ general: error.message || 'Chyba při ukládání dodavatele' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Určit typ akce a info box
  const getActionType = () => {
    // Zkontroluj existence v jednotlivých scope
    if (existsInPersonal || existsInUsek || existsInGlobal) {
      return 'exists';
    }
    return 'add';
  };

  const actionType = getActionType();

  // Určit text tlačítka podle vybraného scope a existence
  const getButtonText = () => {
    if (isSaving) return 'Ukládám...';

    // Zkontroluj, jestli v aktuálně vybraném scope dodavatel existuje
    const existsInSelectedScope =
      (selectedScope === 'personal' && existsInPersonal) ||
      (selectedScope === 'usek' && existsInUsek) ||
      (selectedScope === 'global' && existsInGlobal);

    if (existsInSelectedScope) {
      return 'Aktualizovat'; // Aktualizujeme existující záznam v tomto scope
    }

    return 'Přidat dodavatele'; // Přidáváme do nového scope nebo nový dodavatel
  };

  // Zjisti jestli aktualizujeme existující záznam
  const isUpdatingExisting =
    (selectedScope === 'personal' && existsInPersonal) ||
    (selectedScope === 'usek' && existsInUsek) ||
    (selectedScope === 'global' && existsInGlobal);

  return (
    <DialogOverlay>
      <DialogContainer onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            <FontAwesomeIcon icon={faBuilding} />
            {isUpdatingExisting ? 'Aktualizovat dodavatele' : 'Přidat dodavatele do adresáře'}
          </DialogTitle>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </DialogHeader>

        <DialogContent>
          {/* Info box podle situace */}
          {actionType === 'add' && (
            <InfoBox type="add">
              <FontAwesomeIcon icon={faBuilding} />
              <InfoText>
                <strong>Nový dodavatel</strong>
                <p>Dodavatel s tímto IČO nebyl nalezen v databázi. Můžete ho přidat.</p>
              </InfoText>
            </InfoBox>
          )}

          {actionType === 'exists' && (
            <InfoBox type="exists-own">
              <FontAwesomeIcon icon={faCheckCircle} />
              <InfoText>
                <strong>Dodavatel již existuje v adresáři</strong>
                <p>
                  Fajfky u scope označují, kde je dodavatel již uložen.
                  {existsInPersonal && ' Máte ho ve svém osobním adresáři.'}
                  {existsInUsek && ' Existuje v úsekovém adresáři.'}
                  {existsInGlobal && ' Existuje v globálním adresáři.'}
                </p>
              </InfoText>
            </InfoBox>
          )}

          {/* Rozsah uložení */}
          <FormSection>
            <SectionTitle>Rozsah uložení</SectionTitle>
            <ScopeSelector optionsCount={3}>
              {/* Osobní - vždy viditelný */}
              <ScopeOption
                selected={selectedScope === 'personal'}
                onClick={() => userPermissions.canAddPersonal && setSelectedScope('personal')}
                disabled={!userPermissions.canAddPersonal}
              >
                {existsInPersonal && (
                  <ExistingIndicator scope="personal" title="Kontakt již existuje v osobním adresáři">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </ExistingIndicator>
                )}
                <FontAwesomeIcon icon={faUser} />
                <span>Osobní</span>
              </ScopeOption>

              {/* Úsek - vždy viditelný */}
              <ScopeOption
                selected={selectedScope === 'usek'}
                onClick={() => userPermissions.canAddUsek && setSelectedScope('usek')}
                disabled={!userPermissions.canAddUsek}
              >
                {existsInUsek && (
                  <ExistingIndicator scope="usek" title="Kontakt již existuje v adresáři úseku">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </ExistingIndicator>
                )}
                <FontAwesomeIcon icon={faBuilding} />
                <span>Úsek</span>
              </ScopeOption>

              {/* Globální - vždy viditelný */}
              <ScopeOption
                selected={selectedScope === 'global'}
                onClick={() => userPermissions.canAddGlobal && setSelectedScope('global')}
                disabled={!userPermissions.canAddGlobal}
              >
                {existsInGlobal && (
                  <ExistingIndicator scope="global" title="Kontakt již existuje v globálním adresáři">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </ExistingIndicator>
                )}
                <FontAwesomeIcon icon={faGlobe} />
                <span>Globální</span>
              </ScopeOption>
            </ScopeSelector>
          </FormSection>

          {/* Výběr úseků - zobrazí se pouze když je vybraný scope 'usek' */}
          {selectedScope === 'usek' && (
            <FormSection>
              <SectionTitle>Výběr úseků</SectionTitle>
              {usekyLoading ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                  Načítám úseky...
                </div>
              ) : availableUseky.length === 0 ? (
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
                  ❌ Žádné úseky nebyly načteny
                </div>
              ) : (
                <UsekGrid>
                  {(userPermissions.canAddGlobal ? availableUseky :
                    availableUseky.filter(usek => {
                      // userDetail.usek_zkr může být pole ['IT', 'EN'] nebo string 'IT'
                      const myUseky = Array.isArray(userDetail?.usek_zkr)
                        ? userDetail.usek_zkr
                        : [userDetail?.usek_zkr];
                      return myUseky.includes(usek.usek_zkr);
                    })
                  ).map((usek) => (
                    <UsekItem
                      key={usek.usek_zkr}
                      selected={selectedUseky.includes(usek.usek_zkr)}
                      disabled={!userPermissions.canAddGlobal && (() => {
                        const myUseky = Array.isArray(userDetail?.usek_zkr)
                          ? userDetail.usek_zkr
                          : [userDetail?.usek_zkr];
                        return !myUseky.includes(usek.usek_zkr);
                      })()}
                      onClick={() => {
                        const myUseky = Array.isArray(userDetail?.usek_zkr)
                          ? userDetail.usek_zkr
                          : [userDetail?.usek_zkr];
                        if (userPermissions.canAddGlobal || myUseky.includes(usek.usek_zkr)) {
                          handleUsekToggle(usek.usek_zkr);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUseky.includes(usek.usek_zkr)}
                        onChange={() => handleUsekToggle(usek.usek_zkr)}
                        disabled={!userPermissions.canAddGlobal && (() => {
                          const myUseky = Array.isArray(userDetail?.usek_zkr)
                            ? userDetail.usek_zkr
                            : [userDetail?.usek_zkr];
                          return !myUseky.includes(usek.usek_zkr);
                        })()}
                      />
                      <UsekCode>{usek.usek_zkr}</UsekCode>
                    </UsekItem>
                  ))}
                </UsekGrid>
              )}
              {selectedUseky.length === 0 && !usekyLoading && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#e0f2fe', border: '1px solid #0ea5e9', borderRadius: '6px', fontSize: '12px', color: '#0c4a6e' }}>
                  ℹ️ Pokud nevyberete žádný úsek, kontakt se uloží jako osobní
                </div>
              )}
            </FormSection>
          )}

          {/* Základní údaje */}
          <FormSection>
            <SectionTitle>Základní údaje</SectionTitle>
            <FormRow columns="1fr">
              <FormGroup>
                <Label required>Název společnosti</Label>
                <InputWithIcon>
                  <Building />
                  <Input
                    type="text"
                    value={editedData.nazev || ''}
                    onChange={(e) => handleInputChange('nazev', e.target.value)}
                    hasError={!!errors.nazev}
                    hasIcon
                    placeholder="Název dodavatele"
                  />
                </InputWithIcon>
                {errors.nazev && <ErrorText>{errors.nazev}</ErrorText>}
              </FormGroup>
            </FormRow>

            <FormRow columns="2fr 1fr 1fr">
              <FormGroup>
                <Label required>Adresa</Label>
                <InputWithIcon>
                  <MapPin />
                  <Input
                    type="text"
                    value={editedData.adresa || ''}
                    onChange={(e) => handleInputChange('adresa', e.target.value)}
                    hasError={!!errors.adresa}
                    hasIcon
                    placeholder="Adresa sídla"
                  />
                </InputWithIcon>
                {errors.adresa && <ErrorText>{errors.adresa}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label required>IČO</Label>
                <InputWithIcon>
                  <Hash />
                  <Input
                    type="text"
                    value={editedData.ico || ''}
                    onChange={(e) => handleInputChange('ico', e.target.value)}
                    hasError={!!errors.ico}
                    hasIcon
                    placeholder="12345678"
                    maxLength={8}
                  />
                </InputWithIcon>
                {errors.ico && <ErrorText>{errors.ico}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>DIČ</Label>
                <InputWithIcon>
                  <Hash />
                  <Input
                    type="text"
                    value={editedData.dic || ''}
                    onChange={(e) => handleInputChange('dic', e.target.value)}
                    hasIcon
                    placeholder="CZ12345678"
                  />
                </InputWithIcon>
              </FormGroup>
            </FormRow>

            <FormRow columns="1fr">
              <FormGroup>
                <Label>Zastoupen(a)</Label>
                <InputWithIcon>
                  <User />
                  <Input
                    type="text"
                    value={editedData.zastoupeny || ''}
                    onChange={(e) => handleInputChange('zastoupeny', e.target.value)}
                    hasIcon
                    placeholder="Jméno jednajícího"
                  />
                </InputWithIcon>
              </FormGroup>
            </FormRow>
          </FormSection>

          {/* Kontaktní údaje */}
          <FormSection>
            <SectionTitle>Kontaktní osoba</SectionTitle>
            <FormRow columns="1fr">
              <FormGroup>
                <Label>Jméno kontaktní osoby</Label>
                <InputWithIcon>
                  <User />
                  <Input
                    type="text"
                    value={editedData.kontakt_jmeno || ''}
                    onChange={(e) => handleInputChange('kontakt_jmeno', e.target.value)}
                    hasIcon
                    placeholder="Jméno a příjmení"
                  />
                </InputWithIcon>
              </FormGroup>
            </FormRow>

            <FormRow columns="1fr 1fr">
              <FormGroup>
                <Label>Email</Label>
                <InputWithIcon>
                  <Mail />
                  <Input
                    type="email"
                    value={editedData.kontakt_email || ''}
                    onChange={(e) => handleInputChange('kontakt_email', e.target.value)}
                    hasError={!!errors.kontakt_email}
                    hasIcon
                    placeholder="email@example.com"
                  />
                </InputWithIcon>
                {errors.kontakt_email && <ErrorText>{errors.kontakt_email}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <Label>Telefon</Label>
                <InputWithIcon>
                  <Phone />
                  <Input
                    type="tel"
                    value={editedData.kontakt_telefon || ''}
                    onChange={(e) => handleInputChange('kontakt_telefon', e.target.value)}
                    hasIcon
                    placeholder="+420 123 456 789"
                  />
                </InputWithIcon>
              </FormGroup>
            </FormRow>
          </FormSection>

          {errors.general && (
            <ErrorText style={{ display: 'block', marginTop: '16px', fontSize: '14px' }}>
              {errors.general}
            </ErrorText>
          )}
        </DialogContent>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            <FontAwesomeIcon icon={faTimes} />
            Zrušit
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            <FontAwesomeIcon icon={faCheck} />
            {getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContainer>
    </DialogOverlay>
  );
};

export default SupplierAddDialog;
