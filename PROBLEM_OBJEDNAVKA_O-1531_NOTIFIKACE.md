# 🔴 PROBLÉM: Objednávka O-1531 - Chybějící notifikace o zamítnutí

**Datum:** 26. května 2026, 09:49-09:50  
**Objednávka:** O-1531/75030926/2026/IT (ID: 1543)  
**Problém:** Poslána notifikace "Schválena", pak změněn stav na "Zamítnuta", ale NEPŘIŠLA notifikace o zamítnutí

---

## 📊 ČASOVÁ OSA UDÁLOSTÍ

### ✅ 09:49:37 - Objednávka vytvořena a odeslána ke schválení
- **Akce:** Jan Černohorský (ID 85) vytvořil objednávku
- **Stav:** `ODESLANA_KE_SCHVALENI`
- **Notifikace:** ✅ `ORDER_PENDING_APPROVAL` poslána Tereze Balousové (ID 47)
- **Debug log:** ✅ Existuje záznam v `debug_notification_log` (ID 27305-27315)

### ✅ 09:50:15 - Objednávka schválena
- **Akce:** Tereza Balousová (ID 47) schválila objednávku
- **Stav:** `SCHVALENA`
- **Notifikace:** ✅ `ORDER_APPROVED` poslána 19 příjemcům
  - ID: 30, 33, 34, 47, 51, 57, 62, 63, 64, 65, 67, 68, 75, 79, 85, 95, 102, 113, 136
- **Debug log:** ✅ Existuje záznam v `debug_notification_log` (ID 27326-27336)
- **Notifikace v DB:** ✅ Vytvořeno 19 záznamů (notif_id 2562-2580)

### ❌ NEZNÁMÝ ČAS - Objednávka zamítnuta
- **Akce:** Někdo změnil stav na `ZAMITNUTA`
- **Stav:** `["ZAMITNUTA"]` (aktuální stav v DB)
- **Notifikace:** ❌ **NEPOSLÁNA** `ORDER_REJECTED` - TOTO JE PROBLÉM!
- **Debug log:** ❌ **NEEXISTUJE** žádný záznam o `ORDER_REJECTED`
- **Update info:** ⚠️ `dt_aktualizace` = NULL, `uzivatel_akt_id` = NULL

---

## 🔍 ZJIŠTĚNÍ Z DATABÁZE

### Současný stav objednávky:
```sql
id: 1543
cislo_objednavky: O-1531/75030926/2026/IT
stav_objednavky: Zamítnutá
stav_workflow_kod: ["ZAMITNUTA"]
dt_vytvoreni: 2026-05-26 09:49:37
dt_aktualizace: NULL  ⚠️
uzivatel_akt_id: NULL  ⚠️
objednatel_id: 85 (Jan Černohorský)
schvalovatel_id: 47 (Tereza Balousová)
```

### Notifikace v `25_notifikace`:
```
✅ ORDER_PENDING_APPROVAL - 1 notifikace (09:49:37)
✅ ORDER_APPROVED - 19 notifikací (09:50:15)
❌ ORDER_REJECTED - 0 notifikací (CHYBÍ!)
```

### Notifikace v `25_notifikace_precteni`:
- Všechny notifikace ORDER_APPROVED mají `precteno = 0` (nepřečtené)
- Uživatelé stále vidí "Objednávka schválena", i když je zamítnuta

---

## 🚨 IDENTIFIKOVANÝ PROBLÉM

### Hlavní problém:
**Když uživatel změnil stav z "Schválena" na "Zamítnuta", nebyla zavolána notifikační funkce `triggerNotification('ORDER_REJECTED', ...)`**

### Důkazy:
1. ❌ V `debug_notification_log` NEEXISTUJE žádný záznam o volání `ORDER_REJECTED`
2. ❌ V `25_notifikace` NEEXISTUJE žádná notifikace typu `ORDER_REJECTED`
3. ⚠️ `dt_aktualizace` a `uzivatel_akt_id` jsou NULL (změna neprošla standardním update endpointem)

### Možné příčiny:

#### ❌ PŘÍČINA 1: Frontend nedetekoval změnu správně
**OrderForm25.js, řádek ~12377:**
```javascript
const hasZamitnuta = hasWorkflowState(result.stav_workflow_kod, 'ZAMITNUTA');
const hadZamitnuta = oldWorkflowKod ? hasWorkflowState(oldWorkflowKod, 'ZAMITNUTA') : false;

if (hasZamitnuta && !hadZamitnuta) {
  await triggerNotification('ORDER_REJECTED', formData.id, user_id, {
    order_number: orderNumber,
    order_subject: formData.predmet || ''
  });
}
```

**Možný problém:**
- `oldWorkflowKod` nebyl správně nastaven (byl prázdný nebo obsahoval již ZAMITNUTA)
- Podmínka `!hadZamitnuta` vrátila `false` → notifikace nebyla zavolána
- Frontend neměl správný `oldWorkflowKod` při změně z SCHVALENA na ZAMITNUTA

#### ❌ PŘÍČINA 2: Změna stavu neprošla přes OrderForm25
**Důkaz:** `dt_aktualizace` a `uzivatel_akt_id` jsou NULL

**Možné scénáře:**
- Stav byl změněn přímo v databázi (SQL UPDATE)
- Stav byl změněn přes jiný API endpoint (ne `orders25/partial-update`)
- Stav byl změněn v admin rozhraní nebo jiném formuláři

#### ❌ PŘÍČINA 3: Frontend volal trigger, ale selhal
**Méně pravděpodobné**, protože:
- V `debug_notification_log` by byl záznam o pokusu (není)
- Frontend by měl zalogovat i chyby (nejsou)

---

## 💡 DOPORUČENÁ ŘEŠENÍ

### 🔧 Řešení 1: Přidat backend notifikace do `orderHandlers.php`

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`  
**Funkce:** `handle_orders25_partial_update()`

**Přidat po úspěšném UPDATE (řádek ~4200):**

```php
// ========== NOTIFIKACE PŘI ZMĚNĚ STAVU ==========
if (in_array('stav_workflow_kod', $updatedFields)) {
    require_once(__DIR__ . '/notificationHandlers.php');
    
    $workflow_states = json_decode($input['stav_workflow_kod'], true);
    
    // Detekovat, který stav byl přidán (porovnat s původním)
    $old_workflow_states = array();
    if ($currentState && $currentState['stav_workflow_kod']) {
        $old_workflow_states = json_decode($currentState['stav_workflow_kod'], true);
    }
    
    // SCHVÁLENA - nově přidána
    if (in_array('SCHVALENA', $workflow_states) && !in_array('SCHVALENA', $old_workflow_states)) {
        error_log("📧 [BACKEND] Triggering ORDER_APPROVED for order $order_id");
        triggerNotification($db, 'ORDER_APPROVED', $order_id, $current_user_id, array());
    }
    
    // ZAMÍTNUTA - nově přidána
    if (in_array('ZAMITNUTA', $workflow_states) && !in_array('ZAMITNUTA', $old_workflow_states)) {
        error_log("📧 [BACKEND] Triggering ORDER_REJECTED for order $order_id");
        triggerNotification($db, 'ORDER_REJECTED', $order_id, $current_user_id, array());
    }
    
    // ČEKÁ SE - nově přidána
    if (in_array('CEKA_SE', $workflow_states) && !in_array('CEKA_SE', $old_workflow_states)) {
        error_log("📧 [BACKEND] Triggering ORDER_AWAITING_CHANGES for order $order_id");
        triggerNotification($db, 'ORDER_AWAITING_CHANGES', $order_id, $current_user_id, array());
    }
}
```

**Výhoda:**
- ✅ Notifikace se pošlou vždy, i když se stav změní mimo OrderForm25
- ✅ Konzistentní logování všech změn
- ✅ Backup pro případy, kdy frontend selže

### 🔧 Řešení 2: Opravit detekci změny ve frontendu

**Soubor:** `/apps/eeo-v2/client/src/forms/OrderForm25.js`  
**Řádek:** ~12360-12420

**Problém:** `oldWorkflowKod` může být undefined nebo null při prvním načtení

**Oprava:**
```javascript
// Zajistit, že oldWorkflowKod je vždy string (i když prázdný)
const oldWorkflowKod = savedOrderData?.stav_workflow_kod || '[]';

// NEBO zajistit, že se načte před update:
const oldWorkflowKod = formData.stav_workflow_kod || result.stav_workflow_kod || '[]';
```

### 🔧 Řešení 3: Přidat audit log

**Soubor:** `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`

**Přidat záznam všech změn:**
```php
// Po každém UPDATE stav_workflow_kod
if (in_array('stav_workflow_kod', $updatedFields)) {
    $sql_audit = "INSERT INTO 25_objednavky_historie 
                  (objednavka_id, uzivatel_id, akce, puvodni_hodnota, nova_hodnota, dt_zmeny)
                  VALUES (?, ?, 'UPDATE stav_workflow_kod', ?, ?, NOW())";
    $stmt_audit = $db->prepare($sql_audit);
    $stmt_audit->execute(array(
        $order_id,
        $current_user_id,
        $currentState['stav_workflow_kod'],
        $input['stav_workflow_kod']
    ));
}
```

---

## 📝 ZÁVĚR

### Aktuální situace:
- ❌ Uživatelé dostali notifikaci "Objednávka schválena"
- ❌ Pak někdo změnil stav na "Zamítnuta"
- ❌ Ale uživatelé **NEDOSTALI** notifikaci o zamítnutí
- ❌ Stále vidí "Schválena" jako poslední notifikaci

### Dopad:
- ⚠️ **19 uživatelů** má nepřesné informace o stavu objednávky
- ⚠️ Myslí si, že objednávka je schválena, ale ve skutečnosti je zamítnuta
- ⚠️ Porušení konzistence notifikačního systému

### Doporučení:
1. ✅ **Implementovat Řešení 1** (backend notifikace) - nejvyšší priorita
2. ✅ **Implementovat Řešení 3** (audit log) - pro budoucí debugging
3. ✅ **Zkontrolovat Řešení 2** (frontend detekce) - preventivní oprava
4. ⚠️ **Manuálně poslat notifikaci** pro objednávku O-1531 (informovat uživatele o zamítnutí)

---

**Vytvořeno:** 26. května 2026  
**Analýza provedena:** GitHub Copilot
