# Import Starých Objednávek - API Dokumentace

## 📋 Přehled

API endpoint pro import starých objednávek ze systému DEMO do nové struktury `25a_objednavky`.

**Endpoint:** `POST /orders25/import-oldies`

---

## 🎯 Co endpoint dělá

1. ✅ Načte staré objednávky z tabulky DEMO (pouze SELECT)
2. ✅ Vloží je do nové tabulky `25a_objednavky`
3. ✅ Vytvoří položku v `25a_objednavky_polozky` (ze starého pole "obsah" + "cena")
4. ✅ Naimportuje přílohy do `25a_objednavky_prilohy`
5. ✅ Extrahuje LP kódy z poznámky (regex)
6. ✅ Mapuje druhy smluv na druhy objednávek

**⚠️ DŮLEŽITÉ:** Endpoint **POUZE ČTE** ze starých tabulek (SELECT), **NIKDY** do nich nezapisuje!

---

## 📥 INPUT

### **Request**
```json
{
  "old_order_ids": [1, 25, 33, 34],
  "uzivatel_id": 5,
  "tabulka_obj": "DEMO_objednavky_2025",
  "tabulka_opriloh": "DEMO_pripojene_odokumenty",
  "database": "stara_databaze"
}
```

### **Parametry**

| Parametr | Typ | Povinný | Popis |
|----------|-----|---------|-------|
| `old_order_ids` | array[int] | ✅ ANO | Pole ID starých objednávek k importu |
| `uzivatel_id` | int | ✅ ANO | ID přihlášeného uživatele (nová DB) - použije se pro všechny user_id pole |
| `tabulka_obj` | string | ✅ ANO | Název tabulky se starými objednávkami (např. "DEMO_objednavky_2025") |
| `tabulka_opriloh` | string | ✅ ANO | Název tabulky se starými přílohami (např. "DEMO_pripojene_odokumenty") |
| `database` | string | ❌ NE | Název databáze (volitelné, použije se default z config) |

---

## 📤 OUTPUT

### **Úspěšná odpověď**
```json
{
  "success": true,
  "imported_count": 3,
  "failed_count": 1,
  "results": [
    {
      "old_id": 1,
      "new_id": 156,
      "cislo_objednavky": "O-2024/001",
      "polozky_count": 1,
      "prilohy_count": 2,
      "status": "OK",
      "error": null
    },
    {
      "old_id": 25,
      "new_id": null,
      "cislo_objednavky": "O-2024/025",
      "polozky_count": 0,
      "prilohy_count": 0,
      "status": "ERROR",
      "error": "Objednávka s číslem O-2024/025 již existuje"
    },
    {
      "old_id": 33,
      "new_id": 157,
      "cislo_objednavky": "O-2024/033",
      "polozky_count": 1,
      "prilohy_count": 0,
      "status": "OK",
      "error": null
    },
    {
      "old_id": 34,
      "new_id": 158,
      "cislo_objednavky": "O-2024/034",
      "polozky_count": 1,
      "prilohy_count": 5,
      "status": "OK",
      "error": null
    }
  ]
}
```

### **Response Fields**

| Pole | Typ | Popis |
|------|-----|-------|
| `success` | bool | True pokud alespoň jedna objednávka byla úspěšně importována |
| `imported_count` | int | Počet úspěšně importovaných objednávek |
| `failed_count` | int | Počet selhání |
| `results` | array | Detail pro každou objednávku |

**Položka v `results`:**
- `old_id` - ID ze staré DB
- `new_id` - ID nové objednávky (null při chybě)
- `cislo_objednavky` - Evidenční číslo
- `polozky_count` - Počet importovaných položek
- `prilohy_count` - Počet importovaných příloh
- `status` - "OK" nebo "ERROR"
- `error` - Popis chyby (null při úspěchu)

---

## 🔄 MAPOVÁNÍ DAT

### **1. Objednávka (DEMO_objednavky_2025 → 25a_objednavky)**

| Stará DB | Nová DB | Transformace |
|----------|---------|--------------|
| `evidencni_c` | `cislo_objednavky` | 1:1 |
| `datum_u` | `dt_objednavky` | DATE → DATETIME (+ ' 00:00:00') |
| ~~`obsah`~~ | `predmet` | **"Importovaná obj. ev.č. " + evidencni_c** |
| `cena` | `max_cena_s_dph` | DOUBLE → DECIMAL(15,2) |
| `poznamka` | `poznamka` | 1:1 |
| `poznamka` | `financovani` | **Regex extrakce LP kódu** (např. "LPPT02") |
| `dt_pridani` | `dt_vytvoreni` | **Zachováno původní** |
| **NOW()** | `dt_aktualizace` | **Aktuální čas importu** |
| `dt_pridani` | `dt_odeslani` | Zachováno |
| `dt_pridani` | `dt_akceptace` | Zachováno |
| **$uzivatel_id** | `uzivatel_id` | **Z parametru API** |
| **$uzivatel_id** | `uzivatel_akt_id` | **Z parametru API** |
| **$uzivatel_id** | `garant_uzivatel_id` | **Z parametru API** |
| **$uzivatel_id** | `objednatel_id` | **Z parametru API** |
| `partner_nazev` | `dodavatel_nazev` | 1:1 |
| `partner_ic` | `dodavatel_ico` | 1:1 |
| `partner_adresa` | `dodavatel_adresa` | 1:1 |
| `dt_zverejneni` | `dt_zverejneni` | DATE → DATETIME (pokud `zverejnit='Ano'`) |
| `idds` | `registr_iddt` | 1:1 (pokud `zverejnit='Ano'`) |
| `druh_sml_id` | `druh_objednavky_kod` | **Mapování** (viz tabulka níže) |
| - | `strediska_kod` | `'[]'` (prázdné pole) |
| - | `stav_workflow_kod` | `'["SCHVALENA","ODESLANA","POTVRZENA"]'` |
| - | `stav_objednavky` | `'ARCHIVOVANO'` |
| - | `schvalovatel_id` | NULL |
| - | `odeslani_storno_duvod` | `''` |
| - | `dodavatel_zpusob_potvrzeni` | `''` |
| - | `dt_zamek` | `'1970-01-01 00:00:00'` |
| - | `aktivni` | 1 |

---

### **2. Položka (25a_objednavky_polozky)**

Ze starého pole `obsah` a `cena` se vytvoří **jedna položka**:

| Pole | Hodnota |
|------|---------|
| `objednavka_id` | ID nově vytvořené objednávky |
| `popis` | Původní `obsah` ze staré DB |
| `cena_s_dph` | Původní `cena` |
| `cena_bez_dph` | `cena / 1.21` (zaokrouhleno) |
| `sazba_dph` | 21 |
| `dt_vytvoreni` | NOW() |
| `dt_aktualizace` | NOW() |

---

### **3. Přílohy (DEMO_pripojene_odokumenty → 25a_objednavky_prilohy)**

| Stará DB | Nová DB | Transformace |
|----------|---------|--------------|
| `id_smlouvy` | `objednavka_id` | Mapováno na nové ID |
| `soubor` | `nazev_souboru` | 1:1 |
| `soubor` | `cesta_souboru` | `'/var/www/eeo/evidence_smluv/prilohy/' + soubor` |
| `popis` | `popis` | 1:1 |
| `dt_pridani` | `dt_pridani` | **Zachováno původní** |
| **$uzivatel_id** | `uzivatel_id` | **Z parametru API** |

---

### **4. Mapování druhů smluv (druh_sml_id → druh_objednavky_kod)**

| ID | Starý název | Nový kód |
|----|-------------|----------|
| 1 | auta | `AUTA` |
| 2 | darovací | `DAROVACI` |
| 3 | energie | `ENERGIE` |
| 4 | FKSP | `FKSP` |
| 5 | kupní | `KUPNI` |
| 6 | licenční | `LICENCNI` |
| 7 | LSPP | `LSPP` |
| 8 | mandátní | `MANDATNI` |
| 9 | nájemní | `NAJEMNI` |
| 10 | o dílo | `O_DILO` |
| 11 | odpad | `ODPAD` |
| 12 | ostatní | `OSTATNI` |
| 13 | praxe | `PRAXE` |
| 14 | pronájem | `PRONAJEM` |
| 15 | přestavby | `PRESTAVBY` |
| 16 | radiostanice | `RADIOSTANICE` |
| 17 | RLP | `RLP` |
| 18 | servisní | `SERVISNI` |
| 19 | služby | `SLUZBY` |
| 20 | spolupráce | `SPOLUPRACE` |
| 21 | stáž | `STAZ` |
| 22 | výpoč. technika | `VYPOCETNI_TECHNIKA` |
| 23 | zdr. dozor | `ZDR_DOZOR` |
| 24 | výpůjčka | `VYPUJCKA` |
| 25 | poskytnutí prostor | `POSKYTNUTI_PROSTOR` |
| 26 | bezúplatný převod | `BEZUPLATNY_PREVOD` |
| 27 | prodej | `PRODEJ` |
| 29 | vzdělávací akce | `VZDELAVACI_AKCE` |
| *jiné* | - | `OSTATNI` (fallback) |

---

## 🔍 EXTRAKCE LP KÓDU

Funkce `extractLPKod()` hledá v poznámce LP kódy pomocí regex:

**Pattern:** `/LP[\s\-]*([A-Z]{2,})[\s\-]*(\d{2,})/i`

**Příklady:**
```
"limitovaný příslib LPPT 02"  → "LPPT02"
"LP PT 02 test"               → "LPPT02"
"LPPT02"                      → "LPPT02"
"LP-PT-02"                    → "LPPT02"
"žádný LP kód"                → ""
NULL                          → ""
```

---

## 🚨 ERROR HANDLING

### **Validační chyby:**

```json
{
  "success": false,
  "error": "Parametr old_order_ids musí být pole"
}
```

```json
{
  "success": false,
  "error": "Parametr uzivatel_id je povinný"
}
```

```json
{
  "success": false,
  "error": "Uživatel s ID 999 neexistuje"
}
```

### **Chyby při importu jednotlivých objednávek:**

```json
{
  "old_id": 25,
  "status": "ERROR",
  "error": "Objednávka s ID 25 nebyla nalezena"
}
```

```json
{
  "old_id": 33,
  "status": "ERROR",
  "error": "Objednávka s číslem O-2024/033 již existuje"
}
```

### **Transakce:**
- Každá objednávka se importuje v separátní transakci
- Při chybě se transakce vrátí zpět (ROLLBACK)
- Ostatní objednávky se importují normálně

---

## 💡 PŘÍKLADY POUŽITÍ

### **cURL**
```bash
curl -X POST http://localhost/api.eeo/orders25/import-oldies \
  -H "Content-Type: application/json" \
  -d '{
    "old_order_ids": [1, 25, 33],
    "uzivatel_id": 5,
    "tabulka_obj": "DEMO_objednavky_2025",
    "tabulka_opriloh": "DEMO_pripojene_odokumenty"
  }'
```

### **JavaScript (Fetch)**
```javascript
const response = await fetch('http://localhost/api.eeo/orders25/import-oldies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    old_order_ids: [1, 25, 33],
    uzivatel_id: 5,
    tabulka_obj: 'DEMO_objednavky_2025',
    tabulka_opriloh: 'DEMO_pripojene_odokumenty'
  })
});

const result = await response.json();
console.log('Imported:', result.imported_count);
console.log('Failed:', result.failed_count);
```

---

## ⚙️ TECHNICKÉ DETAILY

### **Kompatibilita:**
- ✅ PHP 5.6
- ✅ MySQL 5.5.43
- ✅ PDO s prepared statements

### **Bezpečnost:**
- ✅ Prepared statements (ochrana proti SQL injection)
- ✅ Validace vstupů
- ✅ Transakce (ACID)
- ✅ Kontrola existence uživatele
- ✅ Kontrola duplicit (dle cislo_objednavky)

### **Výkon:**
- Pro každou objednávku:
  - 1× SELECT (objednávka)
  - 1× INSERT (objednávka)
  - 1× INSERT (položka)
  - N× INSERT (přílohy)

**Doporučení:** Pro import velkého množství objednávek (>100) zvažte dávkové zpracování.

---

## 📝 POZNÁMKY

1. **Duplikáty:** Endpoint kontroluje `cislo_objednavky` - pokud už existuje, objednávka se přeskočí
2. **Přílohy:** Fyzické soubory se **NEKOPÍRUJÍ**, pouze se vytvoří záznam s cestou
3. **Staré tabulky:** Endpoint **POUZE ČTE** (SELECT), nikdy nemění starou DB
4. **Uživatelé:** Všechna pole s `*_id` uživatelů se nastaví na `uzivatel_id` z API parametru
5. **Datový typ:** `cena` (DOUBLE) → `max_cena_s_dph` (DECIMAL) - automatická konverze

---

## 🔗 Související Endpointy

- `POST /orders25/list` - Seznam všech objednávek
- `POST /orders25/detail` - Detail objednávky
- `POST /orders25/by-user` - Objednávky uživatele

---

**Verze:** 1.0  
**Datum:** 2025-10-16  
**Autor:** API v2025.03_25
