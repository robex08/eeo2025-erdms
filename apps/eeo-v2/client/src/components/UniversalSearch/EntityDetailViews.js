/**
 * Entity Detail Views
 * 
 * Quick preview views pro jednotlivé typy entit v slide-in panelu
 */

import React, { useContext, useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import draftManager from '../../services/DraftManager';
import { getStoredUserId } from '../../utils/authStorage';
import ConfirmDialog from '../ConfirmDialog';
import { listInvoiceAttachments25 } from '../../services/api25invoices';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEnvelope, 
  faPhone, 
  faBriefcase,
  faMapMarkerAlt,
  faCalendar,
  faFileAlt,
  faMoneyBill,
  faBuilding,
  faIdCard,
  faDownload,
  faPaperclip,
  faUser,
  faBox,
  faFileContract,
  faFileInvoice,
  faTruck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

// Pomocná funkce pro bezpečné formátování datumů
const formatDateSafe = (dateValue) => {
  if (!dateValue) return 'Není zadáno';
  
  try {
    const date = new Date(dateValue);
    
    // Kontrola, zda je datum validní
    if (isNaN(date.getTime())) {
      return 'Neplatné datum';
    }
    
    return date.toLocaleDateString('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  } catch (error) {
    console.error('Chyba při formátování data:', error);
    return 'Chyba formátování';
  }
};

// Styled Components
const DetailViewWrapper = styled.div`
  position: relative;
  min-height: 100%;
`;

const WatermarkIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 280px;
  color: rgba(0, 0, 0, 0.025);
  z-index: 0;
  pointer-events: none;
  user-select: none;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
`;

// Vodoznak komponenta
const Watermark = ({ icon }) => (
  <WatermarkIcon>
    <FontAwesomeIcon icon={icon} />
  </WatermarkIcon>
);

const DetailSection = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
`;

const InfoGrid = styled.div`
  display: grid;
  gap: 1rem;
  
  /* Dva sloupce pro větší obrazovky */
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const AttachmentsGrid = styled.div`
  display: grid;
  gap: 1rem;
  /* Přílohy přes celou šířku - jeden sloupec */
  grid-template-columns: 1fr;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const InfoRowFullWidth = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  grid-column: 1 / -1; /* Roztažení přes oba sloupce */
`;

const InfoIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 6px;
  color: #3b82f6;
  flex-shrink: 0;
  font-size: 0.875rem;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const InfoValue = styled.div`
  font-size: 0.9375rem;
  color: #1e293b;
  font-weight: 500;
  word-break: break-word;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$color || '#e2e8f0'};
  color: ${props => props.$textColor || '#475569'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 0.875rem;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateY(-1px);
  }
`;

const AttachmentIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color || '#eff6ff'};
  color: ${props => props.$iconColor || '#3b82f6'};
  border-radius: 8px;
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AttachmentName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AttachmentMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
`;

const DownloadButton = styled.button`
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #2563eb;
  }
`;

/**
 * User Detail View
 */
export const UserDetailView = ({ data }) => {
  const { hasAdminRole } = useContext(AuthContext);
  
  if (!data) return <EmptyState>Nepodařilo se načíst data</EmptyState>;

  return (
    <DetailViewWrapper>
      <Watermark icon={faUser} />
      <ContentWrapper>
        <DetailSection>
          <SectionTitle>Základní informace</SectionTitle>
        <InfoGrid>
          <InfoRow>
            <InfoIcon>
              <FontAwesomeIcon icon={faIdCard} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Jméno a příjmení</InfoLabel>
              <InfoValue>
                {data.titul_pred && `${data.titul_pred} `}
                {data.jmeno} {data.prijmeni}
                {data.titul_za && `, ${data.titul_za}`}
              </InfoValue>
            </InfoContent>
          </InfoRow>

          {data.telefon && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faPhone} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Telefon</InfoLabel>
                <InfoValue>
                  <a href={`tel:${data.telefon}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {data.telefon}
                  </a>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.email && (
            <InfoRowFullWidth>
              <InfoIcon>
                <FontAwesomeIcon icon={faEnvelope} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Email</InfoLabel>
                <InfoValue>
                  <a href={`mailto:${data.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {data.email}
                  </a>
                </InfoValue>
              </InfoContent>
            </InfoRowFullWidth>
          )}

          {(data.usek || data.usek_nazev) && (
            <InfoRowFullWidth>
              <InfoIcon>
                <FontAwesomeIcon icon={faBuilding} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Úsek</InfoLabel>
                <InfoValue>{data.usek || data.usek_nazev}</InfoValue>
              </InfoContent>
            </InfoRowFullWidth>
          )}

          {data.pozice_nazev && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faBriefcase} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Pozice</InfoLabel>
                <InfoValue>{data.pozice_nazev}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.lokalita && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faMapMarkerAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Lokalita</InfoLabel>
                <InfoValue>{data.lokalita}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.username && hasAdminRole() && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Uživatelské jméno</InfoLabel>
                <InfoValue>{data.username}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.role_nazev && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Role</InfoLabel>
                <InfoValue>
                  <Badge $color="#dbeafe" $textColor="#1e40af">
                    {data.role_nazev}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {(data.aktivni !== undefined || data.is_active !== undefined) && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Stav účtu</InfoLabel>
                <InfoValue>
                  <Badge 
                    $color={(data.aktivni === '1' || data.aktivni === 1 || data.is_active) ? '#dcfce7' : '#fee2e2'} 
                    $textColor={(data.aktivni === '1' || data.aktivni === 1 || data.is_active) ? '#166534' : '#991b1b'}
                  >
                    {(data.aktivni === '1' || data.aktivni === 1 || data.is_active) ? 'Aktivní' : 'Neaktivní'}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      {(data.adresa || data.mesto || data.psc) && (
        <DetailSection>
          <SectionTitle>Adresa</SectionTitle>
          <InfoGrid>
            {data.adresa && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Ulice a číslo</InfoLabel>
                  <InfoValue>{data.adresa}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {(data.mesto || data.psc) && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Město a PSČ</InfoLabel>
                  <InfoValue>{data.psc && `${data.psc} `}{data.mesto}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {(data.dt_vytvoreni || data.dt_aktualizace || data.created_at || data.last_login) && (
        <DetailSection>
          <SectionTitle>Časové údaje</SectionTitle>
          <InfoGrid>
            {data.dt_vytvoreni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum vytvoření</InfoLabel>
                  <InfoValue>{new Date(data.dt_vytvoreni).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.dt_aktualizace && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum aktualizace</InfoLabel>
                  <InfoValue>{new Date(data.dt_aktualizace).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.created_at && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Vytvořeno</InfoLabel>
                  <InfoValue>{new Date(data.created_at).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.last_login && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Poslední přihlášení</InfoLabel>
                  <InfoValue>{new Date(data.last_login).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}
      </ContentWrapper>
    </DetailViewWrapper>
  );
};

/**
 * Order Detail View (2025 & Legacy)
 */
export const OrderDetailView = ({ 
  data, 
  username, 
  token, 
  onCloseAll
}) => {
  const navigate = useNavigate();
  const { userDetail } = useContext(AuthContext);
  
  // 🎯 State pro confirm dialog - stejný pattern jako v OrderForm25
  const [confirmDialog, setConfirmDialog] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    draftInfo: null,
    targetOrderId: null,
    onConfirm: null
  });

  // Early return AŽ ZA všechny hooks!
  if (!data) return <EmptyState>Nepodařilo se načíst data</EmptyState>;

  // 🔥 FUNKCE: Kontrola neuložených změn před otevřením objednávky
  const handleOrderClick = async (e) => {
    // OKAMŽITĚ zastavit všechny eventy!
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const targetOrderId = parseInt(data.id);

    // Získej user_id
    let user_id = null;
    try {
      const userStr = localStorage.getItem('auth_user_persistent');
      if (userStr) {
        const userData = JSON.parse(userStr);
        user_id = userData?.id || userData?.user_id;
      }
    } catch (e) {
      console.error('OrderDetailView - Chyba při čtení user_id:', e);
    }

    if (!user_id) {
      // NEJPRVE naviguj, PAK zavři panel
      navigate(`/order-form-25?edit=${targetOrderId}`);
      setTimeout(() => {
        if (onCloseAll) onCloseAll();
      }, 100);
      return;
    }

    // Zkontroluj, jestli existuje validní koncept
    draftManager.setCurrentUser(user_id);
    const hasDraft = await draftManager.hasDraft();

    if (!hasDraft) {
      // NEJPRVE naviguj, PAK zavři panel
      navigate(`/order-form-25?edit=${targetOrderId}`);
      setTimeout(() => {
        if (onCloseAll) onCloseAll();
      }, 100);
      return;
    }

    // Existuje draft - načti ho
    const draftData = await draftManager.loadDraft();
    const draftOrderId = draftData.savedOrderId || draftData.formData?.id;

    // Pokud draft patří k TÉTO objednávce, rovnou naviguj
    if (draftOrderId && String(draftOrderId) === String(targetOrderId)) {
      // NEJPRVE naviguj, PAK zavři panel
      navigate(`/order-form-25?edit=${targetOrderId}`);
      setTimeout(() => {
        if (onCloseAll) onCloseAll();
      }, 100);
      return;
    }

    // Draft patří k JINÉ objednávce - zobraz CUSTOM confirm dialog
    const formData = draftData.formData || draftData;
    const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
    const isNewConcept = !draftData.savedOrderId && !formData.id;
    
    // Nastav dialog state
    setConfirmDialog({
      isOpen: true,
      title: 'Potvrzení editace objednávky',
      message: '', // Použijeme children místo message
      draftInfo: { draftTitle, isNewConcept },
      targetOrderId,
      onConfirm: () => {
        // 1. Smaž draft
        draftManager.deleteAllDraftKeys();
        
        // 2. Zavři dialog
        setConfirmDialog({
          isOpen: false,
          title: '',
          message: '',
          draftInfo: null,
          targetOrderId: null,
          onConfirm: null
        });
        
        // 3. Navigace
        navigate(`/order-form-25?edit=${targetOrderId}`);
        
        // 4. Zavři slide panel
        setTimeout(() => {
          if (onCloseAll) {
            onCloseAll();
          }
        }, 100);
      }
    });
  };

  return (
    <DetailViewWrapper>
      <Watermark icon={faBox} />
      <ContentWrapper>
        <DetailSection>
          <SectionTitle>Základní informace</SectionTitle>
        <InfoGrid>
          <InfoRow>
            <InfoIcon>
              <FontAwesomeIcon icon={faFileAlt} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Číslo objednávky</InfoLabel>
              <InfoValue 
                style={{ 
                  color: '#3b82f6', 
                  cursor: 'pointer', 
                  textDecoration: 'underline',
                  fontWeight: '600'
                }}
                onClick={handleOrderClick}
              >
                {data.cislo_objednavky}
              </InfoValue>
            </InfoContent>
          </InfoRow>

          {(data.stav || data.stav_nazev) && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Stav</InfoLabel>
                <InfoValue>
                  <Badge $color="#dbeafe" $textColor="#1e40af">
                    {data.stav || data.stav_nazev}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {(data.creator || data.garant) && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                {data.creator && (
                  <>
                    <InfoLabel>Vytvořil</InfoLabel>
                    <InfoValue>{data.creator}</InfoValue>
                  </>
                )}
                {data.garant && (
                  <>
                    <InfoLabel style={{ marginTop: data.creator ? '0.5rem' : 0 }}>Garant</InfoLabel>
                    <InfoValue>{data.garant}</InfoValue>
                  </>
                )}
              </InfoContent>
            </InfoRow>
          )}

          {data.aktivni && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Status</InfoLabel>
                <InfoValue>
                  <Badge $color={data.aktivni === '1' ? '#dcfce7' : '#fee2e2'} $textColor={data.aktivni === '1' ? '#166534' : '#991b1b'}>
                    {data.aktivni === '1' ? 'Aktivní' : 'Neaktivní'}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      {data.predmet && (
        <DetailSection>
          <SectionTitle>Předmět objednávky</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Popis</InfoLabel>
                <InfoValue style={{ whiteSpace: 'pre-wrap' }}>{data.predmet}</InfoValue>
              </InfoContent>
            </InfoRow>
          </InfoGrid>
        </DetailSection>
      )}

      <DetailSection>
        <SectionTitle>Dodavatel</SectionTitle>
        <InfoGrid>
          {data.dodavatel_nazev && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faBuilding} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Název</InfoLabel>
                <InfoValue>{data.dodavatel_nazev}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dodavatel_ico && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>IČO</InfoLabel>
                <InfoValue>{data.dodavatel_ico}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dodavatel_dic && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>DIČ</InfoLabel>
                <InfoValue>{data.dodavatel_dic}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dodavatel_adresa && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faMapMarkerAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Adresa</InfoLabel>
                <InfoValue>{data.dodavatel_adresa}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dodavatel_kontakt && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Kontaktní osoba</InfoLabel>
                <InfoValue>{data.dodavatel_kontakt}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dodavatel_kontakt_email && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faEnvelope} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Email</InfoLabel>
                <InfoValue>
                  <a href={`mailto:${data.dodavatel_kontakt_email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {data.dodavatel_kontakt_email}
                  </a>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dodavatel_kontakt_telefon && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faPhone} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Telefon</InfoLabel>
                <InfoValue>
                  <a href={`tel:${data.dodavatel_kontakt_telefon}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {data.dodavatel_kontakt_telefon}
                  </a>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      <DetailSection>
        <SectionTitle>Finanční údaje</SectionTitle>
        <InfoGrid>
          {(() => {
            // Parse financovani pokud existuje
            let financovaniData = null;
            if (data.financovani) {
              if (typeof data.financovani === 'string') {
                try {
                  financovaniData = JSON.parse(data.financovani);
                } catch (e) {
                  console.error('Chyba parsování financování:', e);
                }
              } else {
                financovaniData = data.financovani;
              }
            }

            // Pokud je to pole, vezmi první záznam
            const firstFinancovani = Array.isArray(financovaniData) 
              ? financovaniData[0] 
              : (financovaniData && typeof financovaniData === 'object' ? financovaniData : null);

            return (
              <>
                {/* První řádek: Číslo smlouvy / Max cena s DPH */}
                <InfoRow>
                  {firstFinancovani?.cislo_smlouvy ? (
                    <InfoIcon>
                      <FontAwesomeIcon icon={faFileContract} />
                    </InfoIcon>
                  ) : (
                    <InfoIcon>
                      <FontAwesomeIcon icon={faMoneyBill} />
                    </InfoIcon>
                  )}
                  <InfoContent>
                    <InfoLabel>
                      {firstFinancovani?.cislo_smlouvy ? 'Číslo smlouvy' : 'Maximální cena s DPH'}
                    </InfoLabel>
                    <InfoValue style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af' }}>
                      {firstFinancovani?.cislo_smlouvy || 
                        (data.max_cena_s_dph ? `${parseFloat(data.max_cena_s_dph).toLocaleString('cs-CZ')} Kč` : '—')}
                    </InfoValue>
                  </InfoContent>
                </InfoRow>

                <InfoRow>
                  <InfoIcon>
                    <FontAwesomeIcon icon={faMoneyBill} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Maximální cena s DPH</InfoLabel>
                    <InfoValue style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af' }}>
                      {data.max_cena_s_dph ? `${parseFloat(data.max_cena_s_dph).toLocaleString('cs-CZ')} Kč` : '—'}
                    </InfoValue>
                  </InfoContent>
                </InfoRow>

                {/* Poznámka ke smlouvě - celá šířka */}
                {firstFinancovani?.poznamka_smlouvy && (
                  <InfoRowFullWidth>
                    <InfoIcon>
                      <FontAwesomeIcon icon={faFileAlt} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Poznámka ke smlouvě</InfoLabel>
                      <InfoValue style={{ fontSize: '0.9375rem', lineHeight: '1.5' }}>
                        {firstFinancovani.poznamka_smlouvy}
                      </InfoValue>
                    </InfoContent>
                  </InfoRowFullWidth>
                )}

                {/* Ostatní cenové údaje */}
                {data.cena_celkem && (
                  <InfoRow>
                    <InfoIcon>
                      <FontAwesomeIcon icon={faMoneyBill} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Celková cena bez DPH</InfoLabel>
                      <InfoValue style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af' }}>
                        {parseFloat(data.cena_celkem).toLocaleString('cs-CZ')} Kč
                      </InfoValue>
                    </InfoContent>
                  </InfoRow>
                )}

                {data.cena_s_dph && (
                  <InfoRow>
                    <InfoIcon>
                      <FontAwesomeIcon icon={faMoneyBill} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Celková cena s DPH</InfoLabel>
                      <InfoValue style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af' }}>
                        {parseFloat(data.cena_s_dph).toLocaleString('cs-CZ')} Kč
                      </InfoValue>
                    </InfoContent>
                  </InfoRow>
                )}

                {data.mena && (
                  <InfoRow>
                    <InfoIcon>
                      <FontAwesomeIcon icon={faMoneyBill} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Měna</InfoLabel>
                      <InfoValue>{data.mena}</InfoValue>
                    </InfoContent>
                  </InfoRow>
                )}
              </>
            );
          })()}
        </InfoGrid>
      </DetailSection>

      {data.poznamka && (
        <DetailSection>
          <SectionTitle>Poznámka</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoValue style={{ whiteSpace: 'pre-wrap' }}>{data.poznamka}</InfoValue>
              </InfoContent>
            </InfoRow>
          </InfoGrid>
        </DetailSection>
      )}

      {data.prilohy && data.prilohy.length > 0 && (
        <DetailSection>
          <SectionTitle>Přílohy ({data.prilohy.length})</SectionTitle>
          <AttachmentsGrid>
            {data.prilohy.map((priloha, index) => {
              const handleDownload = async () => {
                try {
                  // Použijeme username a token z props (předané z AuthContext)
                  if (!username || !token) {
                    alert('Chybí přihlašovací údaje. Zkuste se znovu přihlásit.');
                    return;
                  }

                  // Import funkcí dynamicky
                  const { downloadOrderAttachment } = await import('../../services/apiOrderV2');
                  const { createDownloadLink25, isPreviewableInBrowser, openInBrowser25 } = await import('../../services/api25orders');
                  
                  const blob = await downloadOrderAttachment(data.id, priloha.id, username, token);
                  const filename = priloha.nazev_souboru;

                  // Zkontrolovat, zda lze soubor zobrazit v prohlížeči
                  if (isPreviewableInBrowser(filename)) {
                    const opened = openInBrowser25(blob, filename);
                    
                    if (opened) {
                      // Nabídnout možnost stažení
                      const shouldDownload = window.confirm(
                        `Příloha "${filename}" byla otevřena v novém okně.\n\nChcete ji také stáhnout?`
                      );
                      
                      if (shouldDownload) {
                        createDownloadLink25(blob, filename);
                      }
                      return;
                    }
                  }

                  // Pokud nelze zobrazit v prohlížeči, přímo stáhnout
                  createDownloadLink25(blob, filename);
                } catch (error) {
                  console.error('Chyba při stahování přílohy:', error);
                  alert('Nepodařilo se stáhnout přílohu: ' + error.message);
                }
              };

              return (
                <InfoRow key={priloha.id || index}>
                  <InfoIcon>
                    <FontAwesomeIcon icon={faPaperclip} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>
                      {priloha.typ_prilohy?.replace(/_/g, ' ') || 'Příloha'}
                    </InfoLabel>
                    <InfoValue style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{priloha.nazev_souboru}</span>
                      {priloha.velikost_souboru_b && (
                        <Badge $color="#f1f5f9" $textColor="#64748b">
                          {(priloha.velikost_souboru_b / 1024).toFixed(1)} KB
                        </Badge>
                      )}
                      <button
                        onClick={handleDownload}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginLeft: 'auto'
                        }}
                        title="Stáhnout přílohu"
                      >
                        <FontAwesomeIcon icon={faDownload} />
                      </button>
                    </InfoValue>
                    {priloha.dt_vytvoreni && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        Nahráno: {new Date(priloha.dt_vytvoreni).toLocaleString('cs-CZ')}
                      </div>
                    )}
                  </InfoContent>
                </InfoRow>
              );
            })}
          </AttachmentsGrid>
        </DetailSection>
      )}

      {(data.datum_objednavky || data.datum_odeslani || data.datum_schvaleni || data.datum_akceptace || data.datum_vecne_spravnosti || data.datum_faktura_pridana || data.datum_dokonceni || data.datum_zverejneni) && (
        <DetailSection>
          <SectionTitle>Časová osa workflow</SectionTitle>
          <InfoGrid>
            {data.datum_objednavky && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum objednávky</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_objednavky)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_odeslani && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum odeslání</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_odeslani)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_schvaleni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum schválení</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_schvaleni)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_akceptace && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum akceptace</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_akceptace)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_vecne_spravnosti && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum věcné správnosti</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_vecne_spravnosti)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_faktura_pridana && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum přidání faktury</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_faktura_pridana)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_dokonceni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum dokončení</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_dokonceni)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_zverejneni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum zveřejnění</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_zverejneni)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {(data.dt_vytvoreni || data.dt_aktualizace) && (
        <DetailSection>
          <SectionTitle>Časové údaje</SectionTitle>
          <InfoGrid>
            {data.dt_vytvoreni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum vytvoření</InfoLabel>
                  <InfoValue>{new Date(data.dt_vytvoreni).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.dt_aktualizace && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum aktualizace</InfoLabel>
                  <InfoValue>{new Date(data.dt_aktualizace).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}
      </ContentWrapper>

      {/* 🎯 Custom Confirm Dialog - stejný styl jako v OrderForm25 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          setConfirmDialog({
            isOpen: false,
            title: '',
            message: '',
            draftInfo: null,
            targetOrderId: null,
            onConfirm: null
          });
        }}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        icon={faExclamationTriangle}
        variant="warning"
        confirmText="Ano, pokračovat"
        cancelText="Ne, zůstat"
      >
        <p>
          Chystáte se editovat objednávku <strong>"{data?.cislo_objednavky || data?.predmet || `ID ${data?.id}`}"</strong>.
        </p>

        {/* Zobraz varování o rozepracované objednávce */}
        {confirmDialog.draftInfo && (
          <p style={{ 
            background: '#fef3c7', 
            padding: '0.75rem', 
            borderRadius: '6px', 
            border: '1px solid #f59e0b', 
            margin: '0.5rem 0',
            fontSize: '0.9375rem'
          }}>
            <strong>⚠️ POZOR:</strong> Máte rozpracovanou {confirmDialog.draftInfo.isNewConcept ? 'novou objednávku' : 'editaci objednávky'}{' '}
            <strong>"{confirmDialog.draftInfo.draftTitle}"</strong> s neuloženými změnami.
            <br /><br />
            Přepnutím na jinou objednávku <strong>přijdete o všechny neuložené změny!</strong>
          </p>
        )}

        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
          Chcete pokračovat a zahodit neuložené změny?
        </p>
      </ConfirmDialog>
    </DetailViewWrapper>
  );
};

/**
 * Contract Detail View
 */
export const ContractDetailView = ({ data }) => {
  if (!data) return <EmptyState>Nepodařilo se načíst data</EmptyState>;

  return (
    <DetailViewWrapper>
      <Watermark icon={faFileContract} />
      <ContentWrapper>
        <DetailSection>
          <SectionTitle>Základní informace</SectionTitle>
        <InfoGrid>
          <InfoRow>
            <InfoIcon>
              <FontAwesomeIcon icon={faFileAlt} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Číslo smlouvy</InfoLabel>
              <InfoValue>{data.cislo_smlouvy}</InfoValue>
            </InfoContent>
          </InfoRow>

          {data.nazev_smlouvy && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Název</InfoLabel>
                <InfoValue>{data.nazev_smlouvy}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.usek && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faBriefcase} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Úsek</InfoLabel>
                <InfoValue>{data.usek}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.typ_smlouvy && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Typ smlouvy</InfoLabel>
                <InfoValue>
                  <Badge $color="#f3e8ff" $textColor="#6b21a8">
                    {data.typ_smlouvy}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.stav && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Stav</InfoLabel>
                <InfoValue>
                  <Badge $color="#dbeafe" $textColor="#1e40af">
                    {data.stav}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      <DetailSection>
        <SectionTitle>Smluvní strana</SectionTitle>
        <InfoGrid>
          {data.nazev_firmy && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faBuilding} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Název firmy</InfoLabel>
                <InfoValue>{data.nazev_firmy}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.ico && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>IČO</InfoLabel>
                <InfoValue>{data.ico}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dic && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>DIČ</InfoLabel>
                <InfoValue>{data.dic}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.adresa && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faMapMarkerAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Adresa</InfoLabel>
                <InfoValue>{data.adresa}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.kontaktni_osoba && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Kontaktní osoba</InfoLabel>
                <InfoValue>{data.kontaktni_osoba}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.telefon && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faPhone} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Telefon</InfoLabel>
                <InfoValue>
                  <a href={`tel:${data.telefon}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {data.telefon}
                  </a>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.email && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faEnvelope} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Email</InfoLabel>
                <InfoValue>
                  <a href={`mailto:${data.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {data.email}
                  </a>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      {(data.datum_uzavreni || data.datum_platnosti_od || data.datum_platnosti_do) && (
        <DetailSection>
          <SectionTitle>Platnost</SectionTitle>
          <InfoGrid>
            {data.datum_uzavreni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum uzavření</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_uzavreni)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_platnosti_od && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Platnost od</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_platnosti_od)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.datum_platnosti_do && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Platnost do</InfoLabel>
                  <InfoValue>{formatDateSafe(data.datum_platnosti_do)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {(data.castka || data.mena) && (
        <DetailSection>
          <SectionTitle>Finanční údaje</SectionTitle>
          <InfoGrid>
            {data.castka && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faMoneyBill} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Částka</InfoLabel>
                  <InfoValue style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af' }}>
                    {parseFloat(data.castka).toLocaleString('cs-CZ')} {data.mena || 'Kč'}
                  </InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {data.poznamka && (
        <DetailSection>
          <SectionTitle>Poznámka</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoValue style={{ whiteSpace: 'pre-wrap' }}>{data.poznamka}</InfoValue>
              </InfoContent>
            </InfoRow>
          </InfoGrid>
        </DetailSection>
      )}

      {(data.dt_vytvoreni || data.dt_aktualizace) && (
        <DetailSection>
          <SectionTitle>Časové údaje</SectionTitle>
          <InfoGrid>
            {data.dt_vytvoreni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum vytvoření</InfoLabel>
                  <InfoValue>{new Date(data.dt_vytvoreni).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.dt_aktualizace && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum aktualizace</InfoLabel>
                  <InfoValue>{new Date(data.dt_aktualizace).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}
      </ContentWrapper>
    </DetailViewWrapper>
  );
};

/**
 * Invoice Detail View
 */
export const InvoiceDetailView = ({ data, username, token }) => {
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // Načíst přílohy faktury
  useEffect(() => {
    if (!data?.id || !token || !username) return;

    const loadAttachments = async () => {
      try {
        setAttachmentsLoading(true);
        const result = await listInvoiceAttachments25({
          token,
          username,
          faktura_id: data.id,
          objednavka_id: data.objednavka_id || data.order_id || null
        });
        
        // API může vracet různé struktury:
        // { success: true, data: { attachments: [...] } } nebo { status: 'ok', attachments: [...] }
        const attachmentsArray = result?.data?.attachments || result?.attachments || [];
        setAttachments(attachmentsArray);
      } catch (error) {
        console.error('Chyba při načítání příloh faktury:', error);
        setAttachments([]);
      } finally {
        setAttachmentsLoading(false);
      }
    };

    loadAttachments();
  }, [data?.id, data?.objednavka_id, data?.order_id, token, username]);

  if (!data) return <EmptyState>Nepodařilo se načíst data</EmptyState>;

  return (
    <DetailViewWrapper>
      <Watermark icon={faFileInvoice} />
      <ContentWrapper>
        <DetailSection>
          <SectionTitle>Základní informace</SectionTitle>
        <InfoGrid>
          <InfoRow>
            <InfoIcon>
              <FontAwesomeIcon icon={faFileAlt} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Variabilní symbol</InfoLabel>
              <InfoValue>{data.fa_cislo_vema}</InfoValue>
            </InfoContent>
          </InfoRow>

          {data.fa_cislo_dodavatele && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Číslo faktury dodavatele</InfoLabel>
                <InfoValue>{data.fa_cislo_dodavatele}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.objednavka_cislo && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Objednávka</InfoLabel>
                <InfoValue>{data.objednavka_cislo}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.typ_faktury && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Typ faktury</InfoLabel>
                <InfoValue>
                  <Badge $color="#fef3c7" $textColor="#92400e">
                    {data.typ_faktury}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.stav && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Stav</InfoLabel>
                <InfoValue>
                  <Badge $color="#dbeafe" $textColor="#1e40af">
                    {data.stav}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      {data.dodavatel_nazev && (
        <DetailSection>
          <SectionTitle>Dodavatel</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faBuilding} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Název</InfoLabel>
                <InfoValue>{data.dodavatel_nazev}</InfoValue>
              </InfoContent>
            </InfoRow>
            {data.dodavatel_ico && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faIdCard} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>IČO</InfoLabel>
                  <InfoValue>{data.dodavatel_ico}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      <DetailSection>
        <SectionTitle>Finanční údaje</SectionTitle>
        <InfoGrid>
          {data.castka && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faMoneyBill} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Částka bez DPH</InfoLabel>
                <InfoValue style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af' }}>
                  {parseFloat(data.castka).toLocaleString('cs-CZ')} Kč
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.castka_s_dph && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faMoneyBill} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Částka vč. DPH</InfoLabel>
                <InfoValue style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af' }}>
                  {parseFloat(data.castka_s_dph).toLocaleString('cs-CZ')} Kč
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.mena && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faMoneyBill} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Měna</InfoLabel>
                <InfoValue>{data.mena}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      <DetailSection>
        <SectionTitle>Data</SectionTitle>
        <InfoGrid>
          {data.datum_vystaveni && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Datum vystavení</InfoLabel>
                <InfoValue>{formatDateSafe(data.datum_vystaveni)}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}
          {data.datum_splatnosti && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Datum splatnosti</InfoLabel>
                <InfoValue>{formatDateSafe(data.datum_splatnosti)}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}
          {data.datum_prijeti && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Datum přijetí</InfoLabel>
                <InfoValue>{formatDateSafe(data.datum_prijeti)}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}
          {data.datum_uhrazeni && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Datum uhrazení</InfoLabel>
                <InfoValue>{formatDateSafe(data.datum_uhrazeni)}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      {data.poznamka && (
        <DetailSection>
          <SectionTitle>Poznámka</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoValue style={{ whiteSpace: 'pre-wrap' }}>{data.poznamka}</InfoValue>
              </InfoContent>
            </InfoRow>
          </InfoGrid>
        </DetailSection>
      )}

      {(data.dt_vytvoreni || data.dt_aktualizace) && (
        <DetailSection>
          <SectionTitle>Časové údaje</SectionTitle>
          <InfoGrid>
            {data.dt_vytvoreni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum vytvoření</InfoLabel>
                  <InfoValue>{new Date(data.dt_vytvoreni).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.dt_aktualizace && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum aktualizace</InfoLabel>
                  <InfoValue>{new Date(data.dt_aktualizace).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {/* Přílohy */}
      {attachmentsLoading ? (
        <DetailSection>
          <SectionTitle>
            <FontAwesomeIcon icon={faPaperclip} style={{ marginRight: '0.5rem' }} />
            Přílohy
          </SectionTitle>
          <EmptyState>Načítám přílohy...</EmptyState>
        </DetailSection>
      ) : attachments.length > 0 ? (
        <DetailSection>
          <SectionTitle>
            <FontAwesomeIcon icon={faPaperclip} style={{ marginRight: '0.5rem' }} />
            Přílohy ({attachments.length})
          </SectionTitle>
          <AttachmentsGrid>
            {attachments.map((attachment, index) => {
              const fileName = attachment.nazev_souboru || attachment.file_name || 'Neznámý soubor';
              const fileSize = attachment.velikost_souboru || attachment.file_size;
              const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
              
              // Ikona a barva podle typu souboru
              let icon = faPaperclip;
              let iconColor = '#3b82f6';
              let bgColor = '#eff6ff';
              
              if (['pdf'].includes(fileExtension)) {
                icon = faFileAlt;
                iconColor = '#dc2626';
                bgColor = '#fee2e2';
              } else if (['doc', 'docx'].includes(fileExtension)) {
                icon = faFileAlt;
                iconColor = '#2563eb';
                bgColor = '#dbeafe';
              } else if (['xls', 'xlsx'].includes(fileExtension)) {
                icon = faFileAlt;
                iconColor = '#059669';
                bgColor = '#d1fae5';
              } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                icon = faFileAlt;
                iconColor = '#7c3aed';
                bgColor = '#ede9fe';
              }

              const formatFileSize = (bytes) => {
                if (!bytes) return '';
                const kb = bytes / 1024;
                if (kb < 1024) return `${kb.toFixed(1)} KB`;
                return `${(kb / 1024).toFixed(1)} MB`;
              };

              const downloadUrl = attachment.url || attachment.file_path;

              return (
                <AttachmentItem key={attachment.id || index}>
                  <AttachmentIcon $color={bgColor} $iconColor={iconColor}>
                    <FontAwesomeIcon icon={icon} />
                  </AttachmentIcon>
                  <AttachmentInfo>
                    <AttachmentName>{fileName}</AttachmentName>
                    {fileSize && (
                      <AttachmentMeta>
                        {formatFileSize(fileSize)} • {fileExtension.toUpperCase()}
                      </AttachmentMeta>
                    )}
                  </AttachmentInfo>
                  {downloadUrl && (
                    <DownloadButton
                      onClick={() => window.open(downloadUrl, '_blank')}
                      title="Stáhnout přílohu"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      Stáhnout
                    </DownloadButton>
                  )}
                </AttachmentItem>
              );
            })}
          </AttachmentsGrid>
        </DetailSection>
      ) : null}
      </ContentWrapper>
    </DetailViewWrapper>
  );
};

/**
 * Supplier Detail View
 */
export const SupplierDetailView = ({ data, onCloseAll }) => {
  const navigate = useNavigate();
  
  if (!data) return <EmptyState>Nepodařilo se načíst data</EmptyState>;

  return (
    <DetailViewWrapper>
      <Watermark icon={faTruck} />
      <ContentWrapper>
        <DetailSection>
          <SectionTitle>Základní informace</SectionTitle>
        <InfoGrid>
          <InfoRowFullWidth>
            <InfoIcon>
              <FontAwesomeIcon icon={faBuilding} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Název</InfoLabel>
              <InfoValue>{data.nazev}</InfoValue>
            </InfoContent>
          </InfoRowFullWidth>

          {data.ico && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>IČO</InfoLabel>
                <InfoValue>{data.ico}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.dic && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>DIČ</InfoLabel>
                <InfoValue>{data.dic}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.adresa && (
            <InfoRowFullWidth>
              <InfoIcon>
                <FontAwesomeIcon icon={faMapMarkerAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Adresa</InfoLabel>
                <InfoValue>{data.adresa}</InfoValue>
              </InfoContent>
            </InfoRowFullWidth>
          )}

          {data.zastoupeny && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faIdCard} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Zastoupen/a</InfoLabel>
                <InfoValue>{data.zastoupeny}</InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.typ_dodavatele && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faBuilding} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Typ</InfoLabel>
                <InfoValue>
                  <Badge $color="#e0f2fe" $textColor="#075985">
                    {data.typ_dodavatele}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}

          {data.is_active !== undefined && (
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faCalendar} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Stav</InfoLabel>
                <InfoValue>
                  <Badge 
                    $color={data.is_active ? '#dcfce7' : '#fee2e2'} 
                    $textColor={data.is_active ? '#166534' : '#991b1b'}
                  >
                    {data.is_active ? 'Aktivní' : 'Neaktivní'}
                  </Badge>
                </InfoValue>
              </InfoContent>
            </InfoRow>
          )}
        </InfoGrid>
      </DetailSection>

      {(data.kontakt_telefon || data.kontakt_email || data.kontakt_jmeno) && (
        <DetailSection>
          <SectionTitle>Kontaktní údaje</SectionTitle>
          <InfoGrid>
            {data.kontakt_jmeno && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faIdCard} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Kontaktní osoba</InfoLabel>
                  <InfoValue>{data.kontakt_jmeno}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.kontakt_telefon && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faPhone} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Telefon</InfoLabel>
                  <InfoValue>
                    <a href={`tel:${data.kontakt_telefon}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      {data.kontakt_telefon}
                    </a>
                  </InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.kontakt_email && (
              <InfoRowFullWidth>
                <InfoIcon>
                  <FontAwesomeIcon icon={faEnvelope} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Email</InfoLabel>
                  <InfoValue>
                    <a href={`mailto:${data.kontakt_email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      {data.kontakt_email}
                    </a>
                  </InfoValue>
                </InfoContent>
              </InfoRowFullWidth>
            )}
            {data.web && (
              <InfoRowFullWidth>
                <InfoIcon>
                  <FontAwesomeIcon icon={faBuilding} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Web</InfoLabel>
                  <InfoValue>
                    <a href={data.web} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      {data.web}
                    </a>
                  </InfoValue>
                </InfoContent>
              </InfoRowFullWidth>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {(data.ucet_cislo || data.banka_kod || data.iban) && (
        <DetailSection>
          <SectionTitle>Bankovní spojení</SectionTitle>
          <InfoGrid>
            {data.ucet_cislo && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faMoneyBill} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Číslo účtu</InfoLabel>
                  <InfoValue>{data.ucet_cislo}{data.banka_kod && `/${data.banka_kod}`}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.iban && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faMoneyBill} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>IBAN</InfoLabel>
                  <InfoValue>{data.iban}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            {data.swift && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faMoneyBill} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>SWIFT</InfoLabel>
                  <InfoValue>{data.swift}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {data.poznamka && (
        <DetailSection>
          <SectionTitle>Poznámka</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <InfoIcon>
                <FontAwesomeIcon icon={faFileAlt} />
              </InfoIcon>
              <InfoContent>
                <InfoValue style={{ whiteSpace: 'pre-wrap' }}>{data.poznamka}</InfoValue>
              </InfoContent>
            </InfoRow>
          </InfoGrid>
        </DetailSection>
      )}

      {(data.pocet_objednavek || data.posledni_pouziti) && (
        <DetailSection>
          <SectionTitle>Statistiky objednávek</SectionTitle>
          <InfoGrid>
            {data.pocet_objednavek && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faBox} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Počet objednávek</InfoLabel>
                  <InfoValue>
                    <Badge $color="#dbeafe" $textColor="#1e40af">
                      {data.pocet_objednavek}
                    </Badge>
                  </InfoValue>
                </InfoContent>
              </InfoRow>
            )}

            {data.posledni_pouziti && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Poslední použití</InfoLabel>
                  <InfoValue>{formatDateSafe(data.posledni_pouziti)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
            
            {/* Tlačítko pro otevření nejnovější objednávky */}
            {data.nejnovejsi_objednavka_id && (
              <InfoRowFullWidth>
                <InfoContent style={{ gridColumn: '1 / -1' }}>
                  <button
                    onClick={async () => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('🔔 Kliknutí na Otevřít nejnovější objednávku, ID:', data.nejnovejsi_objednavka_id);
                      }
                      
                      // Zavři panel
                      if (onCloseAll) onCloseAll();
                      
                      // Naviguj na objednávku
                      navigate(`/order-form-25?edit=${data.nejnovejsi_objednavka_id}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    <FontAwesomeIcon icon={faBox} />
                    Otevřít nejnovější objednávku
                  </button>
                </InfoContent>
              </InfoRowFullWidth>
            )}
          </InfoGrid>
        </DetailSection>
      )}

      {(data.dt_vytvoreni || data.dt_aktualizace || data.created_at) && (
        <DetailSection>
          <SectionTitle>Časové údaje</SectionTitle>
          <InfoGrid>
            {data.dt_vytvoreni && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum vytvoření</InfoLabel>
                  <InfoValue>{formatDateSafe(data.dt_vytvoreni)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}

            {data.dt_aktualizace && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum aktualizace</InfoLabel>
                  <InfoValue>{formatDateSafe(data.dt_aktualizace)}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}

            {data.created_at && (
              <InfoRow>
                <InfoIcon>
                  <FontAwesomeIcon icon={faCalendar} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Vytvořeno</InfoLabel>
                  <InfoValue>{new Date(data.created_at).toLocaleString('cs-CZ')}</InfoValue>
                </InfoContent>
              </InfoRow>
            )}
          </InfoGrid>
        </DetailSection>
      )}
      </ContentWrapper>
    </DetailViewWrapper>
  );
};
