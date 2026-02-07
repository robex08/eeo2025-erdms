import React, { useState } from 'react';
import notificationService from '../services/notificationService';
import { NOTIFICATION_TYPES, getNotificationTypeName, getNotificationIcon } from '../constants/notificationTypes';

/**
 * Testovací komponenta pro notifikační systém
 * Použití: Importuj do App.js pro rychlý test
 */
const NotificationTester = ({ token, username, userId }) => {
  const [orderId, setOrderId] = useState('');
  const [selectedType, setSelectedType] = useState('ORDER_APPROVED');
  const [recipientId, setRecipientId] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Typy notifikací pro objednávky (nejpoužívanější)
  const orderNotificationTypes = [
    'ORDER_PENDING_APPROVAL',
    'ORDER_APPROVED',
    'ORDER_REJECTED',
    'ORDER_AWAITING_CHANGES',
    'ORDER_SENT_TO_SUPPLIER',
    'ORDER_CONFIRMED_BY_SUPPLIER',
    'ORDER_REGISTRY_PUBLISHED',
    'ORDER_INVOICE_ADDED',
    'ORDER_INVOICE_PAID',
    'INVOICE_MATERIAL_CHECK_APPROVED',
    'INVOICE_MATERIAL_CHECK_REJECTED'
  ];

  const handlePreview = async () => {
    if (!orderId) {
      alert('Zadejte Order ID!');
      return;
    }

    setLoading(true);
    setPreview(null);
    setResult(null);

    try {
      const response = await notificationService.preview({
        token,
        username,
        type: selectedType,
        order_id: parseInt(orderId),
        action_user_id: userId
      });

      setPreview(response);
      // Preview loaded successfully
    } catch (error) {
      console.error('❌ Chyba:', error);
      alert('Chyba při načítání náhledu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!orderId || !recipientId) {
      alert('Zadejte Order ID a Recipient ID!');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await notificationService.create({
        token,
        username,
        type: selectedType,
        order_id: parseInt(orderId),
        action_user_id: userId,
        to_user_id: parseInt(recipientId)
      });

      setResult(response);
      // Notification sent successfully
      alert(`✅ Notifikace odeslána! ID: ${response.notification_id}`);
    } catch (error) {
      console.error('❌ Chyba:', error);
      alert('Chyba při odesílání: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '20px',
      width: '400px',
      backgroundColor: '#fff',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <h3 style={{ marginTop: 0, color: '#007bff' }}>
        🔔 Notification Tester
      </h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Order ID:
        </label>
        <input
          type="number"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="např. 123"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Typ notifikace:
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          {orderNotificationTypes.map(type => (
            <option key={type} value={type}>
              {getNotificationIcon(type)} {getNotificationTypeName(type)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Recipient User ID:
        </label>
        <input
          type="number"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          placeholder="např. 10"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <small style={{ color: '#666' }}>
          Pro ODESLÁNÍ notifikace (nepovinné pro náhled)
        </small>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={handlePreview}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳' : '👁️'} Náhled
        </button>
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳' : '📤'} Odeslat
        </button>
      </div>

      {preview && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginTop: 0, color: '#28a745' }}>✅ Náhled:</h4>

          <div style={{ marginBottom: '10px' }}>
            <strong>📱 App Title:</strong>
            <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '4px', marginTop: '5px' }}>
              {preview.template?.app_title || 'N/A'}
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>💬 App Message:</strong>
            <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '4px', marginTop: '5px' }}>
              {preview.template?.app_message || 'N/A'}
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>📧 Email Subject:</strong>
            <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '4px', marginTop: '5px' }}>
              {preview.template?.email_subject || 'N/A'}
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>📝 Email Body (zkráceno):</strong>
            <div style={{
              padding: '8px',
              backgroundColor: '#fff',
              borderRadius: '4px',
              marginTop: '5px',
              maxHeight: '100px',
              overflow: 'auto',
              fontSize: '12px',
              whiteSpace: 'pre-wrap'
            }}>
              {preview.template?.email_body?.substring(0, 200) || 'N/A'}...
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#666' }}>
            <strong>Použité placeholdery:</strong> {preview.placeholders_used?.length || 0}
            {preview.missing_data?.length > 0 && (
              <div style={{ color: '#dc3545', marginTop: '5px' }}>
                ⚠️ Chybějící data: {preview.missing_data.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          borderRadius: '4px',
          border: '1px solid #c3e6cb'
        }}>
          <h4 style={{ marginTop: 0, color: '#155724' }}>✅ Odesláno!</h4>
          <div style={{ fontSize: '14px' }}>
            <strong>Notification ID:</strong> {result.notification_id}<br />
            <strong>Příjemců:</strong> {result.recipients_count}<br />
            <strong>Email odeslán:</strong> {result.email_sent ? '✅ Ano' : '❌ Ne'}
          </div>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666', borderTop: '1px solid #dee2e6', paddingTop: '10px' }}>
        <strong>ℹ️ Info:</strong><br />
        • Backend automaticky naplní 50+ placeholderů z order_id<br />
        • Náhled nezakládá notifikaci v DB<br />
        • Odeslání vytvoří notifikaci v DB
      </div>
    </div>
  );
};

export default NotificationTester;
