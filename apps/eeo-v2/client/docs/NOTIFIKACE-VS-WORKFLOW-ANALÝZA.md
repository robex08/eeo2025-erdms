# Analýza: Notifikace vs Workflow Stavy

## 📊 Porovnání pokrytí

### ✅ MÁME NOTIFIKACE PRO (nyní již kompletní):

| Workflow stav | Notifikace typ v DB | ID | Poznámka |
|--------------|---------------------|----|----|
| `NOVA` | `order_status_nova` | 1 | ✅ Nová objednávka vytvořena |
| `ODESLANA_KE_SCHVALENI` | `order_status_ke_schvaleni` | 2 | ✅ Odeslána ke schválení |
| `SCHVALENA` | `order_status_schvalena` | 3 | ✅ Objednávka schválena |
| `ZAMITNUTA` | `order_status_zamitnuta` | 4 | ✅ Objednávka zamítnuta |
| `CEKA_SE` | `order_status_ceka_se` | 5 | ✅ Objednávka čeká |
| `ODESLANA` | `order_status_odeslana` | 6 | ✅ Odeslána dodavateli |
| `POTVRZENA` | `order_status_potvrzena` | 8 | ✅ Potvrzena dodavatelem |
| `ROZPRACOVANA` | `order_status_rozpracovana` | 12 | ✅ Objednávka rozpracována |
| `DOKONCENA` | `order_status_dokoncena` | 9 | ✅ Objednávka dokončena |
| `ZRUSENA` | `order_status_zrusena` | 10 | ✅ Objednávka zrušena |
| `SMAZANA` | `order_status_smazana` | 11 | ✅ Objednávka smazána |
| `CEKA_POTVRZENI` | `order_status_ceka_potvrzeni` | 7 | ✅ Čeká na potvrzení dodavatele |
| **`UVEREJNIT`** | **`order_status_registr_ceka`** | **13** | ✅ Čeká na zveřejnění |
| **`UVEREJNENA`** | **`order_status_registr_zverejnena`** | **14** | ✅ Byla zveřejněna |
| **`FAKTURACE`** | **`order_status_faktura_prirazena`** | **60** | ✅ Faktura přiřazena |
| **`VECNA_SPRAVNOST`** | **`order_status_zkontrolovana`** | **?** | ✅ Kontrola věcné správnosti |
| **`ZKONTROLOVANA`** | **`order_status_kontrola_ceka`** | **19** | ✅ Čeká na kontrolu |

### ❌ STÁLE CHYBÍ V DB:

| Workflow stav | Potřebný typ v DB | Priorita |
|--------------|-------------------|----------|
| **`NEUVEREJNIT`** | `order_status_neuverejnit` | 🟢 **NÍZKÁ** |

---

## 🎯 Doporučení pro implementaci

### 1. 🔴 PRIORITA VYSOKÁ: UVEREJNIT

**Use case:** 
- Garант/Příkazce přesune objednávku do stavu "Má být zveřejněno"
- → Notifikace odešle **osobě odpovědné za registr smluv**

**Implementace:**
```javascript
// v notificationsApi.js
export const NOTIFICATION_TYPES = {
  // ... stávající
  ORDER_STATUS_UVEREJNIT: 'order_status_uverejnit', // NOVÉ
};

// Funkce pro notifikaci
export const notifyOrderToBePublished = async (order) => {
  return notifyOrderStatusChange(order, 'uverejnit');
};

// V statusConfig přidat:
'uverejnit': {
  type: NOTIFICATION_TYPES.ORDER_STATUS_UVEREJNIT,
  recipients: [order.registr_odpovorna_osoba_id || order.garant_id],
  recipientType: 'registry_manager'
}
```

**DB template (do tabulky `25_notification_templates`):**
```sql
INSERT INTO 25_notification_templates (type, title, message, priority, category, icon, color)
VALUES (
  'order_status_uverejnit',
  'Objednávka {order_number} čeká na zveřejnění',
  'Objednávka {order_number} byla označena k zveřejnění do registru smluv. Předmět: {order_subject}',
  'normal',
  'orders',
  'faFileContract',
  '#f59e0b' -- oranžová
);
```

---

### 2. 🟡 PRIORITA STŘEDNÍ: UVEREJNENA

**Use case:**
- Osoba odpovědná za registr vyplní IDDT + datum zveřejnění
- → Notifikace informuje **garanta + příkazce** že objednávka byla zveřejněna

**Implementace:**
```javascript
ORDER_STATUS_UVEREJNENA: 'order_status_uverejnena',

export const notifyOrderPublished = async (order) => {
  return notifyOrderStatusChange(order, 'uverejnena');
};

'uverejnena': {
  type: NOTIFICATION_TYPES.ORDER_STATUS_UVEREJNENA,
  recipients: [order.garant_id, order.prikazce_id],
  recipientType: 'approvers'
}
```

**DB template:**
```sql
INSERT INTO 25_notification_templates (type, title, message, priority, category, icon, color)
VALUES (
  'order_status_uverejnena',
  'Objednávka {order_number} byla zveřejněna',
  'Objednávka {order_number} byla úspěšně zveřejněna v registru smluv. IDDT: {registr_iddt}',
  'low',
  'orders',
  'faCheckCircle',
  '#10b981' -- zelená
);
```

---

### 3. 🟡 PRIORITA STŘEDNÍ: FAKTURACE

**Use case:**
- Objednávka přešla do fáze fakturace
- → Notifikace informuje **účetní/ekonoma**

**Implementace:**
```javascript
ORDER_STATUS_FAKTURACE: 'order_status_fakturace',

export const notifyOrderInvoicing = async (order) => {
  return notifyOrderStatusChange(order, 'fakturace');
};

'fakturace': {
  type: NOTIFICATION_TYPES.ORDER_STATUS_FAKTURACE,
  recipients: [order.ekonom_id || order.garant_id],
  recipientType: 'accountant'
}
```

**DB template:**
```sql
INSERT INTO 25_notification_templates (type, title, message, priority, category, icon, color)
VALUES (
  'order_status_fakturace',
  'Objednávka {order_number} - fakturace',
  'Objednávka {order_number} přešla do fáze fakturace. Předmět: {order_subject}, Cena: {max_price} Kč',
  'normal',
  'orders',
  'faFileInvoice',
  '#06b6d4' -- tyrkysová
);
```

---

### 4. 🟡 PRIORITA STŘEDNÍ: VECNA_SPRAVNOST

**Use case:**
- Objednávka vyžaduje kontrolu věcné správnosti
- → Notifikace informuje **garanta** jako kontrolora

**Implementace:**
```javascript
ORDER_STATUS_VECNA_SPRAVNOST: 'order_status_vecna_spravnost',

export const notifyOrderMaterialCorrectness = async (order) => {
  return notifyOrderStatusChange(order, 'vecna_spravnost');
};

'vecna_spravnost': {
  type: NOTIFICATION_TYPES.ORDER_STATUS_VECNA_SPRAVNOST,
  recipients: [order.garant_id],
  recipientType: 'guarantor'
}
```

**DB template:**
```sql
INSERT INTO 25_notification_templates (type, title, message, priority, category, icon, color)
VALUES (
  'order_status_vecna_spravnost',
  'Objednávka {order_number} - kontrola věcné správnosti',
  'Objednávka {order_number} čeká na kontrolu věcné správnosti. Zkontrolujte prosím dodání.',
  'normal',
  'orders',
  'faClipboardCheck',
  '#8b5cf6' -- fialová
);
```

---

### 5. 🟢 PRIORITA NÍZKÁ: NEUVEREJNIT

**Use case:**
- Bylo rozhodnuto NEzveřejňovat do registru smluv
- → Informační notifikace pro **garanta**

**Implementace:**
```javascript
ORDER_STATUS_NEUVEREJNIT: 'order_status_neuverejnit',

export const notifyOrderWillNotBePublished = async (order, reason = '') => {
  return notifyOrderStatusChange(order, 'neuverejnit', { reason });
};

'neuverejnit': {
  type: NOTIFICATION_TYPES.ORDER_STATUS_NEUVEREJNIT,
  recipients: [order.garant_id],
  recipientType: 'guarantor'
}
```

---

### 6. 🟢 PRIORITA NÍZKÁ: ZKONTROLOVANA

**Use case:**
- Finální kontrola před dokončením
- → Notifikace pro **tvůrce + garanta**

**Implementace:**
```javascript
ORDER_STATUS_ZKONTROLOVANA: 'order_status_zkontrolovana',

export const notifyOrderChecked = async (order) => {
  return notifyOrderStatusChange(order, 'zkontrolovana');
};

'zkontrolovana': {
  type: NOTIFICATION_TYPES.ORDER_STATUS_ZKONTROLOVANA,
  recipients: [order.creator_id, order.garant_id],
  recipientType: 'owner_and_guarantor'
}
```

---

## 📝 Implementační kroky

### Backend (SQL)
1. Přidat nové typy do tabulky `25_notification_templates`
2. Definovat title, message, priority, icon, color pro každý typ

### Frontend (JavaScript)
1. Přidat konstanty do `NOTIFICATION_TYPES` v `notificationsApi.js`
2. Přidat konfigurace do `statusConfig` v `notifyOrderStatusChange()`
3. Vytvořit exportované helper funkce (`notifyOrderToBePublished`, atd.)
4. Přidat volání notifikací do WorkflowManager při změnách stavů

### OrderForm25.js / WorkflowManager
1. Při přechodu do stavu `UVEREJNIT` → zavolat `notifyOrderToBePublished()`
2. Při vyplnění registru (IDDT + datum) → zavolat `notifyOrderPublished()`
3. Atd. pro ostatní stavy

---

## 🎯 Prioritizace implementace

**Fáze 1 (MUSÍ mít):**
- ✅ `UVEREJNIT` - kritické pro workflow registru smluv

**Fáze 2 (MĚLO by být):**
- ✅ `FAKTURACE` - důležité pro ekonomický oddíl
- ✅ `VECNA_SPRAVNOST` - kontrolní mechanismus
- ✅ `UVEREJNENA` - zpětná vazba o dokončení zveřejnění

**Fáze 3 (NICE to have):**
- ✅ `NEUVEREJNIT` - informační
- ✅ `ZKONTROLOVANA` - informační

---

## 📅 Datum analýzy
**4. listopadu 2025**

## 👤 Autor
GitHub Copilot + @holovsky
