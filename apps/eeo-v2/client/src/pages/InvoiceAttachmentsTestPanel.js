import React, { useState, useEffect, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoice, faSpinner, faExclamationTriangle, faSave } from '@fortawesome/free-solid-svg-icons';
import { InvoiceAttachmentsCompact } from '../components/invoices';
import { listOrdersV2, getOrderV2 } from '../services/apiOrderV2';
import { updateInvoiceV2, createInvoiceV2 } from '../services/api25invoices';
import { getTypyFaktur25 } from '../services/api25orders';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #3b82f6;
  }
`;

const Description = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const Card = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Section = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
`;

const SelectWrapper = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #6b7280;
  font-size: 14px;
  gap: 12px;

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;

  svg {
    flex-shrink: 0;
  }
`;

const OrderInfo = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #374151;
  min-width: 120px;
`;

const InfoValue = styled.span`
  color: #6b7280;
`;

const InvoicesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InvoiceCard = styled.div`
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  }
`;

const InvoiceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
`;

const InvoiceTitle = styled.h4`
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const InvoiceType = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 12px;
  font-weight: 600;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: #9ca3af;
  font-size: 14px;
`;

const InvoiceFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.full-width {
    grid-column: 1 / -1;
  }
`;

const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #1f2937;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SaveButton = styled.button`
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ValidationWarning = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #92400e;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const ValidationTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const ValidationText = styled.div`
  color: #78350f;
`;

const InvoiceAttachmentsTestPanel = () => {
  const { token, username } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [fakturaTypyPrilohOptions, setFakturaTypyPrilohOptions] = useState([]);
  const [editingFaktura, setEditingFaktura] = useState({});
  const [savingFaktura, setSavingFaktura] = useState(false);

  // Načtení posledních 5 objednávek
  useEffect(() => {
    const fetchOrders = async () => {
      if (!token || !username) {
        setError('Uživatel není přihlášen');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await listOrdersV2(
          {
            limit: 5,
            sortBy: 'datum_vytvoreni',
            sortOrder: 'desc'
          },
          token,
          username
        );

        if (response && Array.isArray(response)) {
          setOrders(response);
        } else if (response && response.orders) {
          setOrders(response.orders);
        }
      } catch (err) {
        console.error('Chyba při načítání objednávek:', err);
        setError('Nepodařilo se načíst objednávky: ' + (err.message || 'Neznámá chyba'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, username]);

  // Načtení detailu vybrané objednávky
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!selectedOrderId) {
        setSelectedOrder(null);
        return;
      }

      if (!token || !username) {
        setError('Uživatel není přihlášen');
        return;
      }

      try {
        setLoadingOrder(true);
        setError(null);
        
        const orderData = await getOrderV2(selectedOrderId, token, username);
        
        if (orderData) {
          // Ujistit se, že máme pole faktur
          if (!orderData.faktury) {
            orderData.faktury = [];
          }
          
          // Pro každou fakturu zajistit pole příloh a správná data
          orderData.faktury = orderData.faktury.map(faktura => ({
            ...faktura,
            attachments: faktura.attachments || [],
            // Zajistit, že fa_splatnost obsahuje datum splatnosti
            fa_splatnost: faktura.fa_datum_splatnosti || faktura.fa_splatnost || ''
          }));

          // 🆕 Pokud objednávka nemá žádnou fakturu, vytvořit temporary placeholder
          if (orderData.faktury.length === 0) {
            orderData.faktury.push({
              id: `temp-${Date.now()}`,
              order_id: orderData.id,
              fa_cislo_vema: '',
              fa_castka: 0,
              fa_datum_vystaveni: '',
              fa_datum_doruceni: '',
              fa_splatnost: '',
              fa_datum_splatnosti: '',
              fa_poznamka: '',
              attachments: [],
              _isTemporary: true
            });
          }
          
          setSelectedOrder(orderData);
        }
      } catch (err) {
        console.error('Chyba při načítání objednávky:', err);
        setError('Nepodařilo se načíst detail objednávky: ' + (err.message || 'Neznámá chyba'));
        setSelectedOrder(null);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrderDetail();
  }, [selectedOrderId, token, username]);

  // Načtení klasifikací z databáze
  useEffect(() => {
    const loadClassifications = async () => {
      try {
        const types = await getTypyFaktur25({ token, username, aktivni: 1 });
        setFakturaTypyPrilohOptions(types);
      } catch (error) {
        console.error('Chyba načítání klasifikací:', error);
        showToast('Chyba načítání klasifikací', { type: 'error' });
      }
    };

    if (token && username) {
      loadClassifications();
    }
  }, [token, username, showToast]);  const handleOrderChange = (e) => {
    setSelectedOrderId(e.target.value);
    setEditingFaktura({}); // Reset editace při změně objednávky
  };

  const handleFakturaFieldChange = (fakturaId, fieldName, value) => {
    setEditingFaktura(prev => ({
      ...prev,
      [fakturaId]: {
        ...(prev[fakturaId] || {}),
        [fieldName]: value
      }
    }));
  };

  // Vytvoření nové faktury v DB
  const handleCreateFaktura = async (fakturaData) => {
    if (!token || !username || !selectedOrder) {
      showToast('Chybí autentizace nebo objednávka', { type: 'error' });
      return null;
    }

    try {
      setSavingFaktura(true);
      
      const newInvoice = await createInvoiceV2({
        token,
        username,
        order_id: selectedOrder.id,
        fa_cislo_vema: fakturaData.fa_cislo_vema || 'NEUVEDENO',
        fa_datum_vystaveni: fakturaData.fa_datum_vystaveni || new Date().toISOString().split('T')[0],
        fa_castka: fakturaData.fa_castka || 0,
        fa_datum_splatnosti: fakturaData.fa_splatnost || fakturaData.fa_datum_splatnosti || null,
        fa_datum_doruceni: fakturaData.fa_datum_doruceni || null,
        fa_poznamka: fakturaData.fa_poznamka || null
      });

      // Aktualizovat lokální stav s novou fakturou
      setSelectedOrder(prev => ({
        ...prev,
        faktury: [...(prev.faktury || []), {
          ...newInvoice,
          attachments: [],
          fa_splatnost: newInvoice.fa_datum_splatnosti || ''
        }]
      }));

      showToast('Faktura byla vytvořena', { type: 'success' });
      return newInvoice;
    } catch (err) {
      console.error('Chyba při vytváření faktury:', err);
      showToast('Nepodařilo se vytvořit fakturu: ' + (err.message || 'Neznámá chyba'), { type: 'error' });
      return null;
    } finally {
      setSavingFaktura(false);
    }
  };

  const handleSaveFaktura = async (faktura) => {
    if (!token || !username) {
      showToast('Uživatel není přihlášen', { type: 'error' });
      return;
    }

    // Pokud faktura nemá ID nebo má dočasné ID, vytvoř ji
    if (!faktura.id || String(faktura.id).startsWith('temp-')) {
      const editedData = editingFaktura[faktura.id] || {};
      const fakturaData = { ...faktura, ...editedData };
      return await handleCreateFaktura(fakturaData);
    }

    try {
      setSavingFaktura(true);
      
      const editedData = editingFaktura[faktura.id] || {};
      const updatedData = {
        ...faktura,
        ...editedData
      };

      await updateInvoiceV2(faktura.id, updatedData, token, username);
      
      // Aktualizovat lokální stav
      setSelectedOrder(prev => ({
        ...prev,
        faktury: prev.faktury.map(f =>
          f.id === faktura.id ? updatedData : f
        )
      }));

      // Vymazat editovaná data pro tuto fakturu
      setEditingFaktura(prev => {
        const newState = { ...prev };
        delete newState[faktura.id];
        return newState;
      });

      showToast('Faktura byla úspěšně uložena', { type: 'success' });
      return updatedData;
    } catch (err) {
      console.error('Chyba při ukládání faktury:', err);
      showToast('Nepodařilo se uložit fakturu: ' + (err.message || 'Neznámá chyba'), { type: 'error' });
      return null;
    } finally {
      setSavingFaktura(false);
    }
  };

  const handleInvoiceAttachmentsChange = (fakturaId, newAttachments) => {
    if (!selectedOrder) return;

    setSelectedOrder(prev => ({
      ...prev,
      faktury: prev.faktury.map(faktura =>
        faktura.id === fakturaId
          ? { ...faktura, attachments: newAttachments }
          : faktura
      )
    }));
  };

  const handleInvoiceAttachmentUploaded = async (fakturaId, uploadedAttachment) => {
    if (!selectedOrder) return;

    console.log('📎 handleInvoiceAttachmentUploaded', { fakturaId, uploadedAttachment });

    // Aktualizovat lokální stav s nahranou přílohou
    setSelectedOrder(prev => ({
      ...prev,
      faktury: prev.faktury.map(faktura => {
        // Najít správnou fakturu - buď podle fakturaId nebo pokud má temp-ID
        const isMatch = faktura.id === fakturaId || 
                       (String(faktura.id).startsWith('temp-') && fakturaId);
        
        if (isMatch) {
          return {
            ...faktura,
            id: fakturaId, // Ujistit se, že máme správné ID (už ne temp)
            attachments: [
              ...(faktura.attachments || []).filter(att => 
                att.status !== 'pending_classification' && 
                att.id !== uploadedAttachment.id
              ),
              uploadedAttachment
            ]
          };
        }
        return faktura;
      })
    }));

    // Toast se zobrazuje už v InvoiceAttachmentsCompact komponentě
    // showToast('Příloha byla nahrána', { type: 'success' });
  };

  const validateInvoiceForAttachments = (faktura, file = null) => {
    const missingFields = [];
    
    // Kontrola povinných polí
    if (!faktura.fa_cislo_vema || (typeof faktura.fa_cislo_vema === 'string' && faktura.fa_cislo_vema.trim() === '')) {
      missingFields.push('Číslo faktury VEMA');
    }
    
    if (!faktura.fa_castka || parseFloat(faktura.fa_castka) <= 0) {
      missingFields.push('Částka');
    }
    
    if (!faktura.fa_datum_doruceni || (typeof faktura.fa_datum_doruceni === 'string' && faktura.fa_datum_doruceni.trim() === '')) {
      missingFields.push('Datum doručení');
    }
    
    if (!faktura.fa_splatnost || (typeof faktura.fa_splatnost === 'string' && faktura.fa_splatnost.trim() === '')) {
      missingFields.push('Datum splatnosti');
    }
    
    // Detekce ISDOC souboru
    const isISDOC = file && (
      file.name?.toLowerCase().endsWith('.isdoc') ||
      file.name?.toLowerCase().endsWith('.isdocx') ||
      file.type === 'text/isdoc'
    );

    // Pokud je to ISDOC, povolit upload i bez validních polí (nabídne parsing)
    if (isISDOC) {
      return {
        isValid: true,
        valid: true,
        isISDOC: true,
        missingFields: missingFields, // Informativně
        message: missingFields.length > 0 
          ? 'ISDOC soubor - data lze extrahovat po nahrání' 
          : 'Připraven k nahrání'
      };
    }

    // Pro non-ISDOC soubory vyžadovat vyplněná pole
    if (missingFields.length > 0) {
      return {
        isValid: false,
        valid: false,
        isISDOC: false,
        missingFields: missingFields,
        message: `Pro nahrání přílohy vyplňte nejprve: ${missingFields.join(', ')}`
      };
    }
    
    return { 
      isValid: true,
      valid: true,
      isISDOC: false,
      missingFields: []
    };
  };

  const handleISDOCParsed = (fakturaId, parsedData) => {
    console.log('ISDOC parsed for faktura', fakturaId, parsedData);
    showToast('ISDOC data byla naparsována', { type: 'info' });
  };

  if (loading) {
    return (
      <Container>
        <Card>
          <LoadingState>
            <FontAwesomeIcon icon={faSpinner} />
            Načítám objednávky...
          </LoadingState>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FontAwesomeIcon icon={faFileInvoice} />
          Test faktury a přílohy
        </Title>
        <Description>
          Testovací prostředí pro přidávání a správu příloh k fakturám. 
          Všechny změny se automaticky projeví i v hlavním formuláři objednávky.
        </Description>
      </Header>

      <Card>
        <Section>
          <SectionTitle>1. Výběr objednávky</SectionTitle>
          <SelectWrapper>
            <Label htmlFor="order-select">
              Vyberte objednávku (posledních 5 podle data vytvoření):
            </Label>
            <Select
              id="order-select"
              value={selectedOrderId}
              onChange={handleOrderChange}
              disabled={orders.length === 0}
            >
              <option value="">-- Vyberte objednávku --</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  #{order.id} | {order.predmet || order.nazev || 'Bez názvu'} 
                  {order.datum_vytvoreni ? ` | ${new Date(order.datum_vytvoreni).toLocaleDateString('cs-CZ')}` : ''}
                </option>
              ))}
            </Select>
          </SelectWrapper>

          {orders.length === 0 && !loading && (
            <ErrorState>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>Nenalezeny žádné objednávky</span>
            </ErrorState>
          )}
        </Section>

        {error && (
          <ErrorState>
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{error}</span>
          </ErrorState>
        )}

        {loadingOrder && (
          <LoadingState>
            <FontAwesomeIcon icon={faSpinner} />
            Načítám detail objednávky...
          </LoadingState>
        )}

        {selectedOrder && !loadingOrder && (
          <>
            <Section>
              <SectionTitle>2. Informace o objednávce</SectionTitle>
              <OrderInfo>
                <InfoRow>
                  <InfoLabel>ID:</InfoLabel>
                  <InfoValue>#{selectedOrder.id}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Předmět:</InfoLabel>
                  <InfoValue>{selectedOrder.predmet || 'Nevyplněno'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Název:</InfoLabel>
                  <InfoValue>{selectedOrder.nazev || 'Bez názvu'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Datum vytvoření:</InfoLabel>
                  <InfoValue>
                    {selectedOrder.datum_vytvoreni 
                      ? new Date(selectedOrder.datum_vytvoreni).toLocaleString('cs-CZ')
                      : 'Neznámé'}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Počet faktur:</InfoLabel>
                  <InfoValue>{selectedOrder.faktury?.length || 0}</InfoValue>
                </InfoRow>
              </OrderInfo>
            </Section>

            <Section>
              <SectionTitle>3. Faktury a jejich přílohy</SectionTitle>
              
              {!selectedOrder.faktury || selectedOrder.faktury.length === 0 ? (
                <EmptyState>
                  Tato objednávka zatím nemá žádné faktury.
                  <br />
                  Faktury můžete přidat v hlavním formuláři objednávky.
                </EmptyState>
              ) : (
                <InvoicesList>
                  {selectedOrder.faktury.map((faktura, index) => {
                    const editedFaktura = editingFaktura[faktura.id] || {};
                    const currentValues = { ...faktura, ...editedFaktura };
                    
                    console.log('🔍 Rendering faktura:', { 
                      id: faktura.id, 
                      isTemp: String(faktura.id).startsWith('temp-'),
                      attachmentsCount: faktura.attachments?.length 
                    });
                    
                    return (
                      <InvoiceCard key={faktura.id || index}>
                        <InvoiceHeader>
                          <InvoiceTitle>
                            {faktura._isTemporary ? (
                              'Nová faktura (bude vytvořena při nahrání přílohy)'
                            ) : (
                              <>
                                Faktura #{faktura.id}
                                {faktura.cislo_faktury && ` - ${faktura.cislo_faktury}`}
                              </>
                            )}
                          </InvoiceTitle>
                          <InvoiceType>
                            {faktura._isTemporary ? 'Nová' : (faktura.typ_faktury || 'Běžná')}
                          </InvoiceType>
                        </InvoiceHeader>

                        {/* Formulář pro editaci faktury */}
                        <InvoiceFormGrid>
                          <FormField>
                            <FieldLabel>Číslo faktury VEMA</FieldLabel>
                            <Input
                              type="text"
                              value={currentValues.fa_cislo_vema || ''}
                              onChange={(e) => handleFakturaFieldChange(faktura.id, 'fa_cislo_vema', e.target.value)}
                              placeholder="Např. 2025001"
                            />
                          </FormField>

                          <FormField>
                            <FieldLabel>Částka (Kč)</FieldLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={currentValues.fa_castka || ''}
                              onChange={(e) => handleFakturaFieldChange(faktura.id, 'fa_castka', e.target.value)}
                              placeholder="0.00"
                            />
                          </FormField>

                          <FormField>
                            <FieldLabel>Datum doručení</FieldLabel>
                            <Input
                              type="date"
                              value={currentValues.fa_datum_doruceni || ''}
                              onChange={(e) => handleFakturaFieldChange(faktura.id, 'fa_datum_doruceni', e.target.value)}
                            />
                          </FormField>

                          <FormField>
                            <FieldLabel>Datum vystavení</FieldLabel>
                            <Input
                              type="date"
                              value={currentValues.fa_datum_vystaveni || ''}
                              onChange={(e) => handleFakturaFieldChange(faktura.id, 'fa_datum_vystaveni', e.target.value)}
                            />
                          </FormField>

                          <FormField>
                            <FieldLabel>Datum splatnosti</FieldLabel>
                            <Input
                              type="date"
                              value={currentValues.fa_splatnost || ''}
                              onChange={(e) => handleFakturaFieldChange(faktura.id, 'fa_splatnost', e.target.value)}
                            />
                          </FormField>

                          <FormField className="full-width">
                            <FieldLabel>Poznámka</FieldLabel>
                            <TextArea
                              value={currentValues.fa_poznamka || ''}
                              onChange={(e) => handleFakturaFieldChange(faktura.id, 'fa_poznamka', e.target.value)}
                              placeholder="Zadejte poznámku k faktuře..."
                            />
                          </FormField>

                          {editedFaktura[faktura.id] && Object.keys(editedFaktura[faktura.id]).length > 0 && (
                            <FormField className="full-width">
                              <SaveButton
                                onClick={() => handleSaveFaktura(faktura)}
                                disabled={savingFaktura}
                              >
                                <FontAwesomeIcon icon={faSave} />
                                {savingFaktura ? 'Ukládám...' : 'Uložit změny faktury'}
                              </SaveButton>
                            </FormField>
                          )}
                        </InvoiceFormGrid>

                        {/* Informační panel */}
                        {(() => {
                          const validation = validateInvoiceForAttachments(currentValues);
                          
                          // Pro temporary faktury zobrazit info
                          if (faktura._isTemporary) {
                            return (
                              <ValidationWarning style={{ background: '#dbeafe', borderColor: '#3b82f6' }}>
                                <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#1e40af' }} />
                                <div>
                                  <ValidationTitle style={{ color: '#1e3a8a' }}>Nová faktura</ValidationTitle>
                                  <ValidationText style={{ color: '#1e40af' }}>
                                    • Pro ISDOC soubory: Můžete nahrát přílohu hned, data se automaticky extrahují<br />
                                    • Pro ostatní přílohy: Nejdřív vyplňte povinná pole (číslo VEMA, částka, datum doručení, splatnost)
                                  </ValidationText>
                                </div>
                              </ValidationWarning>
                            );
                          }
                          
                          // Pro existující faktury s chybějícími poli
                          if (!validation.isValid && validation.missingFields?.length > 0) {
                            return (
                              <ValidationWarning>
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                <div>
                                  <ValidationTitle>Doplňte povinné údaje</ValidationTitle>
                                  <ValidationText>
                                    Pro nahrání běžných příloh vyplňte: {validation.missingFields?.join(', ')}
                                    <br />
                                    <em>(ISDOC soubory lze nahrát i bez těchto údajů)</em>
                                  </ValidationText>
                                </div>
                              </ValidationWarning>
                            );
                          }
                          
                          return null;
                        })()}
                      
                      <InvoiceAttachmentsCompact
                        key={`test-attachments-${faktura.id}-${selectedOrder.id}`}
                        fakturaId={faktura.id}
                        objednavkaId={selectedOrder.id}
                        fakturaTypyPrilohOptions={fakturaTypyPrilohOptions}
                        readOnly={false}
                        onISDOCParsed={handleISDOCParsed}
                        formData={selectedOrder}
                        faktura={currentValues}
                        validateInvoiceForAttachments={validateInvoiceForAttachments}
                        isPokladna={false}
                        attachments={faktura.attachments || []}
                        onAttachmentsChange={(newAttachments) => {
                          handleInvoiceAttachmentsChange(faktura.id, newAttachments);
                        }}
                        onAttachmentUploaded={(uploadedAttachment) => {
                          handleInvoiceAttachmentUploaded(faktura.id, uploadedAttachment);
                        }}
                        onCreateInvoiceInDB={async (tempFakturaId) => {
                          console.log('🎯 onCreateInvoiceInDB called:', { tempFakturaId, currentValues });
                          // Vytvoř fakturu v DB a vrať její reálné ID
                          const created = await handleCreateFaktura(currentValues);
                          console.log('✅ handleCreateFaktura result:', created);
                          return created?.id || null;
                        }}
                      />
                    </InvoiceCard>
                    );
                  })}
                </InvoicesList>
              )}
            </Section>
          </>
        )}

        {!selectedOrderId && !loadingOrder && (
          <EmptyState>
            Vyberte objednávku ze seznamu výše pro zobrazení jejích faktur a příloh.
          </EmptyState>
        )}
      </Card>
    </Container>
  );
};

export default InvoiceAttachmentsTestPanel;
