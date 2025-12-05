# 🔔 Mapování notifikací v OrderForm25

## 📋 Účel dokumentu
Tento dokument mapuje, kde se v `OrderForm25.js` volají jednotlivé notifikační templaty a kdy se posílají.

## 🔍 Kde se notifikace posílají
**Soubor:** `/src/forms/OrderForm25.js`  
**Funkce:** `sendOrderNotifications()` (řádek ~6770)  
**Volána z:** `saveOrderToAPI()` po úspěšném uložení změny stavu

---

## 📊 PŘEHLED WORKFLOW NOTIFIKACÍ

### ✅ IMPLEMENTOVANÉ NOTIFIKACE

| # | Workflow Stav | Template Type | Kdy se posílá | Příjemci |
|---|--------------|---------------|---------------|-----------|
| 1 | **ODESLANA_KE_SCHVALENI** | `order_status_ke_schvaleni` | Objednávka odeslána ke schválení | Garant, Příkazce, Schvalovatel |
| 2 | **SCHVALENA** | `order_status_schvalena` | Objednávka schválena | Objednatel, Garant, Příkazce¹ |
| 3 | **ZAMITNUTA** | `order_status_zamitnuta` | Objednávka zamítnuta | Objednatel, Garant, Příkazce¹ |
| 4 | **CEKA_SE** | `order_status_ceka_se` | Vrácena k přepracování | Objednatel, Garant |
| 5 | **ODESLANA** | `order_status_odeslana` | Odeslána dodavateli | Všichni² |
| 6 | **POTVRZENA** | `order_status_potvrzena` | Dodavatel potvrdil | Všichni² |
| 7 | **UVEREJNENA** | `order_status_registr_zverejnena` | Zveřejněna v registru | Všichni² |
| 8 | **NEUVEREJNENA** | `order_status_registr_ceka` | Čeká na registr | Garant + TODO³ |
| 9 | **FAKTURACE** | `order_status_faktura_ceka` | Čeká na fakturu | Garant, Objednatel |
| 10 | **VECNA_SPRAVNOST** | `order_status_kontrola_ceka` | Čeká na věcnou kontrolu | Garant, Objednatel |
| 11 | **ZKONTROLOVANA** | `order_status_kontrola_potvrzena` | Věcná správnost OK | Objednatel, Garant + TODO³ |
| 12 | **DOKONCENA** | `order_status_dokoncena` | Objednávka dokončena | Všichni² |
| 13 | **ZRUSENA** | `order_status_zrusena` | Objednávka zrušena | Objednatel, Garant, Příkazce |

**Poznámky:**
1. ¹ Příkazce JEN pokud je jiný než Schvalovatel
2. ² Všichni = Objednatel, Garant, Příkazce, Schvalovatel (unikátní)
3. ³ TODO = Vyžaduje backend API pro načtení uživatelů podle práv

---

## 🔧 KÓD - Kde se co posílá

### 1️⃣ Odeslána ke schválení
```javascript
// Řádek ~6793
const hasKeSchvaleni = hasWorkflowState(newWorkflowState, 'ODESLANA_KE_SCHVALENI');

if (hasKeSchvaleni && !hadKeSchvaleni) {
  notificationType = 'order_status_ke_schvaleni';
  
  // Příjemci
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.prikazce_id) recipientUserIds.add(parseInt(formData.prikazce_id));
  if (formData.schvalovatel_id) recipientUserIds.add(parseInt(formData.schvalovatel_id));
}
```

### 2️⃣ Schválena / Zamítnuta
```javascript
// Řádek ~6821
const hasSchvalena = hasWorkflowState(newWorkflowState, 'SCHVALENA');
const hasZamitnuta = hasWorkflowState(newWorkflowState, 'ZAMITNUTA');

if ((hasSchvalena && !hadSchvalena) || (hasZamitnuta && !hadZamitnuta)) {
  notificationType = hasSchvalena ? 'order_status_schvalena' : 'order_status_zamitnuta';
  
  // Příjemci
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  
  // Příkazce JEN pokud je jiný než schvalovatel
  if (formData.prikazce_id && formData.schvalovatel_id && 
      parseInt(formData.prikazce_id) !== parseInt(formData.schvalovatel_id)) {
    recipientUserIds.add(parseInt(formData.prikazce_id));
  }
}
```

### 3️⃣ Čeká se (vrácena k přepracování)
```javascript
// Řádek ~6852
const hasCekaSe = hasWorkflowState(newWorkflowState, 'CEKA_SE');

if (hasCekaSe && !hadCekaSe) {
  notificationType = 'order_status_ceka_se';
  
  // Příjemci
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
}
```

### 4️⃣ Odeslána dodavateli
```javascript
// Řádek ~6870
const hasOdeslana = hasWorkflowState(newWorkflowState, 'ODESLANA');

if (hasOdeslana && !hadOdeslana) {
  notificationType = 'order_status_odeslana';
  
  // Příjemci: VŠICHNI
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.prikazce_id) recipientUserIds.add(parseInt(formData.prikazce_id));
  if (formData.schvalovatel_id) recipientUserIds.add(parseInt(formData.schvalovatel_id));
}
```

### 5️⃣ Potvrzena dodavatelem
```javascript
// Řádek ~6888
const hasPotvrzena = hasWorkflowState(newWorkflowState, 'POTVRZENA');

if (hasPotvrzena && !hadPotvrzena) {
  notificationType = 'order_status_potvrzena';
  
  // Příjemci: VŠICHNI
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.prikazce_id) recipientUserIds.add(parseInt(formData.prikazce_id));
  if (formData.schvalovatel_id) recipientUserIds.add(parseInt(formData.schvalovatel_id));
}
```

### 6️⃣ Zveřejněna v registru
```javascript
// Řádek ~6910
const hasUverejnena = hasWorkflowState(newWorkflowState, 'UVEREJNENA');

if (hasUverejnena && !hadUverejnena) {
  notificationType = 'order_status_registr_zverejnena';
  
  // Příjemci: VŠICHNI
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.prikazce_id) recipientUserIds.add(parseInt(formData.prikazce_id));
  if (formData.schvalovatel_id) recipientUserIds.add(parseInt(formData.schvalovatel_id));
}
```

### 7️⃣ Čeká na registr (NEUVEREJNENA)
```javascript
// Řádek ~6927
const hasNeuverejnena = hasWorkflowState(newWorkflowState, 'NEUVEREJNENA');

if (hasNeuverejnena && !hadNeuverejnena) {
  notificationType = 'order_status_registr_ceka';
  
  // Příjemci: Garant + TODO (uživatelé s právy VEREJNE_ZAKAZKY)
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
}
```

### 8️⃣ Čeká na fakturu (FAKTURACE)
```javascript
// Řádek ~6942
const hasFakturace = hasWorkflowState(newWorkflowState, 'FAKTURACE');

if (hasFakturace && !hadFakturace) {
  notificationType = 'order_status_faktura_ceka';
  
  // Příjemci: Garant a Objednatel
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
}
```

### 9️⃣ Čeká na věcnou kontrolu
```javascript
// Řádek ~6957
const hasVecnaSpravnost = hasWorkflowState(newWorkflowState, 'VECNA_SPRAVNOST');

if (hasVecnaSpravnost && !hadVecnaSpravnost) {
  notificationType = 'order_status_kontrola_ceka';
  
  // Příjemci: Garant a Objednatel
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
}
```

### 🔟 Věcná správnost potvrzena (ZKONTROLOVANA)
```javascript
// Řádek ~6975
const hasZkontrolovana = hasWorkflowState(newWorkflowState, 'ZKONTROLOVANA');

if (hasZkontrolovana && !hadZkontrolovana) {
  notificationType = 'order_status_kontrola_potvrzena';
  
  // Příjemci: Objednatel, Garant + TODO (uživatelé s právy)
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  
  // TODO: Přidat uživatele s právy VEREJNE_ZAKAZKY, HLAVNI_UCETNI, ROZPOCTAR
}
```

### 1️⃣1️⃣ Objednávka dokončena
```javascript
// Řádek ~6994
const hasDokoncena = hasWorkflowState(newWorkflowState, 'DOKONCENA');

if (hasDokoncena && !hadDokoncena) {
  notificationType = 'order_status_dokoncena';
  
  // Příjemci: VŠICHNI
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.prikazce_id) recipientUserIds.add(parseInt(formData.prikazce_id));
  if (formData.schvalovatel_id) recipientUserIds.add(parseInt(formData.schvalovatel_id));
}
```

### 1️⃣2️⃣ Objednávka zrušena
```javascript
// Řádek ~7010
const hasZrusena = hasWorkflowState(newWorkflowState, 'ZRUSENA');

if (hasZrusena && !hadZrusena) {
  notificationType = 'order_status_zrusena';
  
  // Příjemci
  if (formData.objednatel_id) recipientUserIds.add(parseInt(formData.objednatel_id));
  if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
  if (formData.prikazce_id) recipientUserIds.add(parseInt(formData.prikazce_id));
}
```

---

## ❌ CHYBĚJÍCÍ NOTIFIKACE (NEJSOU V KÓDU)

Tyto templaty NEJSOU momentálně volány z `OrderForm25.js`:

### 📝 Základní workflow stavy
| Template Type | Popis | Kdy by se mělo posílat |
|--------------|-------|------------------------|
| `order_status_nova` | Nová objednávka (draft) | Při vytvoření konceptu? |
| `order_status_realizovana` | Realizována | Když je zboží dodáno? |

### 💰 Fakturace
| Template Type | Popis | Kdy by se mělo posílat |
|--------------|-------|------------------------|
| `order_status_faktura_prirazena` | Faktura přiřazena | Při přiřazení faktury k objednávce |
| `order_status_faktura_schvalena` | Faktura schválena | Po schválení faktury |
| `order_status_faktura_zaplacena` | Faktura zaplacena | Po označení jako zaplaceno |

### 🚨 Věcná správnost
| Template Type | Popis | Kdy by se mělo posílat |
|--------------|-------|------------------------|
| `order_vecna_spravnost_zamitnuta` | Věcná správnost - reklamace | Při zamítnutí věcné kontroly |

### ⏰ TODO Alarmy
| Template Type | Popis | Kdy by se mělo posílat |
|--------------|-------|------------------------|
| `alarm_todo_normal` | TODO alarm - normální | Připomínka TODO úkolu |
| `alarm_todo_high` | TODO alarm - vysoká priorita | Urgentní TODO úkol |
| `alarm_todo_expired` | TODO alarm - po termínu | TODO po termínu |

### 🔧 Systémové
| Template Type | Popis | Kdy by se mělo posílat |
|--------------|-------|------------------------|
| `system_maintenance` | Systémová údržba | Plánovaná údržba |
| `user_mention` | Zmínka v komentáři | @zmínka uživatele |
| `deadline_reminder` | Připomínka termínu | Blížící se deadline |
| `order_unlock_forced` | Násilně odemčena | Admin převzal objednávku |
| `order_comment_new` | Nový komentář | Nový komentář k objednávce |

---

## 📝 CO DĚLAT DÁLE?

### ✅ IMPLEMENTOVANÉ - ZKONTROLUJ BACKEND
Pro tyto templaty zkontroluj, že existují v databázi (tabulka `25_notification_templates`):

```sql
SELECT type, name, active 
FROM 25_notification_templates 
WHERE type IN (
  'order_status_ke_schvaleni',
  'order_status_schvalena',
  'order_status_zamitnuta',
  'order_status_ceka_se',
  'order_status_odeslana',
  'order_status_potvrzena',
  'order_status_registr_zverejnena',
  'order_status_registr_ceka',
  'order_status_faktura_ceka',
  'order_status_kontrola_ceka',
  'order_status_kontrola_potvrzena',
  'order_status_dokoncena',
  'order_status_zrusena'
);
```

### ⚠️ CHYBĚJÍCÍ - PŘIDEJ DO KÓDU
Pro tyto workflow akce PŘIDEJ notifikace do `OrderForm25.js`:

1. **Faktura přiřazena** (`order_status_faktura_prirazena`)
   - Kde: Po úspěšném přiřazení faktury k objednávce
   - Funkce: `handleAssignInvoice()` nebo podobná
   
2. **Věcná správnost zamítnuta** (`order_vecna_spravnost_zamitnuta`)
   - Kde: Po zamítnutí věcné kontroly (reklamace)
   - Funkce: Při změně stavu věcné správnosti

3. **TODO Alarmy** (`alarm_todo_*`)
   - Kde: Backend worker/cron job (NE v OrderForm25)
   - Periodicka kontrola TODO s alarmy

### 🔧 PŘIDEJ BACKEND TEMPLATE
Pro tyto typy vytvoř SQL INSERT v databázi:

```sql
-- Příklad pro chybějící template
INSERT INTO 25_notification_templates (
  type,
  name,
  app_title,
  app_message,
  email_subject,
  email_body,
  send_email_default,
  priority_default,
  active,
  dt_created,
  dt_updated
) VALUES (
  'order_status_faktura_prirazena',
  'Faktura přiřazena k objednávce',
  'Faktura přiřazena',
  'K objednávce č. {order_number} byla přiřazena faktura {invoice_number}',
  'Faktura {invoice_number} přiřazena k objednávce {order_number}',
  'Dobrý den,\n\nk objednávce č. {order_number} byla přiřazena faktura {invoice_number}.\n\nS pozdravem',
  1,
  'normal',
  1,
  NOW(),
  NOW()
);
```

---

## 🎯 QUICK REFERENCE

### JAK PŘIDAT NOVOU NOTIFIKACI DO WORKFLOW?

1. **Přidej template do DB** (backend):
   ```sql
   INSERT INTO 25_notification_templates (...) VALUES (...);
   ```

2. **Přidej do kódu** (`OrderForm25.js`, funkce `sendOrderNotifications`):
   ```javascript
   const hasMujStav = hasWorkflowState(newWorkflowState, 'MUJ_STAV');
   const hadMujStav = oldWorkflowState ? hasWorkflowState(oldWorkflowState, 'MUJ_STAV') : false;
   
   if (hasMujStav && !hadMujStav) {
     notificationType = 'order_status_muj_stav';
     
     // Přidej příjemce
     if (formData.garant_uzivatel_id) recipientUserIds.add(parseInt(formData.garant_uzivatel_id));
   }
   ```

3. **Otestuj**:
   - Změň stav objednávky
   - Zkontroluj console.log
   - Zkontroluj zvoneček notifikací

---

## 📚 SOUVISEJÍCÍ DOKUMENTY

- `docs/NOTIFICATION-TEMPLATES-PLACEHOLDERS.md` - Placeholders pro templaty
- `docs/BACKEND-CURRENT-NOTIFICATIONS-STATUS.md` - Stav backendu
- `scripts/check-notification-templates.js` - Kontrola dostupných templates
- `src/services/notificationService.js` - API service pro notifikace

---

**Vytvořeno:** 1. listopadu 2025  
**Autor:** GitHub Copilot  
**Verze:** 1.0
