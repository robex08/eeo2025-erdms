# IMPLEMENTACE NOTIFIKAČNÍCH TRIGGERŮ PRO FAKTURY A POKLADNU

**Datum:** 31. prosince 2025  
**Verze:** 1.92d  
**Status:** ✅ PŘIPRAVENO K IMPLEMENTACI

---

## 📋 PŘEHLED NOVÝCH UDÁLOSTÍ

### Faktury (invoices)
1. **INVOICE_SUBMITTED** - Faktura předána
2. **INVOICE_RETURNED** - Faktura vrácena
3. **INVOICE_MATERIAL_CHECK_REQUESTED** - Věcná správnost vyžadována
4. **INVOICE_UPDATED** - Faktura aktualizována
5. **INVOICE_MATERIAL_CHECK_APPROVED** - Věcná správnost potvrzena
6. **INVOICE_REGISTRY_PUBLISHED** - Uveřejněno v registru

### Pokladna (cashbook)
7. **CASHBOOK_MONTH_CLOSED** - Pokladna uzavřena za měsíc
8. **CASHBOOK_MONTH_LOCKED** - Pokladna uzamčena za měsíc

---

## 🎯 MAPOVÁNÍ TRIGGERŮ NA AKCE V SYSTÉMU

### 1. INVOICE_SUBMITTED - Faktura předána
**Kdy se triggeruje:**
- Při změně stavu faktury na "předáno ke kontrole"
- V API endpointu pro update faktury když se mění `stav` pole

**Soubory k úpravě:**
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php` → funkce `handle_invoices25_update()`
- Nebo nový V2 handler v `orderV2InvoiceHandlers.php`

**Podmínka triggeru:**
```php
// Pokud se stav změnil na "předáno" nebo "ke kontrole"
if (isset($input['stav']) && in_array($input['stav'], ['predano', 'ke_kontrole', 'submitted'])) {
    // Trigger notifikaci INVOICE_SUBMITTED
    triggerNotification($db, 'INVOICE_SUBMITTED', [
        'invoice_id' => $faktura_id,
        'invoice_number' => $invoice_data['cislo_faktury'],
        'supplier_name' => $invoice_data['dodavatel_nazev'],
        'amount' => $invoice_data['castka'],
        'order_number' => $invoice_data['objednavka_cislo']
    ]);
}
```

---

### 2. INVOICE_RETURNED - Faktura vrácena
**Kdy se triggeruje:**
- Při změně stavu faktury na "vráceno k doplnění"
- Při zamítnutí věcné správnosti

**Soubory k úpravě:**
- `invoiceHandlers.php` nebo `orderV2InvoiceHandlers.php`

**Podmínka triggeru:**
```php
if (isset($input['stav']) && in_array($input['stav'], ['vraceno', 'returned', 'k_doplneni'])) {
    triggerNotification($db, 'INVOICE_RETURNED', [
        'invoice_id' => $faktura_id,
        'invoice_number' => $invoice_data['cislo_faktury'],
        'supplier_name' => $invoice_data['dodavatel_nazev'],
        'return_reason' => $input['duvod_vraceni'] ?? 'Není uveden'
    ]);
}
```

---

### 3. INVOICE_MATERIAL_CHECK_REQUESTED - Věcná správnost vyžadována
**Kdy se triggeruje:**
- Při přiřazení faktury k objednávce (vyžaduje se kontrola)
- Při explicitním požadavku na kontrolu věcné správnosti

**Soubory k úpravě:**
- `invoiceHandlers.php` - po přiřazení k objednávce
- `orderV2InvoiceHandlers.php` - při přidání faktury

**Podmínka triggeru:**
```php
// Po přiřazení faktury k objednávce
if (isset($input['objednavka_id']) && !empty($input['objednavka_id'])) {
    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', [
        'invoice_id' => $faktura_id,
        'invoice_number' => $invoice_data['cislo_faktury'],
        'supplier_name' => $invoice_data['dodavatel_nazev'],
        'amount' => $invoice_data['castka'],
        'order_id' => $input['objednavka_id']
    ]);
}
```

---

### 4. INVOICE_UPDATED - Faktura aktualizována
**Kdy se triggeruje:**
- Při JAKÉKOLI změně údajů faktury (update)
- Není třeba notifikovat email, jen in-app

**Soubory k úpravě:**
- `invoiceHandlers.php` → `handle_invoices25_update()`

**Podmínka triggeru:**
```php
// Po úspěšném UPDATE
if ($stmt->execute($params)) {
    // Trigger notifikaci INVOICE_UPDATED (pouze app, bez emailu)
    triggerNotification($db, 'INVOICE_UPDATED', [
        'invoice_id' => $faktura_id,
        'invoice_number' => $invoice_data['cislo_faktury'],
        'updated_by' => $user_data['cele_jmeno'],
        'updated_at' => date('d.m.Y H:i')
    ], ['channels' => ['app']]); // Pouze in-app
}
```

---

### 5. INVOICE_MATERIAL_CHECK_APPROVED - Věcná správnost potvrzena
**Kdy se triggeruje:**
- Při potvrzení věcné správnosti faktury
- Změna stavu na "věcně zkontrolováno" nebo "schváleno"

**Soubory k úpravě:**
- `invoiceHandlers.php` nebo `orderV2InvoiceHandlers.php`

**Podmínka triggeru:**
```php
if (isset($input['stav']) && in_array($input['stav'], ['vecne_schvaleno', 'material_check_approved'])) {
    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_APPROVED', [
        'invoice_id' => $faktura_id,
        'invoice_number' => $invoice_data['cislo_faktury'],
        'supplier_name' => $invoice_data['dodavatel_nazev'],
        'amount' => $invoice_data['castka'],
        'approved_by' => $user_data['cele_jmeno']
    ]);
}
```

---

### 6. INVOICE_REGISTRY_PUBLISHED - Uveřejněno v registru
**Kdy se triggeruje:**
- Po úspěšném zveřejnění faktury v registru smluv
- Změna příznaku `registr_zverejneno` na 1

**Soubory k úpravě:**
- `invoiceHandlers.php` nebo speciální handler pro registr

**Podmínka triggeru:**
```php
if (isset($input['registr_zverejneno']) && $input['registr_zverejneno'] == 1) {
    triggerNotification($db, 'INVOICE_REGISTRY_PUBLISHED', [
        'invoice_id' => $faktura_id,
        'invoice_number' => $invoice_data['cislo_faktury'],
        'supplier_name' => $invoice_data['dodavatel_nazev'],
        'published_at' => date('d.m.Y H:i')
    ]);
}
```

---

### 7. CASHBOOK_MONTH_CLOSED - Pokladna uzavřena za měsíc
**Kdy se triggeruje:**
- Při uzavření pokladny za měsíc (nelze přidávat nové záznamy)
- Změna stavu měsíce na "uzavřeno"

**Soubory k úpravě:**
- Potřebujeme najít handler pro pokladnu (cashbook)
- Pravděpodobně `cashbookHandlers.php` nebo podobný

**Podmínka triggeru:**
```php
// Po uzavření měsíce
if ($action === 'close_month') {
    triggerNotification($db, 'CASHBOOK_MONTH_CLOSED', [
        'cashbook_id' => $pokladna_id,
        'cashbook_name' => $pokladna_data['nazev'],
        'month_year' => date('m/Y', strtotime($input['mesic'])),
        'closed_by' => $user_data['cele_jmeno'],
        'final_balance' => $pokladna_data['zustatek']
    ]);
}
```

---

### 8. CASHBOOK_MONTH_LOCKED - Pokladna uzamčena za měsíc
**Kdy se triggeruje:**
- Při finálním uzamčení pokladny (nelze vůbec měnit)
- Změna stavu měsíce na "uzamčeno"

**Soubory k úpravě:**
- Cashbook handler

**Podmínka triggeru:**
```php
// Po uzamčení měsíce
if ($action === 'lock_month') {
    triggerNotification($db, 'CASHBOOK_MONTH_LOCKED', [
        'cashbook_id' => $pokladna_id,
        'cashbook_name' => $pokladna_data['nazev'],
        'month_year' => date('m/Y', strtotime($input['mesic'])),
        'locked_by' => $user_data['cele_jmeno'],
        'final_balance' => $pokladna_data['zustatek']
    ], ['priority' => 'urgent']); // URGENT priorita!
}
```

---

## 🔧 HELPER FUNKCE PRO TRIGGERY

Vytvořit univerzální funkci pro snadné volání notifikací:

```php
/**
 * Trigger notifikace s organizační hierarchií
 * 
 * @param PDO $db Databázové připojení
 * @param string $eventCode Kód události (např. 'INVOICE_SUBMITTED')
 * @param array $data Data pro placeholders v šabloně
 * @param array $options Volitelné nastavení (channels, priority, etc.)
 * @return bool
 */
function triggerNotification($db, $eventCode, $data = [], $options = []) {
    try {
        // 1. Zjisti, zda je aktivní org hierarchie
        $stmt = $db->prepare("
            SELECT aktivni, id 
            FROM `25_hierarchie_profily` 
            WHERE aktivni = 1 
            LIMIT 1
        ");
        $stmt->execute();
        $activeProfile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$activeProfile) {
            error_log("[triggerNotification] ⚠️ Žádný aktivní hierarchický profil");
            return false;
        }
        
        // 2. Zavolej notifikační systém s org hierarchií
        require_once __DIR__ . '/notificationHandlers.php';
        
        // 3. Vytvoř notifikaci přes org hierarchii
        $result = createNotificationWithOrgHierarchy(
            $db,
            $eventCode,
            $data,
            $activeProfile['id'],
            $options
        );
        
        return $result['success'] ?? false;
        
    } catch (Exception $e) {
        error_log("[triggerNotification] ❌ Chyba: " . $e->getMessage());
        return false;
    }
}
```

---

## 📝 PŘEHLED SOUBORŮ K ÚPRAVĚ

### 1. Invoice Handlers
- **Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php`
- **Funkce:** `handle_invoices25_update()`, případně další
- **Akce:**
  - Přidat triggery pro `INVOICE_SUBMITTED`, `INVOICE_RETURNED`, `INVOICE_MATERIAL_CHECK_APPROVED`, `INVOICE_UPDATED`, `INVOICE_REGISTRY_PUBLISHED`

### 2. Order V2 Invoice Handlers
- **Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php`
- **Akce:**
  - Přidat trigger `INVOICE_MATERIAL_CHECK_REQUESTED` při přiřazení faktury k objednávce

### 3. Cashbook Handlers
- **Soubor:** Potřeba najít (pravděpodobně `cashbookHandlers.php`)
- **Akce:**
  - Implementovat triggery `CASHBOOK_MONTH_CLOSED` a `CASHBOOK_MONTH_LOCKED`

### 4. Helper funkce
- **Soubor:** Vytvořit `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationTriggerHelper.php`
- **Akce:**
  - Implementovat `triggerNotification()` funkci

---

## ⚠️ DŮLEŽITÉ POZNÁMKY

### Vícenásobné triggery
Ano, je možné, že jedna akce vyvolá více triggerů. Například:

```php
// Při přidání faktury k objednávce:
triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', ...); // Vyžaduje kontrolu
triggerNotification($db, 'INVOICE_UPDATED', ...); // Zároveň update
```

### Kontrola aktivní org hierarchie
**VŽDY** před triggerem ověř, zda je aktivní organizační hierarchie:
```php
$stmt = $db->prepare("SELECT id FROM `25_hierarchie_profily` WHERE aktivni = 1 LIMIT 1");
$stmt->execute();
if (!$stmt->fetch()) {
    // Org hierarchie není aktivní - nepošle se notifikace
    return;
}
```

### Priority
- **NORMAL**: Běžné události (většina)
- **URGENT**: Kritické události (uzamčení pokladny)

### Kanály
- **app**: In-app notifikace (vždy)
- **email**: Email notifikace (volitelně, jen u důležitých)

---

## ✅ CHECKLIST IMPLEMENTACE

- [ ] Vytvořit `notificationTriggerHelper.php` s funkcí `triggerNotification()`
- [ ] Upravit `invoiceHandlers.php` - přidat 6 triggerů pro faktury
- [ ] Upravit `orderV2InvoiceHandlers.php` - trigger při přiřazení faktury
- [ ] Najít a upravit cashbook handler - 2 triggery pro pokladnu
- [ ] Otestovat každý trigger samostatně
- [ ] Ověřit, že org hierarchie správně směruje notifikace
- [ ] Otestovat vícenásobné triggery (jedna akce = více notifikací)
- [ ] Zkontrolovat logy v `debug_notification_log`

---

## 🎯 TESTOVACÍ SCÉNÁŘE

### Test 1: Faktura předána
1. Vytvoř novou fakturu
2. Změň stav na "předáno"
3. Ověř, že notifikace dorazila THP/PES a garantovi

### Test 2: Faktura vrácena
1. Nastav fakturu na "vráceno"
2. Ověř, že notifikace dorazila objednateli a garantovi

### Test 3: Uzavření pokladny
1. Uzavři měsíc v pokladně
2. Ověř, že notifikace dorazila účetním

### Test 4: Uzamčení pokladny
1. Uzamči měsíc v pokladně
2. Ověř, že URGENT notifikace dorazila účetním a manažerům

---

**Status:** ✅ SQL skripty připraveny a spuštěny  
**Další krok:** Implementace PHP triggerů v handlers souborech
