# 🔔 Frontend Integrace - Notifikační Systém

**Datum:** 29. října 2025  
**Backend Status:** ✅ HOTOVO (commit `3a28a99`)  
**Frontend Status:** 🔄 INTEGRACE PROBÍHÁ

---

## 🎯 Co backend má hotové

### ✅ API Endpointy
1. **`/notifications/create`** - Vytvoření notifikace (rozšířeno o `order_id`)
2. **`/notifications/preview`** - Náhled notifikace před odesláním (NOVÉ)
3. **`/notifications/templates`** - Seznam všech templates (NOVÉ)
4. **`/notifications/send-bulk`** - Hromadné odeslání (NOVÉ)

### ✅ Databáze
- Tabulka `25_notification_templates` obsahuje **30 templates**
- Automatické naplňování **50+ placeholderů**
- Email notifikace připraveny

---

## 📋 Mapování Backend Templates na Workflow

### Backend má (30 templates v DB):
```javascript
// FÁZE 1-2: Základní stavy
'order_status_nova'           // ID 1  - Nová objednávka
'order_status_rozpracovana'   // ID 2  - Rozpracovaná
'order_status_ke_schvaleni'   // ID 3  - Ke schválení ⚡
'order_status_schvalena'      // ID 4  - Schválena
'order_status_zamitnuta'      // ID 5  - Zamítnuta ⚡
'order_status_ceka_se'        // ID 6  - Vrácena k doplnění

// FÁZE 3-4: Dodavatel
'order_status_odeslana'       // ID 7  - Odeslána dodavateli
'order_status_ceka_potvrzeni' // ID 8  - Čeká na potvrzení
'order_status_potvrzena'      // ID 9  - Potvrzena

// FÁZE 5: Registr smluv (NOVÉ)
'order_status_registr_ceka'      // ID 13 - Čeká na registr
'order_status_registr_zverejnena' // ID 14 - Zveřejněna

// FÁZE 6: Fakturace (NOVÉ)
'order_status_faktura_ceka'      // ID 15 - Čeká na fakturu
'order_status_faktura_pridana'   // ID 16 - Faktura přidána
'order_status_faktura_schvalena' // ID 17 - Faktura schválena
'order_status_faktura_uhrazena'  // ID 18 - Faktura uhrazena

// FÁZE 7: Věcná správnost (NOVÉ)
'order_status_kontrola_ceka'      // ID 19 - Čeká na kontrolu ⚡
'order_status_kontrola_potvrzena' // ID 20 - Potvrzena
'order_status_kontrola_zamitnuta' // ID 21 - Zamítnuta/Reklamace ⚡

// TODO ALARMY (5 templates)
'alarm_todo_normal'   // ID 22 - Běžná připomínka
'alarm_todo_high'     // ID 23 - Urgentní ⚡
'alarm_todo_expired'  // ID 24 - Prošlý termín ⚡
'todo_completed'      // ID 25 - Dokončeno
'todo_assigned'       // ID 26 - Přiřazeno

// SYSTÉMOVÉ (10 templates)
'system_maintenance_scheduled' // ID 27 - Plánovaná údržba
'system_maintenance_starting'  // ID 28 - Údržba začíná ⚡
'system_maintenance_finished'  // ID 29 - Údržba dokončena
'system_backup_completed'      // ID 30 - Záloha dokončena
'system_update_available'      // ID 31 - Dostupná aktualizace
'system_update_installed'      // ID 32 - Aktualizace instalována
'system_security_alert'        // ID 33 - Bezpečnostní alert ⚡
'system_user_login_alert'      // ID 34 - Neobvyklé přihlášení ⚡
'system_session_expired'       // ID 35 - Relace vypršela
'system_storage_warning'       // ID 36 - Málo místa ⚡

// OSTATNÍ (3 templates)
'user_mention'          // ID 37 - Zmínka v komentáři
'deadline_reminder'     // ID 38 - Připomínka termínu ⚡
'order_unlock_forced'   // ID 39 - Nucené odemčení ⚡

// DEPRECATED (3 templates)
'order_approved'  // ID 40 - DEPRECATED → použij 'order_status_schvalena'
'order_rejected'  // ID 41 - DEPRECATED → použij 'order_status_zamitnuta'
'order_created'   // ID 42 - DEPRECATED → použij 'order_status_ke_schvaleni'
```

---

## 🔧 Helper Service pro Frontend

### Vytvoř: `src/services/notificationService.js`

```javascript
import api from './api.eeo';

/**
 * Notifikační service pro komunikaci s backend API
 */
class NotificationService {
  
  /**
   * Vytvoří notifikaci s automatickým naplněním placeholderů z objednávky
   * 
   * @param {Object} params
   * @param {string} params.token - User token
   * @param {string} params.username - Username
   * @param {string} params.type - Typ notifikace (z NOTIFICATION_TYPES)
   * @param {number} params.order_id - ID objednávky (automaticky naplní placeholdery)
   * @param {number} params.action_user_id - ID uživatele, který provedl akci
   * @param {number} [params.to_user_id] - ID příjemce (nebo použij to_users)
   * @param {number[]} [params.to_users] - Pole ID příjemců
   * @param {Object} [params.additional_data] - Dodatečná data (rejection_reason, atd.)
   * @param {string} [params.priority] - Přepíše default prioritu (urgent/high/normal/low)
   * @param {boolean} [params.send_email] - Přepíše default email nastavení
   * @param {Object} [params.template_override] - Přepíše části templatu
   * @returns {Promise<Object>} Response s notification_id a recipients_count
   */
  async create({
    token,
    username,
    type,
    order_id,
    action_user_id,
    to_user_id,
    to_users,
    additional_data = {},
    priority,
    send_email,
    template_override
  }) {
    try {
      const payload = {
        token,
        username,
        type,
        order_id,
        action_user_id
      };
      
      // Příjemci
      if (to_user_id) payload.to_user_id = to_user_id;
      if (to_users) payload.to_users = to_users;
      
      // Volitelné parametry
      if (Object.keys(additional_data).length > 0) {
        payload.additional_data = additional_data;
      }
      if (priority) payload.priority = priority;
      if (send_email !== undefined) payload.send_email = send_email;
      if (template_override) payload.template_override = template_override;
      
      const response = await api.post('/notifications/create', payload);
      
      console.log(`✅ Notifikace vytvořena: ${type} pro ${to_user_id || to_users?.length + ' uživatelů'}`);
      
      return response;
    } catch (error) {
      console.error('❌ Chyba při vytváření notifikace:', error);
      throw error;
    }
  }
  
  /**
   * Náhled notifikace PŘED odesláním (pro testování)
   */
  async preview({
    token,
    username,
    type,
    order_id,
    action_user_id,
    additional_data = {}
  }) {
    try {
      const response = await api.post('/notifications/preview', {
        token,
        username,
        type,
        order_id,
        action_user_id,
        additional_data
      });
      
      return response;
    } catch (error) {
      console.error('❌ Chyba při náhledu notifikace:', error);
      throw error;
    }
  }
  
  /**
   * Seznam všech dostupných notification templates (pro admin)
   */
  async getTemplates({
    token,
    username,
    active_only = true
  }) {
    try {
      const response = await api.post('/notifications/templates', {
        token,
        username,
        active_only
      });
      
      return response.data || [];
    } catch (error) {
      console.error('❌ Chyba při načítání templates:', error);
      throw error;
    }
  }
  
  /**
   * Hromadné odeslání notifikace více uživatelům
   */
  async sendBulk({
    token,
    username,
    type,
    order_id,
    action_user_id,
    recipients,
    additional_data = {}
  }) {
    try {
      const response = await api.post('/notifications/send-bulk', {
        token,
        username,
        type,
        order_id,
        action_user_id,
        recipients,
        additional_data
      });
      
      console.log(`✅ Hromadná notifikace odeslána: ${recipients.length} příjemců`);
      
      return response;
    } catch (error) {
      console.error('❌ Chyba při hromadném odeslání:', error);
      throw error;
    }
  }
  
  // =====================================================================
  // HELPER FUNKCE PRO WORKFLOW
  // =====================================================================
  
  /**
   * Odeslat notifikaci při schválení objednávky
   */
  async notifyOrderApproved({
    token,
    username,
    order_id,
    action_user_id,
    creator_id
  }) {
    return this.create({
      token,
      username,
      type: 'order_status_schvalena',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      send_email: true
    });
  }
  
  /**
   * Odeslat notifikaci při zamítnutí objednávky
   */
  async notifyOrderRejected({
    token,
    username,
    order_id,
    action_user_id,
    creator_id,
    rejection_reason
  }) {
    return this.create({
      token,
      username,
      type: 'order_status_zamitnuta',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      additional_data: {
        rejection_reason: rejection_reason || 'Bez uvedení důvodu'
      },
      send_email: true,
      priority: 'high'
    });
  }
  
  /**
   * Odeslat notifikaci při odeslání ke schválení
   */
  async notifyPendingApproval({
    token,
    username,
    order_id,
    action_user_id,
    garant_id
  }) {
    return this.create({
      token,
      username,
      type: 'order_status_ke_schvaleni',
      order_id,
      action_user_id,
      to_user_id: garant_id,
      send_email: true,
      priority: 'high'
    });
  }
  
  /**
   * Odeslat notifikaci při potvrzení věcné správnosti
   */
  async notifyVecnaSpravnostConfirmed({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // garant, příkazce
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'order_status_kontrola_potvrzena',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }
  
  /**
   * Odeslat notifikaci při zveřejnění v registru smluv
   */
  async notifyRegistryPublished({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // creator, garant, příkazce
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'order_status_registr_zverejnena',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }
  
  /**
   * Odeslat notifikaci při uhrazení faktury
   */
  async notifyInvoicePaid({
    token,
    username,
    order_id,
    action_user_id,
    recipients  // creator, garant
  }) {
    return this.sendBulk({
      token,
      username,
      type: 'order_status_faktura_uhrazena',
      order_id,
      action_user_id,
      recipients,
      send_email: true
    });
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Export pro explicitní importy
export {
  NotificationService,
  notificationService
};
```

---

## 📝 Konstanta s typy notifikací

### Vytvoř: `src/constants/notificationTypes.js`

```javascript
/**
 * Typy notifikací odpovídající backend templates
 * ⚡ = Vysoká priorita / Email automaticky
 */
export const NOTIFICATION_TYPES = {
  // FÁZE 1-2: Základní stavy
  ORDER_STATUS_NOVA: 'order_status_nova',
  ORDER_STATUS_ROZPRACOVANA: 'order_status_rozpracovana',
  ORDER_STATUS_KE_SCHVALENI: 'order_status_ke_schvaleni', // ⚡
  ORDER_STATUS_SCHVALENA: 'order_status_schvalena',
  ORDER_STATUS_ZAMITNUTA: 'order_status_zamitnuta', // ⚡
  ORDER_STATUS_CEKA_SE: 'order_status_ceka_se',
  
  // FÁZE 3-4: Dodavatel
  ORDER_STATUS_ODESLANA: 'order_status_odeslana',
  ORDER_STATUS_CEKA_POTVRZENI: 'order_status_ceka_potvrzeni',
  ORDER_STATUS_POTVRZENA: 'order_status_potvrzena',
  
  // FÁZE 5: Registr smluv
  ORDER_STATUS_REGISTR_CEKA: 'order_status_registr_ceka',
  ORDER_STATUS_REGISTR_ZVEREJNENA: 'order_status_registr_zverejnena',
  
  // FÁZE 6: Fakturace
  ORDER_STATUS_FAKTURA_CEKA: 'order_status_faktura_ceka',
  ORDER_STATUS_FAKTURA_PRIDANA: 'order_status_faktura_pridana',
  ORDER_STATUS_FAKTURA_SCHVALENA: 'order_status_faktura_schvalena',
  ORDER_STATUS_FAKTURA_UHRAZENA: 'order_status_faktura_uhrazena',
  
  // FÁZE 7: Věcná správnost
  ORDER_STATUS_KONTROLA_CEKA: 'order_status_kontrola_ceka', // ⚡
  ORDER_STATUS_KONTROLA_POTVRZENA: 'order_status_kontrola_potvrzena',
  ORDER_STATUS_KONTROLA_ZAMITNUTA: 'order_status_kontrola_zamitnuta', // ⚡
  
  // TODO ALARMY
  ALARM_TODO_NORMAL: 'alarm_todo_normal',
  ALARM_TODO_HIGH: 'alarm_todo_high', // ⚡
  ALARM_TODO_EXPIRED: 'alarm_todo_expired', // ⚡
  TODO_COMPLETED: 'todo_completed',
  TODO_ASSIGNED: 'todo_assigned',
  
  // SYSTÉMOVÉ
  SYSTEM_MAINTENANCE_SCHEDULED: 'system_maintenance_scheduled',
  SYSTEM_MAINTENANCE_STARTING: 'system_maintenance_starting', // ⚡
  SYSTEM_MAINTENANCE_FINISHED: 'system_maintenance_finished',
  SYSTEM_BACKUP_COMPLETED: 'system_backup_completed',
  SYSTEM_UPDATE_AVAILABLE: 'system_update_available',
  SYSTEM_UPDATE_INSTALLED: 'system_update_installed',
  SYSTEM_SECURITY_ALERT: 'system_security_alert', // ⚡
  SYSTEM_USER_LOGIN_ALERT: 'system_user_login_alert', // ⚡
  SYSTEM_SESSION_EXPIRED: 'system_session_expired',
  SYSTEM_STORAGE_WARNING: 'system_storage_warning', // ⚡
  
  // OSTATNÍ
  USER_MENTION: 'user_mention',
  DEADLINE_REMINDER: 'deadline_reminder', // ⚡
  ORDER_UNLOCK_FORCED: 'order_unlock_forced' // ⚡
};

/**
 * Helper pro získání názvu typu
 */
export const getNotificationTypeName = (type) => {
  const names = {
    'order_status_nova': 'Nová objednávka',
    'order_status_rozpracovana': 'Rozpracovaná',
    'order_status_ke_schvaleni': 'Ke schválení',
    'order_status_schvalena': 'Schválena',
    'order_status_zamitnuta': 'Zamítnuta',
    'order_status_ceka_se': 'Vrácena k doplnění',
    'order_status_odeslana': 'Odeslána dodavateli',
    'order_status_ceka_potvrzeni': 'Čeká na potvrzení',
    'order_status_potvrzena': 'Potvrzena',
    'order_status_registr_ceka': 'Čeká na registr',
    'order_status_registr_zverejnena': 'Zveřejněna v registru',
    'order_status_faktura_ceka': 'Čeká na fakturu',
    'order_status_faktura_pridana': 'Faktura přidána',
    'order_status_faktura_schvalena': 'Faktura schválena',
    'order_status_faktura_uhrazena': 'Faktura uhrazena',
    'order_status_kontrola_ceka': 'Čeká na kontrolu',
    'order_status_kontrola_potvrzena': 'Věcná správnost OK',
    'order_status_kontrola_zamitnuta': 'Reklamace',
    // ... další typy
  };
  
  return names[type] || type;
};
```

---

## 🎯 Integrace do OrderForm25.js

### Příklad 1: Schválení objednávky

```javascript
import notificationService from '../services/notificationService';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes';

// V komponente OrderForm25.js

const handleApproveOrder = async () => {
  try {
    // 1. Schválit objednávku
    await api.post('/orders/approve', {
      token: userToken,
      username: username,
      order_id: savedOrderId
    });
    
    // 2. Odeslat notifikaci tvůrci
    await notificationService.notifyOrderApproved({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      creator_id: formData.objednatel_id
    });
    
    showToast('Objednávka schválena a notifikace odeslána!', { type: 'success' });
    
  } catch (error) {
    console.error('Chyba při schvalování:', error);
    showToast('Chyba při schvalování objednávky', { type: 'error' });
  }
};
```

### Příklad 2: Zamítnutí objednávky

```javascript
const handleRejectOrder = async (rejectionReason) => {
  try {
    // 1. Zamítnout objednávku
    await api.post('/orders/reject', {
      token: userToken,
      username: username,
      order_id: savedOrderId,
      rejection_reason: rejectionReason
    });
    
    // 2. Odeslat notifikaci s důvodem
    await notificationService.notifyOrderRejected({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      creator_id: formData.objednatel_id,
      rejection_reason: rejectionReason
    });
    
    showToast('Objednávka zamítnuta a notifikace odeslána!', { type: 'info' });
    
  } catch (error) {
    console.error('Chyba při zamítání:', error);
    showToast('Chyba při zamítání objednávky', { type: 'error' });
  }
};
```

### Příklad 3: Odeslání ke schválení

```javascript
const handleSendToApproval = async () => {
  try {
    // 1. Změnit stav na "ke schválení"
    await api.post('/orders/update', {
      token: userToken,
      username: username,
      order_id: savedOrderId,
      stav_schvaleni: 'ceka_na_schvaleni'
    });
    
    // 2. Odeslat notifikaci garantovi
    await notificationService.notifyPendingApproval({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      garant_id: formData.garant_uzivatel_id
    });
    
    showToast('Objednávka odeslána ke schválení!', { type: 'success' });
    
  } catch (error) {
    console.error('Chyba při odesílání:', error);
    showToast('Chyba při odesílání ke schválení', { type: 'error' });
  }
};
```

### Příklad 4: Potvrzení věcné správnosti (NOVÁ FÁZE)

```javascript
const handleConfirmVecnaSpravnost = async () => {
  try {
    // 1. Potvrdit věcnou správnost
    await api.post('/orders/update', {
      token: userToken,
      username: username,
      order_id: savedOrderId,
      potvrzeni_vecne_spravnosti: 1,
      potvrdil_vecnou_spravnost_id: user_id,
      dt_potvrzeni_vecne_spravnosti: new Date().toISOString()
    });
    
    // 2. Odeslat notifikaci garantovi a příkazci
    const recipients = [
      formData.garant_uzivatel_id,
      formData.prikazce_id
    ].filter(Boolean); // Odfiltrovat prázdné hodnoty
    
    await notificationService.notifyVecnaSpravnostConfirmed({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      recipients
    });
    
    showToast('Věcná správnost potvrzena!', { type: 'success' });
    
  } catch (error) {
    console.error('Chyba při potvrzování:', error);
    showToast('Chyba při potvrzování věcné správnosti', { type: 'error' });
  }
};
```

### Příklad 5: Zveřejnění v registru smluv (NOVÁ FÁZE)

```javascript
const handlePublishInRegistry = async (registrData) => {
  try {
    // 1. Aktualizovat registrové údaje
    await api.post('/orders/update', {
      token: userToken,
      username: username,
      order_id: savedOrderId,
      registr_iddt: registrData.iddt,
      dt_zverejneni: registrData.datum
    });
    
    // 2. Odeslat notifikaci všem zainteresovaným
    const recipients = [
      formData.objednatel_id,
      formData.garant_uzivatel_id,
      formData.prikazce_id
    ].filter(Boolean);
    
    await notificationService.notifyRegistryPublished({
      token: userToken,
      username: username,
      order_id: savedOrderId,
      action_user_id: user_id,
      recipients
    });
    
    showToast('Objednávka zveřejněna v registru smluv!', { type: 'success' });
    
  } catch (error) {
    console.error('Chyba při zveřejňování:', error);
    showToast('Chyba při zveřejňování v registru', { type: 'error' });
  }
};
```

---

## 🧪 Testování v DEV prostředí

### 1. Test náhledu notifikace

```javascript
// V konzoli nebo testovací komponentě
import notificationService from './services/notificationService';

const testPreview = async () => {
  const preview = await notificationService.preview({
    token: 'YOUR_TOKEN',
    username: 'testuser',
    type: 'order_status_schvalena',
    order_id: 123,
    action_user_id: 5
  });
  
  console.log('📋 Náhled notifikace:');
  console.log('Titulek:', preview.template.app_title);
  console.log('Zpráva:', preview.template.app_message);
  console.log('Email předmět:', preview.template.email_subject);
  console.log('Email tělo:', preview.template.email_body);
  console.log('Použité placeholdery:', preview.placeholders_used);
  console.log('Chybějící data:', preview.missing_data);
};

testPreview();
```

### 2. Test skutečného odeslání

```javascript
const testSendNotification = async () => {
  try {
    const result = await notificationService.create({
      token: 'YOUR_TOKEN',
      username: 'testuser',
      type: 'order_status_schvalena',
      order_id: 123,
      action_user_id: 5,
      to_user_id: 10
    });
    
    console.log('✅ Notifikace odeslána:', result);
    console.log('Notification ID:', result.notification_id);
    console.log('Počet příjemců:', result.recipients_count);
    console.log('Email odeslaný:', result.email_sent);
  } catch (error) {
    console.error('❌ Chyba:', error);
  }
};

testSendNotification();
```

---

## ✅ Checklist integrace

### 1. Příprava
- [ ] Vytvořit `src/services/notificationService.js`
- [ ] Vytvořit `src/constants/notificationTypes.js`
- [ ] Ověřit, že `api.eeo` existuje a funguje

### 2. Integrace do OrderForm25.js
- [ ] Import notificationService
- [ ] Import NOTIFICATION_TYPES
- [ ] Přidat notifikace do `handleApproveOrder`
- [ ] Přidat notifikace do `handleRejectOrder`
- [ ] Přidat notifikace do `handleSendToApproval`
- [ ] Přidat notifikace do věcné správnosti
- [ ] Přidat notifikace do registru smluv
- [ ] Přidat notifikace do fakturace

### 3. Testování
- [ ] Test náhledu notifikace (preview)
- [ ] Test schválení objednávky
- [ ] Test zamítnutí objednávky
- [ ] Test odeslání ke schválení
- [ ] Test věcné správnosti
- [ ] Ověřit notifikace v DB
- [ ] Ověřit email doručení (pokud nakonfigurováno)

### 4. Admin rozhraní (volitelné)
- [ ] Komponenta pro zobrazení všech templates
- [ ] Možnost testovacího odeslání
- [ ] Statistiky notifikací

---

## 📊 Monitoring a Debug

### Console logy v notificationService

Service automaticky loguje:
- ✅ Úspěšné vytvoření notifikace
- ❌ Chyby při vytváření
- 📊 Počet příjemců

### SQL dotazy pro kontrolu

```sql
-- Notifikace pro konkrétní objednávku
SELECT 
  n.id,
  n.user_id,
  u.username,
  n.order_id,
  n.message,
  n.is_read,
  n.created_at
FROM 25_notifications n
LEFT JOIN 25_users u ON n.user_id = u.id
WHERE n.order_id = 123
ORDER BY n.created_at DESC;

-- Statistika odeslání za posledních 7 dní
SELECT 
  type,
  COUNT(*) as pocet,
  COUNT(CASE WHEN is_read = 1 THEN 1 END) as precteno
FROM 25_notifications
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY type
ORDER BY pocet DESC;
```

---

## 🚀 NEXT STEPS

1. **Vytvořit helper službu** (`notificationService.js`)
2. **Přidat notifikace do OrderForm25.js** (schválení, zamítnutí, atd.)
3. **Otestovat na DEV** prostředí
4. **Ověřit email doručení** (pokud nakonfigurováno)
5. **Rozšířit o další notifikace** (registr, fakturace, věcná správnost)

---

**Vypracoval:** GitHub Copilot  
**Datum:** 29. října 2025  
**Status:** ✅ PŘIPRAVENO K INTEGRACI
