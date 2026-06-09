# 🚨 KRITICKÁ CHYBA: Přepisování User ID při ukládání objednávky

**Datum hlášení:** 2026-06-09  
**Závažnost:** CRITICAL  
**Status:** IDENTIFIKOVÁNO - ČEKÁ NA OPRAVU

## 📋 Popis problému

Při ukládání objednávky v OrderForm25 dochází k **nechtěnému přepisování ID uživatelů**, kteří již dříve potvrdili/zamítli věcnou správnost faktury. Toto narušuje audit trail a workflow objednávek.

### Scénář chyby:
1. **Uživatel A** potvrdí věcnou správnost faktury (status = 1, `potvrdil_vecnou_spravnost_id` = A)
2. **Uživatel B** pak otevře objednávku v jiné fázi a uloží ji (např. doplní poznámku)
3. ❌ Automaticky se přepíše `potvrdil_vecnou_spravnost_id` z A na B
4. ❌ Přepíše se i `dt_potvrzeni_vecne_spravnosti` na aktuální datum

**Výsledek:** Historie workflow je narušená a audit trail je nepravdivý.

---

## 🔍 Identifikace chyby

### Problém nastal po víkendových změnách (5.6 - 7.6.2026)

**Commit:** `9c370eb8c9fa3a4ef8b87147ee2712d796f90a3b`  
**Název:** "FIX: Věcná správnost - ukládání duvodu a automatické nastavení potvrdil_vecnou_spravnost_id/dt"  
**Datum:** 5. června 2026, 20:25

### Změněné soubory:
- ❌ `/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php`
- ❌ `/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`
- ✅ `/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php` (TENTO JE SPRÁVNĚ!)

---

## 🐛 Konkrétní místa chybného kódu

### 1. orderV2Endpoints.php (řádky 1663-1676)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php`

```php
if (isset($faktura['vecna_spravnost_potvrzeno'])) {
    $vs_status = (int)$faktura['vecna_spravnost_potvrzeno'];
    $update_fields[] = 'vecna_spravnost_potvrzeno = ?';
    $update_values[] = $vs_status;

    // ❌ CHYBA: VŽDY nastavit potvrdil_vecnou_spravnost_id a dt při status > 0
    if ($vs_status > 0) {
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = ?';
        $update_values[] = $current_user_id;  // ❌❌❌ PROBLÉM!
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
        $update_values[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
    } else {
        // Reset při status 0
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = NULL';
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = NULL';
    }
}
```

**Problém:**  
Podmínka `if ($vs_status > 0)` se vyhodnotí jako TRUE **kdykoliv je status > 0**, ne jen když se status MĚNÍ! Frontend posílá celý objekt faktury včetně `vecna_spravnost_potvrzeno`, takže při každém uložení se ID přepíše.

---

### 2. orderHandlers.php (řádky 3175-3189)

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php`

```php
if (isset($faktura['vecna_spravnost_potvrzeno'])) {
    $vs_status = (int)$faktura['vecna_spravnost_potvrzeno'];
    $update_fields[] = 'vecna_spravnost_potvrzeno = ?';
    $update_values[] = $vs_status;
    
    // ❌ CHYBA: VŽDY nastavit potvrdil_vecnou_spravnost_id a dt při status > 0
    if ($vs_status > 0) {
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = ?';
        $update_values[] = $current_user_id;  // ❌❌❌ PROBLÉM!
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
        $update_values[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        error_log("✅ [VECNA SPRAVNOST FULL-UPDATE] Nastaveno user_id={$current_user_id} pro fakturu ID={$faktura_id}, status={$vs_status}");
    } else {
        // Reset při status 0
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = NULL';
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = NULL';
        error_log("✅ [VECNA SPRAVNOST FULL-UPDATE] Reset ID a dt pro fakturu ID={$faktura_id}");
    }
}
```

**Stejný problém jako výše!**

---

## ✅ Pro srovnání: SPRÁVNÁ implementace v invoiceCheckHandlers.php

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceCheckHandlers.php` (řádky 376-418)

```php
// ✅ SPRÁVNĚ: ID se nastaví POUZE při explicitní akci potvrzení/zamítnutí
if ($status === VS_STATUS_POTVRZENA) {
    $stmt_update_vs = $db->prepare("
        UPDATE " . TBL_FAKTURY . "
        SET 
            vecna_spravnost_potvrzeno = ?,
            potvrdil_vecnou_spravnost_id = ?,
            dt_potvrzeni_vecne_spravnosti = ?,
            vecna_spravnost_duvod = ?,
            stav = ?
        WHERE id = ?
    ");
    $stmt_update_vs->execute(array(
        $status,
        $token_data['id'],  // ✅ Nastaví se POUZE při této konkrétní akci
        $czech_datetime,
        $vecna_spravnost_duvod,
        INVOICE_STATUS_VERIFICATION,
        $faktura_id
    ));
} else {
    // Status 2 (zamítnuto)
    $stmt_update_vs = $db->prepare("
        UPDATE " . TBL_FAKTURY . "
        SET 
            vecna_spravnost_potvrzeno = ?,
            potvrdil_vecnou_spravnost_id = ?,
            dt_potvrzeni_vecne_spravnosti = ?,
            vecna_spravnost_duvod = ?
        WHERE id = ?
    ");
    $stmt_update_vs->execute(array(
        $status,
        $token_data['id'],  // ✅ Nastaví se POUZE při této konkrétní akci
        $czech_datetime,
        $vecna_spravnost_duvod,
        $faktura_id
    ));
}
```

**Proč je toto správně:**  
- Handler `invoiceCheckHandlers.php` je volaný **POUZE** při explicitní akci potvrzení/zamítnutí věcné správnosti
- Není volaný při běžném ukládání objednávky
- ID uživatele se nastaví POUZE v tomto specifickém kontextu

---

## 🎯 Řešení

### Varianta A: Neukládat potvrdil_vecnou_spravnost_id v orderHandlers (DOPORUČENO)

**Logika:**  
- `potvrdil_vecnou_spravnost_id` a `dt_potvrzeni_vecne_spravnosti` by měly být nastaveny **POUZE** přes endpoint pro potvrzení/zamítnutí věcné správnosti (`invoiceCheckHandlers.php`)
- V obecném update endpointu (`orderHandlers.php`, `orderV2Endpoints.php`) tato pole **neukládat vůbec**

**Implementace:**

#### 1. orderV2Endpoints.php (řádky 1663-1676)

```php
// ❌ ODSTRANIT CELÝ TENTO BLOK:
if (isset($faktura['vecna_spravnost_potvrzeno'])) {
    $vs_status = (int)$faktura['vecna_spravnost_potvrzeno'];
    $update_fields[] = 'vecna_spravnost_potvrzeno = ?';
    $update_values[] = $vs_status;

    // VŽDY nastavit potvrdil_vecnou_spravnost_id a dt při status > 0
    if ($vs_status > 0) {
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = ?';
        $update_values[] = $current_user_id;
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
        $update_values[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
    } else {
        // Reset při status 0
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = NULL';
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = NULL';
    }
}

// ✅ NAHRADIT TÍMTO:
// Věcná správnost se ukládá POUZE přes invoiceCheckHandlers.php
// Tady NESMĚME přepisovat potvrdil_vecnou_spravnost_id a dt_potvrzeni_vecne_spravnosti
if (isset($faktura['vecna_spravnost_poznamka'])) {
    $update_fields[] = 'vecna_spravnost_poznamka = ?';
    $update_values[] = $faktura['vecna_spravnost_poznamka'];
}
if (isset($faktura['vecna_spravnost_umisteni_majetku'])) {
    $update_fields[] = 'vecna_spravnost_umisteni_majetku = ?';
    $update_values[] = $faktura['vecna_spravnost_umisteni_majetku'];
}
// ⚠️ NEUKLÁDÁME: vecna_spravnost_potvrzeno, potvrdil_vecnou_spravnost_id, dt_potvrzeni_vecne_spravnosti, vecna_spravnost_duvod
```

#### 2. orderHandlers.php (řádky 3175-3213)

```php
// ❌ ODSTRANIT CELÝ TENTO BLOK:
if (isset($faktura['vecna_spravnost_potvrzeno'])) {
    $vs_status = (int)$faktura['vecna_spravnost_potvrzeno'];
    $update_fields[] = 'vecna_spravnost_potvrzeno = ?';
    $update_values[] = $vs_status;
    
    // VŽDY nastavit potvrdil_vecnou_spravnost_id a dt při status > 0
    if ($vs_status > 0) {
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = ?';
        $update_values[] = $current_user_id;
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
        $update_values[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        error_log("✅ [VECNA SPRAVNOST FULL-UPDATE] Nastaveno user_id={$current_user_id} pro fakturu ID={$faktura_id}, status={$vs_status}");
    } else {
        // Reset při status 0
        $update_fields[] = 'potvrdil_vecnou_spravnost_id = NULL';
        $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = NULL';
        error_log("✅ [VECNA SPRAVNOST FULL-UPDATE] Reset ID a dt pro fakturu ID={$faktura_id}");
    }
}

if (isset($faktura['vecna_spravnost_duvod'])) {
    $update_fields[] = 'vecna_spravnost_duvod = ?';
    $update_values[] = $faktura['vecna_spravnost_duvod'];
}

// ✅ NAHRADIT TÍMTO:
// Věcná správnost se ukládá POUZE přes invoiceCheckHandlers.php
// Tady NESMĚME přepisovat potvrdil_vecnou_spravnost_id a dt_potvrzeni_vecne_spravnosti
```

**Poznámka k poznamka a umisteni_majetku:**
- Pole `vecna_spravnost_poznamka` a `vecna_spravnost_umisteni_majetku` MŮŽEME ukládat, protože jsou to metadata, ne workflow stavové pole
- Pole `vecna_spravnost_potvrzeno`, `potvrdil_vecnou_spravnost_id`, `dt_potvrzeni_vecne_spravnosti`, `vecna_spravnost_duvod` NESMÍME ukládat v obecném update

---

### Varianta B: Kontrolovat změnu statusu (složitější)

Pokud by z nějakého důvodu bylo potřeba ukládat věcnou správnost i v obecném update:

```php
if (isset($faktura['vecna_spravnost_potvrzeno'])) {
    $vs_status = (int)$faktura['vecna_spravnost_potvrzeno'];
    
    // Načíst aktuální stav z DB
    $current_vs_query = $db->prepare("SELECT vecna_spravnost_potvrzeno FROM `{$faktury_table}` WHERE id = ?");
    $current_vs_query->execute(array($faktura_id));
    $current_vs = $current_vs_query->fetch(PDO::FETCH_ASSOC);
    $old_vs_status = $current_vs ? (int)$current_vs['vecna_spravnost_potvrzeno'] : 0;
    
    // POUZE pokud se status MĚNÍ
    if ($vs_status !== $old_vs_status) {
        $update_fields[] = 'vecna_spravnost_potvrzeno = ?';
        $update_values[] = $vs_status;
        
        if ($vs_status > 0 && $old_vs_status === 0) {
            // Status se MĚNÍ z 0 na něco jiného → nastavit ID
            $update_fields[] = 'potvrdil_vecnou_spravnost_id = ?';
            $update_values[] = $current_user_id;
            $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
            $update_values[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        } elseif ($vs_status === 0) {
            // Reset
            $update_fields[] = 'potvrdil_vecnou_spravnost_id = NULL';
            $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = NULL';
        }
        // Jinak (status se mění mezi 1 a 2) → nezměnit ID
    }
    // Pokud se status NEMĚNÍ → neuložit nic
}
```

**Nevýhoda této varianty:**
- Složitější logika
- Více DB queries
- Možnost dalších chyb

---

## 🔍 Další kontrola: Jsou postižená i další workflow pole?

Na základě analýzy kódu:

- ✅ `garant_uzivatel_id` - NENÍ problém (nastavuje se z inputu)
- ✅ `schvalovatel_id` - NENÍ problém (nastavuje se z inputu)
- ✅ `dodavatel_potvrdil_id` - NENÍ problém (nenašel jsem automatické přepisování)
- ❌ `potvrdil_vecnou_spravnost_id` - **PROBLÉM POTVRZEN** (viz výše)

---

## 📋 Akční plán

1. **OKAMŽITĚ:** Přestat používat obecný update pro změnu věcné správnosti
2. **PRIORITA 1:** Implementovat opravu podle Varianty A
3. **TEST:** Otestovat workflow:
   - Uživatel A potvrdí věcnou správnost
   - Uživatel B uloží objednávku v jiné fázi
   - Ověřit, že `potvrdil_vecnou_spravnost_id` zůstává na uživateli A
4. **AUDIT:** Zkontrolovat databázi, kolik záznamů bylo postiženo
5. **ROLLBACK DATA:** Pokud je to možné, obnovit správná ID ze starších verzí

---

## 📊 Dopady chyby

### Rozsah v databázi (EEO-OSTRA-DEV, stav k 9.6.2026):

```sql
-- Postižené faktury od 5.6.2026:
- Celkem faktur: 13
- Různých uživatelů: 6
- První změna: 5.6.2026 20:55:47
- Poslední změna: 9.6.2026 17:19:00
```

### 🔥 KRITICKÉ PŘÍPADY (důkaz přepisování):

| Faktura ID | dt_potvrzeni | dt_aktualizace | Rozdíl | Aktuálně přiřazený uživatel |
|------------|--------------|----------------|--------|----------------------------|
| **2476** | 2026-06-08 08:16:59 | **2026-05-14 06:48:27** | **25 dní!** | Hana Jonášová |
| **2503** | 2026-06-07 19:29:28 | **2026-06-06 19:12:36** | **1 den** | Tereza Bezoušková |
| **2381** | 2026-06-05 21:26:52 | **2026-06-05 18:12:34** | 3h 14min | Tereza Bezoušková |
| **2254** | 2026-06-05 21:12:08 | **2026-06-05 18:14:15** | 3h | Tereza Bezoušková |

**Faktura 2476 je nejhorší případ:**
- Faktura byla naposledy aktualizována **14. května**
- Ale dt_potvrzeni_vecne_spravnosti je **8. června** (o 25 dní později!)
- To znamená: někdo potvrdil věcnou správnost v květnu, ale pak **8. června někdo jiný otevřel objednávku** a při uložení se mu automaticky přepsal `potvrdil_vecnou_spravnost_id` na Hanu Jonášovou

### Důsledky:

- ❌ **Audit trail narušen** - nelze zpětně dohledat, kdo skutečně potvrdil věcnou správnost
- ❌ **Workflow nepravdivé** - uživatelé vidí, že objednávku potvrdil někdo jiný
- ❌ **Právní důsledky** - v případě auditu/kontroly není možné prokázat, kdo fakticky kontrolu provedl
- ❌ **Ztráta důvěry** - uživatelé si nevěří systému
- ❌ **Data nejsou obnovitelná** - bez audit logu nelze zjistit původní hodnoty

---

## 🎫 Související

- Commit: `9c370eb8c9fa3a4ef8b87147ee2712d796f90a3b`
- Datum: 5. června 2026
- Moduly: OrderForm25, InvoiceEvidence
- Dotčené tabulky: `25a_objednavky_faktury`
- Dotčená pole: `potvrdil_vecnou_spravnost_id`, `dt_potvrzeni_vecne_spravnosti`

---

**Připravil:** GitHub Copilot AI  
**Datum analýzy:** 9. června 2026
