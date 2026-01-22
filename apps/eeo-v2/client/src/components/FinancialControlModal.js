import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFileDownload, faPrint, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { pdf } from '@react-pdf/renderer';
import FinancialControlPDF from './FinancialControlPDF';
import { AuthContext } from '../context/AuthContext';
import { getOrganizaceDetail } from '../services/apiv2Dictionaries';
import { getStrediska25 } from '../services/api25orders';
import { getFakturaLPCerpani } from '../services/apiFakturyLPCerpani';
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
  border-radius: 12px 12px 0 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  background: ${props => props.variant === 'primary' ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.variant === 'primary' ? '#059669' : '#ffffff'};

  &:hover {
    background: ${props => props.variant === 'primary' ? '#f0fdf4' : 'rgba(255, 255, 255, 0.3)'};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
`;

const IframeContainer = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  position: relative;
`;

const PDFIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const LoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(249, 250, 251, 0.95);
  z-index: 10;
`;

const LoadingText = styled.p`
  margin-top: 16px;
  font-size: 1.1rem;
  color: #6b7280;
  font-weight: 500;
`;

const SpinnerIcon = styled(FontAwesomeIcon)`
  font-size: 3rem;
  color: #059669;
  animation: spin 1s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

/**
 * Modal pro náhled a generování PDF finanční kontroly
 * 
 * @param {Object} order - Objednávka s kompletními daty
 * @param {Function} onClose - Callback pro zavření modalu
 * @param {Object} generatedBy - Informace o generátorovi {fullName, position}
 */
const FinancialControlModal = ({ order, onClose, generatedBy }) => {
  const { token, username } = useContext(AuthContext);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizace, setOrganizace] = useState(null);
  const [strediskaMap, setStrediskaMap] = useState({});

  // Generování PDF při otevření
  useEffect(() => {
    const generatePDF = async () => {
      try {
        setIsLoading(true);
        
        // 📋 Načtení vizitky organizace (ID=1 - hlavní organizace)
        let orgData = null;
        try {
          orgData = await getOrganizaceDetail({ token, username, id: 1 });
          setOrganizace(orgData);
        } catch (error) {
          console.error('Nepodařilo se načíst vizitku organizace:', error);
        }

        // 🏛️ Načtení středisek pro mapování kód → název
        let strediskaData = {};
        try {
          const strediskaList = await getStrediska25({ token, username, aktivni: null }); // null = všechna střediska
          
          // Vytvoříme mapu: value -> label (celý kód střediska)
          // API vrací hierarchickou strukturu s 'value' a 'label' 
          // JEDNODUŠE: value = "102_RLP_RAKOVNIK", label = "RLP Rakovník"
          strediskaData = strediskaList.reduce((acc, stredisko) => {
            if (stredisko.value && stredisko.label) {
              acc[stredisko.value] = stredisko.label;
            }
            return acc;
          }, {});
          setStrediskaMap(strediskaData);
        } catch (error) {
          console.error('Nepodařilo se načíst střediska:', error);
        }
        

        // �🔥 NAČTENÍ LP ČERPÁNÍ PRO FAKTURY (stejně jako v FinancialControlConfirmationModal)
        const enrichedFaktury = [];
        if (order.faktury && Array.isArray(order.faktury)) {
          for (const faktura of order.faktury) {
            const enrichedFaktura = { ...faktura };
            
            // Načíst uživatele pro věcnou kontrolu
            if (faktura.potvrdil_vecnou_spravnost_id) {
              try {
                const userData = await getUserDetail(faktura.potvrdil_vecnou_spravnost_id);
                enrichedFaktura.potvrdil_vecnou_spravnost = userData;
              } catch (err) {
                console.warn('Nepodařilo se načíst uživatele:', err);
              }
            }
            
            // 🔥 OPRAVA: Načíst LP čerpání pro fakturu
            if (faktura.id && !String(faktura.id).startsWith('temp-')) {
              try {
                const lpResponse = await getFakturaLPCerpani(faktura.id, token, username);
                // API vrací {status: 'ok', data: {faktura_id, lp_cerpani: [...], suma, fa_castka}}
                enrichedFaktura.lp_cerpani = lpResponse?.data?.lp_cerpani || [];
              } catch (err) {
                console.warn(`Nepodařilo se načíst LP čerpání pro fakturu ${faktura.id}:`, err);
                enrichedFaktura.lp_cerpani = [];
              }
            }
            
            enrichedFaktury.push(enrichedFaktura);
          }
        }
        
        // Mapování dat pro PDF s enrichovanými fakturami  
        const orderForPDF = {
          ...order,
          polozky: order.polozky_objednavky || order.polozky || [],
          faktury: enrichedFaktury
        };
        
        // Vytvoření PDF dokumentu
        const blob = await pdf(
          <FinancialControlPDF
            order={orderForPDF}
            generatedBy={generatedBy}
            organizace={orgData}
            strediskaMap={strediskaData}
          />
        ).toBlob();

        // Vytvoření URL pro iframe
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        console.error('Chyba při generování PDF náhledu:', error);
        alert('Chyba při generování PDF náhledu');
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    generatePDF();

    // Cleanup - uvolnění URL při unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [order, generatedBy]);

  // Stažení PDF
  const handleDownload = async () => {
    try {
      // Znovu načíst enrichovaná data pro download (order se mohl změnit)

      const enrichedFaktury = [];
      if (order.faktury && Array.isArray(order.faktury)) {
        for (const faktura of order.faktury) {
          const enrichedFaktura = { ...faktura };
          
          if (faktura.potvrdil_vecnou_spravnost_id) {
            try {
              const userData = await getUserDetail(faktura.potvrdil_vecnou_spravnost_id);
              enrichedFaktura.potvrdil_vecnou_spravnost = userData;
            } catch (err) {
              console.warn('Nepodařilo se načíst uživatele:', err);
            }
          }
          
          if (faktura.id && !String(faktura.id).startsWith('temp-')) {
            try {
              const lpResponse = await getFakturaLPCerpani(faktura.id, token, username);
              enrichedFaktura.lp_cerpani = lpResponse?.data?.lp_cerpani || [];
            } catch (err) {
              console.warn(`Nepodařilo se načíst LP čerpání pro fakturu ${faktura.id}:`, err);
              enrichedFaktura.lp_cerpani = [];
            }
          }
          
          enrichedFaktury.push(enrichedFaktura);
        }
      }
      
      const orderForPDF = {
        ...order,
        polozky: order.polozky_objednavky || order.polozky || [],
        faktury: enrichedFaktury
      };
      
      const blob = await pdf(
        <FinancialControlPDF
          order={orderForPDF}
          generatedBy={generatedBy}
          organizace={organizace}
          strediskaMap={strediskaMap}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financni-kontrola-${order?.cislo_objednavky || 'dokument'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Chyba při stahování PDF:', error);
      alert('Chyba při stahování PDF');
    }
  };

  // Tisk PDF
  const handlePrint = () => {
    if (pdfUrl) {
      const iframe = document.getElementById('pdf-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
      }
    }
  };

  // Zavření na ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            📋 Finanční kontrola - {order?.cislo_objednavky || 'Náhled'}
          </ModalTitle>
          
          <ModalActions>
            <ActionButton
              variant="secondary"
              onClick={handleDownload}
              disabled={isLoading}
              title="Stáhnout PDF"
            >
              <FontAwesomeIcon icon={faFileDownload} />
              Stáhnout
            </ActionButton>
            
            <ActionButton
              variant="primary"
              onClick={handlePrint}
              disabled={isLoading}
              title="Vytisknout PDF"
            >
              <FontAwesomeIcon icon={faPrint} />
              Tisknout
            </ActionButton>

            <CloseButton onClick={onClose} title="Zavřít (ESC)">
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </ModalActions>
        </ModalHeader>

        <ModalBody>
          <IframeContainer>
            {isLoading && (
              <LoadingContainer>
                <SpinnerIcon icon={faSpinner} />
                <LoadingText>Generuji PDF náhled...</LoadingText>
              </LoadingContainer>
            )}
            
            {pdfUrl && (
              <PDFIframe
                id="pdf-iframe"
                src={pdfUrl}
                title="PDF Náhled - Finanční kontrola"
              />
            )}
          </IframeContainer>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

export default FinancialControlModal;
