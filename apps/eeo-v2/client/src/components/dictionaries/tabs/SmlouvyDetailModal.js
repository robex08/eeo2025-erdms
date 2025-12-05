/**
 * SmlouvyDetailModal - Detail smlouvy se statistikami a objednávkami
 * 
 * Funkce:
 * - Zobrazení všech údajů smlouvy
 * - Seznam navázaných objednávek
 * - Statistiky čerpání
 * - Progress bar čerpání
 * - Tlačítko pro přepočet čerpání
 * - Tlačítko pro editaci
 * 
 * @author Frontend Team
 * @date 2025-11-23
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faEdit, faSyncAlt, faSpinner, faFileContract,
  faBuilding, faCalendar, faMoneyBillWave, faChartLine, faExclamationTriangle, faBolt
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

import ConfirmDialog from '../../ConfirmDialog';

import { useContext } from 'react';
import AuthContext from '../../../context/AuthContext';
import { prepocetCerpaniSmluv } from '../../../services/apiSmlouvy';
import draftManager from '../../../services/DraftManager';
import { isValidConcept, hasDraftChanges } from '../../../utils/draftUtils';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 0.5rem;
`;

const Modal = styled.div`
  background: white;
  border-radius: 8px;
  width: 100%;
  height: 98vh;
  max-width: 98vw;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 8px 8px 0 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const HeaderButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const Body = styled.div`
  padding: 0.875rem;
  overflow-y: auto;
  flex: 1;
`;

const Section = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  color: #1e293b;
  margin-bottom: 0.625rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 4px;
  font-weight: 600;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
`;

const InfoLabel = styled.span`
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
`;

const InfoValue = styled.span`
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 500;
`;

const Badge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$color || '#e2e8f0'};
  color: white;
  display: inline-block;
`;

const ProgressSection = styled.div`
  background: #f8fafc;
  padding: 0.875rem;
  border-radius: 6px;
  margin-bottom: 0.875rem;
  border: 2px solid #e2e8f0;
`;

const ProgressTitle = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 20px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-bottom: 0.625rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    const percent = parseFloat(props.$percent) || 0;
    if (percent >= 90) return 'linear-gradient(to right, #dc2626, #ef4444)';
    if (percent >= 75) return 'linear-gradient(to right, #d97706, #f59e0b)';
    if (percent >= 50) return 'linear-gradient(to right, #2563eb, #3b82f6)';
    return 'linear-gradient(to right, #059669, #10b981)';
  }};
  width: ${props => Math.min(parseFloat(props.$percent) || 0, 100)}%;
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: white;
  padding: 0.625rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${props => props.$color || '#1e293b'};
  margin-bottom: 0.125rem;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #64748b;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableHeaderCell = styled.th`
  padding: 0.5rem 0.625rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.8125rem;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  user-select: none;

  &:first-of-type {
    text-align: left;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid #e2e8f0;

  &:hover {
    background: #f8fafc;
  }
`;

const Td = styled.td`
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
`;

// =============================================================================
// KOMPONENTA
// =============================================================================

const SmlouvyDetailModal = ({ smlouva, onClose, onEdit }) => {
  const { user, token, user_id } = useContext(AuthContext);
  const navigate = useNavigate();
  const [recalculating, setRecalculating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // State pro draft warning dialog
  const [showDraftWarning, setShowDraftWarning] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [currentDraftData, setCurrentDraftData] = useState(null);

  const { smlouva: smlouvaData, objednavky, statistiky } = smlouva;

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEditOrder = async (obj) => {
    // 🎯 KONTROLA DRAFTU - obdobně jako v Orders25List.js
    // Zkontroluj, jestli existuje validní koncept nebo editace pro JINOU objednávku
    
    draftManager.setCurrentUser(user_id);
    const hasDraft = await draftManager.hasDraft();

    let shouldShowConfirmDialog = false;
    let draftDataToStore = null;
    let isDraftForThisOrder = false;

    if (hasDraft) {
      try {
        const draftData = await draftManager.loadDraft();

        // 🎯 KONTROLA OWNERSHIP: Patří draft k TÉTO objednávce?
        const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
        const currentOrderId = obj.id;

        // ✅ Pokud draft patří k TÉTO objednávce, NEPTAT SE!
        if (draftOrderId && currentOrderId && String(draftOrderId) === String(currentOrderId)) {
          shouldShowConfirmDialog = false; // Draft patří k této objednávce - použij ho tiše
          isDraftForThisOrder = true;
        } else {
          // ❌ Draft patří k JINÉ objednávce - zeptej se
          const hasNewConcept = isValidConcept(draftData);
          const hasDbChanges = hasDraftChanges(draftData);
          shouldShowConfirmDialog = hasNewConcept || hasDbChanges;

          if (shouldShowConfirmDialog) {
            draftDataToStore = draftData; // Ulož pro zobrazení v modalu
          }
        }

      } catch (error) {
        console.error('Chyba při načítání draft dat:', error);
        shouldShowConfirmDialog = false;
      }
    }

    // 🎯 OPTIMALIZACE: Pokud draft patří k TÉTO objednávce, rovnou naviguj bez reload
    if (isDraftForThisOrder) {
      // Draft už existuje pro tuto objednávku - pouze naviguj na formulář
      // NEMAZAT draft, NENAČÍTAT znovu z DB
      navigate(`/order-form-25?edit=${obj.id}`);
      return;
    }

    // KONTROLA: Pokud existuje draft pro JINOU objednávku, zobraz confirm
    if (shouldShowConfirmDialog) {
      setCurrentDraftData(draftDataToStore);
      setOrderToEdit(obj);
      setShowDraftWarning(true);
      return;
    }

    // ✅ Žádný draft nebo draft nepatří k jiné objednávce - jdi rovnou
    navigate(`/order-form-25?edit=${obj.id}`);
  };

  const handleDraftWarningConfirm = () => {
    setShowDraftWarning(false);
    // Smaž starý draft a otevři novou objednávku
    draftManager.setCurrentUser(user_id);
    draftManager.deleteDraft();
    
    if (orderToEdit) {
      navigate(`/order-form-25?edit=${orderToEdit.id}`);
    }
  };

  const handleDraftWarningCancel = () => {
    setShowDraftWarning(false);
    setOrderToEdit(null);
    setCurrentDraftData(null);
  };

  const handlePrepocet = async () => {
    setShowConfirm(false);
    try {
      setRecalculating(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      await prepocetCerpaniSmluv({
        token: token,
        username: user.username,
        cislo_smlouvy: smlouvaData.cislo_smlouvy,
        usek_id: null
      });
      setSuccessMessage('Čерpání bylo úspěšně přepočítáno. Pro zobrazení aktualizovaných dat zavřete a znovu otevřete detail.');
    } catch (err) {
      setErrorMessage('Chyba při přepočtu: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  // =============================================================================
  // FORMAT HELPERS
  // =============================================================================

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('cs-CZ');
  };

  const getStavColor = (stav) => {
    switch (stav) {
      case 'AKTIVNI': return '#10b981';
      case 'UKONCENA': return '#6b7280';
      case 'PRERUSENA': return '#f59e0b';
      case 'PRIPRAVOVANA': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return ReactDOM.createPortal(
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Modal>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faFileContract} />
            Detail smlouvy
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeaderButtons>
              <HeaderButton onClick={onEdit}>
                <FontAwesomeIcon icon={faEdit} />
                Upravit
              </HeaderButton>
              <HeaderButton onClick={() => setShowConfirm(true)} disabled={recalculating}>
                <FontAwesomeIcon icon={recalculating ? faSpinner : faSyncAlt} spin={recalculating} />
                Přepočítat čerpání
              </HeaderButton>
            </HeaderButtons>
            <CloseButton onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </div>
        </Header>

        {successMessage && (
          <div style={{ padding: '1rem 1.5rem', background: '#f0fdf4', borderLeft: '4px solid #10b981', color: '#047857', fontWeight: 600 }}>
            ✅ {successMessage}
          </div>
        )}
        {errorMessage && (
          <div style={{ padding: '1rem 1.5rem', background: '#fee2e2', borderLeft: '4px solid #dc2626', color: '#dc2626', fontWeight: 600 }}>
            ❌ {errorMessage}
          </div>
        )}

        <Body>
          {/* Progress Section */}
          <ProgressSection>
            <ProgressTitle>
              <span>Čerpání smlouvy</span>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                {formatCurrency(smlouvaData.cerpano_celkem)} / {formatCurrency(smlouvaData.hodnota_s_dph)}
              </span>
            </ProgressTitle>
            <ProgressBar>
              <ProgressFill $percent={smlouvaData.procento_cerpani}>
                {parseFloat(smlouvaData.procento_cerpani || 0).toFixed(1)}%
              </ProgressFill>
            </ProgressBar>
            <StatsGrid>
              <StatCard>
                <StatValue $color="#3b82f6">
                  {formatCurrency(smlouvaData.cerpano_celkem)}
                </StatValue>
                <StatLabel>Čerpáno</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color="#10b981">
                  {formatCurrency(smlouvaData.zbyva)}
                </StatValue>
                <StatLabel>Zbývá</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{statistiky?.pocet_objednavek || 0}</StatValue>
                <StatLabel>Objednávek</StatLabel>
              </StatCard>
            </StatsGrid>
          </ProgressSection>

          {/* Základní údaje */}
          <Section>
            <SectionTitle>
              <FontAwesomeIcon icon={faFileContract} />
              Základní údaje
            </SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Číslo smlouvy</InfoLabel>
                <InfoValue>
                  <strong>{smlouvaData.cislo_smlouvy}</strong>
                </InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Úsek</InfoLabel>
                <InfoValue>{smlouvaData.usek_zkr}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Druh smlouvy</InfoLabel>
                <InfoValue>{smlouvaData.druh_smlouvy}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Stav</InfoLabel>
                <InfoValue>
                  <Badge $color={getStavColor(smlouvaData.stav)}>
                    {smlouvaData.stav}
                  </Badge>
                </InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Název smlouvy</InfoLabel>
                <InfoValue>{smlouvaData.nazev_smlouvy}</InfoValue>
              </InfoItem>
              {smlouvaData.popis_smlouvy && (
                <InfoItem style={{ gridColumn: '1 / -1' }}>
                  <InfoLabel>Popis</InfoLabel>
                  <InfoValue>{smlouvaData.popis_smlouvy}</InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </Section>

          {/* Smluvní strana */}
          <Section>
            <SectionTitle>
              <FontAwesomeIcon icon={faBuilding} />
              Smluvní strana
            </SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Název firmy</InfoLabel>
                <InfoValue>{smlouvaData.nazev_firmy}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>IČO</InfoLabel>
                <InfoValue>{smlouvaData.ico || '-'}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>DIČ</InfoLabel>
                <InfoValue>{smlouvaData.dic || '-'}</InfoValue>
              </InfoItem>
            </InfoGrid>
          </Section>

          {/* Platnost a finance */}
          <Section>
            <SectionTitle>
              <FontAwesomeIcon icon={faMoneyBillWave} />
              Platnost a finance
            </SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Platnost od</InfoLabel>
                <InfoValue>{formatDate(smlouvaData.platnost_od)}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Platnost do</InfoLabel>
                <InfoValue>{formatDate(smlouvaData.platnost_do)}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Sazba DPH</InfoLabel>
                <InfoValue>{smlouvaData.sazba_dph}%</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Hodnota bez DPH</InfoLabel>
                <InfoValue>{formatCurrency(smlouvaData.hodnota_bez_dph)}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Hodnota s DPH</InfoLabel>
                <InfoValue>
                  <strong>{formatCurrency(smlouvaData.hodnota_s_dph)}</strong>
                </InfoValue>
              </InfoItem>
            </InfoGrid>
          </Section>

          {/* Dodatečné informace */}
          {(smlouvaData.cislo_dms || smlouvaData.kategorie || smlouvaData.poznamka) && (
            <Section>
              <SectionTitle>Dodatečné informace</SectionTitle>
              <InfoGrid>
                {smlouvaData.cislo_dms && (
                  <InfoItem>
                    <InfoLabel>Číslo DMS</InfoLabel>
                    <InfoValue>{smlouvaData.cislo_dms}</InfoValue>
                  </InfoItem>
                )}
                {smlouvaData.kategorie && (
                  <InfoItem>
                    <InfoLabel>Kategorie</InfoLabel>
                    <InfoValue>{smlouvaData.kategorie}</InfoValue>
                  </InfoItem>
                )}
                {smlouvaData.poznamka && (
                  <InfoItem style={{ gridColumn: '1 / -1' }}>
                    <InfoLabel>Poznámka</InfoLabel>
                    <InfoValue>{smlouvaData.poznamka}</InfoValue>
                  </InfoItem>
                )}
              </InfoGrid>
            </Section>
          )}

          {/* Statistiky objednávek */}
          {statistiky && (
            <Section>
              <SectionTitle>
                <FontAwesomeIcon icon={faChartLine} />
                Statistiky objednávek
              </SectionTitle>
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>Průměrná objednávka</InfoLabel>
                  <InfoValue>{formatCurrency(statistiky.prumerna_objednavka)}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Největší objednávka</InfoLabel>
                  <InfoValue>{formatCurrency(statistiky.nejvetsi_objednavka)}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Nejmenší objednávka</InfoLabel>
                  <InfoValue>{formatCurrency(statistiky.nejmensi_objednavka)}</InfoValue>
                </InfoItem>
              </InfoGrid>
            </Section>
          )}

          {/* Seznam objednávek */}
          <Section>
            <SectionTitle>
              <FontAwesomeIcon icon={faFileContract} />
              Navázané objednávky ({objednavky?.length || 0})
            </SectionTitle>
            {objednavky && objednavky.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <TableHeaderCell>Ev. číslo</TableHeaderCell>
                    <TableHeaderCell>Předmět</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'right' }}>Částka s DPH</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'center' }}>Datum přiřazení</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'center' }}>Stav</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'center' }}>
                      <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '16px' }} />
                    </TableHeaderCell>
                  </tr>
                </Thead>
                <Tbody>
                  {objednavky.map((obj, index) => (
                    <Tr key={obj.id} style={{ background: index % 2 === 0 ? '#f8fafc' : 'white' }}>
                      <Td><strong>{obj.ev_cislo}</strong></Td>
                      <Td>{obj.predmet}</Td>
                      <Td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(obj.castka_s_dph)}</Td>
                      <Td style={{ textAlign: 'center' }}>{formatDateTime(obj.dt_prirazeni)}</Td>
                      <Td style={{ textAlign: 'center' }}>
                        <Badge $color="#3b82f6">{obj.stav}</Badge>
                      </Td>
                      <Td>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => handleEditOrder(obj)}
                            title="Editovat objednávku"
                            style={{
                              width: '1.75rem',
                              height: '1.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              borderRadius: '6px',
                              background: 'transparent',
                              color: '#6b7280',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#3b82f6';
                              e.currentTarget.style.background = '#eff6ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#6b7280';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <EmptyState>
                Žádné objednávky nejsou k této smlouvě přiřazeny
              </EmptyState>
            )}
          </Section>

          {/* Metadata */}
          <Section>
            <SectionTitle>Metadata</SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Vytvořeno</InfoLabel>
                <InfoValue>{formatDateTime(smlouvaData.dt_vytvoreni)}</InfoValue>
              </InfoItem>
              {smlouvaData.dt_aktualizace && (
                <InfoItem>
                  <InfoLabel>Aktualizováno</InfoLabel>
                  <InfoValue>{formatDateTime(smlouvaData.dt_aktualizace)}</InfoValue>
                </InfoItem>
              )}
              {smlouvaData.posledni_prepocet && (
                <InfoItem>
                  <InfoLabel>Poslední přepočet</InfoLabel>
                  <InfoValue>{formatDateTime(smlouvaData.posledni_prepocet)}</InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </Section>
        </Body>
      </Modal>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Přepočet čerpání smlouvy"
        icon={faExclamationTriangle}
        variant="warning"
        onConfirm={handlePrepocet}
        onClose={() => setShowConfirm(false)}
      >
        <p>Opravdu chcete přepočítat čerpání této smlouvy?</p>
        <p style={{ marginTop: '1rem', color: '#f59e0b', fontWeight: 600 }}>
          ⏱️ Operace může trvat několik sekund.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={showDraftWarning}
        title="Rozdělaná objednávka"
        icon={faExclamationTriangle}
        variant="warning"
        onConfirm={handleDraftWarningConfirm}
        onClose={handleDraftWarningCancel}
        confirmText="Ano, pokračovat"
        cancelText="Ne, zrušit"
      >
        {currentDraftData && (() => {
          const formData = currentDraftData.formData || currentDraftData;
          const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
          const isNewConcept = isValidConcept(currentDraftData);

          return (
            <>
              <p style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f59e0b', margin: '0.5rem 0' }}>
                <strong>Pozor:</strong> Máte rozepracovanou {isNewConcept ? 'novou objednávku' : 'editaci objednávky'}{' '}
                <strong>{draftTitle}</strong>
                . Přepnutím na jinou objednávku přijdete o neuložené změny!
              </p>
              <p style={{ marginTop: '1rem', color: '#f59e0b', fontWeight: 600 }}>
                ⚠️ Pokud budete pokračovat, rozdělaná objednávka bude smazána.
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                Chcete pokračovat a otevřít tuto objednávku?
              </p>
            </>
          );
        })()}
      </ConfirmDialog>

    </Overlay>,
    document.body
  );
};

export default SmlouvyDetailModal;
