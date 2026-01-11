# CHANGELOG: IMPLEMENTACE NOTIFIKAČNÍCH TRIGGERŮ PRO FAKTURY A POKLADNU

**Datum:** 31. prosince 2025  
**Verze:** 1.92d  
**Status:** ✅ IMPLEMENTOVÁNO

---

## 📋 PŘEHLED ZMĚN

Byla provedena kompletní implementace notifikačních triggerů pro faktury a pokladnu s využitím organizační hierarchie pro automatické rozesílání notifikací.

### Nové události v systému

#### Faktury (6 událostí)
1. **INVOICE_SUBMITTED** - Faktura předána ke kontrole
2. **INVOICE_RETURNED** - Faktura vrácena k doplnění
3. **INVOICE_MATERIAL_CHECK_REQUESTED** - Věcná správnost vyžadována (při přiřazení k objednávce)
4. **INVOICE_UPDATED** - Faktura aktualizována (obecná změna)
5. **INVOICE_MATERIAL_CHECK_APPROVED** - Věcná správnost potvrzena
6. **INVOICE_REGISTRY_PUBLISHED** - Faktura uveřejněna v registru

#### Pokladna (2 události)
7. **CASHBOOK_MONTH_CLOSED** - Pokladna uzavřena za měsíc (čeká na schválení správce)
8. **CASHBOOK_MONTH_LOCKED** - Pokladna uzamčena správcem (⚠️ URGENT priorita)

---

## 🔧 TECHNICKÁ IMPLEMENTACE

### 1. Rozšíření notificationHandlers.php

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

#### Nové funkce:

##### loadInvoicePlaceholders($db, $invoiceId, $triggerUserId)
- Načítá data faktury z databáze včetně JOINů na objednávky, dodavatele a uživatele
- Vrací array placeholders pro použití v šablonách notifikací
- Podporované placeholders:
  - `{{invoice_id}}`, `{{invoice_number}}`, `{{invoice_vs}}`
  - `{{supplier_name}}`, `{{amount}}`, `{{due_date}}`
  - `{{order_number}}`, `{{order_id}}`, `{{creator_name}}`
  - `{{stav}}`, `{{poznamka}}`

##### loadCashbookPlaceholders($db, $cashbookId, $triggerUserId)
- Načítá data pokladní knihy z databáze včetně JOINů na střediska a uživatele
- Vrací array placeholders pro použití v šablonách notifikací
- Podporované placeholders:
  - `{{cashbook_id}}`, `{{month}}`, `{{year}}`, `{{period}}`
  - `{{balance}}`, `{{income_total}}`, `{{expense_total}}`
  - `{{stredisko_kod}}`, `{{stredisko_nazev}}`
  - `{{closed_date}}`, `{{locked_date}}`, `{{creator_name}}`

##### triggerNotification($db, $eventType, $objectId, $triggerUserId, $customPlaceholders)
- Helper funkce pro snadné volání notifikačního routeru z business logiky
- Parametry:
  - `$db` - PDO database connection
  - `$eventType` - Kód události (např. 'INVOICE_SUBMITTED')
  - `$objectId` - ID objektu (invoice_id, cashbook_id, ...)
  - `$triggerUserId` - ID uživatele který vyvolal akci
  - `$customPlaceholders` - Volitelné custom placeholders (array)
- Automaticky zachycuje chyby bez blokování business logiky
- Loguje výsledky do error_log

#### Úprava notificationRouter
- Rozšíření placeholder loading logiky pro `invoices` a `cashbook` objekty
- Automatická detekce typu objektu podle event_type
- Volá správný loader podle typu:
  ```php
  if ($objectType === 'orders') {
      $dbPlaceholders = loadOrderPlaceholders($db, $objectId, $triggerUserId);
  } elseif ($objectType === 'invoices') {
      $dbPlaceholders = loadInvoicePlaceholders($db, $objectId, $triggerUserId);
  } elseif ($objectType === 'cashbook') {
      $dbPlaceholders = loadCashbookPlaceholders($db, $objectId, $triggerUserId);
  }
  ```

---

### 2. Implementace triggerů v invoiceHandlers.php

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`

#### Funkce: handle_invoices25_update()

**Změny:**
1. **Detekce změn stavu** - Načítání starých dat před updatem:
   ```php
   $check_stmt = $db->prepare("SELECT id, stav, objednavka_id, vecna_spravnost_potvrzeno 
                                FROM `$faktury_table` WHERE id = ? AND aktivni = 1");
   $oldInvoiceData = $check_stmt->fetch(PDO::FETCH_ASSOC);
   ```

2. **6 notifikačních triggerů** po úspěšném UPDATE:

   - **INVOICE_UPDATED** - Pouze pokud se nezměnil stav ani věcná správnost
     ```php
     if (!$stavChanged && !$vecnaSpravnostChanged) {
         triggerNotification($db, 'INVOICE_UPDATED', $faktura_id, $currentUserId);
     }
     ```

   - **INVOICE_SUBMITTED** - Pokud se stav změnil na PREDANA/KE_KONTROLE/SUBMITTED
     ```php
     if (in_array(strtoupper($newStav), ['PREDANA', 'KE_KONTROLE', 'SUBMITTED'])) {
         triggerNotification($db, 'INVOICE_SUBMITTED', $faktura_id, $currentUserId);
     }
     ```

   - **INVOICE_RETURNED** - Pokud se stav změnil na VRACENA/RETURNED/K_DOPLNENI
     ```php
     if (in_array(strtoupper($newStav), ['VRACENA', 'RETURNED', 'K_DOPLNENI'])) {
         triggerNotification($db, 'INVOICE_RETURNED', $faktura_id, $currentUserId);
     }
     ```

   - **INVOICE_REGISTRY_PUBLISHED** - Pokud se stav změnil na UVEREJNENA/PUBLISHED
     ```php
     if (in_array(strtoupper($newStav), ['UVEREJNENA', 'PUBLISHED'])) {
         triggerNotification($db, 'INVOICE_REGISTRY_PUBLISHED', $faktura_id, $currentUserId);
     }
     ```

   - **INVOICE_MATERIAL_CHECK_APPROVED** - Pokud se potvrdila věcná správnost
     ```php
     if ($vecnaSpravnostChanged) {
         triggerNotification($db, 'INVOICE_MATERIAL_CHECK_APPROVED', $faktura_id, $currentUserId);
     }
     ```

   - **INVOICE_MATERIAL_CHECK_REQUESTED** - Pokud se přiřadila k objednávce
     ```php
     if ($orderAssigned) {
         triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $currentUserId);
     }
     ```

**Error handling:**
- Všechny triggery jsou v `try-catch` blocích
- Chyby se logují ale neblokují business logiku
- Faktura se vždy úspěšně uloží i když notifikace selže

---

### 3. Implementace triggerů v CashbookService.php

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/CashbookService.php`

#### Funkce: closeBookByUser($bookId, $userId)
- Trigger po uzavření měsíce uživatelem:
  ```php
  require_once __DIR__ . '/../lib/notificationHandlers.php';
  triggerNotification($this->db, 'CASHBOOK_MONTH_CLOSED', $bookId, $userId);
  ```
- Posílá se po `closeBookByUser()` a audit logu
- Notifikuje správce/garanty o čekajícím měsíci ke schválení

#### Funkce: lockBookByAdmin($bookId, $adminId)
- Trigger po zamknutí měsíce správcem:
  ```php
  require_once __DIR__ . '/../lib/notificationHandlers.php';
  triggerNotification($this->db, 'CASHBOOK_MONTH_LOCKED', $bookId, $adminId);
  ```
- Posílá se po `lockBookByAdmin()` a audit logu
- ⚠️ **URGENT priorita** - kritická událost, finální uzavření měsíce
- Notifikuje všechny relevantní účastníky o finálním uzamčení

---

## 📊 DATABÁZOVÉ ZMĚNY

### Tabulka: 25_notifikace_typy_udalosti
✅ Již přidáno (31.12.2025) - 8 nových event types s kategorií `invoices` a `cashbook`

### Tabulka: 25_notifikace_sablony
✅ Již přidáno (31.12.2025) - 8 nových šablon s placeholders pro každý event type

**SQL Script:** `/var/www/erdms-dev/_docs/SQL_ADD_INVOICE_CASHBOOK_NOTIFICATIONS.sql`

---

## 🔄 WORKFLOW INTEGRACE

### Organizační hierarchie
- Všechny nové události využívají existující organizační hierarchii
- Backend automaticky najde správné příjemce podle profilu "PRIKAZCI" (id=12)
- Podporuje generické příjemce (OBJEDNATEL, GARANT, SCHVALOVATEL_1, ...)
- Frontend nemusí specifikovat příjemce - vše řeší backend

### Tok notifikace
```
1. Business logika (faktura/pokladna) → Změna stavu
2. triggerNotification($db, $eventType, $objectId, $userId)
3. notificationRouter($db, $eventType, $objectId, $userId)
4. getObjectTypeFromEvent() → určí typ objektu (invoices/cashbook)
5. loadInvoicePlaceholders() nebo loadCashbookPlaceholders() → načte data
6. findNotificationRecipients() → najde příjemce dle org. hierarchie
7. Zpracování šablony + nahrazení placeholders
8. sendNotificationEmail() + insertNotification() → odeslání
```

---

## ✅ TESTOVÁNÍ

### Test checklist

#### Invoice triggery:
- [ ] INVOICE_SUBMITTED - Změnit stav faktury na "předáno"
- [ ] INVOICE_RETURNED - Změnit stav faktury na "vráceno"
- [ ] INVOICE_MATERIAL_CHECK_REQUESTED - Přiřadit fakturu k objednávce
- [ ] INVOICE_UPDATED - Upravit fakturu bez změny stavu
- [ ] INVOICE_MATERIAL_CHECK_APPROVED - Potvrdit věcnou správnost
- [ ] INVOICE_REGISTRY_PUBLISHED - Změnit stav na "uveřejněno"

#### Cashbook triggery:
- [ ] CASHBOOK_MONTH_CLOSED - Uzavřít měsíc jako uživatel
- [ ] CASHBOOK_MONTH_LOCKED - Zamknout měsíc jako správce (URGENT!)

### Kontrola logů
```bash
# Error log
tail -f /var/log/apache2/error.log | grep -E "🔔|triggerNotification|NotificationRouter"

# Debug notification log v DB
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025-dev \
  -e "SELECT * FROM debug_notification_log ORDER BY id DESC LIMIT 20;"

# Vytvořené notifikace
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025-dev \
  -e "SELECT id, typ, nadpis, dt_created FROM 25_notifikace ORDER BY id DESC LIMIT 10;"
```

---

## 🎯 DALŠÍ KROKY

### 1. UI Konfigurace (Manuální)
- V EEO aplikaci otevřít **Nastavení → Organizační hierarchie**
- Upravit profil **"PRIKAZCI"**
- Přidat nové šablony do grafu:
  - INVOICE_SUBMITTED
  - INVOICE_RETURNED
  - INVOICE_MATERIAL_CHECK_REQUESTED
  - INVOICE_UPDATED
  - INVOICE_MATERIAL_CHECK_APPROVED
  - INVOICE_REGISTRY_PUBLISHED
  - CASHBOOK_MONTH_CLOSED
  - CASHBOOK_MONTH_LOCKED (⚠️ URGENT)
- Definovat pro každou šablonu:
  - Zdrojová role (např. OBJEDNATEL)
  - Cílové role (např. GARANT, SCHVALOVATEL_1)
  - sendEmail (true/false)
  - sendInApp (true/false)

### 2. Production Deployment
```bash
# 1. Zkopírovat změněné soubory do PROD
rsync -av --include="notificationHandlers.php" --include="invoiceHandlers.php" \
  --include="CashbookService.php" --exclude="*" \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/ \
  /var/www/erdms/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/

# 2. Spustit SQL script v PROD databázi
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 \
  < /var/www/erdms-dev/_docs/SQL_ADD_INVOICE_CASHBOOK_NOTIFICATIONS.sql

# 3. Restart Apache (pokud je třeba)
sudo systemctl restart apache2

# 4. Sledovat logy
tail -f /var/log/apache2/error.log | grep "🔔"
```

### 3. Monitoring
- Sledovat `debug_notification_log` tabulku pro případné chyby
- Kontrolovat email delivery rate
- Ověřit že příjemci dostávají notifikace podle hierarchie

---

## 📝 POZNÁMKY

### Kompatibilita
- ✅ Zpětně kompatibilní - neovlivňuje existující notifikace
- ✅ Frontend již volá ORDER_MATERIAL_CORRECTNESS přes `notificationService.trigger()`
- ✅ TODO alarmy fungují přes starší systém (`notificationsApi.create()`)

### Bezpečnost
- Všechny triggery ověřují token před voláním
- Error handling zajišťuje že chyba notifikace nezbortí business logiku
- Organizational hierarchy zajišťuje správné targeting příjemců

### Performance
- Notifikace se odesílají synchronně po business akci
- Pro high-volume workload zvážit async queue (RabbitMQ, Redis)
- Placeholder loading používá optimalizované JOIN queries

---

## 🔗 SOUVISEJÍCÍ DOKUMENTACE

- [IMPLEMENTACE_NOTIFIKACNICH_TRIGGERU_FAKTURY_POKLADNA.md](_docs/IMPLEMENTACE_NOTIFIKACNICH_TRIGGERU_FAKTURY_POKLADNA.md)
- [SOUHRN_NOTIFIKACE_FAKTURY_POKLADNA_2025_12_31.md](_docs/SOUHRN_NOTIFIKACE_FAKTURY_POKLADNA_2025_12_31.md)
- [SQL_ADD_INVOICE_CASHBOOK_NOTIFICATIONS.sql](_docs/SQL_ADD_INVOICE_CASHBOOK_NOTIFICATIONS.sql)

---

**Implementoval:** GitHub Copilot  
**Datum:** 31. prosince 2025  
**Verze systému:** 1.92d
