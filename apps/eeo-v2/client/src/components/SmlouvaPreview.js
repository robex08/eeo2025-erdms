import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileContract, 
  faBuilding, 
  faMoneyBillWave, 
  faCalendar,
  faUser,
  faMapMarkerAlt,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';

const PreviewContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 1.5rem;
`;

const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const ContractNumber = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 0.25rem;
`;

const ContractTitle = styled.div`
  font-size: 0.95rem;
  color: #6b7280;
  font-weight: 500;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const InfoItem = styled.div`
  background: #f9fafb;
  padding: 0.875rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  margin-bottom: 0.25rem;
  font-weight: 500;
`;

const InfoValue = styled.div`
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 600;
`;

const FullWidthInfo = styled(InfoItem)`
  grid-column: 1 / -1;
`;

const AmountDisplay = styled.div`
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const AmountLabel = styled.div`
  font-size: 0.85rem;
  color: #065f46;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AmountValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #065f46;
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 1rem;
  background: ${props => props.$active ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'};
  border: 2px solid ${props => props.$active ? '#10b981' : '#d1d5db'};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.$active ? '#065f46' : '#6b7280'};
`;

const NoData = styled.div`
  padding: 3rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.95rem;
`;

const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ');
  } catch {
    return dateStr;
  }
};

const SmlouvaPreview = ({ smlouvaData, loading }) => {
  // Support both smlouva and smlouvaData props
  const smlouva = smlouvaData;

  if (loading) {
    return (
      <PreviewContainer>
        <NoData>
          <FontAwesomeIcon icon={faFileContract} size="3x" style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <div>Načítám smlouvu...</div>
        </NoData>
      </PreviewContainer>
    );
  }

  if (!smlouva) {
    return (
      <PreviewContainer>
        <NoData>
          <FontAwesomeIcon icon={faFileContract} size="3x" style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <div>Žádná smlouva není vybrána</div>
        </NoData>
      </PreviewContainer>
    );
  }

  console.log('🎨 SmlouvaPreview rendering with data:', smlouva);

  return (
    <PreviewContainer>
      <PreviewHeader>
        <HeaderIcon>
          <FontAwesomeIcon icon={faFileContract} />
        </HeaderIcon>
        <HeaderInfo>
          <ContractNumber>{smlouva.cislo_smlouvy || 'Bez čísla'}</ContractNumber>
          <ContractTitle>{smlouva.nazev_smlouvy || smlouva.nazev || 'Smlouva'}</ContractTitle>
        </HeaderInfo>
        {(smlouva.pouzit_v_obj_formu === 1 || smlouva.pouzit_v_obj_formu === '1' || smlouva.pouzit_v_obj_formu === true) && (
          <StatusBadge $active={false} style={{ background: '#dbeafe', color: '#1e40af', marginRight: '8px' }}>
            FORM
          </StatusBadge>
        )}
        <StatusBadge $active={smlouva.aktivni === 1 || smlouva.aktivni === '1' || smlouva.aktivni === true}>
          {(smlouva.aktivni === 1 || smlouva.aktivni === '1' || smlouva.aktivni === true) ? 'Aktivní' : 'Neaktivní'}
        </StatusBadge>
      </PreviewHeader>

      {/* Celková částka plnění */}
      <AmountDisplay>
        <AmountLabel>
          <FontAwesomeIcon icon={faMoneyBillWave} /> Celkem plnění s DPH
        </AmountLabel>
        <AmountValue>
          {formatCurrency(smlouva.hodnota_s_dph || 0)}
        </AmountValue>
      </AmountDisplay>

      {/* Dodavatel */}
      <Section>
        <SectionTitle>
          <FontAwesomeIcon icon={faBuilding} />
          Dodavatel
        </SectionTitle>
        <InfoGrid>
          <FullWidthInfo>
            <InfoLabel>Název</InfoLabel>
            <InfoValue>{smlouva.nazev_firmy || '—'}</InfoValue>
          </FullWidthInfo>
          {smlouva.ico && (
            <InfoItem>
              <InfoLabel>IČO</InfoLabel>
              <InfoValue>{smlouva.ico}</InfoValue>
            </InfoItem>
          )}
          {smlouva.dic && (
            <InfoItem>
              <InfoLabel>DIČ</InfoLabel>
              <InfoValue>{smlouva.dic}</InfoValue>
            </InfoItem>
          )}
        </InfoGrid>
      </Section>

      {/* Datumy */}
      <Section>
        <SectionTitle>
          <FontAwesomeIcon icon={faCalendar} />
          Termíny
        </SectionTitle>
        <InfoGrid>
          {(smlouva.datum_uzavreni || smlouva.datum_podpisu || smlouva.datum_uzavreni_smlouvy || smlouva.dt_vytvoreni) && (
            <InfoItem>
              <InfoLabel>Datum importu</InfoLabel>
              <InfoValue>{formatDate(smlouva.datum_uzavreni || smlouva.datum_podpisu || smlouva.datum_uzavreni_smlouvy || smlouva.dt_vytvoreni)}</InfoValue>
            </InfoItem>
          )}
          {(smlouva.platnost_od || smlouva.datum_od) && (
            <InfoItem>
              <InfoLabel>Platnost od</InfoLabel>
              <InfoValue>{formatDate(smlouva.platnost_od || smlouva.datum_od)}</InfoValue>
            </InfoItem>
          )}
          {(smlouva.platnost_do || smlouva.datum_do) && (() => {
            const platnostDo = smlouva.platnost_do || smlouva.datum_do;
            const isExpired = platnostDo && new Date(platnostDo) < new Date();
            return (
              <InfoItem style={{ 
                background: isExpired ? '#fee2e2' : '#d1fae5',
                border: `2px solid ${isExpired ? '#dc2626' : '#10b981'}`
              }}>
                <InfoLabel style={{ color: isExpired ? '#7f1d1d' : '#065f46' }}>Platnost do</InfoLabel>
                <InfoValue style={{ color: isExpired ? '#7f1d1d' : '#065f46' }}>
                  {formatDate(platnostDo)}
                </InfoValue>
              </InfoItem>
            );
          })()}
          {(smlouva.datum_ukonceni || smlouva.ukonceni) && (
            <InfoItem>
              <InfoLabel>Datum ukončení</InfoLabel>
              <InfoValue>{formatDate(smlouva.datum_ukonceni || smlouva.ukonceni)}</InfoValue>
            </InfoItem>
          )}
        </InfoGrid>
      </Section>

      {/* Předmět */}
      {smlouva.predmet && (
        <Section>
          <SectionTitle>
            <FontAwesomeIcon icon={faClipboardList} />
            Předmět smlouvy
          </SectionTitle>
          <FullWidthInfo>
            <InfoValue style={{ whiteSpace: 'pre-wrap' }}>{smlouva.predmet}</InfoValue>
          </FullWidthInfo>
        </Section>
      )}

      {/* Čerpání */}
      {(smlouva.cerpano_celkem !== undefined || smlouva.cerpano !== undefined) && (
        <Section>
          <SectionTitle>
            <FontAwesomeIcon icon={faMoneyBillWave} />
            Čerpání
          </SectionTitle>
          <InfoGrid>
            <InfoItem>
              <InfoLabel>Čerpáno</InfoLabel>
              <InfoValue>{formatCurrency(smlouva.cerpano_celkem || smlouva.cerpano || 0)}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Zbývá</InfoLabel>
              <InfoValue>
                {formatCurrency(
                  (smlouva.hodnota_s_dph || smlouva.celkova_castka || 0) - 
                  (smlouva.cerpano_celkem || smlouva.cerpano || 0)
                )}
              </InfoValue>
            </InfoItem>
          </InfoGrid>
        </Section>
      )}

      {/* Poznámka */}
      {smlouva.poznamka && (
        <Section>
          <SectionTitle>Poznámka</SectionTitle>
          <FullWidthInfo>
            <InfoValue style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
              {smlouva.poznamka}
            </InfoValue>
          </FullWidthInfo>
        </Section>
      )}
    </PreviewContainer>
  );
};

export default SmlouvaPreview;
