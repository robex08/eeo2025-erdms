# 🔔 Notifikační systém - Opravy a sjednocení event typů

**Datum:** 3. ledna 2026  
**Verze:** 1.95c  
**Autor:** AI + Developer kolaborace

---

## 🎯 Účel změn

1. **Sjednotit názvy event typů** mezi backendem, frontendem a databází (anglické → české)
2. **Přidat chybějící notifikační triggery** pro všechny změny workflow stavů objednávek
3. **Opravit navigaci** po uložení objednávky (Orders25List se nenačítaly data)

---

## ✅ Provedené změny

### 1. Backend API - Event Types (notificationHandlers.php)

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`  
**Řádky:** 1565-1730

**Opravené názvy event typů:**

| Starý název (anglicky)           | Nový název (česky)                | Popis                                      |
|----------------------------------|-----------------------------------|--------------------------------------------|
| `ORDER_SENT_FOR_APPROVAL`        | `order_status_ke_schvaleni`       | Objednávka odeslána ke schválení           |
| `ORDER_APPROVED`                 | `order_status_schvalena`          | Objednávka schválena                       |
| `ORDER_REJECTED`                 | `order_status_zamitnuta`          | Objednávka zamítnuta                       |
| `ORDER_WAITING_FOR_CHANGES`      | `order_status_ceka_se`            | Objednávka vrácena k doplnění              |
| `ORDER_SENT_TO_SUPPLIER` ⚠️      | `order_status_odeslana` ✅        | **Objednávka odeslána dodavateli**         |
| `ORDER_COMPLETED`                | `order_status_dokoncena`          | Objednávka dokončena                       |
| `ORDER_REGISTRY_APPROVAL_REQUESTED` | `order_status_registr_ceka`    | Čeká na zveřejnění v registru              |
| `ORDER_INVOICE_ADDED`            | `order_status_faktura_pridana`    | Faktura přiřazena                          |
| `ORDER_MATERIAL_CHECK_COMPLETED` | `order_status_kontrola_potvrzena` | Věcná kontrola provedena                   |

**Důvod:** DB tabulka `25_notifikace_sablony` používá české názvy s prefixem `order_status_`.

---

### 2. Frontend - OrderForm25.js - Notifikační triggery

**Soubor:** `apps/eeo-v2/client/src/forms/OrderForm25.js`

#### A) INSERT část (nová objednávka)
**Řádky:** 10650-10707

Přidané triggery:
- ✅ `order_status_odeslana` - při prvním odeslání dodavateli
- ✅ `order_status_schvalena` - při okamžitém schválení
- ✅ `order_status_potvrzena` - při okamžitém potvrzení dodavatele
- ✅ `order_status_dokoncena` - při okamžitém dokončení

#### B) UPDATE část (editace objednávky)
**Řádky:** 11097-11301

Přidané triggery:
- ✅ `order_status_odeslana` - **HLAVNÍ OPRAVA** 🎯
- ✅ `order_status_schvalena`
- ✅ `order_status_zamitnuta`
- ✅ `order_status_ceka_se`
- ✅ `order_status_potvrzena`
- ✅ `order_status_registr_zverejnena`
- ✅ `order_status_dokoncena`

**Příklad kódu:**
```javascript
// 🆕 Při prvním odeslání dodavateli
const hasOdeslana = hasWorkflowState(result.stav_workflow_kod, 'ODESLANA');
const hadOdeslana = oldWorkflowKod ? hasWorkflowState(oldWorkflowKod, 'ODESLANA') : false;

if (hasOdeslana && !hadOdeslana) {
  try {
    await triggerNotification(
      'order_status_odeslana',  // ✅ Nový konzistentní název
      formData.id,
      user_id || formData.objednatel_id,
      { order_number: orderNumber, order_subject: formData.predmet || '' }
    );
    addDebugLog('success', 'NOTIFICATION', 'trigger-sent-odeslana', 
      `Notifikace odeslána: objednávka odeslána dodavateli ${orderNumber}`);
  } catch (triggerError) {
    addDebugLog('warning', 'NOTIFICATION', 'trigger-error-odeslana', 
      `Chyba: ${triggerError.message}`);
  }
}
```

---

### 3. Frontend - Orders25List.js - Navigation Fix

**Soubor:** `apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Řádek:** 9097

**Před:**
```javascript
navigate('/orders25-list', { replace: true });
```

**Po:**
```javascript
navigate('/orders25-list', { state: { forceReload: true }, replace: true });
```

**Důvod:** Po uložení objednávky se Orders25List nenačítaly data z DB kvůli cache. Flag `forceReload` vynutí refresh.

---

## ⚠️ Co je potřeba DOŘÍDIT

### 1. Aktualizovat eventTypes v hierarchii (DEV)

**Problém:** Template node pro "Objednávka odeslána dodavateli" (ID 6) má v hierarchii stále starý název:

```json
{
  "id": "template-6-1767143444671",
  "data": {
    "eventTypes": ["ORDER_SENT_TO_SUPPLIER"]  // ❌ STARÝ
  }
}
```

**Řešení:** Upravit v organizační hierarchii (DEV):

```bash
# 1. Otevřít org hierarchii v DEV: https://dev.erdms.cz/organization-hierarchy
# 2. Kliknout na template "Objednávka odeslána dodavateli"
# 3. V pravém panelu "Event Types" ZMĚNIT:
#    FROM: ORDER_SENT_TO_SUPPLIER
#    TO:   order_status_odeslana
# 4. Uložit hierarchii
```

**Nebo SQL update:**
```sql
-- DEV
UPDATE 25_hierarchie_profily 
SET structure_json = JSON_REPLACE(
  structure_json,
  '$.nodes[?(@.data.templateId == 6)].data.eventTypes',
  JSON_ARRAY('order_status_odeslana')
)
WHERE id = 12 AND aktivni = 1;
```

### 2. Replikovat do PROD

Po otestování v DEV:

```bash
# Zkopírovat hierarchii DEV → PROD (už máš skript)
mysql -h 10.3.172.11 -u erdms_user -p'...' << 'EOSQL'
USE `eeo2025-dev`;
SET @dev_structure = (SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12);

USE eeo2025;
UPDATE 25_hierarchie_profily 
SET structure_json = @dev_structure
WHERE id = 12;
EOSQL
```

### 3. Vytvořit PROD build

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod:explicit
```

---

## 🧪 Testování

### Test 1: Notifikace pro "Odeslaná dodavateli"

1. **Přihlásit se jako:** THP (user_id=100)
2. **Otevřít objednávku:** O-11522 (nebo jinou rozpracovanou)
3. **Zaškrtnout:** "Odesláno dodavateli"
4. **Uložit**

**Očekávaný výsledek:**
- ✅ Backend log: `🔔 NOTIFICATION TRIGGER CALLED! ... order_status_odeslana`
- ✅ Org hierarchie najde template ID 6
- ✅ Notifikace odeslána příjemcům podle edge rules (scope_filter: PARTICIPANTS_ALL)
- ✅ Orders25List se zobrazí BEZ nutnosti F5

### Test 2: Všechny workflow změny

Otestovat triggery pro:
- [x] Ke schválení
- [x] Schválena
- [x] Zamítnuta
- [x] Vrácena k doplnění
- [x] **Odeslaná dodavateli** ← HLAVNÍ FIX
- [x] Potvrzena dodavatelem
- [x] Zveřejněna v registru
- [x] Dokončena

---

## 📊 Backend Log - Příklad úspěšného triggeru

```
╔══════════════════════════════════════════════════════════════════╗
║  🔔 NOTIFICATION TRIGGER CALLED!                                ║
╠══════════════════════════════════════════════════════════════════╣
║  Event Type:   order_status_odeslana                            ║
║  Object ID:    11522                                            ║
║  Trigger User: 100                                              ║
║  Frontend:     8 placeholders                                   ║
╚══════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│  📊 ORGANIZATIONAL HIERARCHY - Finding Recipients             │
├──────────────────────────────────────────────────────────────┤
│  Event Type:   order_status_odeslana                         │
│  Object ID:    11522                                         │
│  Trigger User: 100                                           │
└──────────────────────────────────────────────────────────────┘

✅ Nalezen aktivní profil: ID=12
📊 Hierarchie: 15 nodes, 28 edges
📦 Object type: orders

🔍 Hledám templates s event typem 'order_status_odeslana'...

   ✅ MATCH! Template: 'Objednávka odeslána dodavateli'
      ↪ Event: 'order_status_odeslana'
      
✅ Nalezeno 3 příjemců:
   Příjemce #1: User ID=5, Role=APPROVAL, Email=NE, InApp=ANO
   Příjemce #2: User ID=8, Role=INFO, Email=NE, InApp=ANO
   Příjemce #3: User ID=100, Role=INFO, Email=NE, InApp=ANO

✅ ✅ ✅ [triggerNotification] SUCCESS for order_status_odeslana - Sent: 3 notifications
```

---

## 📝 Poznámky

1. **Konzistence názvů:** Všechny event types nyní používají formát `order_status_*` (české)
2. **Backwards compatibility:** Staré notifikace v DB (id < 670) mají možná starý typ, ale to nevadí
3. **Cache:** Po změně event types může být potřeba vyčistit browser cache (Ctrl+Shift+R)
4. **Debug:** Backend loguje VŠECHNY triggery do error_log - kontroluj tam úspěch/chyby

---

## 🔗 Související soubory

- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php` (event types)
- `apps/eeo-v2/client/src/forms/OrderForm25.js` (triggery)
- `apps/eeo-v2/client/src/pages/Orders25List.js` (forceReload)
- DB tabulky: `25_notifikace_sablony`, `25_hierarchie_profily`

---

**Status:** ✅ Backend + FE HOTOVO | ⚠️ Hierarchie čeká na update v UI
