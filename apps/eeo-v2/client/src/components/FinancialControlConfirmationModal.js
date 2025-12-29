import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { pdf } from '@react-pdf/renderer';
import FinancialControlPDF from './FinancialControlPDF';
import { getOrganizaceDetail } from '../services/apiv2Dictionaries';
import { getStrediska25 } from '../services/api25orders';
import { uploadOrderAttachment } from '../services/apiOrderV2';
import { getUserDetail } from '../services/apiEntityDetail';

// Styled components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 0;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ModalContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f9fafb;
`;

const PDFPreview = styled.div`
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
  }
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  gap: 20px;
  min-height: 400px;
  background: #f9fafb;

  svg {
    font-size: 4rem;
    color: #059669;
    animation: spin 1s linear infinite;
  }

  .main-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: #374151;
    text-align: center;
  }

  .sub-text {
    font-size: 1rem;
    color: #6b7280;
    text-align: center;
    margin-top: 8px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const ModalFooter = styled.div`
  padding: 20px 24px;
  border-top: 2px solid #e5e7eb;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #1e40af;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonCancel = styled(Button)`
  background: #f3f4f6;
  color: #374151;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

const ButtonConfirm = styled(Button)`
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);
  }
`;

/**
 * Modal pro potvrzení dokončení objednávky s náhledem finanční kontroly
 * 
 * @param {Object} order - Objednávka s kompletními daty
 * @param {Function} onConfirm - Callback pro potvrzení (uloží PDF + dokončí objednávku)
 * @param {Function} onCancel - Callback pro zrušení (odškrtne checkbox + uloží bez dokončení)
 * @param {Object} generatedBy - Informace o generátorovi {fullName, position}
 * @param {string} token - JWT token
 * @param {string} username - Username
 */
const FinancialControlConfirmationModal = ({ 
  order, 
  onConfirm, 
  onCancel, 
  generatedBy,
  token,
  username
}) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [organizace, setOrganizace] = useState(null);
  const [strediskaMap, setStrediskaMap] = useState({});

  // Generování PDF náhledu při otevření
  useEffect(() => {
    const generatePreview = async () => {
      try {
        setIsLoading(true);

        // 📋 Načtení vizitky organizace (ID=1 - hlavní organizace)
        let orgData = null;
        try {
          const orgResponse = await getOrganizaceDetail({ token, username, id: 1 });
          orgData = orgResponse;
        } catch (orgError) {
          console.warn('Nepodařilo se načíst vizitku organizace:', orgError);
        }

        // 🏢 Načtení středisek pro převod kódů na názvy
        let strediska = {};
        try {
          const strediskaData = await getStrediska25({ token, username, aktivni: 1 });
          if (Array.isArray(strediskaData)) {
            strediska = strediskaData.reduce((acc, s) => {
              if (s.kod_strediska) {
                acc[s.kod_strediska] = s.nazev_strediska || s.kod_strediska;
              }
              return acc;
            }, {});
          }
        } catch (strediskaError) {
          console.warn('Nepodařilo se načíst střediska:', strediskaError);
        }

        setOrganizace(orgData);
        setStrediskaMap(strediska);

        // � Načtení uživatelů pro faktury s věcnou kontrolou
        const enrichedFaktury = [];
        if (order.faktury && Array.isArray(order.faktury)) {
          for (const faktura of order.faktury) {
            const enrichedFaktura = { ...faktura };
            
            // Načíst uživatele pro věcnou kontrolu
            if (faktura.potvrdil_vecnou_spravnost_id) {
              try {
                const userData = await getUserDetail(faktura.potvrdil_vecnou_spravnost_id);
                enrichedFaktura.potvrdil_vecnou_spravnost = userData;
              } catch (userError) {
                console.warn('Nepodařilo se načíst uživatele:', userError);
              }
            }
            
            enrichedFaktury.push(enrichedFaktura);
          }
        }

        // 🔧 Mapování dat z OrderForm25 formData na formát očekávaný FinancialControlPDF
        // OrderForm25 má: polozky_objednavky, FinancialControlPDF očekává: polozky
        const orderForPDF = {
          ...order,
          polozky: order.polozky_objednavky || order.polozky || [],
          faktury: enrichedFaktury // Použít faktury s načtenými uživateli
        };

        // Vygenerovat PDF blob
        const blob = await pdf(
          <FinancialControlPDF 
            order={orderForPDF} 
            generatedBy={generatedBy}
            organizace={orgData}
            strediskaMap={strediska}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        
        // Minimální delay pro lepší UX - aby loading nebyl příliš rychlý
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Chyba při generování náhledu finanční kontroly:', error);
        alert('Chyba při generování náhledu finanční kontroly');
        setIsLoading(false);
      }
    };

    generatePreview();
  }, [order, generatedBy, token, username]);

  // Cleanup PDF URL při unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        console.log('🧹 Cleaning up PDF URL...');
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // ✅ POTVRDIT - Vrátit PDF data parent komponentě pro upload
  const handleConfirm = async () => {
    try {
      setIsSaving(true);

      // � Načtení uživatelů pro faktury s věcnou kontrolou (stejně jako v generatePreview)
      const enrichedFaktury = [];
      if (order.faktury && Array.isArray(order.faktury)) {
        for (const faktura of order.faktury) {
          const enrichedFaktura = { ...faktura };
          
          // Načíst uživatele pro věcnou kontrolu
          if (faktura.potvrdil_vecnou_spravnost_id) {
            try {
              const userData = await getUserDetail(faktura.potvrdil_vecnou_spravnost_id);
              enrichedFaktura.potvrdil_vecnou_spravnost = userData;
            } catch (userError) {
              console.warn('Nepodařilo se načíst uživatele:', userError);
            }
          }
          
          enrichedFaktury.push(enrichedFaktura);
        }
      }

      // 🔧 Mapování dat z OrderForm25 formData na formát očekávaný FinancialControlPDF
      const orderForPDF = {
        ...order,
        polozky: order.polozky_objednavky || order.polozky || [],
        faktury: enrichedFaktury // Použít faktury s načtenými uživateli
      };

      // 1. Vygenerovat PDF jako File
      const blob = await pdf(
        <FinancialControlPDF 
          order={orderForPDF} 
          generatedBy={generatedBy}
          organizace={organizace}
          strediskaMap={strediskaMap}
        />
      ).toBlob();

      // 2. Vytvořit název souboru: "Financni_kontrola_YYYY-MM-DD_cislo_obj.pdf"
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const orderNumber = (order.cislo_objednavky || 'neznama').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Financni_kontrola_${dateStr}_${orderNumber}.pdf`;

      const pdfFile = new File([blob], filename, { type: 'application/pdf' });

      console.log('✅ PDF vygenerováno, předávám parent komponentě...');

      // 3. Předat PDF parent komponentě a OKAMŽITĚ zavřít modal
      onConfirm(pdfFile);
      
      // Modal je nyní zavřený, parent pokračuje asynchronně na pozadí

    } catch (error) {
      console.error('❌ Chyba při generování PDF:', error);
      alert(`Chyba při generování PDF: ${error.message || error}`);
      setIsSaving(false);
    }
  };

  // ❌ ZRUŠIT - Odškrtnout checkbox + uložit bez DOKONCENA
  const handleCancel = () => {
    onCancel();
  };

  // Zavření na ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSaving]);

  return createPortal(
    <ModalOverlay 
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving && !isLoading) handleCancel(); }}
    >
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            📋 Finanční kontrola - Potvrzení dokončení objednávky
          </ModalTitle>
          
          <CloseButton 
            onClick={handleCancel} 
            disabled={isSaving || isLoading}
            title="Zavřít (ESC)"
          >
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </ModalHeader>

        <ModalContent>
          {isLoading ? (
            <LoadingContainer>
              <FontAwesomeIcon icon={faSpinner} spin />
              <div className="main-text">Generuji finanční kontrolu...</div>
              <div className="sub-text">
                Prosím počkejte, dokument se připravuje<br />
                Načítám data a vytvářím PDF náhled
              </div>
            </LoadingContainer>
          ) : (
            <PDFPreview>
              <iframe 
                src={pdfUrl} 
                title="Náhled finanční kontroly"
                id="pdf-preview-iframe"
              />
            </PDFPreview>
          )}
        </ModalContent>

        <ModalFooter>
          <InfoBox>
            ℹ️ <strong>Před dokončením objednávky zkontrolujte finanční kontrolu.</strong>
            <br />
            Po potvrzení bude dokument automaticky uložen jako příloha objednávky s klasifikací "Kontrolka" 
            a objednávka bude označena jako DOKONČENÁ (nelze již editovat).
          </InfoBox>

          <ButtonGroup>
            <ButtonCancel 
              onClick={handleCancel}
              disabled={isSaving}
            >
              <FontAwesomeIcon icon={faTimesCircle} />
              Zrušit dokončení
            </ButtonCancel>

            <ButtonConfirm 
              onClick={handleConfirm}
              disabled={isLoading || isSaving}
            >
              {isSaving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Ukládám...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Potvrdit a dokončit objednávku
                </>
              )}
            </ButtonConfirm>
          </ButtonGroup>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

export default FinancialControlConfirmationModal;
