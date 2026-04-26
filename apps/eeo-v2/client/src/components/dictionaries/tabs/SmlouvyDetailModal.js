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
  faBuilding, faCalendar, faMoneyBillWave, faChartLine, faExclamationTriangle, faBolt,
  faCheckCircle, faTimesCircle, faTriangleExclamation, faLock, faUnlock, faBoltLightning
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
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// ── Jezevčík progress bar styled komponenty ──────────────────────────────────

const JezWrap = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const JezHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 4px;
`;

const JezBarOuter = styled.div`
  position: relative;
  height: 24px;
  background: #f1f5f9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.5);

  &:hover .jez-month-num {
    color: rgba(148, 163, 184, 0.8) !important;
  }
`;

const JezBarFill = styled.div`
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  z-index: 10;
  transition: width 0.7s ease;
  background: ${props => props.$color || '#10b981'};
  width: ${props => Math.min(props.$percent || 0, 100)}%;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.1);
  }
`;

const JezBarPlanned = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 5;
  transition: width 0.7s ease, left 0.7s ease;
  opacity: 0.4;
  background-color: ${props => props.$color || '#86efac'};
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.3) 25%, transparent 25%, transparent 50%,
    rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.3) 75%, transparent 75%, transparent
  );
  background-size: 8px 8px;
  left: ${props => Math.min(props.$left || 0, 100)}%;
  width: ${props => {
    const maxW = 100 - Math.min(props.$left || 0, 100);
    return Math.min(props.$percent || 0, maxW);
  }}%;
`;

const JezTargetLine = styled.div`
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: rgba(100,116,139,0.6);
  z-index: 30;
  left: ${props => props.$percent || 0}%;
  box-shadow: 0 0 8px rgba(0,0,0,0.1);
`;

const JezLegend = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 3px;
`;

const JezStatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border: 1px solid;
  ${props => {
    if (props.$level === 'critical') return 'background:#fef2f2;color:#dc2626;border-color:#fecaca;';
    if (props.$level === 'warning') return 'background:#fff7ed;color:#ea580c;border-color:#fed7aa;';
    return 'background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;';
  }}
`;

const BezStropuBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  font-weight: 700;
  font-size: 0.72rem;
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
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
          {/* Progress Section – Jezevčík */}
          <ProgressSection>
            <ProgressTitle>
              <span style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {smlouvaData.hodnota_s_dph > 0
                  ? <><FontAwesomeIcon icon={faLock} style={{ fontSize: '0.75rem', color: '#64748b' }} /> Čerpání smlouvy s DPH</>
                  : <><FontAwesomeIcon icon={faUnlock} style={{ fontSize: '0.75rem', color: '#0369a1' }} /> Smlouva bez zastropování</>
                }
              </span>
              {smlouvaData.hodnota_s_dph > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {formatCurrency(smlouvaData.cerpano_celkem)} z {formatCurrency(smlouvaData.hodnota_s_dph)}
                </span>
              )}
            </ProgressTitle>

            {smlouvaData.hodnota_s_dph > 0 ? (() => {
              const limit = smlouvaData.hodnota_s_dph;
              const spent = smlouvaData.cerpano_faktury_dokoncene ?? smlouvaData.cerpano_celkem ?? 0;
              const spentPct = (spent / limit) * 100;

              // "V procesu": přesná hodnota z API (faktury v procesu + obj bez faktury)
              const inProcessAmount = smlouvaData.cerpano_v_procesu ?? 0;
              const inProcessPct = Math.max(0, Math.min((inProcessAmount / limit) * 100, 100 - Math.min(spentPct, 100)));

              // Cíl k datu – z platnosti smlouvy nebo aktuální měsíc
              const calcTarget = () => {
                const platnostDo = smlouvaData.platnost_do;
                if (!platnostDo) {
                  const m = new Date().getMonth() + 1;
                  return Math.round((m / 12) * 100);
                }
                const now = new Date();
                const end = new Date(platnostDo);
                if (now >= end) return 100;
                const start = smlouvaData.platnost_od ? new Date(smlouvaData.platnost_od) : new Date(end.getFullYear(), 0, 1);
                const total = end - start;
                if (total <= 0) return 100;
                return Math.max(0, Math.min(100, Math.round(((now - start) / total) * 100)));
              };
              const targetPct = calcTarget();

              // Stav
              const totalPct = spentPct + inProcessPct;
              const isCritical = spentPct >= 100 || totalPct > targetPct * 2;
              const isWarning = !isCritical && totalPct > targetPct * 1.3;
              const level = isCritical ? 'critical' : isWarning ? 'warning' : 'ok';
              const barColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
              const barColorLight = isCritical ? '#fca5a5' : isWarning ? '#fdba74' : '#86efac';
              const currentMonth = new Date().getMonth();

              return (
                <JezWrap>
                  <JezHeader>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: barColor, letterSpacing: '-0.02em' }}>
                        {spentPct.toFixed(1)}%
                      </span>
                      <span style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                        Čerpáno s DPH
                      </span>
                      {inProcessPct > 0 && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b' }}>
                          + {(inProcessPct).toFixed(1)}% v procesu
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                      <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b' }}>
                        Cíl k datu
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>{targetPct}%</span>
                    </div>
                  </JezHeader>

                  <JezBarOuter>
                    {/* Měsíční rastr */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 20, pointerEvents: 'none' }}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} style={{
                          flex: 1,
                          borderRight: '1px solid rgba(203,213,225,0.3)',
                          background: i === currentMonth ? 'rgba(100,116,139,0.05)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <span className="jez-month-num" style={{ fontSize: '0.4rem', fontWeight: 700, color: 'transparent', transition: 'color 0.2s ease' }}>
                            {i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                    <JezTargetLine $percent={targetPct} />
                    <JezBarFill $percent={spentPct} $color={barColor} />
                    {inProcessPct > 0 && (
                      <JezBarPlanned $left={Math.min(spentPct, 100)} $percent={inProcessPct} $color={barColorLight} />
                    )}
                  </JezBarOuter>

                  <JezLegend>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: barColor, display: 'inline-block' }} />
                        <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Faktury</span>
                      </span>
                      {inProcessPct > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: barColorLight, opacity: 0.7, display: 'inline-block' }} />
                          <span style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>V procesu</span>
                        </span>
                      )}
                    </div>
                    <JezStatusBadge $level={level}>
                      {level === 'critical'
                        ? <><FontAwesomeIcon icon={faTimesCircle} /> Kritické</>
                        : level === 'warning'
                          ? <><FontAwesomeIcon icon={faTriangleExclamation} /> Pozor</>
                          : <><FontAwesomeIcon icon={faCheckCircle} /> V normě</>
                      }
                    </JezStatusBadge>
                  </JezLegend>
                </JezWrap>
              );
            })() : (
              <BezStropuBadge>
                <FontAwesomeIcon icon={faUnlock} />
                Tato smlouva nemá stanovený finanční limit – čerpání není zast­ropováno
              </BezStropuBadge>
            )}

            <StatsGrid style={{ marginTop: '0.75rem' }}>
              <StatCard>
                <StatValue $color="#3b82f6">
                  {formatCurrency(smlouvaData.cerpano_celkem)}
                </StatValue>
                <StatLabel>Čerpáno (s DPH)</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue $color={smlouvaData.zbyva != null && smlouvaData.zbyva < 0 ? '#dc2626' : '#10b981'}>
                  {smlouvaData.zbyva != null ? formatCurrency(smlouvaData.zbyva) : '—'}
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
                      <Td>
                        <strong>
                          {(obj.mimoradna_udalost === 1 || obj.mimoradna_udalost === '1' || obj.mimoradna_udalost === true || obj.mimoradna_udalost === 'true') && (
                            <FontAwesomeIcon icon={faBoltLightning} style={{ color: '#dc2626', marginRight: '4px' }} />
                          )}
                          {obj.ev_cislo}
                        </strong>
                      </Td>
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
