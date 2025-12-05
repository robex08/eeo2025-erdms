# 🔔 NÁVOD NA POUŽITÍ NOTIFIKAČNÍHO SYSTÉMU

**Datum:** 25. října 2025  
**Status:** ✅ READY - API service připraven k použití

---

## 📋 **OBSAH**

1. [Přehled implementace](#přehled-implementace)
2. [Jak to funguje](#jak-to-funguje)
3. [Použití v kódu](#použití-v-kódu)
4. [TODO Alarm notifikace](#todo-alarm-notifikace)
5. [Order notifikace](#order-notifikace)
6. [Testing](#testing)

---

## ✅ **PŘEHLED IMPLEMENTACE**

### **Co je hotovo:**
- ✅ API service (`src/services/notificationsApi.js`)
- ✅ NotificationBell komponenta (`src/components/NotificationBell.js`)
- ✅ Integrace v Layout (`src/components/Layout.js`)
- ✅ Auth handling (JWT token z `authStorage`)
- ✅ TODO Alarm typy (`alarm_todo_normal`, `alarm_todo_high`, `alarm_todo_expired`)
- ✅ Order status typy (všech 12 stavů)
- ✅ Helper funkce pro snadné vytváření notifikací

### **Co NENÍ potřeba dělat:**
- ❌ Endpointy jsou SPRÁVNĚ - neměnit!
- ❌ Auth je OK - používá se JWT token z localStorage
- ❌ Response parsing je OK - handleApiResponse() je správný

---

## 🎯 **JAK TO FUNGUJE**

### **1. Backend struktura (podle BE API dokumentace)**

Backend používá **2-tabulkovou strukturu**:

```sql
-- Master data notifikací (1 notifikace = 1 řádek)
25_notifications (id, type, title, message, priority, category, data, dt_created, ...)

-- Stav čtení pro každého uživatele (M:N vztah)
25_notifications_read (id, notification_id, user_id, is_read, dt_read, is_dismissed, dt_dismissed)

-- Šablony notifikací (typy, texty, priority)
25_notification_templates (id, type, name, email_subject, email_body, app_title, app_message, ...)
```

### **2. Typy notifikací**

Backend má **předpřipravené šablony** pro:

#### **TODO Alarmy:**
```javascript
- alarm_todo_normal    // "Připomínka TODO úkolu"
- alarm_todo_high      // "⚠️ URGENTNÍ: TODO úkol vyžaduje pozornost"
- alarm_todo_expired   // "🔴 TODO úkol po termínu"
```

#### **Order stavy:**
```javascript
- order_status_nova
- order_status_ke_schvaleni
- order_status_schvalena
- order_status_zamitnuta
- order_status_ceka_se
- order_status_odeslana
- order_status_potvrzena
- order_status_dokoncena
- order_status_zrusena
- order_status_ceka_potvrzeni
- order_status_smazana
- order_status_rozpracovana
```

#### **Systémové:**
```javascript
- system_maintenance
- system_message
- system_update_available
- ...
```

---

## 💻 **POUŽITÍ V KÓDU**

### **Import:**
```javascript
import { 
  notifyTodoAlarm,
  notifyTodoAlarmNormal,
  notifyTodoAlarmHigh,
  notifyTodoAlarmExpired,
  notifyOrderSubmittedForApproval,
  notifyOrderApproved,
  createNotification,
  NOTIFICATION_TYPES
} from '../services/notificationsApi';
```

---

## 🔔 **TODO ALARM NOTIFIKACE**

### **Kdy posílat TODO alarm notifikaci?**

V `useTodoAlarms.js` nebo `FloatingAlarmPopup.js` - když nastane čas alarmu:

```javascript
// hooks/useTodoAlarms.js

import { notifyTodoAlarm } from '../services/notificationsApi';

// Když nastane čas alarmu
const triggerAlarm = async (alarm) => {
  try {
    // 1. Zjisti prioritu a stav
    const now = new Date();
    const alarmTime = new Date(alarm.alarm_datetime);
    const isExpired = now > alarmTime;
    const isHighPriority = alarm.priority === 'HIGH' || alarm.urgent;

    // 2. Připrav data pro BE (podle BE API dokumentace)
    const todoData = {
      todo_title: alarm.todo_title || alarm.title,
      todo_note: alarm.todo_note || alarm.note || '',
      alarm_datetime: formatDateTime(alarmTime), // "25. 10. 2025 14:30"
      alarm_date: formatDate(alarmTime),         // "25. 10. 2025"
      alarm_time: formatTime(alarmTime),         // "14:30"
      user_name: alarm.user_name || 'Uživatel',
      time_remaining: isExpired ? 'Prošlý termín' : getTimeRemaining(alarmTime),
      todo_id: alarm.id || alarm.todo_id
    };

    // 3. Odešli notifikaci pomocí API
    await notifyTodoAlarm(
      alarm.user_id,    // ID uživatele
      todoData,         // Data úkolu
      isExpired,        // Je termín prošlý?
      isHighPriority    // Je vysoká priorita?
    );

    console.log('✅ TODO alarm notifikace odeslána na BE');

  } catch (error) {
    console.error('❌ Chyba při odesílání TODO alarm notifikace:', error);
    // Neblokuj - lokální notifikace stále funguje
  }
};

// Helper funkce pro formátování
const formatDateTime = (date) => {
  return date.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (date) => {
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (date) => {
  return date.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTimeRemaining = (alarmTime) => {
  const now = new Date();
  const diff = alarmTime - now;
  
  if (diff < 0) return 'Prošlý termín';
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} minut`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hodin`;
  
  const days = Math.floor(hours / 24);
  return `${days} dní`;
};
```

### **Příklad 1: Běžná připomínka TODO**
```javascript
import { notifyTodoAlarmNormal } from '../services/notificationsApi';

await notifyTodoAlarmNormal(userId, {
  todo_title: 'Zavolat klientovi',
  todo_note: 'Projednat nabídku',
  alarm_datetime: '25. 10. 2025 14:30',
  alarm_date: '25. 10. 2025',
  alarm_time: '14:30',
  user_name: 'Jan Novák',
  time_remaining: '5 minut',
  todo_id: '12345'
});
```

**Backend odešle:**
- 🔔 In-app notifikaci s textem ze šablony `alarm_todo_normal`
- 📧 Email (volitelné, podle BE nastavení)

**Šablona (backend):**
```
app_title: "Připomínka úkolu"
app_message: "{todo_title} - termín {alarm_datetime}"
```

**Výsledek:**
```
📋 Připomínka úkolu
Zavolat klientovi - termín 25. 10. 2025 14:30
```

---

### **Příklad 2: URGENTNÍ TODO (vysoká priorita)**
```javascript
import { notifyTodoAlarmHigh } from '../services/notificationsApi';

await notifyTodoAlarmHigh(userId, {
  todo_title: 'DŮLEŽITÉ: Schůzka s ředitelem',
  todo_note: 'Příprava prezentace',
  alarm_datetime: '25. 10. 2025 10:00',
  alarm_date: '25. 10. 2025',
  alarm_time: '10:00',
  user_name: 'Jan Novák',
  time_remaining: 'NYNÍ!',
  todo_id: '67890'
});
```

**Backend odešle:**
- 🔔 In-app notifikaci s **VYSOKOU prioritou**
- 📧 Email **automaticky** (urgentní = vždy email)

**Šablona (backend):**
```
app_title: "⚠️ URGENTNÍ úkol"
app_message: "{todo_title} - VYŽADUJE POZORNOST!"
```

**Výsledek:**
```
⚠️ URGENTNÍ úkol
DŮLEŽITÉ: Schůzka s ředitelem - VYŽADUJE POZORNOST!
```

---

### **Příklad 3: Prošlý termín**
```javascript
import { notifyTodoAlarmExpired } from '../services/notificationsApi';

await notifyTodoAlarmExpired(userId, {
  todo_title: 'Dokončit výkaz práce',
  todo_note: 'Termín byl včera',
  alarm_datetime: '24. 10. 2025 17:00',
  alarm_date: '24. 10. 2025',
  alarm_time: '17:00',
  user_name: 'Jan Novák',
  time_remaining: 'Prošlý termín',
  todo_id: '11111'
});
```

**Backend odešle:**
- 🔔 In-app notifikaci s **VYSOKOU prioritou**
- 📧 Email **automaticky** (prošlý termín = důležité)

**Šablona (backend):**
```
app_title: "🔴 Prošlý termín úkolu"
app_message: "{todo_title} - termín již prošel"
```

**Výsledek:**
```
🔴 Prošlý termín úkolu
Dokončit výkaz práce - termín již prošel
```

---

### **Příklad 4: Univerzální TODO alarm (automatický výběr typu)**
```javascript
import { notifyTodoAlarm } from '../services/notificationsApi';

// Automaticky vybere správný typ podle stavu
await notifyTodoAlarm(
  userId,
  todoData,
  isExpired,        // true = použije alarm_todo_expired
  isHighPriority    // true = použije alarm_todo_high
);
```

**Logika výběru:**
```javascript
if (isExpired) {
  // → alarm_todo_expired (prošlý termín)
} else if (isHighPriority) {
  // → alarm_todo_high (urgentní)
} else {
  // → alarm_todo_normal (běžná připomínka)
}
```

---

## 📦 **ORDER NOTIFIKACE**

### **Kdy posílat order notifikace?**

V `api25orders.js` nebo `Orders25List.js` - při změně stavu objednávky:

```javascript
import { notifyOrderSubmittedForApproval } from '../services/notificationsApi';

// Když se objednávka odešle ke schválení
const submitOrderForApproval = async (orderId) => {
  try {
    // 1. Změň stav v DB
    await updateOrderStatus(orderId, 'ke_schvaleni');

    // 2. Načti objednávku
    const order = await getOrderDetail(orderId);

    // 3. Odešli notifikaci GARANTOVI a PŘÍKAZCI
    await notifyOrderSubmittedForApproval(order);

    console.log('✅ Notifikace o odeslání ke schválení odeslána');

  } catch (error) {
    console.error('❌ Chyba při odesílání notifikace:', error);
  }
};
```

### **Příklad: Objednávka schválena**
```javascript
import { notifyOrderApproved } from '../services/notificationsApi';

// Když GARANT nebo PŘÍKAZCE schválí objednávku
const approveOrder = async (orderId, approverId) => {
  try {
    // 1. Změň stav
    await updateOrderStatus(orderId, 'schvalena');

    // 2. Načti objednávku
    const order = await getOrderDetail(orderId);

    // 3. Odešli notifikaci VLASTNÍKOVI (tvůrci)
    await notifyOrderApproved(order, {
      approver_name: 'Jan Novák'
    });

  } catch (error) {
    console.error('❌ Chyba:', error);
  }
};
```

---

## 🎨 **PŘIZPŮSOBENÍ ŠABLON (admin)**

Backend má CRUD API pro správu šablon:

```javascript
import { createNotification } from '../services/notificationsApi';

// Vytvoření vlastní šablony (ADMIN ONLY)
// POZNÁMKA: Pro toto zatím není FE komponenta, je to jen backend API
// Pokud potřebujete vlastní typ, kontaktujte BE administrátora

// Použití existující šablony s vlastním textem
await createNotification({
  type: 'alarm_todo_normal',
  to_user_id: userId,
  title: 'VLASTNÍ TITULEK',        // Přepíše šablonu
  message: 'VLASTNÍ ZPRÁVA',       // Přepíše šablonu
  priority: 'high',                // Přepíše priority ze šablony
  category: 'todo',
  send_email: true,
  data: {
    // Vlastní data pro placeholdery
    custom_field: 'hodnota'
  }
});
```

---

## 🧪 **TESTING**

### **Jak otestovat notifikace:**

1. **Vytvoř testovací TODO s alarmem:**
```javascript
// V TODO panelu nebo FloatingAlarmManager
const testAlarm = {
  id: 'test-123',
  todo_title: 'TEST Alarm',
  todo_note: 'Testovací poznámka',
  alarm_datetime: new Date(Date.now() + 60000), // Za 1 minutu
  user_id: currentUserId,
  priority: 'HIGH'
};

// Počkej minutu a zkontroluj:
// - NotificationBell má badge (červený počet)
// - Kliknutím na bell se otevře dropdown s notifikací
// - Backend má záznam v tabulce 25_notifications
```

2. **Ruční test API:**
```javascript
import { notifyTodoAlarmNormal } from '../services/notificationsApi';

// V konzoli nebo v dočasné komponentě
const testNotification = async () => {
  try {
    const result = await notifyTodoAlarmNormal(5, {
      todo_title: 'TEST notifikace',
      todo_note: 'Testovací poznámka',
      alarm_datetime: '25. 10. 2025 14:30',
      alarm_date: '25. 10. 2025',
      alarm_time: '14:30',
      user_name: 'Test User',
      time_remaining: '5 minut',
      todo_id: '999'
    });
    
    console.log('✅ Notifikace vytvořena:', result);
  } catch (error) {
    console.error('❌ Chyba:', error);
  }
};

testNotification();
```

3. **Zkontroluj v DB:**
```sql
-- Zkontroluj, že notifikace byla vytvořena
SELECT * FROM 25_notifications ORDER BY dt_created DESC LIMIT 10;

-- Zkontroluj read status
SELECT * FROM 25_notifications_read WHERE user_id = 5 ORDER BY id DESC LIMIT 10;

-- Zkontroluj šablony
SELECT * FROM 25_notification_templates WHERE type LIKE '%alarm_todo%';
```

---

## 📝 **CHECKLIST PRO INTEGRACI**

### **TODO Alarmy:**
- [ ] Najít místo, kde se spouští alarm (useTodoAlarms.js nebo FloatingAlarmPopup.js)
- [ ] Přidat import `notifyTodoAlarm`
- [ ] Připravit `todoData` object podle BE API struktury
- [ ] Zavolat `notifyTodoAlarm(userId, todoData, isExpired, isHighPriority)`
- [ ] Otestovat s reálným alarmem
- [ ] Ověřit v DB, že notifikace byla vytvořena

### **Order notifikace:**
- [ ] Najít místo, kde se mění stav objednávky
- [ ] Přidat import odpovídající funkce (`notifyOrderApproved`, atd.)
- [ ] Načíst kompletní order object
- [ ] Zavolat notify funkci s order a extraData
- [ ] Otestovat změnu stavu
- [ ] Ověřit, že GARANT/PŘÍKAZCE dostali notifikaci

---

## ⚠️ **DŮLEŽITÉ POZNÁMKY**

### **1. Backend doplní texty automaticky**
```javascript
// ✅ SPRÁVNĚ - použij jen type
await notifyTodoAlarmNormal(userId, todoData);
// Backend vezme šablonu z DB a doplní placeholdery

// ❌ ZBYTEČNÉ - nemusíš ručně psát title/message
await createNotification({
  type: 'alarm_todo_normal',
  title: 'Ručně psaný text...',  // ZBYTEČNÉ
  message: 'Ručně psaná zpráva...', // ZBYTEČNÉ
  // ...
});
```

### **2. Email je volitelný**
- `alarm_todo_normal` - email VYPNUTÝ (default)
- `alarm_todo_high` - email ZAPNUTÝ (urgentní)
- `alarm_todo_expired` - email ZAPNUTÝ (prošlý termín)

Můžeš přepsat:
```javascript
await notifyTodoAlarmNormal(userId, todoData);
// nebo
await createNotification({
  type: 'alarm_todo_normal',
  send_email: true,  // Zapni email ručně
  // ...
});
```

### **3. Placeholdery v datech**
Backend očekává konkrétní názvy fieldů v `data` objektu:
```javascript
data: {
  todo_title: '...',      // ✅ MUSÍ být přesně tento název
  todo_note: '...',       // ✅ MUSÍ být přesně tento název
  alarm_datetime: '...',  // ✅ MUSÍ být přesně tento název
  // ...
}
```

### **4. Formát datumů**
Backend očekává české formátování:
```javascript
alarm_datetime: '25. 10. 2025 14:30'  // ✅ SPRÁVNĚ
alarm_date: '25. 10. 2025'            // ✅ SPRÁVNĚ
alarm_time: '14:30'                   // ✅ SPRÁVNĚ

// ❌ ŠPATNĚ:
alarm_datetime: '2025-10-25T14:30:00Z'  // ISO format
alarm_date: '2025-10-25'                // ISO format
```

---

## 🚀 **PŘÍŠTÍ KROKY**

1. **Integrace v TODO systému** - Přidat volání `notifyTodoAlarm` do `useTodoAlarms.js`
2. **Integrace v Order systému** - Přidat notifikace do všech změn stavu objednávek
3. **Testing** - Otestovat všechny typy notifikací
4. **WebSocket** - Budoucnost: real-time notifikace bez pollingu

---

**Máš otázky? Kontaktuj mě!** 🎉
