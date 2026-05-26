import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave,
  faCalendar,
  faUser,
  faBuilding,
  faClipboardList,
  faFileInvoice,
  faCashRegister,
  faChartPie,
  faPiggyBank
} from '@fortawesome/free-solid-svg-icons';
import { formatDateOnly } from '../utils/format';

// Helper: formátování kódu LP s rokem platnosti (např. LPP4'26)
const formatLpWithYear = (cisloLp, platneDo) => {
  if (!cisloLp) return '';
  if (!platneDo) return cisloLp;
  try {
    const date = typeof platneDo === 'string' ? new Date(platneDo) : platneDo;
    const year = date.getFullYear();
    const shortYear = year.toString().slice(-2);
    return `${cisloLp}'${shortYear}`;
  } catch (e) {
    return cisloLp;
  }
};

const formatCZK = (val) => {
  const num = parseFloat(val || 0);
  return new Intl.NumberFormat('cs-CZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num) + ' Kč';
};

const PreviewContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
`;

const Header = styled.div`
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
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
`;

const HeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LPNumber = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const LPNazev = styled.div`
  font-size: 0.95rem;
  color: #6b7280;
  margin-top: 2px;
`;

const ModulBadge = styled.span`
  display: inline-block;
  background: #fce7f3;
  color: #be185d;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Section = styled.div`
  margin-bottom: 1.25rem;
`;

const SectionTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
`;

const InfoValue = styled.div`
  font-size: 0.9rem;
  color: #1f2937;
  font-weight: 500;
`;

const CerpaniRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 0.875rem;
`;

const CerpaniLabel = styled.div`
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CerpaniValue = styled.div`
  font-weight: 600;
  color: #1f2937;
`;

const TotalRow = styled(CerpaniRow)`
  background: #fef3c7;
  font-weight: 700;
  border: 1px solid #fde68a;
`;

const LimitRow = styled(CerpaniRow)`
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  font-weight: 700;
`;

const RemainingRow = styled(CerpaniRow)`
  background: ${p => p.$negative ? '#fee2e2' : '#dbeafe'};
  border: 1px solid ${p => p.$negative ? '#fca5a5' : '#93c5fd'};
  font-weight: 700;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${p => Math.min(100, p.$pct || 0)}%;
  background: ${p => p.$pct >= 100 ? '#dc2626' : p.$pct >= 80 ? '#f59e0b' : '#10b981'};
  transition: width 0.3s ease;
`;

const ModulDescription = {
  'o': 'Objednávky',
  'p': 'Pokladna',
  'f': 'Faktury (standalone)',
};

const formatModulLabel = (modul) => {
  if (!modul) return '—';
  return modul.split('').map(ch => ModulDescription[ch] || ch).join(' + ');
};

export default function LPPreview({ lpData }) {
  if (!lpData) return null;

  const limit = parseFloat(lpData.limit_celkem || lpData.vyse_financniho_kryti || 0);
  const pokladna = parseFloat(lpData.pokladna || 0);
  const faOdbory = parseFloat(lpData.fakturovano_odbory || 0);
  const faObj = parseFloat(lpData.fakturovano_objednavky || 0);
  const cerpano = parseFloat(lpData.cerpano_celkem || (pokladna + faOdbory + faObj));
  const zbyva = limit - cerpano;
  const pct = limit > 0 ? (cerpano / limit) * 100 : 0;

  const pocetFaOdbory = parseInt(lpData.pocet_faktur_odbory, 10) || 0;
  const pocetFaObj = parseInt(lpData.pocet_faktur_objednavky, 10) || 0;
  const pocetPokl = parseInt(lpData.pocet_pokladnich_polozek, 10) || 0;

  return (
    <PreviewContainer>
      <Header>
        <HeaderIcon>
          <FontAwesomeIcon icon={faMoneyBillWave} />
        </HeaderIcon>
        <HeaderInfo>
          <LPNumber>
            {formatLpWithYear(lpData.cislo_lp, lpData.platne_do)}
            {lpData.modul && (
              <ModulBadge title={formatModulLabel(lpData.modul)}>{lpData.modul}</ModulBadge>
            )}
          </LPNumber>
          <LPNazev>{lpData.nazev_uctu || '—'}</LPNazev>
        </HeaderInfo>
      </Header>

      <Section>
        <SectionTitle>
          <FontAwesomeIcon icon={faClipboardList} /> Základní údaje
        </SectionTitle>
        <InfoGrid>
          <InfoRow>
            <InfoLabel><FontAwesomeIcon icon={faCalendar} /> Platnost od</InfoLabel>
            <InfoValue>{lpData.platne_od ? formatDateOnly(lpData.platne_od) : '—'}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel><FontAwesomeIcon icon={faCalendar} /> Platnost do</InfoLabel>
            <InfoValue>{lpData.platne_do ? formatDateOnly(lpData.platne_do) : '—'}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel><FontAwesomeIcon icon={faUser} /> Příkazce</InfoLabel>
            <InfoValue>{lpData.prikazce_cele_jmeno || lpData.prikazce_jmeno || '—'}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel><FontAwesomeIcon icon={faBuilding} /> Úsek</InfoLabel>
            <InfoValue>
              {lpData.usek_zkr ? `${lpData.usek_zkr}${lpData.usek_nazev ? ' – ' + lpData.usek_nazev : ''}` : '—'}
            </InfoValue>
          </InfoRow>
          <InfoRow style={{ gridColumn: '1 / -1' }}>
            <InfoLabel>Modul</InfoLabel>
            <InfoValue>{formatModulLabel(lpData.modul)}</InfoValue>
          </InfoRow>
          {lpData.vyuziti && (
            <InfoRow style={{ gridColumn: '1 / -1' }}>
              <InfoLabel>Využití</InfoLabel>
              <InfoValue style={{ fontWeight: 400, fontSize: '0.85rem', color: '#4b5563' }}>
                {lpData.vyuziti}
              </InfoValue>
            </InfoRow>
          )}
        </InfoGrid>
      </Section>

      <Section>
        <SectionTitle>
          <FontAwesomeIcon icon={faChartPie} /> Rozpis čerpání
        </SectionTitle>
        <LimitRow>
          <CerpaniLabel><FontAwesomeIcon icon={faPiggyBank} /> Celková výše krytí</CerpaniLabel>
          <CerpaniValue>{formatCZK(limit)}</CerpaniValue>
        </LimitRow>
        <CerpaniRow>
          <CerpaniLabel>
            <FontAwesomeIcon icon={faCashRegister} /> Pokladna
            {pocetPokl > 0 && <small style={{ color: '#6b7280' }}>({pocetPokl} pol.)</small>}
          </CerpaniLabel>
          <CerpaniValue>{formatCZK(pokladna)}</CerpaniValue>
        </CerpaniRow>
        <CerpaniRow>
          <CerpaniLabel>
            <FontAwesomeIcon icon={faFileInvoice} /> Faktury (odbory)
            {pocetFaOdbory > 0 && <small style={{ color: '#6b7280' }}>({pocetFaOdbory} fa)</small>}
          </CerpaniLabel>
          <CerpaniValue>{formatCZK(faOdbory)}</CerpaniValue>
        </CerpaniRow>
        <CerpaniRow>
          <CerpaniLabel>
            <FontAwesomeIcon icon={faFileInvoice} /> Faktury (objednávky)
            {pocetFaObj > 0 && <small style={{ color: '#6b7280' }}>({pocetFaObj} fa)</small>}
          </CerpaniLabel>
          <CerpaniValue>{formatCZK(faObj)}</CerpaniValue>
        </CerpaniRow>
        <TotalRow>
          <CerpaniLabel>Čerpáno celkem</CerpaniLabel>
          <CerpaniValue>{formatCZK(cerpano)} <small style={{ color: '#92400e', marginLeft: 4 }}>({pct.toFixed(1)} %)</small></CerpaniValue>
        </TotalRow>
        <RemainingRow $negative={zbyva < 0}>
          <CerpaniLabel>{zbyva < 0 ? 'Překročeno o' : 'Zbývá k čerpání'}</CerpaniLabel>
          <CerpaniValue>{formatCZK(Math.abs(zbyva))}</CerpaniValue>
        </RemainingRow>
        <ProgressBar>
          <ProgressFill $pct={pct} />
        </ProgressBar>
      </Section>
    </PreviewContainer>
  );
}
