# 🔧 FIX: Notifikace pro potvrzení věcné správnosti faktur

**Datum**: 13. ledna 2026  
**Branch**: `feature/generic-recipient-system`  
**Problém**: V emailových notifikacích o potvrzení věcné správnosti byly prázdné údaje

---

## 🐛 Zjištěné problémy

V ostrém provozu byly objeveny notifikace s prázdnými údaji:

1. ❌ **Chybějící "Potvrdil"** - pole bylo prázdné, ačkoliv potvrzení provedl konkrétní uživatel
2. ❌ **Chybějící číslo faktury** - v emailu nebylo zobrazeno číslo faktury, kterou se notifikace týká
3. ❌ **Nesprávný datum/čas potvrzení** - zobrazoval se aktuální systémový čas místo skutečného času potvrzení z databáze

### Ukázka problému:

```
Číslo faktury:  -
Potvrdil:       -
Datum potvrzení: 13.01.2026 08:45  (← mělo být např. 12.01.2026 14:23)
```

---

## 📋 Analýza příčin

### Příčina 1: Chybějící invoice_id při volání z OrderForm25

**Scénář**:
- Uživatel potvrdí věcné správnosti u všech faktur na OrderForm25
- Klikne "Uložit objednávku"
- Workflow manager detekuje změnu stavu na `ZKONTROLOVANA`
- Pošle notifikaci typu `order_status_kontrola_potvrzena` s **pouze `order_id`**, nikoliv `invoice_id`

**Důsledek**:
- Backend neví, kterou fakturu má načíst
- Placeholdery pro fakturu zůstanou prázdné: `{invoice_number}`, `{vecna_spravnost_kontroloval}`, `{vecna_spravnost_datum_potvrzeni}`

### Příčina 2: Nesprávné načítání datumu potvrzení

V kódu bylo:
```php
'vecna_spravnost_datum_potvrzeni' => date('d.m.Y H:i'),  // ❌ Aktuální systémový čas!
```

Mělo být:
```php
'vecna_spravnost_datum_potvrzeni' => formatDateTime($invoice['dt_potvrzeni_vecne_spravnosti'])  // ✅ Čas z DB
```

### Příčina 3: Chybějící timezone handling

Funkce `formatDateTime()` nepoužívala `Europe/Prague` timezone, což způsobovalo nekonzistentní zobrazení časů.

---

## ✅ Implementované řešení

### 1. Backend speciální logika pro věcnou správnost

**Soubor**: `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php`

Přidána speciální logika pro typ `order_status_kontrola_potvrzena`:

```php
// Když se volá order_status_kontrola_potvrzena BEZ invoice_id (z OrderForm25)
if ($typ === 'order_status_kontrola_potvrzena' && $order_id && !$invoice_id) {
    // 1. Načti všechny faktury objednávky s potvrzenou věcnou správností
    $faktury_stmt = $db->prepare("
        SELECT fa_id, fa_cislo, fa_vecna_spravnost_potvrzena, 
               fa_datum_vystaveni, fa_datum_splatnosti, fa_castka_celkem,
               potvrdil_vecnou_spravnost_id, dt_potvrzeni_vecne_spravnosti
        FROM {$faktury_table}
        WHERE obj_id = ? AND fa_vecna_spravnost_potvrzena = 1
    ");
    
    // 2. Pro každou potvrzen ou fakturu odešli samostatnou notifikaci
    foreach ($potvrzene_faktury as $faktura) {
        // Rekurzivně zavolej s invoice_id
        handle_notifications_create($input + ['invoice_id' => $faktura['fa_id']], ...);
    }
}
```

**Výsledek**:
- Když OrderForm25 pošle notifikaci bez `invoice_id`, backend automaticky načte všechny potvrzené faktury
- Pro každou odešle samostatnou notifikaci s kompletními daty té faktury

### 2. Rozšíření funkce getOrderPlaceholderData()

**Soubor**: `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php`

Přidán parametr `$invoiceId`:

```php
function getOrderPlaceholderData($db, $orderId, $actionUserId = null, 
                                 $additionalData = array(), $invoiceId = null) {
    
    // Načtení konkrétní faktury (pokud je zadané invoice_id)
    if ($invoiceId) {
        $invoiceSql = "SELECT f.*,
                              CONCAT(COALESCE(potvrdil.titul_pred, ''), ' ', 
                                     COALESCE(potvrdil.jmeno, ''), ' ', 
                                     COALESCE(potvrdil.prijmeni, ''), ' ', 
                                     COALESCE(potvrdil.titul_za, '')) as potvrdil_full_name
                       FROM {$fakturyTable} f
                       LEFT JOIN {$usersTable} potvrdil 
                            ON f.potvrdil_vecnou_spravnost_id = potvrdil.id
                       WHERE f.fa_id = :invoice_id";
        
        $invoiceData = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Naplnění placeholders z konkrétní faktury
    $invoicePlaceholders = [
        'invoice_number' => $invoice_to_use['fa_cislo'],
        'invoice_amount' => formatNumber($invoice_to_use['fa_castka_celkem']),
        'vecna_spravnost_kontroloval' => $invoice_to_use['potvrdil_full_name'],
        'vecna_spravnost_datum_potvrzeni' => formatDateTime(
            $invoice_to_use['dt_potvrzeni_vecne_spravnosti']
        )
    ];
}
```

**Nové placeholdery**:
- `{invoice_number}` - číslo faktury
- `{invoice_amount}` - částka faktury
- `{vecna_spravnost_kontroloval}` - jméno uživatele, který potvrdil
- `{potvrdil_name}` - alias pro šablonu
- `{vecna_spravnost_datum_potvrzeni}` - datum a čas potvrzení z DB (formatted)
- `{dt_potvrzeni_vecne_spravnosti}` - alias

### 3. Oprava timezone handling

Upraveny funkce pro konzistentní zobrazení českého času:

```php
function formatDateTime($datetime) {
    if (empty($datetime) || $datetime === '0000-00-00 00:00:00') {
        return '-';
    }
    // ✅ Czech timezone
    $original_timezone = date_default_timezone_get();
    date_default_timezone_set('Europe/Prague');
    
    $dt = new DateTime($datetime);
    $formatted = $dt->format('d.m.Y H:i');
    
    date_default_timezone_set($original_timezone);
    return $formatted;
}
```

Stejná úprava pro `formatDate()` a `formatTime()`.

---

## 🔄 Jak to funguje

### Scénář A: Potvrzení z modulu faktur (InvoiceEvidencePage)

1. Uživatel potvrdí věcnou správnost u konkrétní faktury
2. Klikne "Uložit fakturu"
3. Backend aktualizuje `fa_vecna_spravnost_potvrzena = 1`, `potvrdil_vecnou_spravnost_id`, `dt_potvrzeni_vecne_spravnosti`
4. Frontend pošle notifikaci s **`order_id`** a **`invoice_id`**
5. Backend načte data konkrétní faktury včetně jména potvrzujícího
6. ✅ Email obsahuje všechny údaje

### Scénář B: Potvrzení z OrderForm25 (Workflow Manager)

1. Uživatel potvrdí věcnou správnost u všech faktur na formuláři
2. Klikne "Uložit objednávku"
3. Backend zkontroluje faktury → všechny potvrzené → přidá stav `ZKONTROLOVANA`
4. Workflow manager detekuje změnu stavu (`hasZkontrolovana && !hadZkontrolovana`)
5. Frontend pošle notifikaci s **pouze `order_id`**, bez `invoice_id`
6. Backend detekuje speciální případ: `order_status_kontrola_potvrzena` + `!invoice_id`
7. Backend načte všechny faktury s `fa_vecna_spravnost_potvrzena = 1`
8. Pro každou fakturu rekurzivně zavolá handler s `invoice_id`
9. ✅ Každá faktura dostane samostatnou notifikaci s kompletními údaji

---

## 🎯 Výsledek

### Před opravou:
```
✅ Věcná správnost potvrzena

Dobrý den RH ADMIN,

věcná správnost faktury byla úspěšně ověřena a potvrzena.

📋 Detaily schválené faktury
Číslo faktury:         -
Dodavatel:            Auto - Poly spol. s r.o.
Předmět:              Oprava sanitního vozu VW Transportér
Objednatel:           -
Garant:               -
Částka celkem:        -
Datum splatnosti:     -
Potvrdil:             -
Datum potvrzení:      13.01.2026 08:45
```

### Po opravě:
```
✅ Věcná správnost potvrzena

Dobrý den RH ADMIN,

věcná správnost faktury byla úspěšně ověřena a potvrzena.

📋 Detaily schválené faktury
Číslo faktury:         1412260038
Dodavatel:            Auto - Poly spol. s r.o.
Předmět:              Oprava sanitního vozu VW Transportér
Objednatel:           Lenka Škarvadová
Garant:               Lenka Škarvadová
Částka celkem:        1 627,00 Kč
Datum splatnosti:     08.02.2026
Potvrdil:             Lenka Škarvadová
Datum potvrzení:      13.01.2026 06:31
```

---

## ⚠️ Důležité poznámky

### Notifikace se posílají AŽ PO uložení

- **OrderForm25**: Notifikace se posílají až po úspěšném `updateOrderV2()`, ne při kliknutí na checkbox
- **InvoiceEvidencePage**: Notifikace se posílají až po úspěšné aktualizaci faktury v DB

### Workflow Manager má kontrolu

- Všechny změny stavů workflow procházejí přes OrderForm25
- Workflow manager porovnává `oldWorkflowKod` vs `result.stav_workflow_kod`
- Notifikace se posílají JEN při skutečné změně stavu

### Zachování kompatibility

- ✅ Modul faktur nadále funguje (posílá `invoice_id`)
- ✅ OrderForm25 nově podporuje notifikace pro více faktur najednou
- ✅ Žádné breaking changes

---

## 📝 Testování

### Testovací scénáře:

1. ✅ Potvrzení 1 faktury z modulu faktur → notifikace s daty té faktury
2. ✅ Potvrzení všech faktur z OrderForm25 → notifikace pro každou fakturu
3. ✅ Potvrzení jen některých faktur → žádná notifikace (stav != ZKONTROLOVANA)
4. ✅ Opětovné uložení objednávky se stavem ZKONTROLOVANA → žádná duplicitní notifikace

### Testovací databáze:
- **DEV**: `eeo2025-dev` nebo `EEO-OSTRA-DEV`
- **PROD**: `eeo2025`

---

## 🔗 Související soubory

**Backend**:
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php` (řádky 1034-1093)
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php` (řádky 286-633)
- `apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php`

**Frontend**:
- `apps/eeo-v2/client/src/forms/OrderForm25.js` (řádky 9200-9380, 10700-10730, 11180-11250)
- `apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js`

**Email šablony**:
- DB: `25_notifikace_sablony` (typ: `order_status_kontrola_potvrzena`)

---

## 👨‍💻 Autor

**GitHub Copilot** + **Robert Holovský**  
13. ledna 2026
