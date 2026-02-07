import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faFileWord,
  faDownload,
  faSpinner,
  faCheck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { getDocxSablonyList } from '../services/apiv2Dictionaries';
import { getOrderV2 } from '../services/apiOrderV2'; // ✅ V2 API
import { getDocxOrderData } from '../services/apiDocxOrders';
// ✅ NOVÝ DYNAMICKÝ SYSTÉM - používá POUZE mapování z DB (mapovani_json)
import { generateDocxDocument, downloadGeneratedDocx } from '../utils/docx/newDocxGenerator';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  cursor: default; /* Indikace, že klik neudělá nic */
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: between;
  align-items: center;

  h2 {
    margin: 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f1f5f9;
    color: #374151;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const OrderInfo = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;

  h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 1rem;
    font-weight: 600;
  }

  p {
    margin: 0.25rem 0;
    color: #64748b;
    font-size: 0.875rem;
  }
`;

const TemplatesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TemplateItem = styled.div`
  border: 2px solid ${props => props.$selected ? '#3b82f6' : '#e2e8f0'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$selected ? '#eff6ff' : 'white'};

  &:hover {
    border-color: ${props => props.$selected ? '#3b82f6' : '#cbd5e1'};
    background: ${props => props.$selected ? '#eff6ff' : '#f8fafc'};
  }

  h4 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
    font-size: 1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  p {
    margin: 0.25rem 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  .meta {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 0.5rem;
  }
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: white;
  border: 1px solid #e2e8f0;
  color: #64748b;

  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
`;

const GenerateButton = styled(Button)`
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;

  .spinner {
    margin-bottom: 1rem;
    font-size: 2rem;
    color: #3b82f6;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc2626;

  .icon {
    margin-bottom: 1rem;
    font-size: 2rem;
  }
`;

const NoTemplatesMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;

  .icon {
    margin-bottom: 1rem;
    font-size: 2rem;
  }
`;

export const DocxGeneratorModal = ({ order, isOpen, onClose }) => {
  const { user, token } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Načtení šablon při otevření modalu
  useEffect(() => {
    if (isOpen && order) {
      loadTemplates();
    }
  }, [isOpen, order]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getDocxSablonyList({
        token,
        username: user?.username,
        aktivni: 1 // Pouze aktivní šablony, ale VŠECHNY typy (objednávka, košilka, atd.)
        // NEFILTRUJEME typ_dokumentu - bereme všechny typy šablon
      });

      console.log('📄 DOCX Templates Response:', {
        success: response?.success,
        dataLength: response?.data?.length,
        data: response?.data,
        rawResponse: response
      });

      const templates = response?.data || [];
      setTemplates(templates);

      if (templates.length === 0) {
        setError('V databázi nejsou k dispozici žádné aktivní DOCX šablony');
      } else {
        // Automaticky vyber první šablonu pokud je jen jedna
        if (templates.length === 1) {
          setSelectedTemplate(templates[0]);
        }
      }

    } catch (error) {
      setError(`Nepodařilo se načíst seznam DOCX šablon: ${error.message}`);
      showToast?.(`Chyba při načítání DOCX šablon: ${error.message}`, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocx = async () => {
    if (!selectedTemplate || !order) return;

    try {
      setGenerating(true);

      // KRITICKÉ: Detekuj ID objednávky (různé možné názvy)
      const orderId = order.id || order.objednavka_id || order.order_id || order.ID || order.OBJEDNAVKA_ID;

      if (!orderId) {
        console.error('❌ Chybí ID objednávky:', {
          availableFields: Object.keys(order),
          orderData: order
        });
        throw new Error('Chybí ID objednávky. Dostupná pole: ' + Object.keys(order).join(', '));
      }

        order_id: orderId,
        cislo_objednavky: order.cislo_objednavky,
        availableFields: Object.keys(order)
      });

      // NOVÉ API: Načti DOCX-optimalizovaná data objednávky z nového BE endpointu
      let fullOrderData;

      try {
        // POUZE NOVÉ DOCX API - už není fallback na staré API
        fullOrderData = await getDocxOrderData({
          token: token,
          username: user?.username,
          objednavka_id: orderId
        });

          struktura: 'vnořené objekty s tečkovou notací',
          cislo_objednavky: fullOrderData.cislo_objednavky,
          predmet: fullOrderData.predmet,
          objednatel_username: fullOrderData.objednatel?.username,
          objednatel_plne_jmeno: fullOrderData.objednatel?.plne_jmeno,
          dodavatel_nazev: fullOrderData.dodavatel?.nazev,
          dodavatel_ico: fullOrderData.dodavatel?.ico,
          garant_plne_jmeno: fullOrderData.garant?.plne_jmeno,
          pocet_polozek: fullOrderData.polozky?.length || 0,
          pocet_priloh: fullOrderData.prilohy?.length || 0,
          celkova_cena: fullOrderData.celkova_cena_s_dph,
          dataKeys: Object.keys(fullOrderData).slice(0, 20).join(', ')
        });

      } catch (docxError) {
        throw new Error(`Nepodařilo se načíst data objednávky z DOCX API: ${docxError.message}`);
      }

      // DYNAMICKÉ MAPOVÁNÍ: Zkontroluj, jestli má šablona definované mapování
      const mappingSource = selectedTemplate.docx_mapping || selectedTemplate.mapovani_json;
      const hasMapping = mappingSource && (
        typeof mappingSource === 'string'
          ? mappingSource !== '{}' && mappingSource.trim() !== ''
          : Object.keys(mappingSource).length > 0
      );

      console.log('📄 Připravuji generování DOCX:', {
        template: selectedTemplate.nazev,
        order_id: fullOrderData.cislo_objednavky || fullOrderData.id,
        hasMapping: hasMapping,
        mappingType: typeof mappingSource
      });

      // === NOVÝ SYSTÉM - Použij kompletně nový DOCX generátor ===

      const generatedDocx = await generateDocxDocument({
        templateId: selectedTemplate.id,
        orderId: orderId,
        token: token,
        username: user?.username,
        template: selectedTemplate
      });

      // Stáhni vygenerovaný dokument - odstraň "(šablona)" z názvu (včetně variant s/bez diakritiky)
      const templateName = selectedTemplate.nazev
        .replace(/\s*\([^\)]*[šsŠS][aáAÁ][bB][lL][oóOÓ][nňNŇ][aáAÁ][^\)]*\)\s*/gi, '') // Odstraň (šablona)/(sablona) všude
        .replace(/\s+/g, ' ')
        .trim();
      const fileName = `objednavka_${fullOrderData.cislo_objednavky || orderId}_${templateName}.docx`;
      downloadGeneratedDocx(generatedDocx, fileName);

      showToast?.(
        `📄 DOCX dokument "${selectedTemplate.nazev}" byl úspěšně vygenerován novým systémem a stažen`,
        { type: 'success' }
      );

      onClose();

    } catch (error) {
      showToast?.(
        `Chyba při generování DOCX dokumentu: ${error.message}`,
        { type: 'error' }
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalOverlay>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h2>
            <FontAwesomeIcon icon={faFileWord} />
            Generovat DOCX dokument
          </h2>
          <CloseButton onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <OrderInfo>
            <h3>Objednávka</h3>
            <p><strong>ID:</strong> {order?.id || order?.objednavka_id || order?.order_id || order?.ID || order?.OBJEDNAVKA_ID || 'CHYBÍ ID!'}</p>
            <p><strong>Číslo:</strong> {order?.cislo_objednavky || order?.id || 'N/A'}</p>
            <p><strong>Název:</strong> {order?.nazev || 'Bez názvu'}</p>
            <p><strong>Stav:</strong> {order?.nazev_stavu || 'N/A'}</p>
            <p><strong>Celková cena:</strong> {order?.celkova_cena ? `${order.celkova_cena} Kč` : 'N/A'}</p>
          </OrderInfo>

          {loading && (
            <LoadingMessage>
              <div className="spinner">
                <FontAwesomeIcon icon={faSpinner} />
              </div>
              <p>Načítám DOCX šablony...</p>
            </LoadingMessage>
          )}

          {error && (
            <ErrorMessage>
              <div className="icon">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <p>{error}</p>
            </ErrorMessage>
          )}

          {!loading && !error && templates.length === 0 && (
            <NoTemplatesMessage>
              <div className="icon">
                <FontAwesomeIcon icon={faFileWord} />
              </div>
              <p>Nejsou k dispozici žádné aktivní DOCX šablony</p>
            </NoTemplatesMessage>
          )}

          {!loading && !error && templates.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
                Vyberte DOCX šablonu ({templates.length})
              </h3>
              <TemplatesList>
                {templates.map(template => (
                  <TemplateItem
                    key={template.id}
                    $selected={selectedTemplate?.id === template.id}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <h4>
                      <FontAwesomeIcon icon={faFileWord} />
                      {template.nazev || `Šablona ${template.id}`}
                    </h4>
                    {template.popis && <p>{template.popis}</p>}
                    <div className="meta">
                      ID: {template.id} |
                      Typ: {template.typ_dokumentu || 'N/A'} |
                      Vytvořeno: {template.created_at ? new Date(template.created_at).toLocaleDateString('cs-CZ') : 'N/A'}
                    </div>
                  </TemplateItem>
                ))}
              </TemplatesList>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose}>
            Zrušit
          </CancelButton>
          <GenerateButton
            onClick={handleGenerateDocx}
            disabled={!selectedTemplate || generating}
          >
            {generating ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                Generuji...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDownload} />
                Generovat DOCX
              </>
            )}
          </GenerateButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};