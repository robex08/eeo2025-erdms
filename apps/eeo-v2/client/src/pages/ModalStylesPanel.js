import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faPalette
} from '@fortawesome/free-solid-svg-icons';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 39px;
  background: #f9fafb;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
`;

const Title = styled.h2`
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: #1f2937;

  svg {
    color: #8b5cf6;
  }
`;

const Description = styled.div`
  background: #ede9fe;
  padding: 1.5rem;
  borderRadius: 12px;
  marginBottom: 2rem;
  border: 2px solid #c4b5fd;
`;

const DescriptionText = styled.p`
  margin: 0 0 0.75rem 0;
  fontSize: 1.1rem;
  color: #1f2937;

  &:last-child {
    margin-bottom: 0;
    color: #6b7280;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const DesignCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid ${props => props.$borderColor || '#e5e7eb'};
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const DesignTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.$color || '#1f2937'};
  fontSize: 1.25rem;
  fontWeight: 700;
  borderBottom: 2px solid ${props => props.$borderColor || '#e5e7eb'};
  paddingBottom: 0.5rem;
`;

const ModalPreview = styled.div`
  background: ${props => props.$background || 'white'};
  borderRadius: ${props => props.$borderRadius || '12px'};
  padding: ${props => props.$padding || '2rem'};
  boxShadow: ${props => props.$boxShadow || '0 20px 25px -5px rgba(0, 0, 0, 0.3)'};
  border: ${props => props.$border || '1px solid #e5e7eb'};
  overflow: ${props => props.$overflow || 'visible'};
`;

const ModalHeader = styled.div`
  display: flex;
  alignItems: center;
  gap: 0.75rem;
  marginBottom: 1.5rem;
`;

const IconCircle = styled.div`
  width: 48px;
  height: 48px;
  borderRadius: ${props => props.$borderRadius || '50%'};
  background: ${props => props.$background};
  border: ${props => props.$border || 'none'};
  display: flex;
  alignItems: center;
  justifyContent: center;
  color: ${props => props.$color};
  fontSize: 1.5rem;
  boxShadow: ${props => props.$boxShadow || 'none'};
`;

const ModalTitle = styled.h3`
  fontSize: 1.25rem;
  fontWeight: ${props => props.$fontWeight || 700};
  color: ${props => props.$color || '#1e293b'};
  margin: 0;
  textShadow: ${props => props.$textShadow || 'none'};
`;

const ModalContent = styled.div`
  marginBottom: 2rem;
  lineHeight: 1.6;
  color: ${props => props.$color || '#475569'};
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justifyContent: flex-end;
  borderTop: ${props => props.$borderTop || 'none'};
  paddingTop: ${props => props.$paddingTop || '0'};
`;

const Button = styled.button`
  padding: ${props => props.$padding || '0.75rem 1.5rem'};
  border: ${props => props.$border};
  borderRadius: ${props => props.$borderRadius || '8px'};
  fontWeight: ${props => props.$fontWeight || 600};
  background: ${props => props.$background};
  color: ${props => props.$color};
  cursor: pointer;
  fontSize: ${props => props.$fontSize || '0.9375rem'};
  boxShadow: ${props => props.$boxShadow || 'none'};
  backdropFilter: ${props => props.$backdropFilter || 'none'};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    boxShadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const GradientHeader = styled.div`
  background: ${props => props.$background};
  padding: 1.5rem;
  display: flex;
  alignItems: center;
  gap: 1rem;
  borderBottom: ${props => props.$borderBottom || 'none'};
`;

const TipsSection = styled.div`
  marginTop: 2rem;
  padding: 1.5rem;
  background: white;
  borderRadius: 12px;
  border: 2px solid #e5e7eb;
`;

const TipsTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: #1f2937;
  fontSize: 1.125rem;
  fontWeight: 600;
`;

const TipsList = styled.ul`
  margin: 0;
  paddingLeft: 1.5rem;
  color: #6b7280;
  lineHeight: 1.8;

  li {
    marginBottom: 0.5rem;

    strong {
      color: #1f2937;
    }
  }
`;

const ModalStylesPanel = () => {
  return (
    <Container>
      <Header>
        <Title>
          <FontAwesomeIcon icon={faPalette} />
          🎨 Návrhy Stylů Modálních Dialogů
        </Title>
      </Header>

      <Description>
        <DescriptionText>
          <strong>📋 Instrukce:</strong> Níže vidíte různé návrhy stylů pro modální confirming dialogy.
        </DescriptionText>
        <DescriptionText>
          Každý návrh má <strong>jednoznačný název</strong> - vyber si styl, který se ti líbí,
          a řekni mi název. Pak jej použijeme jako základ pro jednotný modal systém v celé aplikaci.
        </DescriptionText>
      </Description>

      <Grid>
        {/* NÁVRH 1: CURRENT-STYLE */}
        <DesignCard $borderColor="#1e40af">
          <DesignTitle $color="#60a5fa" $borderColor="#1e40af">
            CURRENT-STYLE (Současný)
          </DesignTitle>

          <ModalPreview>
            <ModalHeader>
              <IconCircle $background="#fecaca" $color="#dc2626">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </IconCircle>
              <ModalTitle>Potvrzení akce</ModalTitle>
            </ModalHeader>

            <ModalContent>
              Toto je ukázka současného stylu modálního dialogu.
              Design používá kulaté ikonky, světlé pozadí a jemné stíny.
            </ModalContent>

            <ModalActions>
              <Button
                $border="2px solid #d1d5db"
                $background="white"
                $color="#6b7280"
              >
                Zrušit
              </Button>
              <Button
                $border="2px solid #dc2626"
                $background="#dc2626"
                $color="white"
              >
                Potvrdit
              </Button>
            </ModalActions>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 2: GRADIENT-MODERN-RED */}
        <DesignCard $borderColor="#dc2626">
          <DesignTitle $color="#f87171" $borderColor="#dc2626">
            GRADIENT-MODERN-RED (Kompaktní) ⭐ VYBRANÝ
          </DesignTitle>

          <ModalPreview
            $borderRadius="16px"
            $padding="0"
            $overflow="hidden"
            $boxShadow="0 20px 60px rgba(0, 0, 0, 0.4)"
          >
            <GradientHeader
              $background="linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
              $borderBottom="3px solid #991b1b"
              style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ fontSize: '1.5rem', color: 'white', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <ModalTitle $color="white" $textShadow="0 2px 4px rgba(0,0,0,0.2)" $fontWeight={800}>
                Potvrzení akce
              </ModalTitle>
            </GradientHeader>

            <div style={{ padding: '2rem 2rem 1.75rem 2rem' }}>
              <ModalContent $color="#374151" style={{ marginBottom: '1.75rem', fontSize: '1rem', lineHeight: '1.7' }}>
                Chystáte se smazat objednávku <strong>"OBJ-2025-001"</strong>.
                <br /><br />
                Opravdu chcete pokračovat?
              </ModalContent>

              <ModalActions $borderTop="2px solid #f3f4f6" $paddingTop="1.75rem" style={{ justifyContent: 'flex-end' }}>
                <Button
                  $border="2px solid #d1d5db"
                  $borderRadius="10px"
                  $background="white"
                  $color="#6b7280"
                  $fontWeight={700}
                  $padding="0.875rem 1.75rem"
                >
                  Zrušit
                </Button>
                <Button
                  $border="none"
                  $borderRadius="10px"
                  $background="linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                  $color="white"
                  $fontWeight={700}
                  $boxShadow="0 4px 12px rgba(220, 38, 38, 0.4)"
                  $padding="0.875rem 1.75rem"
                >
                  Potvrdit
                </Button>
              </ModalActions>
            </div>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 2B: GRADIENT-MODERN-RED - S DODATEČNÝMI INFORMACEMI */}
        <DesignCard $borderColor="#dc2626">
          <DesignTitle $color="#f87171" $borderColor="#dc2626">
            GRADIENT-MODERN-RED (S dodatečnými infomacemi) ⭐ VYBRANÝ
          </DesignTitle>

          <ModalPreview
            $borderRadius="16px"
            $padding="0"
            $overflow="hidden"
            $boxShadow="0 20px 60px rgba(0, 0, 0, 0.4)"
          >
            <GradientHeader
              $background="linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
              $borderBottom="3px solid #991b1b"
              style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ fontSize: '1.5rem', color: 'white', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <ModalTitle $color="white" $textShadow="0 2px 4px rgba(0,0,0,0.2)" $fontWeight={800}>
                Varování - Ztráta konceptu
              </ModalTitle>
            </GradientHeader>

            <div style={{ padding: '2rem 2rem 1.75rem 2rem' }}>
              <ModalContent $color="#374151" style={{ marginBottom: '0', fontSize: '1rem', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 1rem 0' }}>
                  Chystáte se editovat archivovanou objednávku <strong>"OBJ-2024-542"</strong>.
                </p>

                {/* Varování box 1 */}
                <div style={{
                  background: '#fef3c7',
                  padding: '0.875rem',
                  borderRadius: '8px',
                  border: '2px solid #fbbf24',
                  margin: '1rem 0',
                  fontSize: '0.9375rem'
                }}>
                  <strong style={{ color: '#92400e' }}>⚠️ VAROVÁNÍ - ARCHIVOVÁNO:</strong>
                  <br />
                  <span style={{ color: '#78350f' }}>
                    Tato objednávka byla importována z původního systému EEO.
                    Editace může být přepsána při opakovaném importu dat.
                  </span>
                </div>

                {/* Varování box 2 */}
                <div style={{
                  background: '#fee2e2',
                  padding: '0.875rem',
                  borderRadius: '8px',
                  border: '2px solid #f87171',
                  margin: '1rem 0',
                  fontSize: '0.9375rem'
                }}>
                  <strong style={{ color: '#991b1b' }}>🗑️ ZTRÁTA KONCEPTU:</strong>
                  <br />
                  <span style={{ color: '#7f1d1d' }}>
                    Máte rozpracovanou objednávku <strong>"★ NOVÁ OBJEDNÁVKA ★"</strong>,
                    která bude při pokračování <strong>ZTRACENA</strong> a nelze ji obnovit!
                  </span>
                </div>

                <p style={{ margin: '1rem 0 0 0', fontWeight: 600, color: '#dc2626' }}>
                  Opravdu chcete pokračovat a ztratit rozpracovanou objednávku?
                </p>
              </ModalContent>

              <ModalActions $borderTop="2px solid #f3f4f6" $paddingTop="1.75rem" style={{ justifyContent: 'flex-end', marginTop: '1.75rem' }}>
                <Button
                  $border="2px solid #d1d5db"
                  $borderRadius="10px"
                  $background="white"
                  $color="#6b7280"
                  $fontWeight={700}
                  $padding="0.875rem 1.75rem"
                >
                  Ne, zrušit
                </Button>
                <Button
                  $border="none"
                  $borderRadius="10px"
                  $background="linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                  $color="white"
                  $fontWeight={700}
                  $boxShadow="0 4px 12px rgba(220, 38, 38, 0.4)"
                  $padding="0.875rem 1.75rem"
                >
                  Ano, rozumím rizikům
                </Button>
              </ModalActions>
            </div>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 2C: GRADIENT-MODERN-GREEN - INFO/SUCCESS VARIANTA */}
        <DesignCard $borderColor="#10b981">
          <DesignTitle $color="#34d399" $borderColor="#10b981">
            GRADIENT-MODERN-GREEN (Informační - kompaktní) ℹ️
          </DesignTitle>

          <ModalPreview
            $borderRadius="16px"
            $padding="0"
            $overflow="hidden"
            $boxShadow="0 20px 60px rgba(0, 0, 0, 0.4)"
          >
            <GradientHeader
              $background="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              $borderBottom="3px solid #047857"
              style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ fontSize: '1.5rem', color: 'white', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <ModalTitle $color="white" $textShadow="0 2px 4px rgba(0,0,0,0.2)" $fontWeight={800}>
                Potvrzení akce
              </ModalTitle>
            </GradientHeader>

            <div style={{ padding: '2rem 2rem 1.75rem 2rem' }}>
              <ModalContent $color="#374151" style={{ marginBottom: '1.75rem', fontSize: '1rem', lineHeight: '1.7' }}>
                Objednávka <strong>"OBJ-2025-123"</strong> byla úspěšně uložena.
                <br /><br />
                Chcete pokračovat v editaci nebo se vrátit do seznamu?
              </ModalContent>

              <ModalActions $borderTop="2px solid #f3f4f6" $paddingTop="1.75rem" style={{ justifyContent: 'flex-end' }}>
                <Button
                  $border="2px solid #d1d5db"
                  $borderRadius="10px"
                  $background="white"
                  $color="#6b7280"
                  $fontWeight={700}
                  $padding="0.875rem 1.75rem"
                >
                  Zpět do seznamu
                </Button>
                <Button
                  $border="none"
                  $borderRadius="10px"
                  $background="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  $color="white"
                  $fontWeight={700}
                  $boxShadow="0 4px 12px rgba(16, 185, 129, 0.4)"
                  $padding="0.875rem 1.75rem"
                >
                  Pokračovat v editaci
                </Button>
              </ModalActions>
            </div>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 2D: GRADIENT-MODERN-GREEN - S DODATEČNÝMI INFORMACEMI */}
        <DesignCard $borderColor="#10b981">
          <DesignTitle $color="#34d399" $borderColor="#10b981">
            GRADIENT-MODERN-GREEN (Informační - s dodatečnými info) ℹ️
          </DesignTitle>

          <ModalPreview
            $borderRadius="16px"
            $padding="0"
            $overflow="hidden"
            $boxShadow="0 20px 60px rgba(0, 0, 0, 0.4)"
          >
            <GradientHeader
              $background="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              $borderBottom="3px solid #047857"
              style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ fontSize: '1.5rem', color: 'white', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <ModalTitle $color="white" $textShadow="0 2px 4px rgba(0,0,0,0.2)" $fontWeight={800}>
                Objednávka vyžaduje schválení
              </ModalTitle>
            </GradientHeader>

            <div style={{ padding: '2rem 2rem 1.75rem 2rem' }}>
              <ModalContent $color="#374151" style={{ marginBottom: '0', fontSize: '1rem', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 1rem 0' }}>
                  Objednávka <strong>"Dodávka kancelářského materiálu Q1/2025"</strong> byla úspěšně vytvořena.
                </p>

                {/* Info box 1 */}
                <div style={{
                  background: '#d1fae5',
                  padding: '0.875rem',
                  borderRadius: '8px',
                  border: '2px solid #6ee7b7',
                  margin: '1rem 0',
                  fontSize: '0.9375rem'
                }}>
                  <strong style={{ color: '#065f46' }}>✅ AUTOMATICKÉ AKCE:</strong>
                  <br />
                  <span style={{ color: '#047857' }}>
                    Objednávka byla automaticky přiřazena garantovi <strong>Ing. Jan Novák</strong>
                    a odeslána ke schválení finančnímu schvalovateli.
                  </span>
                </div>

                {/* Info box 2 */}
                <div style={{
                  background: '#dbeafe',
                  padding: '0.875rem',
                  borderRadius: '8px',
                  border: '2px solid #93c5fd',
                  margin: '1rem 0',
                  fontSize: '0.9375rem'
                }}>
                  <strong style={{ color: '#1e40af' }}>📧 NOTIFIKACE:</strong>
                  <br />
                  <span style={{ color: '#1e3a8a' }}>
                    E-mailové upozornění bylo odesláno všem zainteresovaným stranám.
                    Sledovat stav můžete v sekci "Moje objednávky".
                  </span>
                </div>

                <p style={{ margin: '1rem 0 0 0', fontWeight: 600, color: '#059669' }}>
                  Co chcete udělat dále?
                </p>
              </ModalContent>

              <ModalActions $borderTop="2px solid #f3f4f6" $paddingTop="1.75rem" style={{ justifyContent: 'flex-end', marginTop: '1.75rem' }}>
                <Button
                  $border="2px solid #d1d5db"
                  $borderRadius="10px"
                  $background="white"
                  $color="#6b7280"
                  $fontWeight={700}
                  $padding="0.875rem 1.75rem"
                >
                  Zpět do seznamu
                </Button>
                <Button
                  $border="none"
                  $borderRadius="10px"
                  $background="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  $color="white"
                  $fontWeight={700}
                  $boxShadow="0 4px 12px rgba(16, 185, 129, 0.4)"
                  $padding="0.875rem 1.75rem"
                >
                  Zobrazit detail
                </Button>
              </ModalActions>
            </div>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 3: MINIMAL-CLEAN */}
        <DesignCard $borderColor="#10b981">
          <DesignTitle $color="#34d399" $borderColor="#10b981">
            MINIMAL-CLEAN (Minimalistický čistý)
          </DesignTitle>

          <ModalPreview
            $borderRadius="8px"
            $boxShadow="0 10px 15px -3px rgba(0, 0, 0, 0.1)"
          >
            <div style={{ borderLeft: '4px solid #dc2626', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
              <ModalTitle $color="#111827" $fontWeight={600} style={{ fontSize: '1.125rem' }}>
                Potvrzení akce
              </ModalTitle>
            </div>

            <ModalContent $color="#6b7280" style={{ fontSize: '0.9375rem' }}>
              Jednoduchý, minimalistický design bez zbytečných dekorací.
              Soustředění na obsah a čitelnost.
            </ModalContent>

            <ModalActions>
              <Button
                $padding="0.5rem 1.25rem"
                $border="none"
                $borderRadius="6px"
                $background="#f3f4f6"
                $color="#374151"
                $fontWeight={500}
                $fontSize="0.875rem"
              >
                Zrušit
              </Button>
              <Button
                $padding="0.5rem 1.25rem"
                $border="none"
                $borderRadius="6px"
                $background="#dc2626"
                $color="white"
                $fontWeight={500}
                $fontSize="0.875rem"
              >
                Potvrdit
              </Button>
            </ModalActions>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 4: CARD-ELEVATED */}
        <DesignCard $borderColor="#f59e0b">
          <DesignTitle $color="#fbbf24" $borderColor="#f59e0b">
            CARD-ELEVATED (Kartový zvýšený)
          </DesignTitle>

          <ModalPreview
            $borderRadius="20px"
            $padding="0"
            $boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            $border="none"
            $overflow="hidden"
          >
            <div style={{ background: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <IconCircle
                  $borderRadius="16px"
                  $background="linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                  $color="#d97706"
                  $boxShadow="0 4px 6px -1px rgba(217, 119, 6, 0.1)"
                  style={{ width: '56px', height: '56px', fontSize: '1.75rem' }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </IconCircle>
                <div>
                  <ModalTitle $color="#0f172a" style={{ fontSize: '1.375rem' }}>
                    Potvrzení akce
                  </ModalTitle>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                    Důležité rozhodnutí
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: '2rem' }}>
              <ModalContent $color="#475569" style={{ fontSize: '1rem', lineHeight: '1.7' }}>
                Elegantní kartový design s výrazným stínem a detailním headerem.
                Premium pocit a profesionální vzhled.
              </ModalContent>

              <ModalActions>
                <Button
                  $padding="0.875rem 1.75rem"
                  $border="2px solid #e2e8f0"
                  $borderRadius="12px"
                  $background="white"
                  $color="#475569"
                >
                  Zrušit
                </Button>
                <Button
                  $padding="0.875rem 1.75rem"
                  $border="none"
                  $borderRadius="12px"
                  $background="#dc2626"
                  $color="white"
                  $boxShadow="0 4px 6px -1px rgba(220, 38, 38, 0.25)"
                >
                  Potvrdit
                </Button>
              </ModalActions>
            </div>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 5: DARK-CONTRAST */}
        <DesignCard $borderColor="#ec4899">
          <DesignTitle $color="#f9a8d4" $borderColor="#ec4899">
            DARK-CONTRAST (Tmavý kontrastní)
          </DesignTitle>

          <ModalPreview
            $background="#1e293b"
            $boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.5)"
            $border="1px solid #334155"
          >
            <ModalHeader>
              <IconCircle
                $background="rgba(239, 68, 68, 0.2)"
                $border="2px solid #ef4444"
                $color="#f87171"
                style={{ width: '52px', height: '52px' }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </IconCircle>
              <ModalTitle $color="#f1f5f9">Potvrzení akce</ModalTitle>
            </ModalHeader>

            <ModalContent $color="#cbd5e1">
              Tmavý režim s vysokým kontrastem. Ideální pro aplikace
              s dark mode nebo pro noční použití.
            </ModalContent>

            <ModalActions>
              <Button
                $border="2px solid #475569"
                $background="#0f172a"
                $color="#cbd5e1"
              >
                Zrušit
              </Button>
              <Button
                $border="2px solid #ef4444"
                $background="#ef4444"
                $color="white"
              >
                Potvrdit
              </Button>
            </ModalActions>
          </ModalPreview>
        </DesignCard>

        {/* NÁVRH 6: GLASS-MORPHISM */}
        <DesignCard $borderColor="#06b6d4">
          <DesignTitle $color="#22d3ee" $borderColor="#06b6d4">
            GLASS-MORPHISM (Skleněný morfismus)
          </DesignTitle>

          <ModalPreview
            $background="rgba(255, 255, 255, 0.95)"
            $borderRadius="16px"
            $boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.37)"
            $border="1px solid rgba(255, 255, 255, 0.18)"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            <ModalHeader>
              <IconCircle
                $background="rgba(220, 38, 38, 0.1)"
                $border="2px solid rgba(220, 38, 38, 0.3)"
                $color="#dc2626"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </IconCircle>
              <ModalTitle>Potvrzení akce</ModalTitle>
            </ModalHeader>

            <ModalContent>
              Moderní glassmorphism efekt s průhledností a rozmazáním.
              Trendy design s hloubkou a vrstvením.
            </ModalContent>

            <ModalActions>
              <Button
                $border="2px solid rgba(209, 213, 219, 0.5)"
                $background="rgba(255, 255, 255, 0.8)"
                $backdropFilter="blur(10px)"
                $color="#6b7280"
              >
                Zrušit
              </Button>
              <Button
                $border="2px solid rgba(220, 38, 38, 0.5)"
                $background="rgba(220, 38, 38, 0.9)"
                $backdropFilter="blur(10px)"
                $color="white"
              >
                Potvrdit
              </Button>
            </ModalActions>
          </ModalPreview>
        </DesignCard>
      </Grid>

      <TipsSection>
        <TipsTitle>💡 Tip pro výběr:</TipsTitle>
        <TipsList>
          <li><strong>CURRENT-STYLE:</strong> Zachováme současný vzhled, jen jej zrefaktorujeme</li>
          <li><strong>GRADIENT-MODERN-RED (Kompaktní) ⭐:</strong> Červený gradient pro kritické confirm dialogy - smazání, ztráta dat</li>
          <li><strong>GRADIENT-MODERN-RED (S dodatečnými info) ⭐:</strong> Červený gradient pro složité varování se všemi detaily</li>
          <li><strong>GRADIENT-MODERN-GREEN (Kompaktní) ℹ️:</strong> Zelený gradient pro informační/success dialogy - uložení, potvrzení</li>
          <li><strong>GRADIENT-MODERN-GREEN (S dodatečnými info) ℹ️:</strong> Zelený gradient s detailními info o provedených akcích</li>
          <li><strong>MINIMAL-CLEAN:</strong> Nejjednodušší, bez dekorací - rychlé načítání, univerzální</li>
          <li><strong>CARD-ELEVATED:</strong> Premium, elegantní - pro business aplikace</li>
          <li><strong>DARK-CONTRAST:</strong> Pro dark mode nebo večerní práci</li>
          <li><strong>GLASS-MORPHISM:</strong> Trendy, moderní - efektní ale může být náročnější na výkon</li>
        </TipsList>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '2px solid #86efac' }}>
          <strong style={{ color: '#166534' }}>🎨 Barevná strategie:</strong>
          <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', color: '#15803d' }}>
            <li><strong>Červená (#dc2626):</strong> Varování, smazání, ztráta dat, kritické akce</li>
            <li><strong>Zelená (#10b981):</strong> Info, úspěch, potvrzení, nekritické akce</li>
          </ul>
        </div>
      </TipsSection>
    </Container>
  );
};

export default ModalStylesPanel;
