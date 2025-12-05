import React, { useState, useEffect, useContext } from 'react';
import styled from '@emotion/styled';
import AuthContext from '../context/AuthContext';
import {
  getOrderV2,
  createOrderV2,
  updateOrderV2,
  deleteOrderV2,
  listOrdersV2,
  getNextOrderNumberV2,
  checkOrderNumberV2,
  getOrderTimestampV2,
  // Attachments API
  uploadOrderAttachment,
  listOrderAttachments,
  downloadOrderAttachment,
  deleteOrderAttachment,
  updateOrderAttachment,
  verifyOrderAttachments,
  listAllOrderAttachments,
  uploadInvoiceAttachment,
  listInvoiceAttachments,
  downloadInvoiceAttachment,
  deleteInvoiceAttachment,
  updateInvoiceAttachment,
  listAllInvoiceAttachments
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

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(325px, 1fr));
  gap: 19.5px;
  margin-top: 19.5px;
`;

const TestButton = styled.button`
  padding: 19.5px 26px;
  border: none;
  border-radius: 13px;
  font-size: 18.2px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 13px;
  box-shadow: 0 2.6px 10.4px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    transform: translateY(-2.6px);
    box-shadow: 0 5.2px 15.6px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .icon {
    font-size: 26px;
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

const BtnPrimary = styled(TestButton)`
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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
  max-height: 500px;
  overflow-y: auto;

  .success {
    color: #4ade80;
  }

  .error {
    color: #f87171;
  }

  .key {
    color: #7dd3fc;
  }

  .string {
    color: #fbbf24;
  }

  .number {
    color: #a78bfa;
  }
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

const OrderV2TestPanel = () => {
  const { user, token, username, user_id, userDetail, fullName } = useContext(AuthContext);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testOrderId, setTestOrderId] = useState('11248');
  const [testOrderNumber, setTestOrderNumber] = useState('');
  const [testInvoiceId, setTestInvoiceId] = useState('1');
  const [testAttachmentId, setTestAttachmentId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Test GET order
  const testGetOrder = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await getOrderV2(testOrderId, token, username, true);
      setResponse({ success: true, endpoint: 'GET /order-v2/{id}/enriched', data });
    } catch (err) {
      setError({ endpoint: 'GET /order-v2/{id}/enriched', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test CREATE order
  const testCreateOrder = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const currentUserId = user_id || user?.user_id || user?.id || 1;
      const orderData = {
        uzivatel_id: currentUserId,
        objednatel_id: currentUserId,
        predmet: `TEST Order - ${new Date().toLocaleString('cs-CZ')}`,
        garant_uzivatel_id: "100",
        prikazce_id: "1",
        strediska_kod: ["KLADNO", "VOTICE"],
        max_cena_s_dph: "5000",
        stav_workflow_kod: '["ODESLANA_KE_SCHVALENI"]',
        stav_objednavky: "Ke schválení",
        dt_objednavky: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      const data = await createOrderV2(orderData, token, username);
      setResponse({ success: true, endpoint: 'POST /order-v2/create', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/create', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test UPDATE order
  const testUpdateOrder = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const updateData = {
        predmet: `UPDATED TEST - ${new Date().toLocaleString('cs-CZ')}`,
        max_cena_s_dph: "7500"
      };

      const data = await updateOrderV2(testOrderId, updateData, token, username);
      setResponse({ success: true, endpoint: 'POST /order-v2/{id}/update', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/{id}/update', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test LIST orders
  const testListOrders = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const currentUserId = user_id || user?.user_id || user?.id || 1;
      const filters = {
        uzivatel_id: currentUserId,
        limit: 10,
        offset: 0
      };

      const data = await listOrdersV2(filters, token, username, true); // true = return full response
      setResponse({ success: true, endpoint: 'POST /order-v2/list', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/list', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 🧪 Test LIST ENRICHED with filters (pro testování archiv, datum, uživatel)
  const [testFilters, setTestFilters] = useState({
    uzivatel_id: '',
    datum_od: '',
    datum_do: '',
    archivovano: '',
    frontend_order_id: '' // 🆕 Frontend filtr pro Order ID
  });

  const testListEnrichedWithFilters = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const filters = {};

      // Přidej pouze vyplněné filtry (BEZ frontend_order_id - to filtrujeme až po načtení)
      if (testFilters.uzivatel_id) filters.uzivatel_id = parseInt(testFilters.uzivatel_id);
      if (testFilters.datum_od) filters.datum_od = testFilters.datum_od;
      if (testFilters.datum_do) filters.datum_do = testFilters.datum_do;
      if (testFilters.archivovano !== '') filters.archivovano = parseInt(testFilters.archivovano);

      const data = await listOrdersV2(filters, token, username, false, true); // true = enriched

      // 🆕 Frontend filtr podle Order ID (po načtení z BE)
      let filteredData = data;
      if (testFilters.frontend_order_id) {
        const searchId = parseInt(testFilters.frontend_order_id);
        filteredData = data.filter(o => o.id === searchId);
      }

      // Spočítej statistiky (z FILTROVANÝCH dat)
      const stats = {
        total: filteredData.length,
        archived: filteredData.filter(o => o.stav_objednavky === 'ARCHIVOVANO').length,
        nonArchived: filteredData.filter(o => o.stav_objednavky !== 'ARCHIVOVANO').length,
        byYear: {},
        byUser: {},
        // 🆕 Info o filtraci
        frontendFiltered: testFilters.frontend_order_id ? true : false,
        totalFromBE: data.length // Kolik přišlo z BE před frontend filtrací
      };

      // Počítej statistiky z FILTROVANÝCH dat
      filteredData.forEach(o => {
        const year = o.dt_objednavky ? new Date(o.dt_objednavky).getFullYear() : 'N/A';
        stats.byYear[year] = (stats.byYear[year] || 0) + 1;
        stats.byUser[o.uzivatel_id] = (stats.byUser[o.uzivatel_id] || 0) + 1;
      });

      setResponse({
        success: true,
        endpoint: 'POST /order-v2/list-enriched',
        data: filteredData, // 🆕 Vrať FILTROVANÁ data
        stats,
        filtersSent: filters,
        frontendFilterApplied: testFilters.frontend_order_id ? `Order ID = ${testFilters.frontend_order_id}` : null
      });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/list-enriched', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test GET next order number
  const testGetNextNumber = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await getNextOrderNumberV2(token, username);
      setResponse({ success: true, endpoint: 'POST /order-v2/next-number', data });
      setTestOrderNumber(data.next_order_string || data.order_number_string || '');
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/next-number', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test CHECK order number
  const testCheckNumber = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const numberToCheck = testOrderNumber || 'O-0001/00000000/2025/IT';
      const data = await checkOrderNumberV2(numberToCheck, token, username, true);
      setResponse({ success: true, endpoint: 'POST /order-v2/check-number', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/check-number', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test GET timestamp
  const testGetTimestamp = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await getOrderTimestampV2(testOrderId, token, username);
      setResponse({ success: true, endpoint: 'POST /order-v2/{id}/dt-aktualizace', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/{id}/dt-aktualizace', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test DELETE order
  const testDeleteOrder = async () => {
    if (!window.confirm(`Opravdu chcete smazat objednávku #${testOrderId}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await deleteOrderV2(testOrderId, token, username);
      setResponse({ success: true, endpoint: 'POST /order-v2/{id}/delete', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/{id}/delete', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // ORDER ATTACHMENTS TESTS
  // ========================================

  // Test UPLOAD order attachment
  const testUploadOrderAttachment = async () => {
    if (!selectedFile) {
      setError({ endpoint: 'POST /order-v2/{id}/attachments/upload', message: 'Nejprve vyberte soubor!' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await uploadOrderAttachment(testOrderId, selectedFile, username, token, 'obj');
      setResponse({ success: true, endpoint: 'POST /order-v2/{id}/attachments/upload', data });
      setTestAttachmentId(data.data?.attachment_id || data.data?.id || '');
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/{id}/attachments/upload', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test LIST order attachments
  const testListOrderAttachments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await listOrderAttachments(testOrderId, username, token);
      setResponse({ success: true, endpoint: 'GET /order-v2/{id}/attachments', data });
    } catch (err) {
      setError({ endpoint: 'GET /order-v2/{id}/attachments', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test DOWNLOAD order attachment
  const testDownloadOrderAttachment = async () => {
    if (!testAttachmentId) {
      setError({ endpoint: 'GET /order-v2/{id}/attachments/{att_id}', message: 'Nejprve zadejte Attachment ID!' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      await downloadOrderAttachment(testOrderId, testAttachmentId, username, token);
      setResponse({ success: true, endpoint: 'GET /order-v2/{id}/attachments/{att_id}', data: { message: 'Soubor byl stažen' } });
    } catch (err) {
      setError({ endpoint: 'GET /order-v2/{id}/attachments/{att_id}', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test DELETE order attachment
  const testDeleteOrderAttachment = async () => {
    if (!testAttachmentId) {
      setError({ endpoint: 'DELETE /order-v2/{id}/attachments/{att_id}', message: 'Nejprve zadejte Attachment ID!' });
      return;
    }

    if (!window.confirm(`Opravdu chcete smazat přílohu #${testAttachmentId}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await deleteOrderAttachment(testOrderId, testAttachmentId, username, token);
      setResponse({ success: true, endpoint: 'DELETE /order-v2/{id}/attachments/{att_id}', data });
    } catch (err) {
      setError({ endpoint: 'DELETE /order-v2/{id}/attachments/{att_id}', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test UPDATE order attachment metadata
  const testUpdateOrderAttachment = async () => {
    if (!testAttachmentId) {
      setError({ endpoint: 'PUT /order-v2/{id}/attachments/{att_id}', message: 'Nejprve zadejte Attachment ID!' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const updates = {
        original_name: `updated_file_${Date.now()}.pdf`,
        type: 'SMLOUVA'
      };
      const data = await updateOrderAttachment(testOrderId, testAttachmentId, username, token, updates);
      setResponse({ success: true, endpoint: 'PUT /order-v2/{id}/attachments/{att_id}', data });
    } catch (err) {
      setError({ endpoint: 'PUT /order-v2/{id}/attachments/{att_id}', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test VERIFY order attachments
  const testVerifyOrderAttachments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await verifyOrderAttachments(testOrderId, username, token);
      setResponse({ success: true, endpoint: 'POST /order-v2/{id}/attachments/verify', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/{id}/attachments/verify', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test LIST ALL order attachments
  const testListAllOrderAttachments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await listAllOrderAttachments(username, token, 50, 0);
      setResponse({ success: true, endpoint: 'POST /order-v2/attachments/list', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/attachments/list', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // INVOICE ATTACHMENTS TESTS
  // ========================================

  // Test UPLOAD invoice attachment
  const testUploadInvoiceAttachment = async () => {
    if (!selectedFile) {
      setError({ endpoint: 'POST /order-v2/invoices/{id}/attachments/upload', message: 'Nejprve vyberte soubor!' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await uploadInvoiceAttachment(testInvoiceId, testOrderId, selectedFile, username, token);
      setResponse({ success: true, endpoint: 'POST /order-v2/invoices/{id}/attachments/upload', data });
      setTestAttachmentId(data.data?.attachment_id || data.data?.id || '');
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/invoices/{id}/attachments/upload', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test LIST invoice attachments
  const testListInvoiceAttachments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await listInvoiceAttachments(testInvoiceId, username, token);
      setResponse({ success: true, endpoint: 'GET /order-v2/invoices/{id}/attachments', data });
    } catch (err) {
      setError({ endpoint: 'GET /order-v2/invoices/{id}/attachments', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test DOWNLOAD invoice attachment
  const testDownloadInvoiceAttachment = async () => {
    if (!testAttachmentId) {
      setError({ endpoint: 'POST /order-v2/invoices/{id}/attachments/{att_id}/download', message: 'Nejprve zadejte Attachment ID!' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      await downloadInvoiceAttachment(testInvoiceId, testAttachmentId, username, token);
      setResponse({ success: true, endpoint: 'POST /order-v2/invoices/{id}/attachments/{att_id}/download', data: { message: 'Soubor byl stažen' } });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/invoices/{id}/attachments/{att_id}/download', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test DELETE invoice attachment
  const testDeleteInvoiceAttachment = async () => {
    if (!testAttachmentId) {
      setError({ endpoint: 'DELETE /order-v2/invoices/{id}/attachments/{att_id}', message: 'Nejprve zadejte Attachment ID!' });
      return;
    }

    if (!window.confirm(`Opravdu chcete smazat přílohu faktury #${testAttachmentId}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await deleteInvoiceAttachment(testInvoiceId, testAttachmentId, username, token);
      setResponse({ success: true, endpoint: 'DELETE /order-v2/invoices/{id}/attachments/{att_id}', data });
    } catch (err) {
      setError({ endpoint: 'DELETE /order-v2/invoices/{id}/attachments/{att_id}', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test UPDATE invoice attachment metadata
  const testUpdateInvoiceAttachment = async () => {
    if (!testAttachmentId) {
      setError({ endpoint: 'PUT /order-v2/invoices/{id}/attachments/{att_id}/update', message: 'Nejprve zadejte Attachment ID!' });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const updates = {
        original_name: `updated_invoice_${Date.now()}.pdf`,
        type: 'FAKTURA_VYUCTOVANI'
      };
      const data = await updateInvoiceAttachment(testInvoiceId, testAttachmentId, username, token, updates);
      setResponse({ success: true, endpoint: 'PUT /order-v2/invoices/{id}/attachments/{att_id}/update', data });
    } catch (err) {
      setError({ endpoint: 'PUT /order-v2/invoices/{id}/attachments/{att_id}/update', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Test LIST ALL invoice attachments
  const testListAllInvoiceAttachments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await listAllInvoiceAttachments(username, token, 50, 0);
      setResponse({ success: true, endpoint: 'POST /order-v2/invoices/attachments/list', data });
    } catch (err) {
      setError({ endpoint: 'POST /order-v2/invoices/attachments/list', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // File input handler
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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

        {/* Input for Order ID */}
        <Section>
          <h2>⚙️ Parametry testů</h2>
          <Label htmlFor="orderId">Order ID (pro GET/UPDATE/DELETE/TIMESTAMP):</Label>
          <Input
            id="orderId"
            type="text"
            value={testOrderId}
            onChange={(e) => setTestOrderId(e.target.value)}
            placeholder="např. 11248"
          />

          <Label htmlFor="orderNumber">Order Number (pro CHECK):</Label>
          <Input
            id="orderNumber"
            type="text"
            value={testOrderNumber}
            onChange={(e) => setTestOrderNumber(e.target.value)}
            placeholder="např. O-0001/00000000/2025/IT"
          />

          <Label htmlFor="invoiceId">Invoice ID (pro Invoice Attachments):</Label>
          <Input
            id="invoiceId"
            type="text"
            value={testInvoiceId}
            onChange={(e) => setTestInvoiceId(e.target.value)}
            placeholder="např. 1"
          />

          <Label htmlFor="attachmentId">Attachment ID (pro Download/Delete/Update):</Label>
          <Input
            id="attachmentId"
            type="text"
            value={testAttachmentId}
            onChange={(e) => setTestAttachmentId(e.target.value)}
            placeholder="např. 123"
          />

          <Label htmlFor="fileUpload">Soubor pro upload (Attachments):</Label>
          <Input
            id="fileUpload"
            type="file"
            onChange={handleFileChange}
          />
          {selectedFile && (
            <Alert className="info" style={{ marginTop: '10px', padding: '10px 15px' }}>
              📎 Vybraný soubor: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(2)} KB)
            </Alert>
          )}
        </Section>

        {/* CRUD Operations */}
        <Section>
          <h2>📝 CRUD Operace</h2>
          <ButtonGrid>
            <BtnSuccess onClick={testCreateOrder} disabled={loading || !token}>
              <span className="icon">➕</span>
              <span>CREATE Order</span>
            </BtnSuccess>

            <BtnInfo onClick={testGetOrder} disabled={loading || !token || !testOrderId}>
              <span className="icon">📖</span>
              <span>GET Order (Enriched)</span>
            </BtnInfo>

            <BtnWarning onClick={testUpdateOrder} disabled={loading || !token || !testOrderId}>
              <span className="icon">✏️</span>
              <span>UPDATE Order</span>
            </BtnWarning>

            <BtnDanger onClick={testDeleteOrder} disabled={loading || !token || !testOrderId}>
              <span className="icon">🗑️</span>
              <span>DELETE Order</span>
            </BtnDanger>
          </ButtonGrid>
        </Section>

        {/* 🧪 Filter Testing */}
        <Section style={{ background: 'linear-gradient(135deg, #fef3c7, #fef08a)', border: '2px solid #eab308' }}>
          <h2>🧪 TEST Filtrů pro List Enriched</h2>
          <Alert className="info" style={{ marginBottom: '20px' }}>
            ℹ️ <strong>Test filtrace Order V2 API:</strong>
            <br />
            Testuj různé kombinace filtrů a uvidíš co BE vrátí vs. co by měl frontend zobrazit.
            <br />
            <br />
            <strong>Dostupné filtry:</strong>
            <br />
            • <code>uzivatel_id</code> - ID uživatele (číslo, např. 1)
            <br />
            • <code>datum_od</code> - Od data (YYYY-MM-DD)
            <br />
            • <code>datum_do</code> - Do data (YYYY-MM-DD)
            <br />
            • <code>archivovano</code> - 1 = včetně archivovaných, 0 nebo prázdné = BEZ archivovaných
          </Alert>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <Label>User ID (číslo):</Label>
              <Input
                type="number"
                value={testFilters.uzivatel_id}
                onChange={(e) => setTestFilters({...testFilters, uzivatel_id: e.target.value})}
                placeholder="např. 1"
              />
            </div>

            <div>
              <Label>Archivovano (0/1):</Label>
              <Input
                type="number"
                min="0"
                max="1"
                value={testFilters.archivovano}
                onChange={(e) => setTestFilters({...testFilters, archivovano: e.target.value})}
                placeholder="0 = bez archiv, 1 = s archivem"
              />
            </div>

            <div>
              <Label>Datum od:</Label>
              <Input
                type="date"
                value={testFilters.datum_od}
                onChange={(e) => setTestFilters({...testFilters, datum_od: e.target.value})}
              />
            </div>

            <div>
              <Label>Datum do:</Label>
              <Input
                type="date"
                value={testFilters.datum_do}
                onChange={(e) => setTestFilters({...testFilters, datum_do: e.target.value})}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Label>🔍 Order ID (frontend filtr - NEPOŠLE SE do BE):</Label>
              <Input
                type="number"
                value={testFilters.frontend_order_id}
                onChange={(e) => setTestFilters({...testFilters, frontend_order_id: e.target.value})}
                placeholder="např. 11248 - načte všechny z BE a pak vyfiltruje podle ID"
                style={{ background: '#fef3c7', borderColor: '#f59e0b' }}
              />
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '5px' }}>
                ⚠️ Tento filtr se aplikuje AŽ PO načtení dat z BE (frontend filtr)
              </div>
            </div>
          </div>

          <BtnWarning
            onClick={testListEnrichedWithFilters}
            disabled={loading || !token}
            style={{ width: '100%', fontSize: '16px', padding: '15px' }}
          >
            <span className="icon">🔍</span>
            <span>🧪 TEST LIST ENRICHED s filtry</span>
          </BtnWarning>
        </Section>

        {/* List & Utilities */}
        <Section>
          <h2>🔧 Pomocné funkce</h2>
          <ButtonGrid>
            <BtnPrimary onClick={testListOrders} disabled={loading || !token}>
              <span className="icon">📋</span>
              <span>LIST Orders</span>
            </BtnPrimary>

            <BtnInfo onClick={testGetNextNumber} disabled={loading || !token}>
              <span className="icon">🔢</span>
              <span>GET Next Number</span>
            </BtnInfo>

            <BtnWarning onClick={testCheckNumber} disabled={loading || !token || !testOrderNumber}>
              <span className="icon">✅</span>
              <span>CHECK Number</span>
            </BtnWarning>

            <BtnInfo onClick={testGetTimestamp} disabled={loading || !token || !testOrderId}>
              <span className="icon">⏰</span>
              <span>GET Timestamp</span>
            </BtnInfo>
          </ButtonGrid>
        </Section>

        {/* Order Attachments */}
        <Section>
          <h2>📎 Order Attachments API</h2>
          <ButtonGrid>
            <BtnSuccess onClick={testUploadOrderAttachment} disabled={loading || !token || !testOrderId || !selectedFile}>
              <span className="icon">⬆️</span>
              <span>UPLOAD Order Attachment</span>
            </BtnSuccess>

            <BtnInfo onClick={testListOrderAttachments} disabled={loading || !token || !testOrderId}>
              <span className="icon">📋</span>
              <span>LIST Order Attachments</span>
            </BtnInfo>

            <BtnPrimary onClick={testDownloadOrderAttachment} disabled={loading || !token || !testOrderId || !testAttachmentId}>
              <span className="icon">📥</span>
              <span>DOWNLOAD Order Attachment</span>
            </BtnPrimary>

            <BtnWarning onClick={testUpdateOrderAttachment} disabled={loading || !token || !testOrderId || !testAttachmentId}>
              <span className="icon">✏️</span>
              <span>UPDATE Attachment Metadata</span>
            </BtnWarning>

            <BtnDanger onClick={testDeleteOrderAttachment} disabled={loading || !token || !testOrderId || !testAttachmentId}>
              <span className="icon">🗑️</span>
              <span>DELETE Order Attachment</span>
            </BtnDanger>

            <BtnInfo onClick={testVerifyOrderAttachments} disabled={loading || !token || !testOrderId}>
              <span className="icon">🔍</span>
              <span>VERIFY Order Attachments</span>
            </BtnInfo>

            <BtnPrimary onClick={testListAllOrderAttachments} disabled={loading || !token}>
              <span className="icon">🌐</span>
              <span>LIST ALL Order Attachments</span>
            </BtnPrimary>
          </ButtonGrid>
        </Section>

        {/* Invoice Attachments */}
        <Section>
          <h2>💰 Invoice Attachments API</h2>
          <ButtonGrid>
            <BtnSuccess onClick={testUploadInvoiceAttachment} disabled={loading || !token || !testInvoiceId || !selectedFile}>
              <span className="icon">⬆️</span>
              <span>UPLOAD Invoice Attachment</span>
            </BtnSuccess>

            <BtnInfo onClick={testListInvoiceAttachments} disabled={loading || !token || !testInvoiceId}>
              <span className="icon">📋</span>
              <span>LIST Invoice Attachments</span>
            </BtnInfo>

            <BtnPrimary onClick={testDownloadInvoiceAttachment} disabled={loading || !token || !testInvoiceId || !testAttachmentId}>
              <span className="icon">📥</span>
              <span>DOWNLOAD Invoice Attachment</span>
            </BtnPrimary>

            <BtnWarning onClick={testUpdateInvoiceAttachment} disabled={loading || !token || !testInvoiceId || !testAttachmentId}>
              <span className="icon">✏️</span>
              <span>UPDATE Invoice Attachment</span>
            </BtnWarning>

            <BtnDanger onClick={testDeleteInvoiceAttachment} disabled={loading || !token || !testInvoiceId || !testAttachmentId}>
              <span className="icon">🗑️</span>
              <span>DELETE Invoice Attachment</span>
            </BtnDanger>

            <BtnPrimary onClick={testListAllInvoiceAttachments} disabled={loading || !token}>
              <span className="icon">🌐</span>
              <span>LIST ALL Invoice Attachments</span>
            </BtnPrimary>
          </ButtonGrid>
        </Section>

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

            {/* 🧪 Pokud je to test filtrů, zobraz statistiky */}
            {response.stats && (
              <Section style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '2px solid #22c55e', marginTop: '20px' }}>
                <h2>📊 Statistiky z BE Response</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  <Alert className="info" style={{ margin: 0 }}>
                    <strong>Celkem objednávek:</strong><br />
                    <span style={{ fontSize: '24px', color: '#3b82f6' }}>{response.stats.total}</span>
                  </Alert>
                  <Alert className="success" style={{ margin: 0 }}>
                    <strong>Nearchivované:</strong><br />
                    <span style={{ fontSize: '24px', color: '#22c55e' }}>{response.stats.nonArchived}</span>
                  </Alert>
                  <Alert className="warning" style={{ margin: 0 }}>
                    <strong>Archivované:</strong><br />
                    <span style={{ fontSize: '24px', color: '#f59e0b' }}>{response.stats.archived}</span>
                  </Alert>
                </div>

                <Alert className="info">
                  <strong>📡 Filtry poslané do API:</strong>
                  <ResponseBox style={{ marginTop: '10px' }}>
                    {JSON.stringify(response.filtersSent, null, 2)}
                  </ResponseBox>
                </Alert>

                {/* 🆕 Frontend filtr info */}
                {response.frontendFilterApplied && (
                  <Alert className="warning" style={{ background: 'linear-gradient(135deg, #fef3c7, #fef08a)' }}>
                    <strong>🔍 Frontend filtr aplikován:</strong> {response.frontendFilterApplied}
                    <br />
                    <small>Z BE přišlo <strong>{response.stats.totalFromBE}</strong> objednávek, po frontend filtraci zůstalo <strong>{response.stats.total}</strong></small>
                  </Alert>
                )}

                {Object.keys(response.stats.byYear).length > 0 && (
                  <Alert className="info">
                    <strong>📅 Rozložení podle roku:</strong>
                    <ResponseBox style={{ marginTop: '10px' }}>
                      {JSON.stringify(response.stats.byYear, null, 2)}
                    </ResponseBox>
                  </Alert>
                )}

                {Object.keys(response.stats.byUser).length > 0 && (
                  <Alert className="info">
                    <strong>👤 Rozložení podle uživatele:</strong>
                    <ResponseBox style={{ marginTop: '10px' }}>
                      {JSON.stringify(response.stats.byUser, null, 2)}
                    </ResponseBox>
                  </Alert>
                )}
              </Section>
            )}

            <ResponseBox>
              {(() => {
                // Pro attachment lists zobraz jen posledních 10
                if (response.data?.data?.attachments && Array.isArray(response.data.data.attachments)) {
                  const attachments = response.data.data.attachments;
                  const last10 = attachments.slice(-10);
                  return JSON.stringify({
                    ...response.data,
                    data: {
                      ...response.data.data,
                      attachments: last10,
                      _note: `Zobrazeno posledních ${last10.length} z ${attachments.length} příloh`
                    }
                  }, null, 2);
                }
                // Pro order lists zobraz jen posledních 10
                if (response.data?.data?.orders && Array.isArray(response.data.data.orders)) {
                  const orders = response.data.data.orders;
                  const last10 = orders.slice(-10);
                  return JSON.stringify({
                    ...response.data,
                    data: {
                      ...response.data.data,
                      orders: last10,
                      _note: `Zobrazeno posledních ${last10.length} z ${orders.length} objednávek`
                    }
                  }, null, 2);
                }
                // Jinak zobraz vše
                return JSON.stringify(response.data, null, 2);
              })()}
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
          <>
            <Alert className="info">
              ℹ️ <strong>Návod k použití:</strong>
              <br />
              1. Zkontrolujte, že jste přihlášeni (vidíte username a token nahoře)
              <br />
              2. Zadejte Order ID pro testy GET/UPDATE/DELETE/TIMESTAMP
              <br />
              3. Pro Attachments: Vyberte soubor a zadejte Order ID / Invoice ID
              <br />
              4. Klikněte na tlačítko pro test konkrétního API endpointu
              <br />
              5. Výsledek se zobrazí níže
              <br />
              <br />
              ⚠️ <strong>Známé problémy (backend):</strong>
              <br />
              • <code>LIST ALL Order Attachments</code> - Backend má chybu v SQL (chybí sloupec velikost_souboru)
              <br />
              • <code>LIST ALL Invoice Attachments</code> - Může mít stejný problém
              <br />
              → Testujte nejprve jednotlivé operace (UPLOAD, LIST pro konkrétní Order/Invoice)
            </Alert>

            <Section>
              <h2>📡 Očekávaná Response od BE (LIST Orders)</h2>
              <ResponseBox>
{`{
  "status": "ok",
  "debug": "Jsi tu - username: admin",
  "message": "DEBUG: handle_order_v2_list reached successfully",
  "input_received": {
    "has_token": true,
    "has_username": true,
    "token_length": 24
  }
}`}
              </ResponseBox>
            </Section>
          </>
        )}
      </Content>
    </Container>
  );
};

export default OrderV2TestPanel;
