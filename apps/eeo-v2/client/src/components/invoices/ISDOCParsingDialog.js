import React from 'react';
import styled from '@emotion/styled';
import { FileText, Info, AlertCircle, CheckCircle, Building, Calendar, Banknote, Package, X } from 'lucide-react';

/**
 * Formátuje datum do CZ formátu DD.MM.YYYY
 */
const formatDateCZ = (dateString) => {
  if (!dateString) return '---';

  try {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString; // Fallback na původní string

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  } catch (e) {
    return dateString;
  }
};

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
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 1100px;
  width: 95%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;

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

const Header = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  color: #ffffff;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 28px;
    height: 28px;
  }
`;

const HeaderTitle = styled.div`
  flex: 1;
`;

const HeaderTitleText = styled.h2`
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
`;

const HeaderSubtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 0.875rem;
  opacity: 0.95;
`;

const Content = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border: 1px solid #93c5fd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  gap: 12px;

  svg {
    width: 20px;
    height: 20px;
    color: #2563eb;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const InfoText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #1e40af;
  line-height: 1.5;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 18px;
    height: 18px;
    color: #6b7280;
  }
`;

const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  margin-bottom: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TopRowGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const DataItem = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
`;

const DataLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.7;
  }
`;

const DataValue = styled.div`
  font-size: 0.9375rem;
  color: #111827;
  font-weight: 600;

  &.highlight {
    color: #10b981;
    font-size: 1.125rem;
  }
`;

const FullWidthItem = styled(DataItem)`
  grid-column: 1 / -1;
`;

const Footer = styled.div`
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &.primary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;

    &:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
  }

  &.secondary {
    background: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;

    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const WarningBox = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  gap: 12px;

  svg {
    width: 20px;
    height: 20px;
    color: #f59e0b;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const WarningText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #92400e;
  line-height: 1.5;
`;

const CheckboxContainer = styled.div`
  background: #e0f2fe;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.9375rem;
  color: #0c4a6e;
  font-weight: 500;
  user-select: none;
  flex: 1;

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #0ea5e9;
  }

  &:hover {
    color: #075985;
  }
`;

const CheckboxHint = styled.div`
  font-size: 0.8125rem;
  color: #0c4a6e;
  margin-top: 8px;
  margin-left: 30px;
  line-height: 1.4;
  font-style: italic;
  font-weight: 500;
`;

const ItemsSection = styled.div`
  display: flex;
  flex-direction: column;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
`;

const ItemsSectionTitle = styled.h3`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  svg {
    width: 14px;
    height: 14px;
    color: #10b981;
  }
`;

const ItemsList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-top: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #e5e7eb;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #10b981;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #059669;
  }
`;

const ItemRow = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 6px;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    border-color: #10b981;
    box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);
    transform: translateX(2px);
    transition: all 0.2s ease;
  }
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const ItemName = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  flex: 1;
`;

const ItemPrice = styled.div`
  font-size: 0.9375rem;
  font-weight: 700;
  color: #10b981;
  white-space: nowrap;
  margin-left: 16px;
`;

const ItemDetails = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  color: #6b7280;
`;

const ItemDetail = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;

  strong {
    color: #374151;
  }
`;

/**
 * ISDOCParsingDialog Component
 *
 * Dialog pro potvrzení extrakce dat z ISDOC souboru
 * Zobrazuje náhled dat a ptá se uživatele, zda chce data vyplnit
 */
const ISDOCParsingDialog = ({
  isdocSummary,
  isdocData,
  onConfirm,
  onCancel,
  onUploadWithoutParsing
}) => {
  // 🎯 State pro checkbox - výchozí hodnota TRUE (variabilní symbol)
  const [useVariableSymbol, setUseVariableSymbol] = React.useState(true);

  // 🎯 Získat položky z isdocData nebo isdocSummary
  const polozky = isdocData?.polozky || isdocSummary?.polozky || [];

  return (
    <Overlay onClick={(e) => e.stopPropagation()}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderIcon>
            <FileText />
          </HeaderIcon>
          <HeaderTitle>
            <HeaderTitleText>Detekován ISDOC formát!</HeaderTitleText>
            <HeaderSubtitle>Elektronická faktura byla úspěšně načtena</HeaderSubtitle>
          </HeaderTitle>
          <CloseButton onClick={onCancel} aria-label="Zavřít">
            <X />
          </CloseButton>
        </Header>

        <Content>
          <InfoBox>
            <Info />
            <InfoText>
              ISDOC je standardní formát pro elektronickou výměnu faktur.
              Systém může automaticky vyplnit údaje faktury z tohoto souboru.
            </InfoText>
          </InfoBox>

          {/* 🎯 DVOUSLOUPCOVÝ LAYOUT: LEVÁ (pod sebou) + PRAVÁ (dodavatel + položky) */}
          <TwoColumnLayout>
            {/* LEVÁ STRANA - 2×2 GRID (50/50) */}
            <LeftColumn>
              <TopRowGrid>
                <DataItem>
                  <DataLabel>
                    <Calendar />
                    Datum vystavení
                  </DataLabel>
                  <DataValue>{formatDateCZ(isdocSummary.datum_vystaveni)}</DataValue>
                </DataItem>

                <DataItem>
                  <DataLabel>
                    <Banknote />
                    Celková částka
                  </DataLabel>
                  <DataValue className="highlight">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{isdocSummary.castka_s_dph}</span>
                      {isdocSummary.ma_slevu && isdocSummary.sleva_celkem > 0 && (
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#059669',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🎉 Sleva: -{isdocSummary.sleva_celkem.toLocaleString('cs-CZ', {
                            minimumFractionDigits: 2
                          })} Kč
                          {isdocSummary.sleva_procenta > 0 && (
                            <span style={{
                              fontSize: '0.7rem',
                              opacity: 0.8
                            }}>
                              ({isdocSummary.sleva_procenta.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </DataValue>
                </DataItem>
              </TopRowGrid>

              <TopRowGrid>
                <DataItem>
                  <DataLabel>
                    <FileText />
                    Číslo faktury
                  </DataLabel>
                  <DataValue>{isdocSummary.cislo_faktury}</DataValue>
                </DataItem>

                <DataItem>
                  <DataLabel>
                    <FileText />
                    Variabilní symbol
                  </DataLabel>
                  <DataValue>{isdocSummary.variabilni_symbol}</DataValue>
                </DataItem>
              </TopRowGrid>
            </LeftColumn>

            {/* PRAVÁ STRANA - Dodavatel + Počet na jednom řádku, pak položky */}
            <RightColumn>
              {/* První řádek: Dodavatel + Počet položek */}
              <TopRowGrid>
                <DataItem>
                  <DataLabel>
                    <Building />
                    Dodavatel
                  </DataLabel>
                  <DataValue>{isdocSummary.dodavatel}</DataValue>
                </DataItem>

                <DataItem>
                  <DataLabel>
                    <Package />
                    Počet položek
                  </DataLabel>
                  <DataValue>{isdocSummary.pocet_polozek}</DataValue>
                </DataItem>
              </TopRowGrid>

              {/* Položky - přes celou šířku */}
              {polozky && polozky.length > 0 && (
                <ItemsSection>
                  <ItemsSectionTitle>
                    <Package />
                    Položky faktury
                  </ItemsSectionTitle>
                  <ItemsList>
                    {polozky.map((polozka, index) => (
                      <ItemRow key={index}>
                        <ItemHeader>
                          <ItemName>
                            {index + 1}. {polozka.popis || 'Položka bez popisu'}
                          </ItemName>
                          <ItemPrice>
                            {polozka.cena_celkem_s_dph?.toLocaleString('cs-CZ', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} Kč
                          </ItemPrice>
                        </ItemHeader>
                        <ItemDetails>
                          <ItemDetail>
                            <strong>Množství:</strong> {polozka.mnozstvi} {polozka.jednotka}
                          </ItemDetail>
                          <ItemDetail>
                            <strong>Cena/jedn.:</strong> {polozka.cena_za_jednotku?.toLocaleString('cs-CZ', {
                              minimumFractionDigits: 2
                            })} Kč
                          </ItemDetail>
                          <ItemDetail>
                            <strong>Bez DPH:</strong> {polozka.cena_celkem_bez_dph?.toLocaleString('cs-CZ', {
                              minimumFractionDigits: 2
                            })} Kč
                          </ItemDetail>
                          <ItemDetail>
                            <strong>DPH:</strong> {polozka.sazba_dph}%
                          </ItemDetail>
                        </ItemDetails>
                      </ItemRow>
                    ))}
                  </ItemsList>
                </ItemsSection>
              )}
            </RightColumn>
          </TwoColumnLayout>

          {/* 🎯 CHECKBOX PRO VÝBĚR MEZI ČÍSLEM FAKTURY A VARIABILNÍM SYMBOLEM */}
          <CheckboxContainer>
            <div style={{ flex: 1 }}>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={useVariableSymbol}
                  onChange={(e) => setUseVariableSymbol(e.target.checked)}
                />
                <span>
                  Do pole <strong>Číslo FA/VPD</strong> použít <strong>variabilní symbol</strong> místo čísla faktury
                </span>
              </CheckboxLabel>
              <CheckboxHint>
                {useVariableSymbol
                  ? `✓ Bude použit variabilní symbol: ${isdocSummary.variabilni_symbol}`
                  : `✓ Bude použito číslo faktury: ${isdocSummary.cislo_faktury}`
                }
              </CheckboxHint>
            </div>
          </CheckboxContainer>

          <WarningBox>
            <AlertCircle />
            <WarningText>
              <strong>Datum doručení</strong> bude automaticky nastaven na dnešní datum.
              Po vyplnění údajů zkontrolujte všechna pole před uložením!
            </WarningText>
          </WarningBox>
        </Content>

        <Footer>
          <Button className="secondary" onClick={onUploadWithoutParsing}>
            Nahrát bez extrakce
          </Button>
          <Button className="secondary" onClick={onCancel}>
            Zrušit
          </Button>
          <Button className="primary" onClick={() => onConfirm(useVariableSymbol)}>
            <CheckCircle />
            Vyplnit údaje faktury
          </Button>
        </Footer>
      </Modal>
    </Overlay>
  );
};

export default ISDOCParsingDialog;
