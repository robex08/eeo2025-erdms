import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { loadAuthData } from '../utils/authStorage';
// ✅ NOVÝ NOTIFIKAČNÍ SYSTÉM - použij notificationService
import { notificationService } from '../services/notificationsUnified';

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

const Section = styled.div`
  margin-bottom: 39px;  /* 30px * 1.3 */

  h2 {
    color: #202d65;
    margin-bottom: 19.5px;  /* 15px * 1.3 */
    font-size: 26px;        /* 20px * 1.3 */
    border-bottom: 2.6px solid #304e85;  /* 2px * 1.3 */
    padding-bottom: 10.4px;  /* 8px * 1.3 */
  }
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(325px, 1fr));  /* 250px * 1.3 */
  gap: 19.5px;  /* 15px * 1.3 */
  margin-top: 19.5px;
`;

const TestButton = styled.button`
  padding: 19.5px 26px;  /* 15px * 1.3, 20px * 1.3 */
  border: none;
  border-radius: 13px;    /* 10px * 1.3 */
  font-size: 18.2px;      /* 14px * 1.3 */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 13px;              /* 10px * 1.3 */
  box-shadow: 0 2.6px 10.4px rgba(0, 0, 0, 0.1);  /* 2px * 1.3, 8px * 1.3 */

  &:hover {
    transform: translateY(-2.6px);  /* -2px * 1.3 */
    box-shadow: 0 5.2px 15.6px rgba(0, 0, 0, 0.2);  /* 4px * 1.3, 12px * 1.3 */
  }

  &:active {
    transform: translateY(0);
  }

  .icon {
    font-size: 26px;  /* 20px * 1.3 */
  }
`;

const BtnSuccess = styled(TestButton)`
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: white;
`;

const BtnDanger = styled(TestButton)`
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
`;

const BtnInfo = styled(TestButton)`
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
`;

const Button = styled.button`
  padding: 10.4px 20.8px;
  border: none;
  border-radius: 7.8px;
  font-size: 15.6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BtnWarning = styled(TestButton)`
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
`;

const BtnSecondary = styled(TestButton)`
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
`;

const BtnPrimary = styled(TestButton)`
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
`;

const BtnAll = styled(TestButton)`
  background: linear-gradient(135deg, #202d65, #304e85);
  color: white;
  font-size: 20.8px;      /* 16px * 1.3 */
  padding: 23.4px 31.2px; /* 18px * 1.3, 24px * 1.3 */
  grid-column: 1 / -1;
`;

const Alert = styled.div`
  padding: 19.5px 26px;  /* 15px * 1.3, 20px * 1.3 */
  border-radius: 13px;    /* 10px * 1.3 */
  margin-bottom: 26px;    /* 20px * 1.3 */
  font-size: 18.2px;      /* 14px * 1.3 */
  line-height: 1.6;

  &.warning {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }

  &.info {
    background: #dbeafe;
    border-left: 4px solid #3b82f6;
    color: #1e3a8a;
  }

  &.success {
    background: #d1fae5;
    border-left: 4px solid #16a34a;
    color: #065f46;
  }

  &.error {
    background: #fee2e2;
    border-left: 4px solid #dc2626;
    color: #991b1b;
  }

  strong {
    font-weight: 600;
    display: block;
    margin-bottom: 6.5px;  /* 5px * 1.3 */
  }
`;

const LogContainer = styled.div`
  background: #1f2937;
  color: #10b981;
  padding: 26px;          /* 20px * 1.3 */
  border-radius: 13px;    /* 10px * 1.3 */
  font-family: 'Courier New', monospace;
  font-size: 15.6px;      /* 12px * 1.3 */
  max-height: 520px;      /* 400px * 1.3 */
  overflow-y: auto;
  margin-top: 15px;
`;

const LogEntry = styled.div`
  margin-bottom: 10.4px;  /* 8px * 1.3 */
  line-height: 1.5;

  &.error { color: #ef4444; }
  &.success { color: #10b981; }
  &.info { color: #3b82f6; }
  &.warning { color: #f59e0b; }
`;

const ClearBtn = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 10.4px 20.8px;  /* 8px * 1.3, 16px * 1.3 */
  border-radius: 7.8px;     /* 6px * 1.3 */
  cursor: pointer;
  font-size: 15.6px;        /* 12px * 1.3 */
  margin-top: 13px;         /* 10px * 1.3 */

  &:hover {
    background: #dc2626;
  }
`;

const RecipientSelector = styled.div`
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 13px;
  padding: 19.5px;
  margin-bottom: 26px;

  h3 {
    color: #202d65;
    font-size: 20.8px;
    margin-bottom: 15.6px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 13px;
  margin-top: 15.6px;
  flex-wrap: wrap;
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 13px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 10.4px;
  cursor: pointer;
  padding: 10.4px;
  border-radius: 7.8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(32, 45, 101, 0.05);
  }

  input[type="radio"] {
    width: 20.8px;
    height: 20.8px;
    cursor: pointer;
  }

  span {
    font-size: 16.9px;
  }
`;

const InputGroup = styled.div`
  margin-top: 10.4px;
  margin-left: 31.2px;

  input {
    width: 100%;
    max-width: 390px;
    padding: 10.4px 15.6px;
    border: 1.3px solid #cbd5e1;
    border-radius: 7.8px;
    font-size: 16.9px;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3.9px rgba(59, 130, 246, 0.1);
    }
  }

  small {
    display: block;
    margin-top: 6.5px;
    color: #64748b;
    font-size: 14.3px;
  }
`;

const NotificationTestPanel = () => {
  const [logs, setLogs] = useState([{ time: new Date(), message: 'Ready to test notifications...', type: 'info' }]);
  const [authStatus, setAuthStatus] = useState({ authenticated: false, username: null });
  const [recipientMode, setRecipientMode] = useState('current'); // 'current', 'user', 'users', 'all'
  const [recipientUserId, setRecipientUserId] = useState('5');
  const [recipientUserIds, setRecipientUserIds] = useState('3,5,8');
  const [testOrderId, setTestOrderId] = useState(''); // ID objednávky pro testování
  const [loadingLastOrder, setLoadingLastOrder] = useState(false);

  useEffect(() => {
    checkAuth();
    loadLastOrderId(); // Automaticky načti poslední objednávku
  }, []);

  const checkAuth = async () => {
    try {
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();

      if (token && user?.username) {
        setAuthStatus({ authenticated: true, username: user.username });
        addLog(`✅ Authenticated as: ${user.username}`, 'success');
      } else {
        setAuthStatus({ authenticated: false, username: null });
        addLog('⚠️ Not authenticated!', 'error');
      }
    } catch (error) {
      addLog(`❌ Auth error: ${error.message}`, 'error');
    }
  };

  const loadLastOrderId = async () => {
    setLoadingLastOrder(true);
    try {
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();

      if (!token || !user?.username) {
        addLog('⚠️ Cannot load order - not authenticated', 'warning');
        setLoadingLastOrder(false);
        return;
      }

      const baseURL = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';

      // Načti seznam objednávek (poslední první)
      const response = await fetch(`${baseURL}order-v2/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username: user.username,
          limit: 1,
          offset: 0,
          sort_by: 'id',
          sort_order: 'DESC'
        })
      });

      const data = await response.json();

      if (data.status === 'ok' && data.data && data.data.length > 0) {
        const lastOrderId = data.data[0].id;
        setTestOrderId(lastOrderId.toString());
        addLog(`✅ Auto-loaded last order ID: ${lastOrderId}`, 'success');
      } else {
        addLog('⚠️ No orders found in database', 'warning');
        setTestOrderId('1'); // Fallback
      }

    } catch (error) {
      addLog(`❌ Failed to load last order: ${error.message}`, 'error');
      setTestOrderId('1'); // Fallback
    } finally {
      setLoadingLastOrder(false);
    }
  };

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date(), message, type }]);
  };

  const clearLog = () => {
    setLogs([{ time: new Date(), message: 'Log cleared...', type: 'info' }]);
  };

  const createNotification = async (type) => {
    addLog(`Creating notification: ${type}`, 'info');
    const baseURL = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';

    // Zobraz info o příjemci
    let recipientInfo = '';
    if (recipientMode === 'current') {
      recipientInfo = `Current user (${authStatus.username})`;
    } else if (recipientMode === 'user') {
      recipientInfo = `Single user ID: ${recipientUserId}`;
    } else if (recipientMode === 'users') {
      recipientInfo = `Multiple users: [${recipientUserIds}]`;
    } else if (recipientMode === 'all') {
      recipientInfo = 'ALL USERS (broadcast)';
    }
    addLog(`📤 Recipient: ${recipientInfo}`, 'info');

    try {
      // Kontrola autentizace
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();

      if (!token || !user?.username) {
        addLog('ERROR: Not authenticated!', 'error');
        return;
      }

      // ✅ NOVÝ SYSTÉM: Použij notificationService s order_id
      // Backend načte všechna data z DB a automaticky vyplní placeholdery
      const orderIdToUse = parseInt(testOrderId) || 1;

      if (!testOrderId || testOrderId === '') {
        addLog(`⚠️ WARNING: No order ID set! Using fallback ID: 1`, 'warning');
        addLog(`💡 TIP: Set a valid order ID in the input field above`, 'info');
      } else {
        addLog(`📋 Using order_id: ${orderIdToUse}`, 'info');
      }

      // Připrav příjemce podle zvoleného režimu
      let recipients = null;
      let to_user_id = null;

      if (recipientMode === 'user') {
        to_user_id = parseInt(recipientUserId);
      } else if (recipientMode === 'users') {
        recipients = recipientUserIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      } else if (recipientMode === 'current') {
        to_user_id = user.id; // Aktuálně přihlášený uživatel
      }
      // Pro 'all' zatím není podpora v novém API

  addLog(`Sending POST request to ${baseURL}notifications/create...`, 'info');

      // Zobraz debug info

      if (recipients) {
      } else if (to_user_id) {
      }


      const payloadPreview = {
        type: type,
        order_id: orderIdToUse,
        recipient: recipients ? `users: [${recipients.join(',')}]` : `user_id: ${to_user_id}`
      };
      addLog(`📦 Payload: ${JSON.stringify(payloadPreview)}`, 'info');

      // ✅ VOLÁNÍ NOVÉHO API přes notificationService
      const result = await notificationService.create({
        token,
        username: user.username,
        type: type,
        order_id: orderIdToUse,
        action_user_id: user.id,
        to_user_id: to_user_id,
        recipients: recipients
      });

      // Debug - zobraz celou response

      addLog(`📦 Backend response: ${JSON.stringify(result)}`, 'info');

      // Kontrola ID (backend vrací notification_id)
      if (result.notification_id) {
        addLog(`✅ SUCCESS: Notification created! ID: ${result.notification_id}`, 'success');
      } else if (result.id) {
        addLog(`✅ SUCCESS: Notification created! ID: ${result.id}`, 'success');
      } else {
        addLog(`⚠️ WARNING: Notification created but ID not returned!`, 'warning');
        addLog(`💡 Backend should return { status: 'ok', notification_id: 123 }`, 'info');
      }

      addLog(`🔔 Notification will appear in bell icon within 60 seconds (background refresh)`, 'success');

    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, 'error');

      // Kontrola, zda chyba obsahuje HTML (endpoint neexistuje)
      if (error.message && (error.message.includes('<!doctype') || error.message.includes('HTML'))) {
        addLog(`⚠️ Backend endpoint might not exist yet.`, 'error');
        addLog(`💡 Ask backend developer to implement: POST ${baseURL}notifications/create`, 'info');
      }

      // Zobraz detaily chyby
      if (error.response) {
        addLog(`HTTP Status: ${error.response.status}`, 'error');
        addLog(`Response: ${JSON.stringify(error.response.data)}`, 'error');
      }
    }
  };

  // === 2️⃣ CREATE ALL NOTIFICATIONS (for bulk testing) ===
  const createAllNotifications = async () => {
    addLog('🚀 Creating all notification types...', 'info');

    const types = [
      // Stavy objednávek (12 typů)
      'order_status_nova',
      'order_status_ke_schvaleni',
      'order_status_schvalena',
      'order_status_zamitnuta',
      'order_status_ceka_se',
      'order_status_odeslana',
      'order_status_potvrzena',
      'order_status_dokoncena',
      'order_status_zrusena',
      'order_status_ceka_potvrzeni',
      'order_status_smazana',
      'order_status_rozpracovana',
      // Obecné notifikace (6 typů)
      'order_approved',
      'order_rejected',
      'order_created',
      'system_maintenance',
      'user_mention',
      'deadline_reminder',
      // TODO alarmy (3 typy)
      'alarm_todo_normal',
      'alarm_todo_high',
      'alarm_todo_expired'
    ];

    for (const type of types) {
      await createNotification(type);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    addLog('✅ All notifications created!', 'success');
  };

  // Speciální funkce pro testování TODO alarmů přes dedikované API funkce
  const testTodoAlarmDirect = async (type) => {
    addLog(`Testing TODO alarm directly: ${type}`, 'info');

    try {
      const user = await loadAuthData.user();
      const userName = user?.fullName || user?.username || 'Test User';

      // Připrav testovací data
      const testTodo = {
        id: Math.floor(Math.random() * 1000),
        title: type === 'normal' ? 'Zkontrolovat fakturu' :
               type === 'high' ? 'URGENTNÍ: Schválit objednávku' :
               'Odeslat report',
        alarmTime: type === 'normal' ? new Date(Date.now() + 3600000) :
                  type === 'high' ? new Date(Date.now() + 1800000) :
                  new Date(Date.now() - 3600000),
        orderNumber: '2025-TEST',
        orderId: 999
      };

      addLog(`📤 Calling unified notificationService for TODO alarm (${type})...`, 'info');

      // Map old helper functions to new notificationService.create calls
      let result;
      const token = await loadAuthData.token();
      const username = (await loadAuthData.user())?.username;

      const typeMap = {
        normal: 'alarm_todo_normal',
        high: 'alarm_todo_high',
        expired: 'alarm_todo_expired'
      };

      const notifType = typeMap[type] || 'alarm_todo_normal';

      result = await notificationService.create({
        token,
        username,
        type: notifType,
        order_id: testTodo.orderId,
        action_user_id: (await loadAuthData.user())?.id,
        custom_placeholders: {
          todo_id: testTodo.id,
          todo_title: testTodo.title,
          alarm_time: testTodo.alarmTime.toISOString(),
          order_number: testTodo.orderNumber
        }
      });

      addLog(`📦 Backend response: ${JSON.stringify(result)}`, 'info');

      if (result.notification_id || result.id) {
        addLog(`✅ SUCCESS: TODO alarm sent! ID: ${result.notification_id || result.id}`, 'success');
      } else {
        addLog(`⚠️ WARNING: Response received but no ID!`, 'warning');
      }

      addLog(`🔔 Alarm will appear in bell icon within 60 seconds`, 'success');

    } catch (error) {
      addLog(`❌ ERROR: ${error.message}`, 'error');
    }
  };

  return (
    <Container>
      <Content>
        {authStatus.authenticated ? (
          <Alert className="success">
            <strong>✅ Přihlášen jako:</strong> {authStatus.username}
            <div style={{ marginTop: '13px', padding: '10.4px', background: 'rgba(22, 163, 74, 0.1)', borderRadius: '7.8px' }}>
              <strong>👤 Příjemce notifikací:</strong><br />
              Notifikace se vytvoří <strong>pouze pro tebe</strong> ({authStatus.username}).<br />
              Backend použije <code>token</code> a <code>username</code> k určení <code>user_id</code>.
            </div>
          </Alert>
        ) : (
          <Alert className="warning">
            <strong>⚠️ DŮLEŽITÉ:</strong><br />
            Nejsi přihlášen! Přihlas se nejdřív, aby testování fungovalo.
          </Alert>
        )}

        <Alert className="info">
          <strong>💡 Jak testovat:</strong>
          <ol style={{ marginTop: '10px', marginLeft: '20px', marginBottom: '10px' }}>
            <li>Klikni na tlačítko níže pro vytvoření testovací notifikace</li>
            <li>Backend vytvoří notifikaci v databázi</li>
            <li>Počkej <strong>max. 60 sekund</strong> - background task aktualizuje každých 60s</li>
            <li>Zkontroluj <strong>červený badge</strong> na ikoně zvonečku v menu (vedle profilu)</li>
            <li>Klikni na <strong>zvoněček</strong> → otevře se dropdown s notifikacemi</li>
          </ol>
          <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
            ⏱️ <strong>Časování:</strong> Background task běží každých <strong>60 sekund</strong>.
            První kontrola proběhne do minuty od vytvoření notifikace.
          </div>
        </Alert>

        {authStatus.authenticated && (
          <Alert className="error">
            <strong>⚠️ BACKEND KONTROLA:</strong><br />
            Pokud se notifikace nezobrazí ani po minutě, zkontroluj:
            <ul style={{ marginTop: '13px', marginLeft: '26px' }}>
              <li>Je endpoint <code>POST /api.eeo/notifications/create</code> implementován?</li>
              <li>Vrací backend správné ID v response? (viz log níže)</li>
              <li>Je notifikace uložena v DB tabulce <code>25_notifications</code>?</li>
              <li><strong>Je <code>user_id</code> správně nastaveno?</strong> Backend musí:
                <ul style={{ marginTop: '6.5px' }}>
                  <li>Vzít <code>username</code> z payloadu</li>
                  <li>Najít odpovídající <code>user_id</code> v DB (např. tabulka <code>users</code>)</li>
                  <li>Uložit notifikaci s tímto <code>user_id</code></li>
                </ul>
              </li>
            </ul>
            <div style={{ marginTop: '13px', padding: '10.4px', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '7.8px' }}>
              <strong>💡 SQL příklad kontroly:</strong><br />
              <code style={{ fontSize: '14.3px' }}>
                SELECT * FROM 25_notifications WHERE user_id = (SELECT id FROM users WHERE username = '{authStatus.username}') ORDER BY created_at DESC LIMIT 5;
              </code>
            </div>
          </Alert>
        )}

        <RecipientSelector>
          <h3>🆔 ID Objednávky pro testování</h3>
          <InputGroup>
            <input
              type="number"
              placeholder="např. 42"
              value={testOrderId}
              onChange={(e) => setTestOrderId(e.target.value)}
              disabled={loadingLastOrder}
            />
            <small>
              {loadingLastOrder ? '⏳ Načítám poslední objednávku...' :
               testOrderId ? `✅ Backend načte data z objednávky ID: ${testOrderId}` :
               '⚠️ Zadej ID existující objednávky z databáze'}
            </small>
          </InputGroup>
          <ButtonRow>
            <Button onClick={loadLastOrderId} disabled={loadingLastOrder}>
              🔄 Načíst poslední objednávku
            </Button>
          </ButtonRow>
        </RecipientSelector>

        <RecipientSelector>
          <h3>👥 Komu poslat notifikaci?</h3>
          <RadioGroup>
            <RadioOption>
              <input
                type="radio"
                name="recipient"
                value="current"
                checked={recipientMode === 'current'}
                onChange={(e) => setRecipientMode(e.target.value)}
              />
              <span><strong>Aktuální uživatel</strong> ({authStatus.username}) - Backend použije token</span>
            </RadioOption>

            <RadioOption>
              <input
                type="radio"
                name="recipient"
                value="user"
                checked={recipientMode === 'user'}
                onChange={(e) => setRecipientMode(e.target.value)}
              />
              <span><strong>Konkrétní uživatel</strong> (to_user_id)</span>
            </RadioOption>
            {recipientMode === 'user' && (
              <InputGroup>
                <input
                  type="number"
                  placeholder="5"
                  value={recipientUserId}
                  onChange={(e) => setRecipientUserId(e.target.value)}
                />
                <small>Zadej ID uživatele (např. 5)</small>
              </InputGroup>
            )}

            <RadioOption>
              <input
                type="radio"
                name="recipient"
                value="users"
                checked={recipientMode === 'users'}
                onChange={(e) => setRecipientMode(e.target.value)}
              />
              <span><strong>Skupina uživatelů</strong> (to_users) - např. GARANT + PŘÍKAZCE</span>
            </RadioOption>
            {recipientMode === 'users' && (
              <InputGroup>
                <input
                  type="text"
                  placeholder="3,5,8"
                  value={recipientUserIds}
                  onChange={(e) => setRecipientUserIds(e.target.value)}
                />
                <small>Zadej ID oddělená čárkou (např. 3,5,8)</small>
              </InputGroup>
            )}

            <RadioOption>
              <input
                type="radio"
                name="recipient"
                value="all"
                checked={recipientMode === 'all'}
                onChange={(e) => setRecipientMode(e.target.value)}
              />
              <span><strong>⚠️ Všichni uživatelé</strong> (to_all_users=true) - BROADCAST</span>
            </RadioOption>
          </RadioGroup>
        </RecipientSelector>

        <Section>
          <h2>� STAVY OBJEDNÁVEK (12 typů)</h2>
          <ButtonGrid>
            <TestButton style={{background: 'linear-gradient(135deg, #64748b, #475569)', color: 'white'}}
                        onClick={() => createNotification('order_status_nova')}>
              <span className="icon">📝</span>
              <span>Nová objednávka</span>
            </TestButton>

            <BtnInfo onClick={() => createNotification('order_status_ke_schvaleni')}>
              <span className="icon">�📋</span>
              <span>Ke schválení</span>
            </BtnInfo>

            <BtnSuccess onClick={() => createNotification('order_status_schvalena')}>
              <span className="icon">✅</span>
              <span>Schválena</span>
            </BtnSuccess>

            <BtnDanger onClick={() => createNotification('order_status_zamitnuta')}>
              <span className="icon">❌</span>
              <span>Zamítnuta</span>
            </BtnDanger>

            <BtnWarning onClick={() => createNotification('order_status_ceka_se')}>
              <span className="icon">⏸️</span>
              <span>Čeká se</span>
            </BtnWarning>

            <BtnInfo onClick={() => createNotification('order_status_odeslana')}>
              <span className="icon">📤</span>
              <span>Odeslána</span>
            </BtnInfo>

            <BtnSuccess onClick={() => createNotification('order_status_potvrzena')}>
              <span className="icon">✔️</span>
              <span>Potvrzena</span>
            </BtnSuccess>

            <BtnSuccess onClick={() => createNotification('order_status_dokoncena')}>
              <span className="icon">🎉</span>
              <span>Dokončena</span>
            </BtnSuccess>

            <BtnDanger onClick={() => createNotification('order_status_zrusena')}>
              <span className="icon">🚫</span>
              <span>Zrušena</span>
            </BtnDanger>

            <BtnWarning onClick={() => createNotification('order_status_ceka_potvrzeni')}>
              <span className="icon">⏳</span>
              <span>Čeká na potvrzení</span>
            </BtnWarning>

            <TestButton style={{background: 'linear-gradient(135deg, #991b1b, #7f1d1d)', color: 'white'}}
                        onClick={() => createNotification('order_status_smazana')}>
              <span className="icon">🗑️</span>
              <span>Smazána</span>
            </TestButton>

            <TestButton style={{background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white'}}
                        onClick={() => createNotification('order_status_rozpracovana')}>
              <span className="icon">🔄</span>
              <span>Rozpracována</span>
            </TestButton>
          </ButtonGrid>
        </Section>

        <Section>
          <h2>⏰ TODO ALARMY (3 typy) - NOVÉ!</h2>
          <Alert className="info" style={{ marginBottom: '19.5px' }}>
            <strong>💡 TODO Alarm Systém:</strong>
            <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
              <li><strong>alarm_todo_normal</strong> - Běžný připomínač úkolu (priorita: normal)</li>
              <li><strong>alarm_todo_high</strong> - Urgentní úkol s emailem (priorita: high, send_email: true)</li>
              <li><strong>alarm_todo_expired</strong> - Prošlý termín s emailem (priorita: high, send_email: true)</li>
            </ul>
            <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
              ⏱️ <strong>Kontrola alarmů:</strong> Automaticky každých <strong>60 sekund</strong> přes background task checkNotifications.
            </div>
          </Alert>
          <ButtonGrid>
            <TestButton style={{background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white'}}
                        onClick={() => createNotification('alarm_todo_normal')}>
              <span className="icon">⏰</span>
              <span>Běžný TODO alarm</span>
            </TestButton>

            <TestButton style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white'}}
                        onClick={() => createNotification('alarm_todo_high')}>
              <span className="icon">⚠️</span>
              <span>URGENTNÍ TODO alarm</span>
            </TestButton>

            <TestButton style={{background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white'}}
                        onClick={() => createNotification('alarm_todo_expired')}>
              <span className="icon">🚨</span>
              <span>PROŠLÝ TODO alarm</span>
            </TestButton>
          </ButtonGrid>
        </Section>

        <Section>
          <h2>🎯 TODO ALARMY - Přímé API volání (Production-ready)</h2>
          <Alert className="success" style={{ marginBottom: '19.5px' }}>
            <strong>✅ Testování skutečných API funkcí:</strong>
            <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
              <li>Používá <code>notifyTodoAlarmNormal()</code>, <code>notifyTodoAlarmHigh()</code>, <code>notifyTodoAlarmExpired()</code></li>
              <li>Stejné funkce jako v <code>useTodoAlarms.js</code> hooku</li>
              <li>Automaticky formátuje data pro český jazyk</li>
              <li>High a Expired typy posílají i email</li>
            </ul>
          </Alert>
          <ButtonGrid>
            <TestButton style={{background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white'}}
                        onClick={() => testTodoAlarmDirect('normal')}>
              <span className="icon">✅</span>
              <span>Test NORMAL alarm (API)</span>
            </TestButton>

            <TestButton style={{background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white'}}
                        onClick={() => testTodoAlarmDirect('high')}>
              <span className="icon">🔥</span>
              <span>Test HIGH alarm (API + Email)</span>
            </TestButton>

            <TestButton style={{background: 'linear-gradient(135deg, #991b1b, #7f1d1d)', color: 'white'}}
                        onClick={() => testTodoAlarmDirect('expired')}>
              <span className="icon">💥</span>
              <span>Test EXPIRED alarm (API + Email)</span>
            </TestButton>
          </ButtonGrid>
        </Section>

        <Section>
          <h2>📋 OBECNÉ NOTIFIKACE (6 typů - deprecated)</h2>
          <ButtonGrid>
            <BtnSuccess onClick={() => createNotification('order_approved')}>
              <span className="icon">✅</span>
              <span>[OLD] Objednávka schválena</span>
            </BtnSuccess>

            <BtnDanger onClick={() => createNotification('order_rejected')}>
              <span className="icon">❌</span>
              <span>[OLD] Objednávka zamítnuta</span>
            </BtnDanger>

            <BtnInfo onClick={() => createNotification('order_created')}>
              <span className="icon">📋</span>
              <span>[OLD] Nová objednávka</span>
            </BtnInfo>

            <BtnWarning onClick={() => createNotification('system_maintenance')}>
              <span className="icon">🔧</span>
              <span>Systémová údržba</span>
            </BtnWarning>

            <BtnSecondary onClick={() => createNotification('user_mention')}>
              <span className="icon">👤</span>
              <span>Zmínka v komentáři</span>
            </BtnSecondary>

            <BtnPrimary onClick={() => createNotification('deadline_reminder')}>
              <span className="icon">⏰</span>
              <span>Upozornění na termín</span>
            </BtnPrimary>
          </ButtonGrid>
        </Section>

        <Section>
          <h2>🚀 Hromadné akce</h2>
          <BtnAll onClick={createAllNotifications}>
            <span className="icon">🔔</span>
            <span>Vytvořit všechny typy notifikací najednou</span>
          </BtnAll>
        </Section>

        <Section>
          <h2>📜 Log</h2>
          <LogContainer>
            {logs.map((log, index) => (
              <LogEntry key={index} className={log.type}>
                [{log.time.toLocaleTimeString('cs-CZ')}] {log.message}
              </LogEntry>
            ))}
          </LogContainer>
          <ClearBtn onClick={clearLog}>Vymazat log</ClearBtn>
        </Section>
      </Content>
    </Container>
  );
};

export default NotificationTestPanel;
