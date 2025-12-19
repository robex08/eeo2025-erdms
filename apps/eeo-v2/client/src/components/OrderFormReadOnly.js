/**
 * OrderFormReadOnly - Read-only náhled objednávky
 * 
 * Přesná 1:1 kopie OrderForm25 struktury jen pro zobrazení
 * Včetně svinovacích sekcí a stejného pořadí jako OrderForm25
 */

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faBuilding, faFileAlt, faMoneyBillWave, faCalendar,
  faCheckCircle, faClock, faMapMarkerAlt, faTruck, faChevronUp,
  faClipboardCheck, faBox, faCoins, faCheck, faTimesCircle, faEdit,
  faPaperclip, faFile, faDownload
} from '@fortawesome/free-solid-svg-icons';
import { formatDateOnly } from '../utils/format';
import { downloadOrderAttachment, downloadInvoiceAttachment } from '../services/apiOrderV2';

// ===================================================================
// STYLED COMPONENTS - Zkopírované z OrderForm25
// ===================================================================

const FormContainer = styled.div`
  background: #fafbfc;
  border-radius: 8px;
  overflow: hidden;
`;

const Section = styled.div`
  background: white;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  border: 2px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 5px solid transparent;
  position: relative;
  
  /* 3D efekt na levé lince */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    box-shadow: 
      inset 2px 0 3px rgba(0, 0, 0, 0.15),
      inset -1px 0 2px rgba(255, 255, 255, 0.5);
  }
  
  /* Barevná schémata podle OF25 */
  ${props => {
    switch(props.$theme) {
      case 'grey':
        return `
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-left-color: #64748b;
          &:hover { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); }
        `;
      case 'orange':
        return `
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border-left-color: #f97316;
          &:hover { background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%); }
        `;
      case 'blue':
        return `
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left-color: #3b82f6;
          &:hover { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
        `;
      case 'purple':
        return `
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-left-color: #a855f7;
          &:hover { background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); }
        `;
      case 'green':
        return `
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-left-color: #22c55e;
          &:hover { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); }
        `;
      case 'red':
        return `
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-left-color: #ef4444;
          &:hover { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); }
        `;
      default:
        return `
          background: ${props.$isActive ? '#f8fafc' : '#fff'};
          &:hover { background: #f1f5f9; }
        `;
    }
  }}
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    ${props => {
      switch(props.$theme) {
        case 'grey': return 'color: #64748b;';
        case 'orange': return 'color: #f97316;';
        case 'blue': return 'color: #3b82f6;';
        case 'purple': return 'color: #a855f7;';
        case 'green': return 'color: #22c55e;';
        case 'red': return 'color: #ef4444;';
        default: return 'color: #3b82f6;';
      }
    }}
  }
`;

const CollapseIcon = styled.div`
  transition: transform 0.3s ease;
  transform: ${props => props.$collapsed ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #64748b;
  font-size: 1.2rem;
`;

const SectionContent = styled.div`
  max-height: ${props => props.$collapsed ? '0' : '5000px'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  padding: ${props => props.$collapsed ? '0 1.5rem' : '1.5rem'};
  border-left: 5px solid transparent;
  position: relative;
  background: #fafbfc;
  
  /* 3D efekt na levé lince - pokračování z headeru */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    box-shadow: 
      inset 2px 0 3px rgba(0, 0, 0, 0.15),
      inset -1px 0 2px rgba(255, 255, 255, 0.5);
  }
  
  /* Barevná linka podle tématu */
  ${props => {
    switch(props.$theme) {
      case 'grey': return 'border-left-color: #64748b;';
      case 'orange': return 'border-left-color: #f97316;';
      case 'blue': return 'border-left-color: #3b82f6;';
      case 'purple': return 'border-left-color: #a855f7;';
      case 'green': return 'border-left-color: #22c55e;';
      case 'red': return 'border-left-color: #ef4444;';
      default: return '';
    }
  }}
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: 1rem;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FieldLabel = styled.div`
  font-weight: 600;
  color: #64748b;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const FieldValue = styled.div`
  font-size: 0.95rem;
  color: #1e293b;
  padding: 0.5rem 0;
  
  &.empty {
    color: #94a3b8;
    font-style: italic;
  }
  
  &.highlight {
    font-weight: 600;
    color: #1e40af;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$bg || '#f1f5f9'};
  color: ${props => props.$color || '#475569'};
`;

// Nové komponenty pro lepší organizaci
const InfoCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const CardTitle = styled.div`
  font-weight: 600;
  color: #475569;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    color: #64748b;
    font-size: 1rem;
  }
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || 'repeat(auto-fit, minmax(200px, 1fr))'};
  gap: 1.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KeyValuePair = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
`;

const KeyLabel = styled.div`
  font-weight: 600;
  color: #64748b;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const ValueText = styled.div`
  font-size: 0.95rem;
  color: #1e293b;
  word-wrap: break-word;
  
  &.empty {
    color: #94a3b8;
    font-style: italic;
  }
  
  &.highlight {
    font-weight: 600;
    color: #1e40af;
    font-size: 1.05rem;
    white-space: nowrap;
  }
  
  &.currency {
    font-weight: 600;
    color: #059669;
    font-size: 1.05rem;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(to right, #e2e8f0, #f1f5f9, #e2e8f0);
  margin: 1.5rem 0;
`;

const ExpandCollapseButton = styled.button`
  position: sticky;
  top: 1rem;
  right: 1rem;
  float: right;
  margin-bottom: 1rem;
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
  z-index: 10;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  
  &:hover {
    background: #2563eb;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
`;

const EditInvoiceButton = styled.button`
  padding: 0.5rem 1rem;
  background: #f97316;
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
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
  
  &:hover {
    background: #ea580c;
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const OrderFormReadOnly = forwardRef(({ orderData, onCollapseChange, onEditInvoice, canEditInvoice = true, editingInvoiceId, token, username }, ref) => {
  // State pro svinovací sekce
  const [collapsed, setCollapsed] = useState({
    objednatel: false,
    schvaleni: false,
    dodavatel: false,
    detaily: false,
    dodani: false,
    fakturace: false,
    poznamky: false,
    registr: false,
    vecna_spravnost: false,
    dokonceni: false,
    prilohy: false
  });

  const toggleSection = (section) => {
    setCollapsed(prev => {
      const newCollapsed = { ...prev, [section]: !prev[section] };
      // Notify parent about change
      if (onCollapseChange) {
        const hasAnyCollapsed = Object.values(newCollapsed).some(val => val === true);
        onCollapseChange(hasAnyCollapsed);
      }
      return newCollapsed;
    });
  };

  const collapseAll = () => {
    const allCollapsed = {};
    Object.keys(collapsed).forEach(key => {
      allCollapsed[key] = true;
    });
    setCollapsed(allCollapsed);
    if (onCollapseChange) {
      onCollapseChange(true);
    }
  };

  const expandAll = () => {
    const allExpanded = {};
    Object.keys(collapsed).forEach(key => {
      allExpanded[key] = false;
    });
    setCollapsed(allExpanded);
    if (onCollapseChange) {
      onCollapseChange(false);
    }
  };

  const areAllCollapsed = Object.values(collapsed).every(val => val === true);
  const areAllExpanded = Object.values(collapsed).every(val => val === false);

  // Export collapse functions via ref
  useImperativeHandle(ref, () => ({
    collapseAll,
    expandAll,
    areAllCollapsed,
    areAllExpanded
  }));

  if (!orderData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        <FontAwesomeIcon icon={faFileAlt} size="3x" style={{ marginBottom: '1rem', opacity: 0.3 }} />
        <div>Žádná data k zobrazení</div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    if (!value) return '—';
    return `${parseFloat(value).toLocaleString('cs-CZ')} Kč`;
  };

  const getWorkflowBadges = () => {
    if (!orderData.stav_workflow_kod || !Array.isArray(orderData.stav_workflow_kod)) return null;
    
    const badgeColors = {
      'SCHVALENA': { bg: '#dcfce7', color: '#166534' },
      'ODESLANA': { bg: '#dbeafe', color: '#1e40af' },
      'POTVRZENA': { bg: '#e0e7ff', color: '#4338ca' },
      'NEUVEREJNIT': { bg: '#fef3c7', color: '#92400e' },
      'FAKTURACE': { bg: '#fce7f3', color: '#9f1239' },
      'VECNA_SPRAVNOST': { bg: '#f3e8ff', color: '#6b21a8' },
      'ZKONTROLOVANA': { bg: '#d1fae5', color: '#065f46' },
      'DOKONCENA': { bg: '#ccfbf1', color: '#115e59' }
    };

    return orderData.stav_workflow_kod.map((kod, index) => {
      const colors = badgeColors[kod] || { bg: '#f1f5f9', color: '#475569' };
      return (
        <React.Fragment key={kod}>
          <Badge $bg={colors.bg} $color={colors.color} style={{ marginBottom: '0.5rem' }}>
            {kod.replace('_', ' ')}
          </Badge>
          {index < orderData.stav_workflow_kod.length - 1 && (
            <span style={{ margin: '0 0.5rem', color: '#64748b', fontWeight: '600' }}>→</span>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <FormContainer>
      {/* SEKCE 1: INFORMACE O OBJEDNATELI */}
      <Section>
        <SectionHeader $theme="grey" $isActive={!collapsed.objednatel} onClick={() => toggleSection('objednatel')}>
          <SectionTitle $theme="grey">
            <FontAwesomeIcon icon={faUser} />
            Informace o objednateli
          </SectionTitle>
          <CollapseIcon $collapsed={collapsed.objednatel}>
            <FontAwesomeIcon icon={faChevronUp} />
          </CollapseIcon>
        </SectionHeader>
        <SectionContent $collapsed={collapsed.objednatel} $theme="grey">
          {/* Objednatel */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faUser} />
              Objednatel
            </CardTitle>
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Jméno</KeyLabel>
                <ValueText className="highlight">
                  {(() => {
                    const enriched = orderData._enriched?.uzivatel || orderData._enriched?.objednatel;
                    if (enriched) {
                      const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                      const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                      return `${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                    }
                    return orderData.uzivatel?.cele_jmeno || orderData.jmeno || '—';
                  })()}
                </ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>Telefon</KeyLabel>
                <ValueText>
                  {(() => {
                    const enriched = orderData._enriched?.uzivatel || orderData._enriched?.objednatel;
                    return enriched?.telefon || orderData.objednatel_telefon || orderData.uzivatel?.telefon || orderData.telefon || '—';
                  })()}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
            
            <DataGrid $columns="1fr" style={{marginTop: '1rem'}}>
              <KeyValuePair>
                <KeyLabel>E-mail</KeyLabel>
                <ValueText>
                  {(() => {
                    const enriched = orderData._enriched?.uzivatel || orderData._enriched?.objednatel;
                    return enriched?.email || orderData.uzivatel?.email || orderData.email || '—';
                  })()}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
          </InfoCard>

          {/* Garant */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faCheckCircle} />
              Garant objednávky
            </CardTitle>
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Jméno</KeyLabel>
                <ValueText className="highlight">
                  {(() => {
                    const enriched = orderData._enriched?.garant_uzivatel;
                    if (enriched) {
                      const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                      const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                      return `${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                    }
                    return orderData.garant_uzivatel?.cele_jmeno || '—';
                  })()}
                </ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>Telefon</KeyLabel>
                <ValueText>
                  {orderData._enriched?.garant_uzivatel?.telefon || '—'}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
            
            <DataGrid $columns="1fr" style={{marginTop: '1rem'}}>
              <KeyValuePair>
                <KeyLabel>E-mail</KeyLabel>
                <ValueText>
                  {orderData._enriched?.garant_uzivatel?.email || '—'}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
          </InfoCard>
        </SectionContent>
      </Section>

      {/* SEKCE 2: SCHVÁLENÍ NÁKUPU PO */}
      <Section>
        <SectionHeader $theme="grey" $isActive={!collapsed.schvaleni} onClick={() => toggleSection('schvaleni')}>
          <SectionTitle $theme="grey">
            <FontAwesomeIcon icon={faClipboardCheck} />
            Schválení nákupu PO
          </SectionTitle>
          <CollapseIcon $collapsed={collapsed.schvaleni}>
            <FontAwesomeIcon icon={faChevronUp} />
          </CollapseIcon>
        </SectionHeader>
        <SectionContent $collapsed={collapsed.schvaleni} $theme="grey">
          {/* Základní informace o objednávce */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faFileAlt} />
              Základní údaje
            </CardTitle>
            <KeyValuePair style={{ marginBottom: '1rem' }}>
              <KeyLabel>Předmět objednávky</KeyLabel>
              <ValueText className="highlight">{orderData.predmet || '—'}</ValueText>
            </KeyValuePair>
            
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Číslo objednávky</KeyLabel>
                <ValueText className="highlight">
                  {orderData.cislo_objednavky || `#${orderData.id}`}
                </ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>Datum objednávky</KeyLabel>
                <ValueText>
                  {orderData.dt_objednavky ? formatDateOnly(orderData.dt_objednavky) : '—'}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
            
            <DataGrid $columns="1fr">
              <KeyValuePair style={{textAlign: 'right'}}>
                <KeyLabel style={{textAlign: 'right'}}>Max. cena s DPH</KeyLabel>
                <ValueText className="currency" style={{textAlign: 'right'}}>
                  {formatCurrency(orderData.max_cena_s_dph)}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
          </InfoCard>

          {/* Příkazce */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faUser} />
              Příkazce rozpočtu
            </CardTitle>
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Jméno</KeyLabel>
                <ValueText className="highlight">
                  {(() => {
                    const enriched = orderData._enriched?.prikazce;
                    if (enriched) {
                      const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                      const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                      return `${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                    }
                    return orderData.prikazce?.cele_jmeno || '—';
                  })()}
                </ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>Telefon</KeyLabel>
                <ValueText>
                  {orderData._enriched?.prikazce?.telefon || '—'}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
            
            <DataGrid $columns="1fr" style={{marginTop: '1rem'}}>
              <KeyValuePair>
                <KeyLabel>E-mail</KeyLabel>
                <ValueText>
                  {orderData._enriched?.prikazce?.email || '—'}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
          </InfoCard>

          {/* Schvalovatel */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faCheckCircle} />
              Schvalovatel
            </CardTitle>
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Jméno</KeyLabel>
                <ValueText className="highlight">
                  {(() => {
                    const enriched = orderData._enriched?.schvalovatel;
                    if (enriched) {
                      const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                      const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                      return `${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                    }
                    return orderData.schvalovatel?.cele_jmeno || '—';
                  })()}
                </ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>Telefon</KeyLabel>
                <ValueText>
                  {orderData._enriched?.schvalovatel?.telefon || '—'}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
            
            <DataGrid $columns="1fr" style={{marginTop: '1rem'}}>
              <KeyValuePair>
                <KeyLabel>E-mail</KeyLabel>
                <ValueText>
                  {orderData._enriched?.schvalovatel?.email || '—'}
                </ValueText>
              </KeyValuePair>
            </DataGrid>
          </InfoCard>

          {/* Střediska */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faBuilding} />
              Střediska
            </CardTitle>
            <KeyValuePair>
              <ValueText>
                {(() => {
                  // Backend vrací _enriched.strediska s názvy
                  if (orderData._enriched?.strediska && Array.isArray(orderData._enriched.strediska)) {
                    return orderData._enriched.strediska
                      .map(s => s.nazev || s.kod)
                      .join(', ') || '—';
                  }
                  // Fallback: jen kódy
                  if (orderData.strediska_kod && Array.isArray(orderData.strediska_kod)) {
                    return orderData.strediska_kod.join(', ');
                  }
                  return '—';
                })()}
              </ValueText>
            </KeyValuePair>
          </InfoCard>

          {/* Financování */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faCoins} />
              Způsob financování a workflow
            </CardTitle>
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Typ financování</KeyLabel>
                <ValueText className="highlight">
                  {orderData.financovani?.typ_nazev || orderData.financovani?.typ || '—'}
                </ValueText>
              </KeyValuePair>

              {/* LP - Limitované přísliby */}
              {orderData.financovani?.lp_nazvy && orderData.financovani.lp_nazvy.length > 0 && (
                <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                  <KeyLabel>Limitované přísliby</KeyLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {orderData.financovani.lp_nazvy.map((lp, idx) => {
                      let lpText = '';
                      if (typeof lp === 'object') {
                        const kod = lp.cislo_lp || lp.kod || lp.id;
                        const popis = lp.nazev || lp.nazev_uctu || lp.label;
                        lpText = kod && popis ? `${kod} - ${popis}` : (popis || kod || 'LP');
                      } else {
                        lpText = String(lp);
                      }
                      return (
                        <Badge key={idx} $bg="#dbeafe" $color="#1e40af">
                          {lpText}
                        </Badge>
                      );
                    })}
                  </div>
                </KeyValuePair>
              )}

              {/* Smlouva - dynamické pole */}
              {(() => {
                const typKod = orderData.financovani?.typ_kod || orderData.financovani?.typ || orderData.zpusob_financovani;
                const isSmlouva = typKod === 'SMLOUVA' || typKod?.toUpperCase?.() === 'SMLOUVA';
                
                if (isSmlouva) {
                  return (
                    <>
                      <KeyValuePair>
                        <KeyLabel>Číslo smlouvy</KeyLabel>
                        <ValueText>{orderData.financovani?.cislo_smlouvy || orderData.cislo_smlouvy || <span style={{color: '#9ca3af'}}>Není vyplněno</span>}</ValueText>
                      </KeyValuePair>
                      <KeyValuePair>
                        <KeyLabel>Poznámka ke smlouvě</KeyLabel>
                        <ValueText>{orderData.financovani?.smlouva_poznamka || orderData.smlouva_poznamka || <span style={{color: '#9ca3af'}}>Není vyplněno</span>}</ValueText>
                      </KeyValuePair>
                    </>
                  );
                }
                return null;
              })()}

              {/* Individuální schválení - dynamické pole */}
              {(() => {
                const typKod = orderData.financovani?.typ_kod || orderData.financovani?.typ || orderData.zpusob_financovani;
                const isIndividualni = typKod === 'INDIVIDUALNI_SCHVALENI' || typKod?.toUpperCase?.() === 'INDIVIDUALNI_SCHVALENI' || 
                                      typKod === 'INDIVIDUALNI SCHVALENI' || typKod?.includes?.('INDIVIDUALNI');
                
                if (isIndividualni) {
                  return (
                    <>
                      <KeyValuePair>
                        <KeyLabel>Číslo výzvy</KeyLabel>
                        <ValueText>{orderData.financovani?.individualni_schvaleni || orderData.individualni_schvaleni || <span style={{color: '#9ca3af'}}>Není vyplněno</span>}</ValueText>
                      </KeyValuePair>
                      <KeyValuePair>
                        <KeyLabel>Poznámka</KeyLabel>
                        <ValueText>{orderData.financovani?.individualni_poznamka || orderData.individualni_poznamka || <span style={{color: '#9ca3af'}}>Není vyplněno</span>}</ValueText>
                      </KeyValuePair>
                    </>
                  );
                }
                return null;
              })()}

              {/* Pojistná událost - dynamické pole */}
              {(() => {
                const typKod = orderData.financovani?.typ_kod || orderData.financovani?.typ || orderData.zpusob_financovani;
                const isPojistna = typKod === 'POJISTNA_UDALOST' || typKod?.toUpperCase?.() === 'POJISTNA_UDALOST' ||
                                  typKod === 'POJISTNA UDALOST' || typKod?.includes?.('POJISTNA');
                
                if (isPojistna) {
                  return (
                    <>
                      <KeyValuePair>
                        <KeyLabel>Číslo pojistné události</KeyLabel>
                        <ValueText>{orderData.financovani?.pojistna_udalost_cislo || orderData.pojistna_udalost_cislo || <span style={{color: '#9ca3af'}}>Není vyplněno</span>}</ValueText>
                      </KeyValuePair>
                      <KeyValuePair>
                        <KeyLabel>Poznámka k pojistné události</KeyLabel>
                        <ValueText>{orderData.financovani?.pojistna_udalost_poznamka || orderData.pojistna_udalost_poznamka || <span style={{color: '#9ca3af'}}>Není vyplněno</span>}</ValueText>
                      </KeyValuePair>
                    </>
                  );
                }
                return null;
              })()}

              {/* Workflow stavy */}
              <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                <KeyLabel>Stavy workflow</KeyLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  {getWorkflowBadges()}
                </div>
              </KeyValuePair>
            </DataGrid>
          </InfoCard>
        </SectionContent>
      </Section>

      {/* SEKCE 3: DODAVATEL */}
      <Section>
        <SectionHeader $theme="orange" $isActive={!collapsed.dodavatel} onClick={() => toggleSection('dodavatel')}>
          <SectionTitle $theme="orange">
            <FontAwesomeIcon icon={faBuilding} />
            Dodavatel
          </SectionTitle>
          <CollapseIcon $collapsed={collapsed.dodavatel}>
            <FontAwesomeIcon icon={faChevronUp} />
          </CollapseIcon>
        </SectionHeader>
        <SectionContent $collapsed={collapsed.dodavatel} $theme="orange">
          {/* Základní údaje dodavatele */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faBuilding} />
              Základní údaje
            </CardTitle>
            <KeyValuePair style={{ marginBottom: '1rem' }}>
              <KeyLabel>Název dodavatele</KeyLabel>
              <ValueText className="highlight">{orderData.dodavatel_nazev || '—'}</ValueText>
            </KeyValuePair>
            
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>IČO</KeyLabel>
                <ValueText>{orderData.dodavatel_ico || '—'}</ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>DIČ</KeyLabel>
                <ValueText>{orderData.dodavatel_dic || '—'}</ValueText>
              </KeyValuePair>
            </DataGrid>
            
            <KeyValuePair style={{ marginTop: '1rem' }}>
              <KeyLabel>Adresa</KeyLabel>
              <ValueText>{orderData.dodavatel_adresa || '—'}</ValueText>
            </KeyValuePair>
          </InfoCard>

          {/* Kontaktní osoba */}
          <InfoCard>
            <CardTitle>
              <FontAwesomeIcon icon={faUser} />
              Kontaktní osoba
            </CardTitle>
            <DataGrid $columns="1fr 1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Jméno</KeyLabel>
                <ValueText>{orderData.dodavatel_kontakt_jmeno || '—'}</ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>E-mail</KeyLabel>
                <ValueText>{orderData.dodavatel_kontakt_email || '—'}</ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>Telefon</KeyLabel>
                <ValueText>{orderData.dodavatel_kontakt_telefon || '—'}</ValueText>
              </KeyValuePair>
            </DataGrid>
          </InfoCard>
        </SectionContent>
      </Section>

      {/* SEKCE 5: DETAILY OBJEDNÁVKY */}
      {orderData.polozky && orderData.polozky.length > 0 && (
        <Section>
          <SectionHeader $theme="orange" $isActive={!collapsed.detaily} onClick={() => toggleSection('detaily')}>
            <SectionTitle $theme="orange">
              <FontAwesomeIcon icon={faBox} />
              Detaily objednávky ({orderData.polozky_count || orderData.polozky.length} {orderData.polozky.length === 1 ? 'položka' : 'položek'})
            </SectionTitle>
            <CollapseIcon $collapsed={collapsed.detaily}>
              <FontAwesomeIcon icon={faChevronUp} />
            </CollapseIcon>
          </SectionHeader>
          <SectionContent $collapsed={collapsed.detaily} $theme="orange">
            <FieldRow>
              <FieldGroup>
                <FieldLabel>Druh objednávky</FieldLabel>
                <FieldValue>
                  {orderData._enriched?.druh_objednavky?.nazev || 
                   orderData.druh_objednavky_nazev || 
                   orderData.druh_objednavky || 
                   '—'}
                </FieldValue>
              </FieldGroup>
            </FieldRow>

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                Položky objednávky
              </div>
              {orderData.polozky.map((polozka, idx) => (
                <div key={idx} style={{ 
                  padding: '1rem', 
                  background: '#fafafa', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px', 
                  marginBottom: '1rem' 
                }}>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span>POLOŽKA {idx + 1}</span>
                    {/* LP kód položky - najít v orderData.financovani.lp_nazvy podle lp_id */}
                    {polozka.lp_id && (() => {
                      // Najít LP podle ID v orderData.financovani.lp_nazvy
                      const lpData = orderData.financovani?.lp_nazvy?.find(lp => lp.id === polozka.lp_id);
                      
                      if (!lpData) return null;
                      
                      return (
                        <Badge 
                          $bg={polozka.lp_je_platne !== false ? '#dcfce7' : '#fee2e2'}
                          $color={polozka.lp_je_platne !== false ? '#166534' : '#991b1b'}
                        >
                          🎯 LP: {lpData.cislo_lp} - {lpData.nazev}
                        </Badge>
                      );
                    })()}
                  </div>

                  <FieldRow>
                    <FieldGroup>
                      <FieldLabel>Název / popis</FieldLabel>
                      <FieldValue>{polozka.popis || '—'}</FieldValue>
                    </FieldGroup>
                  </FieldRow>

                  <FieldRow $columns="1fr auto 1fr">
                    <FieldGroup>
                      <FieldLabel>Cena bez DPH</FieldLabel>
                      <FieldValue>{formatCurrency(polozka.cena_bez_dph)}</FieldValue>
                    </FieldGroup>
                    
                    <FieldGroup>
                      <FieldLabel>DPH</FieldLabel>
                      <FieldValue>{polozka.sazba_dph || '21'}%</FieldValue>
                    </FieldGroup>
                    
                    <FieldGroup>
                      <FieldLabel>Cena s DPH</FieldLabel>
                      <FieldValue className="highlight">
                        {formatCurrency(polozka.cena_s_dph)}
                      </FieldValue>
                    </FieldGroup>
                  </FieldRow>

                  {/* Umístění - úsek, budova, místnost z JSON polozky */}
                  {(polozka.usek_kod || polozka.budova_kod || polozka.mistnost_kod || polozka.poznamka) && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #d1d5db' }}>
                      <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                        UMÍSTĚNÍ MAJETKU
                      </div>
                      <FieldRow $columns="1fr 1fr 1fr">
                        {polozka.usek_kod && (
                          <FieldGroup>
                            <FieldLabel>Úsek</FieldLabel>
                            <FieldValue>{polozka.usek_kod}</FieldValue>
                          </FieldGroup>
                        )}
                        {polozka.budova_kod && (
                          <FieldGroup>
                            <FieldLabel>Budova</FieldLabel>
                            <FieldValue>{polozka.budova_kod}</FieldValue>
                          </FieldGroup>
                        )}
                        {polozka.mistnost_kod && (
                          <FieldGroup>
                            <FieldLabel>Místnost</FieldLabel>
                            <FieldValue>{polozka.mistnost_kod}</FieldValue>
                          </FieldGroup>
                        )}
                      </FieldRow>
                      {(polozka.usek_kod || polozka.budova_kod || polozka.mistnost_kod) && (
                        <FieldRow style={{ marginTop: '0.5rem' }}>
                          <FieldGroup>
                            <FieldLabel>Poznámka k místu</FieldLabel>
                            <FieldValue>{polozka.poznamka || <span style={{color: '#9ca3af'}}>---</span>}</FieldValue>
                          </FieldGroup>
                        </FieldRow>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#374151' }}>Celkem s DPH:</div>
                <div style={{ fontWeight: '700', fontSize: '1.3rem', color: '#1e40af' }}>
                  {formatCurrency(orderData.polozky_celkova_cena_s_dph)}
                </div>
              </div>
            </div>

            {/* Poznámka k objednávce */}
            <FieldRow style={{ marginTop: '1.5rem' }}>
              <FieldGroup>
                <FieldLabel>Poznámka k objednávce</FieldLabel>
                <FieldValue>{orderData.poznamka_objednavky || orderData.poznamka || <span style={{color: '#9ca3af'}}>---</span>}</FieldValue>
              </FieldGroup>
            </FieldRow>
          </SectionContent>
        </Section>
      )}

      {/* SEKCE 5: DODÁNÍ */}
      <Section>
        <SectionHeader $theme="orange" $isActive={!collapsed.dodani} onClick={() => toggleSection('dodani')}>
          <SectionTitle $theme="orange">
            <FontAwesomeIcon icon={faTruck} />
            Dodání
          </SectionTitle>
          <CollapseIcon $collapsed={collapsed.dodani}>
            <FontAwesomeIcon icon={faChevronUp} />
          </CollapseIcon>
        </SectionHeader>
        <SectionContent $collapsed={collapsed.dodani} $theme="orange">
          <InfoCard>
            <DataGrid $columns="1fr 1fr">
              <KeyValuePair>
                <KeyLabel>Místo dodání</KeyLabel>
                <ValueText>{orderData.misto_dodani || '—'}</ValueText>
              </KeyValuePair>
              
              <KeyValuePair>
                <KeyLabel>Předpokládaný termín dodání</KeyLabel>
                <ValueText>
                  {orderData.dt_predpokladany_termin_dodani 
                    ? formatDateOnly(orderData.dt_predpokladany_termin_dodani) 
                    : '—'}
                </ValueText>
              </KeyValuePair>

              <KeyValuePair>
                <KeyLabel>Záruka</KeyLabel>
                <ValueText>{orderData.zaruka || <span style={{color: '#9ca3af'}}>---</span>}</ValueText>
              </KeyValuePair>

              {orderData.dt_akceptace && (
                <>
                  <KeyValuePair>
                    <KeyLabel>Datum akceptace dodavatelem</KeyLabel>
                    <ValueText>
                      {formatDateOnly(orderData.dt_akceptace)}
                    </ValueText>
                  </KeyValuePair>
                  
                  <KeyValuePair>
                    <KeyLabel>Potvrdil dodavatel</KeyLabel>
                    <ValueText>
                      {(() => {
                        const enriched = orderData._enriched?.dodavatel_potvrdil;
                        if (enriched) {
                          const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                          const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                          return `${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                        }
                        return orderData.dodavatel_potvrdil_jmeno || '—';
                      })()}
                    </ValueText>
                  </KeyValuePair>
                </>
              )}
            </DataGrid>
          </InfoCard>
        </SectionContent>
      </Section>

      {/* SEKCE 6: UVEŘEJNĚNÍ V REGISTRU SMLUV */}
      {('zverejnit' in orderData) && (
        <Section>
          <SectionHeader $theme="blue" $isActive={!collapsed.registr} onClick={() => toggleSection('registr')}>
            <SectionTitle $theme="blue">
              <FontAwesomeIcon icon={faFileAlt} />
              Rozhodnutí o zveřejnění v registru smluv
            </SectionTitle>
            <CollapseIcon $collapsed={collapsed.registr}>
              <FontAwesomeIcon icon={faChevronUp} />
            </CollapseIcon>
          </SectionHeader>
          <SectionContent $collapsed={collapsed.registr} $theme="blue">
            {(() => {
              // Robustní kontrola - převedeme na string a porovnáme
              const jeZverejnit = String(orderData.zverejnit) === '1';
              
              return (
                <InfoCard>
                  <DataGrid $columns="1fr 1fr">
                    <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                      <KeyLabel>Má být zveřejněna v registru smluv</KeyLabel>
                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: jeZverejnit ? '#dcfce7' : '#fee2e2',
                        border: `2px solid ${jeZverejnit ? '#16a34a' : '#ef4444'}`,
                        borderRadius: '8px',
                        color: jeZverejnit ? '#166534' : '#991b1b',
                        fontWeight: '600',
                        marginTop: '0.5rem'
                      }}>
                        <FontAwesomeIcon icon={jeZverejnit ? faCheckCircle : faTimesCircle} />
                        {jeZverejnit ? 'ANO' : 'NE'}
                      </div>
                    </KeyValuePair>

                    {/* Pokud NE (0), zobraz info že nebyla zveřejněna */}
                    {!jeZverejnit && (
                      <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                        <ValueText style={{ color: '#6b7280', fontStyle: 'italic' }}>
                          Objednávka nebyla zveřejněna v registru smluv.
                        </ValueText>
                      </KeyValuePair>
                    )}

                    {/* Datum a ID se zobrazí POUZE pokud má být zveřejněna */}
                    {jeZverejnit && orderData.dt_zverejneni && (
                      <>
                        <KeyValuePair>
                          <KeyLabel>Datum zveřejnění</KeyLabel>
                          <ValueText>{formatDateOnly(orderData.dt_zverejneni)}</ValueText>
                        </KeyValuePair>
                        <KeyValuePair>
                          <KeyLabel>Zveřejnil</KeyLabel>
                          <ValueText>
                            {(() => {
                              const enriched = orderData._enriched?.zverejnil;
                              if (enriched) {
                                const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                                const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                                return `${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                              }
                              return orderData.zverejnil_jmeno || '—';
                            })()}
                          </ValueText>
                        </KeyValuePair>
                      </>
                    )}

                    {jeZverejnit && orderData.registr_iddt && (
                      <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                        <KeyLabel>ID smlouvy v registru</KeyLabel>
                        <ValueText>{orderData.registr_iddt}</ValueText>
                      </KeyValuePair>
                    )}
                  </DataGrid>
                </InfoCard>
              );
            })()}
          </SectionContent>
        </Section>
      )}

      {/* SEKCE 7: FAKTURY */}
      {orderData.faktury && orderData.faktury.length > 0 && (
        <Section data-section="faktury">
          <SectionHeader $theme="blue" $isActive={!collapsed.fakturace} onClick={() => toggleSection('fakturace')}>
            <SectionTitle $theme="blue">
              <FontAwesomeIcon icon={faMoneyBillWave} />
              Fakturace k objednávce ({orderData.faktury.length})
            </SectionTitle>
            <CollapseIcon $collapsed={collapsed.fakturace}>
              <FontAwesomeIcon icon={faChevronUp} />
            </CollapseIcon>
          </SectionHeader>
          <SectionContent $collapsed={collapsed.fakturace} $theme="blue">
            {orderData.faktury.map((faktura, index) => {
              const isVecnaPotvrzena = faktura.vecna_spravnost_potvrzeno === 1;
              const isBeingEdited = editingInvoiceId && (faktura.id === editingInvoiceId || faktura.id === Number(editingInvoiceId));
              return (
              <div key={faktura.id || index} style={{
                border: isBeingEdited ? '3px solid #f59e0b' : '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '0',
                marginBottom: index < orderData.faktury.length - 1 ? '1.5rem' : 0,
                background: isBeingEdited ? '#fffbeb' : (isVecnaPotvrzena ? '#f0fdf4' : '#ffffff'),
                boxShadow: isBeingEdited ? '0 4px 16px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}>
                {/* Záhlaví faktury - výrazné */}
                <div style={{
                  background: isBeingEdited 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '1rem 1.25rem',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderBottom: isBeingEdited ? '3px solid #b45309' : '3px solid #1e40af',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FontAwesomeIcon icon={isBeingEdited ? faEdit : faMoneyBillWave} style={{ fontSize: '1.2rem' }} />
                    Faktura #{index + 1}
                    {faktura.fa_cislo_vema && (
                      <span style={{ 
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        letterSpacing: 'normal',
                        textTransform: 'none'
                      }}>
                        {faktura.fa_cislo_vema}
                      </span>
                    )}
                  </div>
                  {/* Swap: buď tlačítko Upravit NEBO badge Editace */}
                  {isBeingEdited ? (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      padding: '0.5rem 1rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      letterSpacing: '0.05em'
                    }}>
                      <FontAwesomeIcon icon={faEdit} />
                      PRÁVĚ EDITUJETE
                    </div>
                  ) : onEditInvoice && canEditInvoice && (
                    <EditInvoiceButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditInvoice(faktura);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        padding: '0.5rem 1rem',
                        fontWeight: '600'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                      Upravit
                    </EditInvoiceButton>
                  )}
                </div>

                {/* Obsah faktury */}
                <div style={{ padding: '1.25rem' }}>
                <DataGrid $columns="1fr 1fr">
                  <KeyValuePair>
                    <KeyLabel>Číslo faktury</KeyLabel>
                    <ValueText>{faktura.fa_cislo_vema || '—'}</ValueText>
                  </KeyValuePair>
                  
                  <KeyValuePair>
                    <KeyLabel>Částka</KeyLabel>
                    <ValueText className="highlight">
                      {formatCurrency(faktura.fa_castka)}
                    </ValueText>
                  </KeyValuePair>

                  <KeyValuePair>
                    <KeyLabel>Datum vystavení</KeyLabel>
                    <ValueText>
                      {faktura.fa_datum_vystaveni ? formatDateOnly(faktura.fa_datum_vystaveni) : '—'}
                    </ValueText>
                  </KeyValuePair>
                  
                  <KeyValuePair>
                    <KeyLabel>Datum splatnosti</KeyLabel>
                    <ValueText>
                      {(faktura.fa_datum_splatnosti || faktura.fa_splatnost)
                        ? formatDateOnly(faktura.fa_datum_splatnosti || faktura.fa_splatnost)
                        : '—'}
                    </ValueText>
                  </KeyValuePair>
                  
                  <KeyValuePair>
                    <KeyLabel>Datum doručení</KeyLabel>
                    <ValueText>
                      {faktura.fa_datum_doruceni ? formatDateOnly(faktura.fa_datum_doruceni) : '—'}
                    </ValueText>
                  </KeyValuePair>

                  <KeyValuePair>
                    <KeyLabel>Typ faktury</KeyLabel>
                    <ValueText>
                      {(() => {
                        const typ = faktura.fa_typ || 'BEZNA';
                        const typColors = {
                          'BEZNA': { bg: '#f1f5f9', color: '#475569' },
                          'ZALOHOVA': { bg: '#dbeafe', color: '#1e40af' },
                          'OPRAVNA': { bg: '#fef3c7', color: '#92400e' },
                          'PROFORMA': { bg: '#f3e8ff', color: '#6b21a8' },
                          'DOBROPIS': { bg: '#d1fae5', color: '#065f46' }
                        };
                        const colors = typColors[typ] || typColors['BEZNA'];
                        return (
                          <Badge $bg={colors.bg} $color={colors.color}>
                            {typ}
                          </Badge>
                        );
                      })()}
                    </ValueText>
                  </KeyValuePair>

                  {faktura.fa_strediska_kod && (
                    <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                      <KeyLabel>Střediska</KeyLabel>
                      <ValueText>
                        {(() => {
                          const strediska = faktura.fa_strediska_kod;
                          if (Array.isArray(strediska)) {
                            const formatted = strediska
                              .map(s => {
                                if (typeof s === 'object') {
                                  const kod = s.kod || s.value;
                                  const nazev = s.nazev || s.label;
                                  return kod && nazev ? `${kod} - ${nazev}` : (nazev || kod || s);
                                }
                                return s;
                              })
                              .filter(Boolean)
                              .join(', ');
                            return formatted || '—';
                          }
                          if (typeof strediska === 'string') {
                            return strediska || '—';
                          }
                          return '—';
                        })()}
                      </ValueText>
                    </KeyValuePair>
                  )}

                  <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                    <KeyLabel>Poznámka</KeyLabel>
                    <ValueText>{faktura.fa_poznamka || <span style={{color: '#9ca3af'}}>---</span>}</ValueText>
                  </KeyValuePair>

                  {faktura._isdoc_dodavatel && (
                    <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                      <KeyLabel>ISDOC Dodavatel</KeyLabel>
                      <ValueText>
                        {faktura._isdoc_dodavatel.nazev}
                        {faktura._isdoc_dodavatel.ico && ` (IČO: ${faktura._isdoc_dodavatel.ico})`}
                      </ValueText>
                    </KeyValuePair>
                  )}

                </DataGrid>

                {/* PŘÍLOHY FAKTURY */}
                {faktura.prilohy && faktura.prilohy.length > 0 && (
                  <div style={{
                    margin: '1.5rem 0 1rem 0',
                    borderTop: '2px solid #e5e7eb',
                    paddingTop: '1rem'
                  }}>
                    <div style={{
                      fontWeight: '600',
                      color: '#1e40af',
                      fontSize: '0.9rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FontAwesomeIcon icon={faPaperclip} style={{ color: '#3b82f6' }} />
                      PŘÍLOHY FAKTURY Č. {index + 1} ({faktura.prilohy.length})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {faktura.prilohy.map((priloha, idx) => {
                        const formatFileSize = (bytes) => {
                          if (!bytes || bytes === 0) return '0 B';
                          const k = 1024;
                          const sizes = ['B', 'KB', 'MB', 'GB'];
                          const i = Math.floor(Math.log(bytes) / Math.log(k));
                          return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
                        };

                        const getTypeBadge = (typ) => {
                          const typeMap = {
                            'FAKTURA': { bg: '#dbeafe', color: '#1e40af', label: 'Faktura' },
                            'ISDOC': { bg: '#e0e7ff', color: '#4338ca', label: 'ISDOC' },
                            'PRILOHA': { bg: '#f3e8ff', color: '#6b21a8', label: 'Příloha' },
                            'SMLOUVA': { bg: '#fef3c7', color: '#92400e', label: 'Smlouva' },
                            'IMPORT': { bg: '#fce7f3', color: '#9f1239', label: 'Import' },
                            'JINE': { bg: '#f1f5f9', color: '#475569', label: 'Jiné' },
                            'JINA': { bg: '#f1f5f9', color: '#475569', label: 'Jiná' }
                          };
                          const config = typeMap[typ] || typeMap['JINA'];
                          return (
                            <Badge $bg={config.bg} $color={config.color}>
                              {config.label}
                            </Badge>
                          );
                        };

                        const handleDownload = async () => {
                          try {
                            const blob = await downloadInvoiceAttachment(faktura.id, priloha.id, username, token);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = priloha.originalni_nazev_souboru || 'attachment';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            console.error('Error downloading invoice attachment:', error);
                            // Error už byl zpracován v API vrstvě, stačí zobrazit error.message
                            alert(error.message || 'Nepodařilo se stáhnout přílohu faktury');
                          }
                        };

                        return (
                          <div key={priloha.id || idx} onClick={handleDownload} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0.75rem',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                          title="Klikněte pro stažení">
                            <FontAwesomeIcon icon={faFile} style={{ color: '#6b7280', fontSize: '1rem' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.875rem',
                                color: '#374151',
                                fontWeight: '500',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {priloha.originalni_nazev_souboru || 'Nepojmenovaný soubor'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                marginTop: '2px'
                              }}>
                                {formatFileSize(priloha.velikost_souboru_b)}
                              </div>
                            </div>
                            {getTypeBadge(priloha.typ_prilohy)}
                            <FontAwesomeIcon icon={faDownload} style={{ color: '#3b82f6', fontSize: '0.875rem', marginLeft: '0.5rem' }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DĚLÍCÍ ČÁRA - VĚCNÁ KONTROLA FAKTURY */}
                <div style={{
                  margin: '1.5rem 0 1rem 0',
                  borderTop: '2px solid #e5e7eb',
                  paddingTop: '1rem'
                }}>
                  <div style={{
                    fontWeight: '600',
                    color: '#6b21a8',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <FontAwesomeIcon icon={faClipboardCheck} style={{ color: '#a855f7' }} />
                    VĚCNÁ KONTROLA FAKTURY {index + 1}
                  </div>

                  <DataGrid $columns="1fr 1fr">
                    <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                      <KeyLabel>Stav věcné kontroly</KeyLabel>
                      <ValueText>
                        {faktura.vecna_spravnost_potvrzeno === 1 || faktura.vecna_spravnost_potvrzeno === '1' ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: '#dcfce7',
                            border: '2px solid #16a34a',
                            borderRadius: '8px',
                            color: '#166534',
                            fontWeight: '600'
                          }}>
                            <FontAwesomeIcon icon={faCheckCircle} />
                            Potvrzeno
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: '#fee2e2',
                            border: '2px solid #ef4444',
                            borderRadius: '8px',
                            color: '#991b1b',
                            fontWeight: '600'
                          }}>
                            <FontAwesomeIcon icon={faTimesCircle} />
                            Nepotvrzeno
                          </div>
                        )}
                      </ValueText>
                    </KeyValuePair>

                    <KeyValuePair>
                      <KeyLabel>Datum potvrzení</KeyLabel>
                      <ValueText>
                        {faktura.dt_potvrzeni_vecne_spravnosti 
                          ? <span style={{fontWeight: '600', color: '#059669'}}>{formatDateOnly(faktura.dt_potvrzeni_vecne_spravnosti)}</span>
                          : <span style={{color: '#9ca3af'}}>Nepotvrzeno</span>}
                      </ValueText>
                    </KeyValuePair>
                    
                    <KeyValuePair>
                      <KeyLabel>Potvrdil</KeyLabel>
                      <ValueText>
                        {(() => {
                          // Primárně použij jméno z DB (JOIN) včetně titulů
                          if (faktura.potvrdil_vecnou_spravnost_jmeno) {
                            const titul_pred = faktura.potvrdil_vecnou_spravnost_titul_pred ? `${faktura.potvrdil_vecnou_spravnost_titul_pred} ` : '';
                            const titul_za = faktura.potvrdil_vecnou_spravnost_titul_za ? `, ${faktura.potvrdil_vecnou_spravnost_titul_za}` : '';
                            const fullName = `${titul_pred}${faktura.potvrdil_vecnou_spravnost_jmeno} ${faktura.potvrdil_vecnou_spravnost_prijmeni || ''}${titul_za}`.trim();
                            return <span style={{fontWeight: '600', color: '#059669'}}>{fullName}</span>;
                          }
                          // Fallback na enriched data
                          const enriched = faktura._enriched?.potvrdil_vecnou_spravnost;
                          if (enriched) {
                            const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                            const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                            const fullName = `${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                            return <span style={{fontWeight: '600', color: '#059669'}}>{fullName}</span>;
                          }
                          return <span style={{color: '#9ca3af'}}>—</span>;
                        })()}
                      </ValueText>
                    </KeyValuePair>

                    <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                      <KeyLabel>Umístění majetku</KeyLabel>
                      <ValueText>
                        {faktura.vecna_spravnost_umisteni_majetku || <span style={{color: '#9ca3af'}}>---</span>}
                      </ValueText>
                    </KeyValuePair>

                    <KeyValuePair style={{ gridColumn: '1 / -1' }}>
                      <KeyLabel>Poznámka k věcné kontrole</KeyLabel>
                      <ValueText>
                        {faktura.vecna_spravnost_poznamka || <span style={{color: '#9ca3af'}}>---</span>}
                      </ValueText>
                    </KeyValuePair>
                  </DataGrid>
                </div>
                </div>
                {/* Konec obsahu faktury */}
              </div>
            );
            })}
          </SectionContent>
        </Section>
      )}

      {/* SEKCE 8: POZNÁMKY */}
      {orderData.poznamka && (
        <Section>
          <SectionHeader $theme="orange" $isActive={!collapsed.poznamky} onClick={() => toggleSection('poznamky')}>
            <SectionTitle $theme="orange">
              <FontAwesomeIcon icon={faFileAlt} />
              Poznámky
            </SectionTitle>
            <CollapseIcon $collapsed={collapsed.poznamky}>
              <FontAwesomeIcon icon={faChevronUp} />
            </CollapseIcon>
          </SectionHeader>
          <SectionContent $collapsed={collapsed.poznamky} $theme="orange">
            <InfoCard>
              <ValueText style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{orderData.poznamka}</ValueText>
            </InfoCard>
          </SectionContent>
        </Section>
      )}

      {/* SEKCE 9: DOKONČENÍ */}
      {orderData.stav_workflow_kod && orderData.stav_workflow_kod.includes('DOKONCENA') && (
        <Section>
          <SectionHeader $theme="green" $isActive={!collapsed.dokonceni} onClick={() => toggleSection('dokonceni')}>
            <SectionTitle $theme="green">
              <FontAwesomeIcon icon={faCheck} />
              Dokončení objednávky
            </SectionTitle>
            <CollapseIcon $collapsed={collapsed.dokonceni}>
              <FontAwesomeIcon icon={faChevronUp} />
            </CollapseIcon>
          </SectionHeader>
          <SectionContent $collapsed={collapsed.dokonceni} $theme="green">
            <div style={{
              padding: '1rem',
              background: '#dcfce7',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: '600',
              marginBottom: '1.5rem'
            }}>
              <FontAwesomeIcon icon={faCheckCircle} size="lg" />
              Objednávka byla úspěšně dokončena
            </div>

            {/* Workflow timeline */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#166534', fontSize: '0.95rem', fontWeight: '600' }}>
                Historie workflow
              </h4>
              
              {/* 1. Schválení */}
              {orderData.dt_schvaleni && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ color: '#16a34a', fontSize: '1.1rem', lineHeight: '1.4' }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Schválení objednávky
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDateOnly(orderData.dt_schvaleni)}
                      {(() => {
                        const enriched = orderData._enriched?.schvalovatel;
                        if (enriched) {
                          const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                          const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                          return ` • ${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                        }
                        return '';
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Odeslání dodavateli */}
              {orderData.dt_odeslani && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ color: '#16a34a', fontSize: '1.1rem', lineHeight: '1.4' }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Odeslání dodavateli
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDateOnly(orderData.dt_odeslani)}
                      {(() => {
                        const enriched = orderData._enriched?.odesilatel;
                        if (enriched) {
                          const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                          const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                          return ` • ${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                        }
                        return '';
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Potvrzení dodavatele */}
              {orderData.dt_akceptace && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ color: '#16a34a', fontSize: '1.1rem', lineHeight: '1.4' }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Potvrzení dodavatele
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDateOnly(orderData.dt_akceptace)}
                      {(() => {
                        const enriched = orderData._enriched?.dodavatel_potvrdil;
                        if (enriched) {
                          const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                          const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                          return ` • ${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                        }
                        return '';
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Registr smluv (optional) */}
              {orderData.dt_zverejneni && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ color: '#16a34a', fontSize: '1.1rem', lineHeight: '1.4' }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Zveřejnění v registru smluv
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDateOnly(orderData.dt_zverejneni)}
                      {(() => {
                        const enriched = orderData._enriched?.zverejnil;
                        if (enriched) {
                          const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                          const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                          return ` • ${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                        }
                        return '';
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Fakturace */}
              {orderData.dt_faktura_pridana && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <span style={{ color: '#16a34a', fontSize: '1.1rem', lineHeight: '1.4' }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Přidání faktury
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDateOnly(orderData.dt_faktura_pridana)}
                      {(() => {
                        const enriched = orderData._enriched?.fakturant;
                        if (enriched) {
                          const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                          const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                          return ` • ${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                        }
                        return '';
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Věcná správnost */}
              {orderData.dt_potvrzeni_vecne_spravnosti && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{ color: '#16a34a', fontSize: '1.1rem', lineHeight: '1.4' }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Potvrzení věcné správnosti
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDateOnly(orderData.dt_potvrzeni_vecne_spravnosti)}
                      {(() => {
                        const enriched = orderData._enriched?.potvrdil_vecnou_spravnost;
                        if (enriched) {
                          const titul_pred = enriched.titul_pred ? `${enriched.titul_pred} ` : '';
                          const titul_za = enriched.titul_za ? `, ${enriched.titul_za}` : '';
                          return ` • ${titul_pred}${enriched.jmeno} ${enriched.prijmeni}${titul_za}`;
                        }
                        return '';
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Price comparison warning */}
            {orderData.faktury_celkem_s_dph && orderData.max_cena_s_dph && 
             parseFloat(orderData.faktury_celkem_s_dph) > parseFloat(orderData.max_cena_s_dph) && (
              <div style={{
                padding: '0.75rem 1rem',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                color: '#991b1b',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                <strong>⚠️ Upozornění:</strong> Celková cena faktur (
                {parseFloat(orderData.faktury_celkem_s_dph).toLocaleString('cs-CZ', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} Kč) překračuje maximální cenu objednávky (
                {parseFloat(orderData.max_cena_s_dph).toLocaleString('cs-CZ', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} Kč)
              </div>
            )}

            {/* Poznámka k dokončení */}
            <FieldGroup>
              <FieldLabel>Poznámka k dokončení</FieldLabel>
              <FieldValue>{orderData.dokonceni_poznamka || <span style={{color: '#9ca3af'}}>---</span>}</FieldValue>
            </FieldGroup>
          </SectionContent>
        </Section>
      )}

      {/* SEKCE 10: PŘÍLOHY */}
      {orderData.prilohy_count > 0 && (
        <Section>
          <SectionHeader $theme="red" $isActive={!collapsed.prilohy} onClick={() => toggleSection('prilohy')}>
            <SectionTitle $theme="red">
              <FontAwesomeIcon icon={faFileAlt} />
              Přílohy ({orderData.prilohy_count})
            </SectionTitle>
            <CollapseIcon $collapsed={collapsed.prilohy}>
              <FontAwesomeIcon icon={faChevronUp} />
            </CollapseIcon>
          </SectionHeader>
          <SectionContent $collapsed={collapsed.prilohy} $theme="red">
            {orderData.prilohy && orderData.prilohy.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orderData.prilohy.map((priloha, idx) => {
                  const formatFileSize = (bytes) => {
                    if (!bytes || bytes === 0) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
                  };

                  const getTypeBadge = (typ) => {
                    const typeMap = {
                      'FAKTURA': { bg: '#dbeafe', color: '#1e40af', label: 'Faktura' },
                      'ISDOC': { bg: '#e0e7ff', color: '#4338ca', label: 'ISDOC' },
                      'PRILOHA': { bg: '#f3e8ff', color: '#6b21a8', label: 'Příloha' },
                      'SMLOUVA': { bg: '#fef3c7', color: '#92400e', label: 'Smlouva' },
                      'OBJEDNAVKA': { bg: '#d1fae5', color: '#065f46', label: 'Objednávka' },
                      'IMPORT': { bg: '#fce7f3', color: '#9f1239', label: 'Import' },
                      'JINE': { bg: '#f1f5f9', color: '#475569', label: 'Jiné' },
                      'JINA': { bg: '#f1f5f9', color: '#475569', label: 'Jiná' }
                    };
                    const config = typeMap[typ] || typeMap['JINA'];
                    return (
                      <Badge $bg={config.bg} $color={config.color}>
                        {config.label}
                      </Badge>
                    );
                  };

                  const handleDownload = async () => {
                    try {
                      const blob = await downloadOrderAttachment(orderData.id, priloha.id, username, token);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = priloha.originalni_nazev_souboru || priloha.nazev_souboru || 'attachment';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error('Error downloading order attachment:', error);
                      // Error už byl zpracován v API vrstvě, stačí zobrazit error.message
                      alert(error.message || 'Nepodařilo se stáhnout přílohu objednávky');
                    }
                  };

                  return (
                    <div key={priloha.id || idx} onClick={handleDownload} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                    title="Klikněte pro stažení">
                      <FontAwesomeIcon icon={faFile} style={{ color: '#6b7280', fontSize: '1.25rem' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#374151',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {priloha.originalni_nazev_souboru || priloha.nazev_souboru || 'Nepojmenovaný soubor'}
                        </div>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#9ca3af',
                          marginTop: '2px'
                        }}>
                          {formatFileSize(priloha.velikost_souboru_b || priloha.velikost)}
                        </div>
                      </div>
                      {getTypeBadge(priloha.typ_prilohy || priloha.typ)}
                      <FontAwesomeIcon icon={faDownload} style={{ color: '#3b82f6', fontSize: '1rem', marginLeft: '0.5rem' }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <FieldValue>
                Počet příloh: <strong>{orderData.prilohy_count}</strong>
              </FieldValue>
            )}
          </SectionContent>
        </Section>
      )}
    </FormContainer>
  );
});

OrderFormReadOnly.displayName = 'OrderFormReadOnly';

export default OrderFormReadOnly;
