/**
 * InvoiceListPopup.js
 * 
 * Komponenta pro zobrazení popupu se seznamem faktur k objednávce
 * Umožňuje editaci existujících faktur a přidání nové faktury
 * 
 * @author GitHub Copilot
 * @date 4. února 2026
 */

import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faEdit, 
  faPlus, 
  faFileInvoice,
  faCalendarAlt,
  faMoneyBillWave,
  faCheckCircle,
  faClock
} from '@fortawesome/free-solid-svg-icons';

// Styled Components
const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 1rem;
`;

const PopupContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
`;

const PopupTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    font-size: 1.25rem;
  }
`;

const OrderInfo = styled.div`
  font-size: 0.875rem;
  opacity: 0.95;
  margin-top: 0.25rem;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const PopupContent = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const InvoiceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InvoiceItem = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const InvoiceInfo = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    display: flex;
    align-items: center;
    gap: 0.375rem;

    svg {
      font-size: 0.875rem;
    }
  }

  span {
    font-size: 0.9375rem;
    color: #1e293b;
    font-weight: 500;
  }
`;

const InvoiceStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.8125rem;
  font-weight: 600;
  background-color: ${props => props.$delivered ? '#dcfce7' : '#fef3c7'};
  color: ${props => props.$delivered ? '#15803d' : '#a16207'};

  svg {
    font-size: 0.875rem;
  }
`;

const EditButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  svg {
    font-size: 1rem;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PopupFooter = styled.div`
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: center;
`;

const AddInvoiceButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  svg {
    font-size: 1.125rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: #64748b;

  svg {
    font-size: 3rem;
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    color: #475569;
  }

  p {
    margin: 0;
    font-size: 0.9375rem;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: #64748b;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  p {
    margin: 0;
    font-size: 0.9375rem;
  }
`;

/**
 * Komponenta pro zobrazení popupu se seznamem faktur
 * 
 * @param {Object} props
 * @param {Array} props.invoices - Seznam faktur
 * @param {Object} props.order - Data objednávky
 * @param {Function} props.onClose - Callback pro zavření popupu
 * @param {Function} props.onEditInvoice - Callback pro editaci faktury
 * @param {Function} props.onAddInvoice - Callback pro přidání nové faktury
 * @param {boolean} props.loading - Indikuje, zda se načítají data
 */
const InvoiceListPopup = ({ 
  invoices = [], 
  order, 
  onClose, 
  onEditInvoice, 
  onAddInvoice,
  loading = false 
}) => {
  // Mapování stavů faktur na lidsky čitelné texty
  const getInvoiceStatusLabel = (stavKod) => {
    if (!stavKod) return 'Zaevidována';
    
    const stavMap = {
      'ZAEVIDOVANA': 'Zaevidována',
      'PREDANA': 'Předána',
      'PREDANA_PO': 'Předána PO',
      'PREDANA_VECNA': 'Předána věcná správnost',
      'ZAPLACENA': 'Zaplacena',
      'VECNA_SPRAVNOST': 'Věcná správnost',
      'DOKONCENA': 'Dokončena'
    };
    
    return stavMap[stavKod.toUpperCase()] || stavKod;
  };

  // Formátování data
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('cs-CZ');
    } catch (e) {
      return dateString;
    }
  };

  // Formátování částky
  const formatAmount = (amount) => {
    if (!amount) return '—';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč';
  };

  // Zavření na kliknutí mimo popup
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <PopupOverlay onClick={handleOverlayClick}>
      <PopupContainer>
        <PopupHeader>
          <div>
            <PopupTitle>
              <FontAwesomeIcon icon={faFileInvoice} />
              Faktury objednávky
            </PopupTitle>
            <OrderInfo>
              {order?.cislo_objednavky || order?.evidencni_cislo || `OBJ #${order?.id}`}
            </OrderInfo>
          </div>
          <CloseButton onClick={onClose} title="Zavřít">
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </PopupHeader>

        <PopupContent>
          {loading ? (
            <LoadingState>
              <div className="spinner" />
              <p>Načítám faktury...</p>
            </LoadingState>
          ) : invoices.length === 0 ? (
            <EmptyState>
              <FontAwesomeIcon icon={faFileInvoice} />
              <h4>Žádné faktury</h4>
              <p>K této objednávce zatím nejsou evidovány žádné faktury.</p>
            </EmptyState>
          ) : (
            <InvoiceList>
              {invoices.map((invoice) => (
                <InvoiceItem key={invoice.id}>
                  <InvoiceInfo>
                    <InfoItem>
                      <label>
                        <FontAwesomeIcon icon={faFileInvoice} />
                        Fa VS
                      </label>
                      <span>{invoice.fa_cislo_vema || '—'}</span>
                    </InfoItem>
                    <InfoItem>
                      <label>
                        <FontAwesomeIcon icon={faMoneyBillWave} />
                        Částka
                      </label>
                      <span>{formatAmount(invoice.fa_castka)}</span>
                    </InfoItem>
                    <InfoItem>
                      <label>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                        Splatnost do
                      </label>
                      <span>{formatDate(invoice.fa_datum_splatnosti)}</span>
                    </InfoItem>
                    <InfoItem>
                      <label>Stav</label>
                      <span style={{ fontWeight: 600, color: '#1e40af' }}>
                        {getInvoiceStatusLabel(invoice.fa_stav || invoice.stav)}
                      </span>
                    </InfoItem>
                  </InvoiceInfo>
                  <EditButton 
                    onClick={() => onEditInvoice(invoice)}
                    title="Editovat fakturu"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                    Upravit
                  </EditButton>
                </InvoiceItem>
              ))}
            </InvoiceList>
          )}
        </PopupContent>

        <PopupFooter>
          <AddInvoiceButton onClick={onAddInvoice}>
            <FontAwesomeIcon icon={faPlus} />
            Zaevidovat novou fakturu
          </AddInvoiceButton>
        </PopupFooter>
      </PopupContainer>
    </PopupOverlay>
  );
};

export default InvoiceListPopup;
