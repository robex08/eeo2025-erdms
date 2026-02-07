# CHANGELOG - Notifikace věcné správnosti faktur

**Datum implementace:** 11. ledna 2026  
**Branch:** `feature/generic-recipient-system`  
**Verze:** v2.10  
**Autor:** AI Assistant (GitHub Copilot)

## 📋 Přehled změn

Implementace **4 notifikačních triggerů** pro věcnou správnost faktur v systému objednávek.

---

## 🎯 Účel

Zajistit, aby všichni relevantní uživatelé (garant, schvalovatel, účetní) dostali notifikaci:
1. **Když je faktura přiřazena k objednávce** → vyžaduje kontrolu věcné správnosti
2. **Když je věcná správnost potvrzena** → informovat nadřízené a účetní

---

## 🔔 Implementované triggery

### 1️⃣ INVOICE_MATERIAL_CHECK_REQUESTED (Frontend - OrderForm25)

**Soubor:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Funkce:** `handleCreateInvoiceInDB()` (po řádku 8801)  
**Kdy se spustí:** Po vytvoření faktury v databázi (temp ID → reálné ID)

```javascript
// 🔔 TRIGGER 1: INVOICE_MATERIAL_CHECK_REQUESTED
await triggerNotification(
  'INVOICE_MATERIAL_CHECK_REQUESTED',
  realFakturaId,
  user_id,
  {
    faktura_cislo: faktura.fa_cislo_vema,
    objednavka_id: orderId,
    objednavka_cislo: formData.cislo_objednavky
  }
);
```

**Placeholdery:**
- `{{faktura_cislo}}` - Číslo faktury
- `{{objednavka_id}}` - ID objednávky
- `{{objednavka_cislo}}` - Číslo objednávky

---

### 2️⃣ INVOICE_MATERIAL_CHECK_APPROVED (Frontend - OrderForm25)

**Soubor:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Místo:** onChange handler checkboxu věcné správnosti (po řádku 24131)  
**Kdy se spustí:** Když uživatel zaškrtne "Potvrzuji věcnou správnost faktury"

```javascript
// 🔔 TRIGGER 2: INVOICE_MATERIAL_CHECK_APPROVED
if (newValue === 1 && faktura.vecna_spravnost_potvrzeno !== 1) {
  const hasRealId = faktura.id && !String(faktura.id).startsWith('temp-');
  if (hasRealId) {
    await triggerNotification(
      'INVOICE_MATERIAL_CHECK_APPROVED',
      faktura.id,
      user_id,
      {
        faktura_cislo: faktura.fa_cislo_vema,
        objednavka_id: formData.id,
        objednavka_cislo: formData.cislo_objednavky
      }
    );
  }
}
```

**Validace:**
- Pouze pro faktury s reálným ID (ne temp-*)
- Pouze při změně z 0 na 1 (ne při opakovaném kliknutí)

---

### 3️⃣ INVOICE_MATERIAL_CHECK_REQUESTED (Backend - InvoiceHandlers)

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`  
**Řádek:** 584-593  
**Kdy se spustí:** Když se faktura přiřadí k objednávce (změna `objednavka_id` z NULL na hodnotu)

```php
// TRIGGER 6: INVOICE_MATERIAL_CHECK_REQUESTED
$orderAssigned = isset($input['objednavka_id']) && 
                 !empty($input['objednavka_id']) && 
                 empty($oldInvoiceData['objednavka_id']);

if ($orderAssigned) {
    require_once __DIR__ . '/notificationHandlers.php';
    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $currentUserId);
    error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_REQUESTED for invoice $faktura_id");
}
```

**Použití:** Samostatný modul Faktury (InvoiceEvidencePage)

---

### 4️⃣ INVOICE_MATERIAL_CHECK_APPROVED (Backend - InvoiceHandlers)

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`  
**Řádek:** 573-578  
**Kdy se spustí:** Když se změní `vecna_spravnost_potvrzeno` z 0 na 1

```php
// TRIGGER 5: INVOICE_MATERIAL_CHECK_APPROVED
$vecnaSpravnostChanged = isset($input['vecna_spravnost_potvrzeno']) && 
                          (int)$input['vecna_spravnost_potvrzeno'] === 1 && 
                          (int)$oldInvoiceData['vecna_spravnost_potvrzeno'] !== 1;

if ($vecnaSpravnostChanged) {
    require_once __DIR__ . '/notificationHandlers.php';
    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_APPROVED', $faktura_id, $currentUserId);
    error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_APPROVED for invoice $faktura_id");
}
```

**Použití:** Samostatný modul Faktury (InvoiceEvidencePage)

---

## 📊 Databázové definice

### Tabulka: `25_notifikace_typy_udalosti`

| ID | Kód | Název | Popis |
|----|-----|-------|-------|
| 17 | `INVOICE_MATERIAL_CHECK_REQUESTED` | Věcná správnost vyžadována | Událost nastane když je třeba provést kontrolu věcné správnosti faktury |
| 19 | `INVOICE_MATERIAL_CHECK_APPROVED` | Věcná správnost faktury potvrzena | Událost nastane po potvrzení věcné správnosti faktury |

**Struktura tabulky:**
- `id` - Primární klíč
- `kod` - Unikátní kód události (VARCHAR 100)
- `nazev` - Název události (VARCHAR 255)
- `kategorie` - Kategorie (VARCHAR 50) - např. "INVOICE"
- `popis` - Popis události (TEXT)
- `uroven_nahlhavosti` - NORMAL/URGENT/EXCEPTIONAL
- `role_prijemcu` - JSON pole rolí (TEXT)
- `vychozi_kanaly` - JSON pole kanálů (TEXT)
- `modul` - Název modulu (VARCHAR 50)
- `aktivni` - Je aktivní? (TINYINT 1)
- `dt_vytvoreno` - Datum vytvoření
- `dt_upraveno` - Datum úpravy

---

## 🔄 Tok notifikací

### Scénář A: Přidání faktury na OrderForm25 (FAKTURACE fáze)

```
1. Účetní vytvoří fakturu v OrderForm25
   └─> handleCreateInvoiceInDB()
       └─> Backend: POST /invoices/v2/create
           └─> Vrátí realFakturaId
               └─> 🔔 TRIGGER: INVOICE_MATERIAL_CHECK_REQUESTED
                   └─> Notifikační router → Org hierarchie
                       └─> Příjemci: garant, schvalovatel, účetní (dle hierarchie)

2. Garant/schvalovatel zkontroluje věcnou správnost
   └─> Zaškrtne checkbox "Potvrzuji věcnou správnost"
       └─> onChange handler
           └─> 🔔 TRIGGER: INVOICE_MATERIAL_CHECK_APPROVED
               └─> Notifikační router → Org hierarchie
                   └─> Příjemci: nadřízený garant, účetní (dle hierarchie)
```

### Scénář B: Přiřazení faktury z modulu Faktury k objednávce

```
1. Účetní v modulu Faktury přiřadí fakturu k objednávce
   └─> Backend: PUT /invoices/{id}
       └─> invoiceHandlers.php detekuje změnu objednavka_id
           └─> 🔔 TRIGGER: INVOICE_MATERIAL_CHECK_REQUESTED (backend)
               └─> Notifikační router → Org hierarchie

2. Uživatel potvrdí věcnou správnost v modulu Faktury
   └─> Backend: PUT /invoices/{id}
       └─> invoiceHandlers.php detekuje změnu vecna_spravnost_potvrzeno
           └─> 🔔 TRIGGER: INVOICE_MATERIAL_CHECK_APPROVED (backend)
               └─> Notifikační router → Org hierarchie
```

---

## ⚠️ Důležité poznámky

### Žádné duplicity

**OVĚŘENO:** Notifikace se NEPOSÍLAJÍ duplicitně, protože:
1. **OrderForm25** ukládá faktury přes `orderV2Endpoints.php` → **NEVOLÁ invoiceHandlers.php**
2. **InvoiceEvidencePage** používá dedikovaný endpoint → **VOLÁ invoiceHandlers.php**
3. Tyto dvě cesty se **NEPŘEKRÝVAJÍ**

### Frontend vs Backend triggery

| Modul | Cesta | Trigger REQUESTED | Trigger APPROVED |
|-------|-------|-------------------|------------------|
| OrderForm25 | Frontend → orderV2Endpoints.php | ✅ Frontend (po vytvoření) | ✅ Frontend (checkbox) |
| InvoiceEvidencePage | Frontend → invoiceHandlers.php | ✅ Backend (přiřazení k obj.) | ✅ Backend (checkbox) |

---

## 🧪 Testování

### Test 1: Přidání faktury v OrderForm25

1. Otevřít objednávku ve fázi FAKTURACE
2. Kliknout "Přidat fakturu"
3. Vyplnit číslo faktury, datum, částku, středisko
4. Uložit objednávku
5. **Očekáváno:** Notifikace `INVOICE_MATERIAL_CHECK_REQUESTED` odeslaná příjemcům dle hierarchie

### Test 2: Potvrzení věcné správnosti v OrderForm25

1. Otevřít objednávku s fakturou ve fázi FAKTURACE
2. Zaškrtnout "Potvrzuji věcnou správnost faktury"
3. Uložit objednávku
4. **Očekáváno:** Notifikace `INVOICE_MATERIAL_CHECK_APPROVED` odeslaná příjemcům dle hierarchie

### Test 3: Přiřazení faktury v modulu Faktury

1. Otevřít modul Faktury (InvoiceEvidencePage)
2. Vybrat fakturu bez objednávky
3. Přiřadit k objednávce
4. **Očekáváno:** Backend trigger `INVOICE_MATERIAL_CHECK_REQUESTED`

### Test 4: Potvrzení věcné správnosti v modulu Faktury

1. Otevřít modul Faktury (InvoiceEvidencePage)
2. Vybrat fakturu přiřazenou k objednávce
3. Zaškrtnout "Věcná správnost potvrzena"
4. **Očekáváno:** Backend trigger `INVOICE_MATERIAL_CHECK_APPROVED`

---

## 📦 Soubory změněny

### 1. Frontend konstanty

**Soubor:** `/apps/eeo-v2/client/src/services/notificationsApi.js`  
**Změna:** Přidány konstanty pro INVOICE notifikace

```javascript
// FAKTURY - VĚCNÁ SPRÁVNOST (NOVÉ 2026-01-11)
INVOICE_MATERIAL_CHECK_REQUESTED: 'INVOICE_MATERIAL_CHECK_REQUESTED', // DB: id 17
INVOICE_MATERIAL_CHECK_APPROVED: 'INVOICE_MATERIAL_CHECK_APPROVED',   // DB: id 19
```

### 2. OrderForm25 - Trigger po vytvoření faktury

**Soubor:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Funkce:** `handleCreateInvoiceInDB()` (řádek ~8801)  
**Změna:** Přidán trigger `INVOICE_MATERIAL_CHECK_REQUESTED`

### 3. OrderForm25 - Trigger při potvrzení věcné správnosti

**Soubor:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Místo:** onChange handler checkboxu (řádek ~24131)  
**Změna:** Přidán trigger `INVOICE_MATERIAL_CHECK_APPROVED`

### 4. Backend triggery (již existující)

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`  
**Změna:** Žádná - triggery již implementovány (řádky 573-593)

---

## 🔗 Související dokumenty

- [INVOICE_NOTIFICATION_TRIGGERS_ANALYSIS.md](./INVOICE_NOTIFICATION_TRIGGERS_ANALYSIS.md) - Analýza existujících triggerů
- [HIERARCHY_WORKFLOW_BACKEND_IMPLEMENTATION.md](./HIERARCHY_WORKFLOW_BACKEND_IMPLEMENTATION.md) - Implementace hierarchie
- [docs/migrations/20260111_rename_order_status_zrusena_to_ORDER_CANCELLED.sql](./migrations/20260111_rename_order_status_zrusena_to_ORDER_CANCELLED.sql) - Migrace názvů notifikací

---

## 🚀 Deployment

### Prerekvizity

- ✅ Databázová tabulka `25_notifikace_typy_udalosti` obsahuje záznamy ID 17 a 19
- ✅ Backend notificationHandlers.php podporuje `triggerNotification()`
- ✅ Frontend má importován `triggerNotification` z notificationsApi.js

### Postup nasazení

1. **Merge branch** `feature/generic-recipient-system` do `main`
2. **Build frontend:**
   ```bash
   cd /var/www/erdms-dev/apps/eeo-v2/client
   npm run build
   ```
3. **Nasazení na PROD:**
   ```bash
   cd /var/www/erdms-dev
   ./deploy-dev.sh
   ```
4. **Ověření v databázi:**
   ```sql
   SELECT * FROM 25_notifikace_typy_udalosti 
   WHERE kod IN ('INVOICE_MATERIAL_CHECK_REQUESTED', 'INVOICE_MATERIAL_CHECK_APPROVED');
   ```
5. **Test na DEV:** Projít všechny 4 testovací scénáře
6. **Monitoring:** Sledovat logy `/tmp/debug_order_update.log` a error_log

---

## 📝 TODO (budoucí rozšíření)

- [ ] HTML šablony pro email notifikace (pokud jsou vyžadovány)
- [ ] Konfigurace hierarchie v org profilu (dle role: garant, schvalovatel, účetní)
- [ ] Rozšíření placeholderů o další metadata faktury (dodavatel, částka, středisko)
- [ ] Možnost oznámit vícero uživatelů najednou (group notifications)

---

## 🎉 Závěr

Implementace **4 notifikačních triggerů** pro věcnou správnost faktur je **kompletní**.

**Výsledek:**
- ✅ Žádné duplicitní notifikace
- ✅ Plná podpora pro OrderForm25 i InvoiceEvidencePage
- ✅ Připraveno pro konfiguraci v org hierarchii
- ✅ Konzistentní s existujícím notifikačním systémem

**Příjemce notifikací se určují dynamicky** podle organizační hierarchie (tabulka `25_hierarchie_profily`), kterou si uživatel nakonfiguruje sám v profilu.

---

**Konec dokumentace**
