import React, { useState, useContext, useRef } from 'react';
import styled from '@emotion/styled';
import AuthContext from '../context/AuthContext';
import {
  uploadAttachmentV2,
  listAttachmentsV2,
  downloadAttachmentV2,
  deleteAttachmentV2,
  uploadInvoiceAttachmentV2,
  listInvoiceAttachmentsV2,
  downloadInvoiceAttachmentV2,
  deleteInvoiceAttachmentV2
} from '../services/apiOrderV2';

const Container = styled.div`
  max-width: 1170px;
  margin: 0 auto;
  padding: 39px 26px;
  font-size: 130%;
`;

const Content = styled.div`
  background: white;
  padding: 39px;
  border-radius: 13px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

const UserInfo = styled.div`
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 2px solid #3b82f6;
  border-radius: 13px;
  padding: 26px;
  margin-bottom: 39px;

  h3 {
    color: #1e40af;
    margin-bottom: 13px;
    font-size: 23.4px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 13px;
  }

  .info-item {
    display: flex;
    gap: 10px;

    strong {
      color: #1e3a8a;
      min-width: 100px;
    }

    code {
      background: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 16px;
      color: #dc2626;
      font-family: 'Courier New', monospace;
    }
  }
`;

const Section = styled.div`
  margin-bottom: 39px;

  h2 {
    color: #202d65;
    margin-bottom: 19.5px;
    font-size: 26px;
    border-bottom: 2.6px solid #304e85;
    padding-bottom: 10.4px;
  }
`;

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 13px;
  padding: 26px;

  h3 {
    color: #1f2937;
    margin: 0 0 19.5px 0;
    font-size: 20.8px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 13px;
  margin-top: 19.5px;
`;

const TestButton = styled.button`
  padding: 13px 19.5px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .icon {
    font-size: 20px;
  }
`;

const BtnSuccess = styled(TestButton)`
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: white;
`;

const BtnInfo = styled(TestButton)`
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
`;

const BtnWarning = styled(TestButton)`
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
`;

const BtnDanger = styled(TestButton)`
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
`;

const Alert = styled.div`
  padding: 19.5px 26px;
  border-radius: 13px;
  margin-bottom: 26px;
  font-size: 18.2px;
  line-height: 1.6;

  &.success {
    background: #d1fae5;
    border-left: 4px solid #16a34a;
    color: #065f46;
  }

  &.error {
    background: #fee2e2;
    border-left: 4px solid #dc2626;
    color: #7f1d1d;
  }

  &.info {
    background: #dbeafe;
    border-left: 4px solid #3b82f6;
    color: #1e3a8a;
  }
`;

const ResponseBox = styled.pre`
  background: #1e293b;
  color: #e2e8f0;
  padding: 26px;
  border-radius: 13px;
  overflow-x: auto;
  font-size: 16px;
  line-height: 1.6;
  margin-top: 19.5px;
  max-height: 400px;
  overflow-y: auto;
`;

const Input = styled.input`
  padding: 13px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 18.2px;
  width: 100%;
  margin-bottom: 19.5px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #1f2937;
  font-weight: 600;
  font-size: 18.2px;
`;

const FileInput = styled.input`
  display: block;
  padding: 13px;
  border: 2px dashed #e5e7eb;
  border-radius: 10px;
  width: 100%;
  margin-bottom: 19.5px;
  background: white;
  cursor: pointer;

  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }
`;

const AttachmentList = styled.div`
  margin-top: 19.5px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 13px;
  }
`;

const ClearBtn = styled.button`
  padding: 4px 10px;
  border: 1px solid #dc2626;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #dc2626;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    color: white;
    transform: translateY(-1px);
  }
`;

const AttachmentItem = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 13px;
  margin-bottom: 10px;

  .info {
    margin-bottom: 10px;

    .name {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 6px;
      font-size: 16px;
      word-break: break-word;
    }

    .meta {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 2px;
    }
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
`;

const SmallButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DownloadBtn = styled(SmallButton)`
  background: #3b82f6;
  color: white;
`;

const DeleteBtn = styled(SmallButton)`
  background: #dc2626;
  color: white;
`;

const AttachmentsV2TestPanel = () => {
  const { user, token, username, user_id, userDetail, fullName } = useContext(AuthContext);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Order attachments state
  const [orderId, setOrderId] = useState(''); // prázdné = všechny
  const [orderAttachments, setOrderAttachments] = useState([]);
  const orderFileInputRef = useRef(null);

  // Invoice attachments state
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceAttachments, setInvoiceAttachments] = useState([]);
  const invoiceFileInputRef = useRef(null);

  // ========================================
  // ORDER ATTACHMENTS
  // ========================================

  const testListOrderAttachments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Pokud není zadané ID, pošleme null pro načtení všech
      const idToUse = orderId.trim() || null;
      const data = await listAttachmentsV2(idToUse, token, username);
      setOrderAttachments(data);
      setResponse({
        success: true,
        endpoint: orderId.trim() ? `POST /order-v2/${orderId}/attachments` : 'POST /order-v2/attachments/list (všechny)',
        data
      });
    } catch (err) {
      setError({ endpoint: orderId.trim() ? `POST /order-v2/${orderId}/attachments` : 'POST /order-v2/attachments/list', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testUploadOrderAttachment = async () => {
    const file = orderFileInputRef.current?.files[0];
    if (!file) {
      setError({ endpoint: orderId ? `POST /order-v2/${orderId}/attachments` : 'POST /order-v2/attachments', message: 'Vyberte soubor' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await uploadAttachmentV2(orderId, file, token, username);
      setResponse({ success: true, endpoint: orderId ? `POST /order-v2/${orderId}/attachments` : 'POST /order-v2/attachments', data });

      // Refresh list
      await testListOrderAttachments();

      // Clear file input
      if (orderFileInputRef.current) {
        orderFileInputRef.current.value = '';
      }
    } catch (err) {
      setError({ endpoint: orderId ? `POST /order-v2/${orderId}/attachments` : 'POST /order-v2/attachments', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testDownloadOrderAttachment = async (attachmentId, fileName) => {
    setLoading(true);
    setError(null);

    try {
      const blob = await downloadAttachmentV2(orderId, attachmentId, token, username);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `attachment_${attachmentId}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setResponse({ success: true, endpoint: orderId ? `GET /order-v2/${orderId}/attachments/${attachmentId}` : `GET /order-v2/attachments/${attachmentId}`, data: { message: 'Soubor stažen' } });
    } catch (err) {
      setError({ endpoint: orderId ? `GET /order-v2/${orderId}/attachments/${attachmentId}` : `GET /order-v2/attachments/${attachmentId}`, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testDeleteOrderAttachment = async (attachmentId) => {
    if (!window.confirm(`Opravdu smazat přílohu #${attachmentId}?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await deleteAttachmentV2(orderId, attachmentId, token, username);
      setResponse({ success: true, endpoint: orderId ? `DELETE /order-v2/${orderId}/attachments/${attachmentId}` : `DELETE /order-v2/attachments/${attachmentId}`, data });

      // Refresh list
      await testListOrderAttachments();
    } catch (err) {
      setError({ endpoint: orderId ? `DELETE /order-v2/${orderId}/attachments/${attachmentId}` : `DELETE /order-v2/attachments/${attachmentId}`, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // INVOICE ATTACHMENTS
  // ========================================

  const testListInvoiceAttachments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Pokud není zadané ID, pošleme null pro načtení všech
      const idToUse = invoiceId.trim() || null;
      const data = await listInvoiceAttachmentsV2(idToUse, token, username);
      setInvoiceAttachments(data);
      setResponse({
        success: true,
        endpoint: invoiceId.trim() ? `POST /order-v2/invoices/${invoiceId}/attachments` : 'POST /order-v2/invoices/attachments/list (všechny)',
        data
      });
    } catch (err) {
      setError({ endpoint: invoiceId.trim() ? `POST /order-v2/invoices/${invoiceId}/attachments` : 'POST /order-v2/invoices/attachments/list', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testUploadInvoiceAttachment = async () => {
    if (!invoiceId) {
      setError({ endpoint: 'POST /order-v2/invoices/attachments', message: 'Zadejte Invoice ID' });
      return;
    }

    const file = invoiceFileInputRef.current?.files[0];
    if (!file) {
      setError({ endpoint: `POST /order-v2/invoices/${invoiceId}/attachments`, message: 'Vyberte soubor' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await uploadInvoiceAttachmentV2(invoiceId, file, token, username);
      setResponse({ success: true, endpoint: `POST /order-v2/invoices/${invoiceId}/attachments`, data });

      // Refresh list
      await testListInvoiceAttachments();

      // Clear file input
      if (invoiceFileInputRef.current) {
        invoiceFileInputRef.current.value = '';
      }
    } catch (err) {
      setError({ endpoint: `POST /order-v2/invoices/${invoiceId}/attachments`, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testDownloadInvoiceAttachment = async (attachmentId, fileName) => {
    if (!invoiceId) return;

    setLoading(true);
    setError(null);

    try {
      const blob = await downloadInvoiceAttachmentV2(invoiceId, attachmentId, token, username);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `invoice_attachment_${attachmentId}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setResponse({ success: true, endpoint: `GET /order-v2/invoices/${invoiceId}/attachments/${attachmentId}`, data: { message: 'Soubor stažen' } });
    } catch (err) {
      setError({ endpoint: `GET /order-v2/invoices/${invoiceId}/attachments/${attachmentId}`, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testDeleteInvoiceAttachment = async (attachmentId) => {
    if (!invoiceId) return;
    if (!window.confirm(`Opravdu smazat přílohu faktury #${attachmentId}?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await deleteInvoiceAttachmentV2(invoiceId, attachmentId, token, username);
      setResponse({ success: true, endpoint: `DELETE /order-v2/invoices/${invoiceId}/attachments/${attachmentId}`, data });

      // Refresh list
      await testListInvoiceAttachments();
    } catch (err) {
      setError({ endpoint: `DELETE /order-v2/invoices/${invoiceId}/attachments/${attachmentId}`, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Content>
        {/* User Info */}
        <UserInfo>
          <h3>👤 Aktuálně přihlášený uživatel</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Username:</strong>
              <code>{username || 'N/A'}</code>
            </div>
            <div className="info-item">
              <strong>User ID:</strong>
              <code>{user_id || user?.user_id || user?.id || 'N/A'}</code>
            </div>
            <div className="info-item">
              <strong>Jméno:</strong>
              <code>{fullName || (userDetail?.jmeno ? `${userDetail.jmeno} ${userDetail.prijmeni || ''}` : (user?.jmeno ? `${user.jmeno} ${user.prijmeni || ''}` : 'N/A'))}</code>
            </div>
            <div className="info-item">
              <strong>Token:</strong>
              <code>{token ? `${token.slice(0, 10)}...` : 'N/A'}</code>
            </div>
          </div>
        </UserInfo>

        {/* Two columns layout */}
        <TwoColumns>
          {/* Order Attachments */}
          <Column>
            <h3>📎 Přílohy objednávky</h3>

            <Label htmlFor="orderId">Order ID: <small style={{fontWeight: 'normal', color: '#64748b'}}>(prázdné = všechny)</small></Label>
            <Input
              id="orderId"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="např. 11248 nebo prázdné pro všechny"
            />

            <Label htmlFor="orderFile">Nahrát soubor:</Label>
            <FileInput
              id="orderFile"
              type="file"
              ref={orderFileInputRef}
            />

            <ButtonGrid>
              <BtnInfo onClick={testListOrderAttachments} disabled={loading || !token}>
                📋 LIST
              </BtnInfo>

              <BtnSuccess onClick={testUploadOrderAttachment} disabled={loading || !token || !orderId}>
                📤 UPLOAD
              </BtnSuccess>
            </ButtonGrid>

            {orderAttachments.length > 0 && (
              <AttachmentList>
                <div className="header">
                  <strong>Přílohy ({Math.min(10, orderAttachments.length)}{orderAttachments.length > 10 ? ` z ${orderAttachments.length}` : ''}):</strong>
                  <ClearBtn onClick={() => setOrderAttachments([])}>
                    ✕ Vymazat
                  </ClearBtn>
                </div>
                {orderAttachments.slice(-10).map((att) => {
                  const fileName = att.original_name || att.nazev_souboru || att.file_name || 'Soubor';
                  const fileSize = att.file_size || att.velikost_souboru;
                  const fileSizeKB = fileSize ? `${(fileSize / 1024).toFixed(2)} KB` : 'N/A';

                  return (
                    <AttachmentItem key={att.id}>
                      <div className="info">
                        <div className="name">📄 {fileName}</div>
                        <div className="meta">ID: {att.id} | Velikost: {fileSizeKB}</div>
                        {att.order_number && <div className="meta" style={{fontSize: '0.85em', color: '#64748b'}}>Obj: {att.order_number}</div>}
                      </div>
                      <div className="actions">
                        <DownloadBtn onClick={() => testDownloadOrderAttachment(att.id, fileName)} disabled={loading}>
                          💾 Stáhnout
                        </DownloadBtn>
                        <DeleteBtn onClick={() => testDeleteOrderAttachment(att.id)} disabled={loading}>
                          🗑️ Smazat
                        </DeleteBtn>
                      </div>
                    </AttachmentItem>
                  );
                })}
                {orderAttachments.length > 10 && (
                  <div style={{textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '0.9em'}}>
                    Zobrazeno posledních 10 z {orderAttachments.length} příloh
                  </div>
                )}
              </AttachmentList>
            )}
          </Column>

          {/* Invoice Attachments */}
          <Column>
            <h3>📄 Přílohy faktury</h3>

            <Label htmlFor="invoiceId">Invoice ID: <small style={{fontWeight: 'normal', color: '#64748b'}}>(prázdné = všechny)</small></Label>
            <Input
              id="invoiceId"
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="např. 789 nebo prázdné pro všechny"
            />

            <Label htmlFor="invoiceFile">Nahrát soubor:</Label>
            <FileInput
              id="invoiceFile"
              type="file"
              ref={invoiceFileInputRef}
            />

            <ButtonGrid>
              <BtnInfo onClick={testListInvoiceAttachments} disabled={loading || !token}>
                📋 LIST
              </BtnInfo>

              <BtnSuccess onClick={testUploadInvoiceAttachment} disabled={loading || !token || !invoiceId}>
                📤 UPLOAD
              </BtnSuccess>
            </ButtonGrid>

            {invoiceAttachments.length > 0 && (
              <AttachmentList>
                <div className="header">
                  <strong>Přílohy faktury ({Math.min(10, invoiceAttachments.length)}{invoiceAttachments.length > 10 ? ` z ${invoiceAttachments.length}` : ''}):</strong>
                  <ClearBtn onClick={() => setInvoiceAttachments([])}>
                    ✕ Vymazat
                  </ClearBtn>
                </div>
                {invoiceAttachments.slice(-10).map((att) => {
                  const fileName = att.original_name || att.nazev_souboru || att.file_name || 'Soubor';
                  const fileSize = att.file_size || att.velikost_souboru;
                  const fileSizeKB = fileSize ? `${(fileSize / 1024).toFixed(2)} KB` : 'N/A';

                  return (
                    <AttachmentItem key={att.id}>
                      <div className="info">
                        <div className="name">📄 {fileName}</div>
                        <div className="meta">ID: {att.id} | Velikost: {fileSizeKB}</div>
                        {att.invoice_number && <div className="meta" style={{fontSize: '0.85em', color: '#64748b'}}>Faktura: {att.invoice_number}</div>}
                        {att.order_number && <div className="meta" style={{fontSize: '0.85em', color: '#64748b'}}>Obj: {att.order_number}</div>}
                      </div>
                      <div className="actions">
                        <DownloadBtn onClick={() => testDownloadInvoiceAttachment(att.id, fileName)} disabled={loading}>
                          💾 Stáhnout
                        </DownloadBtn>
                        <DeleteBtn onClick={() => testDeleteInvoiceAttachment(att.id)} disabled={loading}>
                          🗑️ Smazat
                        </DeleteBtn>
                      </div>
                    </AttachmentItem>
                  );
                })}
                {invoiceAttachments.length > 10 && (
                  <div style={{textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '0.9em'}}>
                    Zobrazeno posledních 10 z {invoiceAttachments.length} příloh
                  </div>
                )}
              </AttachmentList>
            )}
          </Column>
        </TwoColumns>

        {/* Loading State */}
        {loading && (
          <Alert className="info">
            ⏳ Odesílám požadavek na backend...
          </Alert>
        )}

        {/* Success Response */}
        {response && (
          <>
            <Alert className="success">
              ✅ <strong>Úspěch!</strong> Endpoint: <code>{response.endpoint}</code>
            </Alert>
            <ResponseBox>
              {JSON.stringify(response.data, null, 2)}
            </ResponseBox>
          </>
        )}

        {/* Error Response */}
        {error && (
          <>
            <Alert className="error">
              ❌ <strong>Chyba!</strong> Endpoint: <code>{error.endpoint}</code>
              <br /><br />
              {error.message}
            </Alert>
          </>
        )}

        {/* Instructions */}
        {!response && !error && !loading && (
          <Alert className="info">
            ℹ️ <strong>Návod k použití:</strong>
            <br />
            1. Zkontrolujte, že jste přihlášeni (vidíte username a token nahoře)
            <br />
            2. Zadejte konkrétní Order ID / Invoice ID, nebo <strong>nechte prázdné pro všechny přílohy</strong>
            <br />
            3. Pro zobrazení příloh klikněte na LIST
            <br />
            4. Pro nahrání vyberte soubor a klikněte UPLOAD (vyžaduje konkrétní ID)
            <br />
            5. Můžete přílohy stahovat nebo mazat
          </Alert>
        )}
      </Content>
    </Container>
  );
};

export default AttachmentsV2TestPanel;
