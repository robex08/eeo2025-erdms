# Centralizovaný systém pro práci s rozsirujici_data

## 📋 Přehled

Vytvořil jsem centralizovanou knihovnu pro **bezpečnou práci s JSON metadata** uloženými v poli `rozsirujici_data` napříč všemi tabulkami v systému.

### ⚠️ Proč bylo potřeba tohle řešení?

V databázi se zjistilo, že pole `rozsirujici_data` v tabulce `25a_objednavky_faktury` je **sdílený prostor** používaný různými moduly:
- `kontrola_radku` - informace o kontrole řádků faktury
- `typ_platby` - typ platby ("faktura", "záloha", atd.)
- `rocni_poplatek` - nově přidané informace o přiřazení k ročnímu poplatku

**Problém:** Přímé přepisování `rozsirujici_data = json_encode($novyObjekt)` by vymazalo všechna existující data z jiných modulů!

**Řešení:** Vytvořen centralizovaný helper, který **vždy merguje** nová data s existujícími.

---

## 📁 Nové soubory

### `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/rozsirujiciDataHelper.php`

Kompletní knihovna s 7 funkcemi pro práci s JSON metadata:

1. **getRozsirujiciData($pdo, $table, $entityId)**
   - Načte a dekóduje rozsirujici_data z dané entity
   - Vrátí pole (array) nebo prázdné pole při chybě

2. **mergeRozsirujiciData($existingData, $newData, $deepMerge=true)**
   - Bezpečně sloučí existující a nová data
   - Nepřepíše existující klíče, pokud nejsou v $newData
   - Podporuje hluboké i ploché mergování

3. **updateRozsirujiciData($pdo, $table, $entityId, $newData, $additionalUpdates, $userId)**
   - **HLAVNÍ FUNKCE** pro aktualizaci entity
   - Načte existující data → merguje → uloží
   - Také umožní aktualizovat jiné sloupce (např. smlouva_id)
   - Automaticky nastaví dt_aktualizace a aktualizoval_uzivatel_id

4. **setRozsirujiciDataKey($pdo, $table, $entityId, $key, $value, $userId)**
   - Jednoduchá verze pro nastavení jednoho klíče
   - Interně volá updateRozsirujiciData

5. **getRozsirujiciDataKey($pdo, $table, $entityId, $key, $default=null)**
   - Načte hodnotu konkrétního klíče
   - Vrátí default, pokud klíč neexistuje

6. **removeRozsirujiciDataKey($pdo, $table, $entityId, $key, $userId)**
   - Bezpečně odstraní jeden klíč
   - Zachová ostatní data

7. **hasRozsirujiciDataKey($pdo, $table, $entityId, $key)**
   - Zkontroluje, zda klíč existuje
   - Vrátí true/false

---

## 🔄 Refaktored soubory

### `/apps/eeo-v2/api-legacy/api.eeo/api.php`

**Změna:** Přidán require_once pro nový helper

```php
// ANNUAL FEES - Roční poplatky
require_once __DIR__ . '/v2025.03_25/lib/rozsirujiciDataHelper.php';  // ← NOVÉ
require_once __DIR__ . '/v2025.03_25/lib/annualFeesHandlers.php';
```

### `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php`

**Před refaktoringem** (manuální merge, ~40 řádků kódu):
```php
$stmtGetInvoice = $pdo->prepare("SELECT rozsirujici_data FROM ...");
$stmtGetInvoice->execute(['faktura_id' => $data['faktura_id']]);
$currentInvoice = $stmtGetInvoice->fetch(PDO::FETCH_ASSOC);

$existingData = [];
if (!empty($currentInvoice['rozsirujici_data'])) {
    $existingData = json_decode($currentInvoice['rozsirujici_data'], true) ?: [];
}

$existingData['rocni_poplatek'] = [
    'id' => $item['rocni_poplatek_id'],
    // ... další data
];

$stmtInvoice = $pdo->prepare("UPDATE ... SET rozsirujici_data = ...");
$stmtInvoice->execute([
    'rozsirujici_data' => json_encode($existingData),
    // ... další parametry
]);
```

**Po refaktoringu** (helper, ~10 řádků kódu):
```php
updateRozsirujiciData(
    $pdo,
    $tblFaktury,
    $data['faktura_id'],
    [
        'rocni_poplatek' => [
            'id' => $item['rocni_poplatek_id'],
            'nazev' => $fee['nazev'],
            'rok' => $fee['rok'],
            'prirazeno_dne' => TimezoneHelper::getCzechDateTime(),
            'prirazeno_uzivatelem_id' => $user['id']
        ]
    ],
    ['smlouva_id' => $fee['smlouva_id']], // Také aktualizuje smlouvu
    $user['id']
);
```

**Benefit:**
- ✅ 75% méně kódu
- ✅ Automatická validace a error handling
- ✅ Jednotné chování napříč celým systémem
- ✅ Snadnější údržba a testování

---

## 🧪 Testování

### Test script: `/var/www/erdms-dev/test_rozsirujici_data_merge.php`

**Výsledky testů:**

```
=== TEST ROZSIRUJICI DATA HELPER ===

📋 Testovací faktura: #13 (104530)
📦 Původní rozsirujici_data:
Array
(
    [kontrola_radku] => Array
        (
            [kontrolovano] => 1
            [kontroloval_user_id] => 1
            [dt_kontroly] => 2026-01-25 16:31:36
        )
)

🔧 Test 1: Přidání rocni_poplatek klíče pomocí setRozsirujiciDataKey...
✅ Výsledná data po merge:
Array
(
    [kontrola_radku] => Array
        (
            [kontrolovano] => 1
            [kontroloval_user_id] => 1
            [dt_kontroly] => 2026-01-25 16:31:36
        )
    [rocni_poplatek] => Array
        (
            [id] => 999
            [nazev] => TEST Roční poplatek
            [rok] => 2026
        )
)

✅ ÚSPĚCH: Všechny původní klíče zachovány + nový klíč 'rocni_poplatek' přidán
✅ ÚSPĚCH: hasRozsirujiciDataKey správně detekuje existující/neexistující klíče
✅ ÚSPĚCH: getRozsirujiciDataKey správně vrací hodnoty a default
✅ ÚSPĚCH: Testovací klíč odstraněn, původní data zachována

=== VŠECHNY TESTY DOKONČENY ===
📊 Helper je připraven k použití v produkci!
```

---

## 📖 Jak používat v jiných modulech

### Příklad 1: Přidání nového klíče do faktury

```php
// Jednoduchá verze - nastavit jeden klíč
setRozsirujiciDataKey(
    $pdo,
    '25a_objednavky_faktury',
    $fakturaId,
    'typ_platby',
    'zalohova_faktura',
    $userId
);
```

### Příklad 2: Aktualizace více klíčů + jiných sloupců

```php
// Komplexní verze - mergovat více klíčů + aktualizovat smlouvu
updateRozsirujiciData(
    $pdo,
    '25a_objednavky_faktury',
    $fakturaId,
    [
        'kontrola_radku' => [
            'kontrolovano' => true,
            'kontroloval_user_id' => $userId,
            'dt_kontroly' => date('Y-m-d H:i:s')
        ],
        'typ_platby' => 'faktura'
    ],
    [
        'smlouva_id' => $smlouvaId,
        'stav' => 'ZAPLACENO'
    ],
    $userId
);
```

### Příklad 3: Čtení konkrétního klíče

```php
// Načíst informace o ročním poplatku
$rocniPoplatek = getRozsirujiciDataKey(
    $pdo,
    '25a_objednavky_faktury',
    $fakturaId,
    'rocni_poplatek',
    null  // default hodnota, pokud klíč neexistuje
);

if ($rocniPoplatek) {
    echo "Faktura patří k: " . $rocniPoplatek['nazev'] . " (" . $rocniPoplatek['rok'] . ")";
}
```

### Příklad 4: Kontrola existence klíče

```php
// Zjistit, zda je faktura přiřazena k ročnímu poplatku
$isPrirazena = hasRozsirujiciDataKey(
    $pdo,
    '25a_objednavky_faktury',
    $fakturaId,
    'rocni_poplatek'
);

if ($isPrirazena) {
    // Zobrazit speciální badge v UI
}
```

---

## 🎯 Doporučení pro vývojáře

### ✅ DO:
- **VŽDY používat rozsirujiciDataHelper** při práci s polem rozsirujici_data
- Používat `updateRozsirujiciData()` pro komplexní operace
- Používat `setRozsirujiciDataKey()` pro jednoduché úpravy
- Testovat před commitem pomocí test_rozsirujici_data_merge.php

### ❌ DON'T:
- **NIKDY** nepřepisovat `rozsirujici_data` přímo přes UPDATE SET
- **NIKDY** nepoužívat `json_encode($novyObjekt)` bez načtení existujících dat
- Nepoužívat `unset()` na klíčích - místo toho `removeRozsirujiciDataKey()`

---

## 📊 Aktuální využití rozsirujici_data

### V tabulce 25a_objednavky_faktury:

| Klíč | Modul | Popis | Příklad hodnoty |
|------|-------|-------|-----------------|
| `kontrola_radku` | Faktury | Informace o kontrole řádků | `{"kontrolovano": true, "kontroloval_user_id": 1}` |
| `typ_platby` | Faktury | Typ platby | `"faktura"` nebo `"zalohova_faktura"` |
| `rocni_poplatek` | Roční poplatky | Přiřazení k ročnímu poplatku | `{"id": 5, "nazev": "Energie 2026", "rok": 2026}` |

**Důležité:** Všechny moduly **musí respektovat existenci ostatních klíčů** a používat merge místo přepisu!

---

## 🔜 Další kroky

1. **Frontend enhancement** - Zobrazit badge u faktur přiřazených k ročním poplatkům
2. **Refaktoring ostatních modulů** - Přepsat handlery pro faktury/objednávky na použití helperu
3. **Dokumentace** - Přidat komentáře do invoiceHandlers.php vysvětlující strukturu rozsirujici_data
4. **Code review** - Projít všechna místa, kde se pracuje s `rozsirujici_data` a zajistit použití helperu

---

## 📝 Changelog

**2026-01-28**
- ✅ Vytvořen rozsirujiciDataHelper.php s 7 funkcemi
- ✅ Helper includován v api.php
- ✅ Refaktorován annualFeesHandlers.php (handleAnnualFeesUpdateItem, handleAnnualFeesCreateItem)
- ✅ Vytvořen test_rozsirujici_data_merge.php - všechny testy prošly
- ✅ Dokumentace vytvořena (tento soubor)

**Autor:** GitHub Copilot (Claude Sonnet 4.5)
**Testováno:** DEV environment (EEO-OSTRA-DEV)
**Status:** ✅ Připraveno k produkčnímu nasazení
