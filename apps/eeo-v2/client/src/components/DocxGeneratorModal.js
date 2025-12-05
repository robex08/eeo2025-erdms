import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faFileWord,
  faDownload,
  faSpinner,
  faExclamationTriangle,
  faInfoCircle,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { getDocxSablonyList } from '../services/apiv2Dictionaries';
import { getDocxOrderData } from '../services/apiDocxOrders';
// ✅ NOVÝ DYNAMICKÝ SYSTÉM - používá POUZE mapování z DB (mapovani_json)
import { generateDocxDocument, downloadGeneratedDocx } from '../utils/docx/newDocxGenerator';

// ============================================================================
// ✅ SJEDNOCENÝ STYLING - stejný jako ostatní dialogy v Orders25List
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
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 0;
  max-width: 1200px;
  width: 95%;
  max-height: 90vh;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);

  h2 {
    margin: 0;
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.75rem;

    svg {
      color: white;
    }
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  gap: 1.5rem;

  @media (max-width: 1200px) {
    flex-direction: column;
  }
`;

// Levý sloupec - Info + Výběr uživatele
const LeftColumn = styled.div`
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (max-width: 1200px) {
    flex: 1;
  }
`;

// Pravý sloupec - Seznam šablon
const RightColumn = styled.div`
  flex: 1;
  min-width: 0; /* Umožní správné shrinkování */
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &.full-width {
    grid-column: 1 / -1;
  }
`;

const InfoDivider = styled.div`
  grid-column: 1 / -1;
  border-top: 1px solid #cbd5e1;
  margin: 0.5rem 0;
`;

// ✅ Styled komponenta pro info box objednávky
const OrderInfoBox = styled.div`
  background: linear-gradient(135deg, #dbeafe 0%, #f0f9ff 100%);
  border: 2px solid #93c5fd;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;

  h3 {
    margin: 0 0 1rem 0;
    color: #1e40af;
    font-size: 1.05rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    svg {
      color: #3b82f6;
    }
  }
`;

// ✅ NOVÉ: Styled komponenty pro výběr uživatele
const UserSelectSection = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fef9f5 100%);
  border: 2px solid #fcd34d;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;

  h3 {
    margin: 0 0 1rem 0;
    color: #92400e;
    font-size: 1.05rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    svg {
      color: #f59e0b;
    }
  }

  p {
    margin: 0 0 1rem 0;
    color: #78350f;
    font-size: 0.875rem;
    line-height: 1.5;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1e293b;
  background: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #10b981;
  }

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
    opacity: 0.6;
  }

  option {
    padding: 0.5rem;
  }

  option:disabled {
    color: #94a3b8;
    font-style: italic;
  }
`;

const InfoLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoValue = styled.span`
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 500;

  &.highlighted {
    color: #3b82f6;
    font-weight: 700;
    font-size: 1.05rem;
  }

  &.price {
    color: #059669;
    font-weight: 700;
  }

  &.missing {
    color: #94a3b8;
    font-style: italic;
  }
`;

const TemplatesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TemplatesHeader = styled.div`
  margin-bottom: 1rem;

  h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 1.05rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
  }
`;

const TemplateItem = styled.div`
  border: 2px solid ${props => props.$selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 10px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$selected ? '#eff6ff' : 'white'};
  position: relative;

  &:hover {
    border-color: ${props => props.$selected ? '#2563eb' : '#cbd5e1'};
    background: ${props => props.$selected ? '#eff6ff' : '#f8fafc'};
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateX(2px);
  }

  ${props => props.$selected && `
    &::after {
      content: '✓';
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 28px;
      height: 28px;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
    }
  `}

  h4 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
    font-size: 1.05rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-right: ${props => props.$selected ? '2.5rem' : '0'};

    svg {
      color: ${props => props.$selected ? '#3b82f6' : '#64748b'};
    }

    .template-type {
      font-size: 0.8rem;
      font-weight: 400;
      color: #94a3b8;
      margin-left: 0.25rem;
    }
  }

  p {
    margin: 0.5rem 0;
    color: #64748b;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .meta {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;

    span {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;

      &::before {
        content: '•';
        color: #cbd5e1;
      }

      &:first-of-type::before {
        content: '';
      }
    }
  }
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  background: #f8fafc;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 2px solid;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    transform: translateY(1px);
  }
`;

const CancelButton = styled(Button)`
  background: white;
  border-color: #d1d5db;
  color: #6b7280;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
    color: #374151;
  }
`;

const GenerateButton = styled(Button)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  color: white;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    border-color: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;

  .spinner {
    margin-bottom: 1rem;
    font-size: 2.5rem;
    color: #3b82f6;
    animation: spin 1s linear infinite;
  }

  p {
    margin: 0;
    font-size: 1rem;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #dc2626;

  .icon {
    margin-bottom: 1rem;
    font-size: 2.5rem;
  }

  p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.6;
  }
`;

const NoTemplatesMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;

  .icon {
    margin-bottom: 1rem;
    font-size: 2.5rem;
  }

  p {
    margin: 0;
    font-size: 1rem;
  }
`;

export const DocxGeneratorModal = ({ order, isOpen, onClose }) => {
  const { user, token } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUserIndex, setSelectedUserIndex] = useState(-1); // ✅ INDEX vybraného uživatele v poli
  const [availableUsers, setAvailableUsers] = useState([]); // ✅ Dostupní uživatelé z workflow

  // Načtení šablon a uživatelů při otevření modalu
  useEffect(() => {
    if (!isOpen || !order) return;

    // ✅ Načti uživatele přímo z order objektu (již je enriched ze seznamu)
    // ⚠️ POZOR: Enriched API vrací objekty s podtržítky: garant_uzivatel, prikazce_uzivatel, ...
    // 
    // 🔮 FUTURE: Backend enriched endpoint vrací přímo pole `dostupni_uzivatele_pro_podpis[]`
    // které obsahuje všechny tyto uživatele v jednotné struktuře:
    // { id, cele_jmeno, role, lokalita_nazev }
    // Až bude backend ready, můžeme použít přímo ten seznam.
    const loadAvailableUsers = () => {
      const users = [];

      // Garant (order.garant_uzivatel objekt, ID na order.garant_uzivatel_id)
      if (order.garant_uzivatel_id && order.garant_uzivatel?.cele_jmeno &&
          order.garant_uzivatel.cele_jmeno !== 'Nezadáno' && order.garant_uzivatel.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.garant_uzivatel_id,
          name: order.garant_uzivatel.cele_jmeno,
          role: 'Garant'
        });
      }

      // Příkazce (order.prikazce_uzivatel objekt, ID na order.prikazce_id)
      if (order.prikazce_id && order.prikazce_uzivatel?.cele_jmeno &&
          order.prikazce_uzivatel.cele_jmeno !== 'Nezadáno' && order.prikazce_uzivatel.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.prikazce_id,
          name: order.prikazce_uzivatel.cele_jmeno,
          role: 'Příkazce'
        });
      }

      // Schvalovatel (order.schvalovatel objekt, ID na order.schvalovatel_id)
      if (order.schvalovatel_id && order.schvalovatel?.cele_jmeno &&
          order.schvalovatel.cele_jmeno !== 'Nezadáno' && order.schvalovatel.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.schvalovatel_id,
          name: order.schvalovatel.cele_jmeno,
          role: 'Schvalovatel'
        });
      }

      // Objednatel (order.uzivatel objekt - ten kdo vytvořil, ID na order.uzivatel_id)
      if (order.uzivatel_id && order.uzivatel?.cele_jmeno &&
          order.uzivatel.cele_jmeno !== 'Nezadáno' && order.uzivatel.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.uzivatel_id,
          name: order.uzivatel.cele_jmeno,
          role: 'Objednatel'
        });
      }

      // Dodavatel potvrdil (order.dodavatel_potvrdil objekt, ID na order.dodavatel_potvrdil_id)
      if (order.dodavatel_potvrdil_id && order.dodavatel_potvrdil?.cele_jmeno &&
          order.dodavatel_potvrdil.cele_jmeno !== 'Nezadáno' && order.dodavatel_potvrdil.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.dodavatel_potvrdil_id,
          name: order.dodavatel_potvrdil.cele_jmeno,
          role: 'Dodavatel potvrdil'
        });
      }

      // Odesílatel (order.odesilatel objekt, ID na order.odesilatel_id)
      if (order.odesilatel_id && order.odesilatel?.cele_jmeno &&
          order.odesilatel.cele_jmeno !== 'Nezadáno' && order.odesilatel.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.odesilatel_id,
          name: order.odesilatel.cele_jmeno,
          role: 'Odesílatel'
        });
      }

      // Fakturant (order.fakturant objekt, ID na order.fakturant_id)
      if (order.fakturant_id && order.fakturant?.cele_jmeno &&
          order.fakturant.cele_jmeno !== 'Nezadáno' && order.fakturant.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.fakturant_id,
          name: order.fakturant.cele_jmeno,
          role: 'Fakturant'
        });
      }

      // Potvrdil věcnou správnost (order.potvrdil_vecnou_spravnost objekt, ID na order.potvrdil_vecnou_spravnost_id)
      if (order.potvrdil_vecnou_spravnost_id && order.potvrdil_vecnou_spravnost?.cele_jmeno &&
          order.potvrdil_vecnou_spravnost.cele_jmeno !== 'Nezadáno' && order.potvrdil_vecnou_spravnost.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.potvrdil_vecnou_spravnost_id,
          name: order.potvrdil_vecnou_spravnost.cele_jmeno,
          role: 'Potvrdil věcnou správnost'
        });
      }

      // Dokončil objednávku (order.dokoncil objekt, ID na order.dokoncil_id)
      if (order.dokoncil_id && order.dokoncil?.cele_jmeno &&
          order.dokoncil.cele_jmeno !== 'Nezadáno' && order.dokoncil.cele_jmeno !== 'Nezadano') {
        users.push({
          id: order.dokoncil_id,
          name: order.dokoncil.cele_jmeno,
          role: 'Dokončil objednávku'
        });
      }

      setAvailableUsers(users);

      // Automaticky vyber příkazce, pokud existuje, jinak prvního uživatele
      if (users.length > 0) {
        const prikazceIndex = users.findIndex(u => u.role === 'Příkazce');
        setSelectedUserIndex(prikazceIndex !== -1 ? prikazceIndex : 0);
      }
    };

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getDocxSablonyList({
          token,
          username: user?.username,
          aktivni: 1 // Pouze aktivní šablony
        });

        const templates = response?.data || [];
        setTemplates(templates);

        if (templates.length === 0) {
          setError('V databázi nejsou k dispozici žádné aktivní DOCX šablony');
        } else if (templates.length === 1) {
          // Automaticky vyber první šablonu pokud je jen jedna
          setSelectedTemplate(templates[0]);
        }

      } catch (error) {
        setError(`Nepodařilo se načíst seznam DOCX šablon: ${error.message}`);
        showToast?.(`Chyba při načítání DOCX šablon: ${error.message}`, { type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    // Načti uživatele z už enriched order objektu
    loadAvailableUsers();
    // Načti šablony paralelně
    loadTemplates();

  }, [isOpen, order, token, user, showToast]); // ✅ Všechny závislosti

  const handleGenerateDocx = async () => {
    if (!selectedTemplate || !order) return;

    // ✅ VALIDACE: Zkontroluj, jestli je vybrán uživatel
    if (selectedUserIndex === -1 || !availableUsers[selectedUserIndex]) {
      showToast?.('Prosím vyberte uživatele, který bude dosazen do dokumentu', { type: 'warning' });
      return;
    }

    const selectedUser = availableUsers[selectedUserIndex];
    const selectedUserId = selectedUser.id;


    try {
      setGenerating(true);

      // KRITICKÉ: Detekuj ID objednávky
      const orderId = order.id || order.objednavka_id || order.order_id;

      if (!orderId) {
        throw new Error('Chybí ID objednávky');
      }

      // ✅ POUŽIJEME order Z MODALU - už má enriched uživatele (garant_uzivatel, prikazce_uzivatel atd.)

      // === NOVÝ SYSTÉM - DOCX generátor: enriched endpoint ===
      // ✅ orderData parametr už NENÍ POTŘEBA - používáme enriched endpoint!
      // Backend vrací KOMPLETNÍ data včetně všech enriched uživatelů
      const generatedDocx = await generateDocxDocument({
        templateId: selectedTemplate.id,
        orderId: orderId,
        token: token,
        username: user?.username,
        template: selectedTemplate,
        selectedUserId: selectedUserId // ✅ ID vybraného uživatele pro podpis
      });

      // Stáhni vygenerovaný dokument
      const fileName = `objednavka_${order.cislo_objednavky || orderId}_${selectedTemplate.nazev}.docx`;
      downloadGeneratedDocx(generatedDocx, fileName);

      showToast?.(
        `📄 DOCX dokument "${selectedTemplate.nazev}" byl úspěšně vygenerován a stažen`,
        { type: 'success' }
      );

      onClose();

    } catch (error) {
      showToast?.(
        `Chyba při generování DOCX dokumentu: ${error.message}`,
        { type: 'error' }
      );
    } finally {
      setGenerating(false);
    }
  };

  // ✅ HELPER: Formátování ceny
  const formatPrice = (price) => {
    if (!price) return null;
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };



  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h2>
            <FontAwesomeIcon icon={faFileWord} />
            Generovat DOCX dokument
          </h2>
          <CloseButton onClick={onClose} title="Zavřít">
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* LEVÝ SLOUPEC - Info o objednávce + Výběr uživatele */}
          <LeftColumn>
            {/* ✅ ZOBRAZENÍ OBJEDNÁVKY */}
            {order && (
              <OrderInfoBox>
                <h3>
                  <FontAwesomeIcon icon={faInfoCircle} />
                  Informace o objednávce
                </h3>
                <InfoGrid>
                  <InfoItem className="full-width">
                    <InfoLabel>ČÍSLO OBJEDNÁVKY</InfoLabel>
                    <InfoValue className="highlighted">
                      {order?.cislo_objednavky || order?.id || 'N/A'}
                    </InfoValue>
                  </InfoItem>

                  <InfoItem className="full-width">
                    <InfoLabel>PŘEDMĚT</InfoLabel>
                    <InfoValue>
                      {order?.predmet || order?.nazev || <span className="missing">Bez předmětu</span>}
                    </InfoValue>
                  </InfoItem>

                  <InfoDivider />

                  <InfoItem>
                    <InfoLabel>STAV</InfoLabel>
                    <InfoValue>
                      {order?.stav_objednavky || <span className="missing">Neznámý</span>}
                    </InfoValue>
                  </InfoItem>

                  <InfoItem>
                    <InfoLabel>CELKOVÁ CENA S DPH</InfoLabel>
                    <InfoValue className="price">
                      {formatPrice(order?.max_cena_s_dph || order?.polozky_celkova_cena_s_dph) || <span className="missing">Nezadáno</span>}
                    </InfoValue>
                  </InfoItem>

                  <InfoItem>
                    <InfoLabel>DODAVATEL</InfoLabel>
                    <InfoValue>
                      {order?.dodavatel_nazev || <span className="missing">Nezadáno</span>}
                    </InfoValue>
                  </InfoItem>

                  <InfoItem>
                    <InfoLabel>IČO</InfoLabel>
                    <InfoValue>
                      {order?.dodavatel_ico || <span className="missing">Nezadáno</span>}
                    </InfoValue>
                  </InfoItem>

                  <InfoItem>
                    <InfoLabel>GARANT</InfoLabel>
                    <InfoValue>
                      {order?.garant_uzivatel?.cele_jmeno || <span className="missing">Nezadáno</span>}
                    </InfoValue>
                  </InfoItem>
                </InfoGrid>
              </OrderInfoBox>
            )}

            {/* ✅ VÝBĚR UŽIVATELE */}
            {!loading && !error && order && (
              <UserSelectSection>
                <h3>
                  <FontAwesomeIcon icon={faUser} />
                  Vyberte uživatele pro dokument
                </h3>
                <p>
                  Vybraný uživatel bude dosazen do vypočítaných polí dokumentu (celé jméno včetně titulů).
                  {availableUsers.length > 0
                    ? ' Můžete vybrat garanta, přikazce, schvalovatele nebo jiného uživatele z workflow.'
                    : ' ⚠️ V této objednávce nejsou definováni žádní uživatelé (všichni jsou "Nezadáno").'}
                </p>
                {availableUsers.length > 0 ? (
                  <Select
                    value={selectedUserIndex}
                    onChange={(e) => setSelectedUserIndex(parseInt(e.target.value, 10))}
                    disabled={generating}
                  >
                    <option value="-1" disabled>-- Vyberte uživatele --</option>
                    {availableUsers.map((user, index) => (
                      <option key={index} value={index}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div style={{
                    padding: '1rem',
                    background: '#fee2e2',
                    border: '2px solid #fca5a5',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontWeight: 500
                  }}>
                    ⚠️ Nelze generovat DOCX - v objednávce nejsou definováni žádní uživatelé!
                    <br />
                    <small style={{ fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                      Prosím doplňte garanta, přikazce nebo jiného uživatele v objednávce.
                    </small>
                  </div>
                )}
              </UserSelectSection>
            )}
          </LeftColumn>

          {/* PRAVÝ SLOUPEC - Seznam DOCX šablon */}
          <RightColumn>
            {loading && (
              <LoadingMessage>
                <div className="spinner">
                  <FontAwesomeIcon icon={faSpinner} />
                </div>
                <p>Načítám DOCX šablony...</p>
              </LoadingMessage>
            )}

            {error && (
              <ErrorMessage>
                <div className="icon">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </div>
                <p>{error}</p>
              </ErrorMessage>
            )}

            {!loading && !error && templates.length === 0 && (
              <NoTemplatesMessage>
                <div className="icon">
                  <FontAwesomeIcon icon={faFileWord} />
                </div>
                <p>Nejsou k dispozici žádné aktivní DOCX šablony</p>
              </NoTemplatesMessage>
            )}

            {!loading && !error && templates.length > 0 && (
              <div>
                <TemplatesHeader>
                  <h3>Vyberte DOCX šablonu</h3>
                  <p>K dispozici {templates.length} {templates.length === 1 ? 'šablona' : templates.length < 5 ? 'šablony' : 'šablon'}</p>
                </TemplatesHeader>
                <TemplatesList>
                  {templates.map(template => (
                    <TemplateItem
                      key={template.id}
                      $selected={selectedTemplate?.id === template.id}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <h4>
                        <FontAwesomeIcon icon={faFileWord} />
                        {template.nazev || `Šablona ${template.id}`}
                        {template.typ_dokumentu && (
                          <span className="template-type"> ({template.typ_dokumentu})</span>
                        )}
                      </h4>
                      {template.popis && <p>{template.popis}</p>}
                    </TemplateItem>
                  ))}
                </TemplatesList>
              </div>
            )}
          </RightColumn>
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
            Zrušit
          </CancelButton>
          <GenerateButton
            onClick={handleGenerateDocx}
            disabled={!selectedTemplate || generating || availableUsers.length === 0}
            title={
              !selectedTemplate ? 'Vyberte DOCX šablonu' :
              availableUsers.length === 0 ? 'V objednávce nejsou definováni žádní uživatelé' :
              generating ? 'Generování probíhá...' :
              'Generovat DOCX dokument'
            }
          >
            {generating ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                Generuji...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDownload} />
                Generovat DOCX
              </>
            )}
          </GenerateButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};
