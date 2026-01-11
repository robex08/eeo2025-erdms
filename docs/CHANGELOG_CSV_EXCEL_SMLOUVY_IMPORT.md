# 📋 CHANGELOG: CSV/Excel Import Smluv s Auto-Normalizací Platnosti

**Datum:** 30. prosince 2025  
**Autor:** Backend Team  
**Verze:** 2.1 🆕  
**Status:** ✅ Implementováno + Rozšířená Validace

---

## 🆕 Co je nového v 2.1

### 5-Úrovňová Validace CSV Hlavičky

Před parsováním dat se nyní provádí **kompletní validace CSV struktury**:

1. **Validace 1:** Kontrola minimálního počtu sloupců (min. 6)
   - Error pokud hlavička má méně než 6 sloupců
   
2. **Validace 2:** Detekce povinných polí
   - Rozpoznává 24+ variant názvů sloupců
   - Příklady: "ČÍSLO SML" = "ČÍSLO SMLOUVY" = "cislo_smlouvy"
   
3. **Validace 3:** Hlášení chybějících sloupců
   - Detailní error s:
     - `missing_columns` - co chybí (v čitelném formátu)
     - `recognized_columns` - co bylo rozpoznáno
     - `unrecognized_columns` - co nebylo rozpoznáno
     - `help` - nápověda s očekávanými názvy
     - `detected_header_raw` - raw hlavička z CSV
     
4. **Validace 4:** Varování o nerozpoznaných sloupcích
   - Neblokuje import
   - Loguje se do error_log pro audit
   
5. **Validace 5:** Finální kontrola počtu
   - Ověří, že bylo rozpoznáno minimálně 6 povinných sloupců

**Příklad error response:**
```json
{
  "status": "error",
  "message": "CSV neobsahuje všechny povinné sloupce",
  "missing_columns": ["DRUH SMLOUVY / DRUH"],
  "recognized_columns": ["cislo_smlouvy", "usek_zkr", "nazev_firmy", "nazev_smlouvy", "hodnota_s_dph"],
  "unrecognized_columns": ["NĚJAKÝ DIVNÝ SLOUPEC"],
  "help": "Ujistěte se, že CSV má hlavičku s názvy: ČÍSLO SML, ÚSEK, DRUH SMLOUVY, PARTNER, NÁZEV SML, HODNOTA S DPH",
  "detected_header_raw": ["ČÍSLO SML", "ÚSEK", "PARTNER", "NÁZEV SML", "HODNOTA S DPH"]
}
```

---

## 🎯 Zadání

**Požadavek uživatele:**
> "Import CSV/Excel smluv. Pokud smlouva nemá platnost do, tak ji nevyluc, ale nastav datum platnosti do 31.12.2099"

**+ Rozšíření:**
> "Ještě mohl by si tam možná mít hned validaci jestli soubor obsahuje sloupce kterým rozumíme a jsou postačující pro import"

---

## 🔧 Implementace

### 1️⃣ Nová Funkce: `normalizePlatnostDo()`

**Soubor:** `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/smlouvyHandlers.php` (řádky 22-58)

**Účel:** Automatické nastavení `platnost_do` na `31.12.2099` pokud chybí

**Logika:**
```
1. Pokud je PRÁZDNÉ nebo NULL → "2099-12-31"
2. Pokud je "0", "00.00.0000" nebo podobné → "2099-12-31"
3. Pokud je datum NEVALIDNÍ → "2099-12-31"
4. Pokud je rok < 2000 → "2099-12-31" (patrně chyba v datech)
5. Pokud je datum VALIDNÍ → normalizuj na YYYY-MM-DD
```

**Příklady:**
```php
normalizePlatnostDo("") 
// ↓
"2099-12-31"

normalizePlatnostDo("31.12.2025")
// ↓
"2025-12-31"

normalizePlatnostDo("00.00.0000")
// ↓
"2099-12-31"

normalizePlatnostDo(NULL)
// ↓
"2099-12-31"
```

### 2️⃣ Úprava Validace Dat

**Soubor:** `smlouvyHandlers.php` (řádky 132-145)

**Co se změnilo:**
- ❌ STARÉ: `platnost_do` musela být POVINNÁ
- ✅ NOVÉ: `platnost_do` je VOLITELNÁ - normalizuje se automaticky

**Nové chování:**
```php
// Pokud je prázdné → OK (normalizuje se později v bulk-import)
if (empty($data['platnost_do'])) {
    // ✅ Validace PROJDE - bude normalizováno na 2099-12-31
}

// Pokud je zadáno, ale nevalidní → CHYBA
if (!empty($data['platnost_do']) && !strtotime($data['platnost_do'])) {
    $errors[] = 'Platnost do musi byt platne datum (nebo ponechte prázdné pro 2099-12-31)';
}
```

### 3️⃣ Normalizace v Bulk-Import Handler

**Soubor:** `smlouvyHandlers.php` (řádky 922-938)

**Kde se normalizace děje:**
- ✅ Na ZAČÁTKU smyčky pro každý řádek
- ✅ PŘED validací
- ✅ PŘED pokusem o INSERT/UPDATE

**Kód:**
```php
foreach ($data as $index => $row) {
    // NORMALIZACE: Pokud "platnost_do" chybí, nastav na 31.12.2099
    if (!isset($row['platnost_do']) || empty($row['platnost_do'])) {
        $row['platnost_do'] = '2099-12-31';
        error_log("SMLOUVY IMPORT: Smlouva bez 'platnost_do' -> 2099-12-31");
    } else {
        // Normalizuj existující hodnotu (konverze formátů)
        $row['platnost_do'] = normalizePlatnostDo($row['platnost_do']);
    }
    // ... zbytek zpracování
}
```

### 4️⃣ Nový Endpoint: CSV/Excel Import

**Endpoint:** `POST /ciselniky/smlouvy/import-csv`

**Funkce:** `handle_ciselniky_smlouvy_import_csv()` (řádky 1317-1470)

**Co dělá:**
1. ✅ Parsuje CSV soubor
2. ✅ Automaticky detekuje sloupce (flexibilní mapování)
3. ✅ Normalizuje `platnost_do` → `31.12.2099` pokud chybí
4. ✅ Vrátí data připravená na `bulk-import` endpoint
5. ✅ Hlásí chyby parsování

**Povinné sloupce:**
- `ČÍSLO SML` → `cislo_smlouvy`
- `ÚSEK` → `usek_zkr`
- `DRUH SMLOUVY` → `druh_smlouvy` 🆕
- `PARTNER` → `nazev_firmy`
- `NÁZEV SML` → `nazev_smlouvy`
- `HODNOTA S DPH` → `hodnota_s_dph`

**Volitelné sloupce:**
- `IČO` → `ico`
- `DIČ` → `dic`
- `POPIS SML` → `popis_smlouvy`
- `DATUM OD` → `platnost_od`
- `DATUM DO` → `platnost_do` (→ auto-normalizace na `31.12.2099` pokud chybí)

**Request format:**
```json
{
  "username": "user@example.com",
  "token": "valid_token_here",
  "csv_data": "ČÍSLO SML,ÚSEK,DRUH SMLOUVY,...\nS-001/2025,LPPT,DODAVATELSKA,...",
  "excel_data": null
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "parsed_data": [
      {
        "cislo_smlouvy": "S-001/2025",
        "usek_zkr": "LPPT",
        "druh_smlouvy": "DODAVATELSKA",
        "nazev_firmy": "Acme Inc.",
        "nazev_smlouvy": "Služby IT",
        "hodnota_s_dph": "100000",
        "platnost_do": "2099-12-31",
        "_note_platnost_do": "AUTO (chybělo)"
      }
    ],
    "parsed_rows_count": 1,
    "parse_errors": [],
    "_info": "Data jsou připravena k importu. Pošli je na /ciselniky/smlouvy/bulk-import"
  },
  "meta": {
    "version": "v2",
    "endpoint": "import-csv",
    "timestamp": "2025-12-30T14:30:00+01:00"
  }
}
```

---

## 📊 Workflow Importu Smluv

```
┌─ CSV/Excel soubor
│  └─> /ciselniky/smlouvy/import-csv
│      ├─ Parse CSV
│      ├─ Detekuj sloupce
│      ├─ Normalizuj platnost_do → 31.12.2099 pokud chybí
│      └─ Vrať: parsed_data[]
│
└─> Frontend pošle parsed_data do /ciselniky/smlouvy/bulk-import
    ├─ Validace
    ├─ Párování usek_zkr → usek_id
    ├─ Výpočet stavu (AKTIVNI/UKONCENA/...)
    ├─ INSERT/UPDATE do 25_smlouvy
    └─ Vrať: import_log_id + statistiky
```

---

## ✅ Testovací Příklady

### Případ 1: Smlouva bez "DATUM DO"

**CSV:**
```
ČÍSLO SML,ÚSEK,DRUH SMLOUVY,PARTNER,NÁZEV SML,HODNOTA S DPH
S-001/2025,LPPT,DODAVATELSKA,Acme Inc.,Služby IT,100000
```

**Výsledek v DB:**
```sql
cislo_smlouvy:   "S-001/2025"
platnost_od:     NULL
platnost_do:     "2099-12-31"  ← AUTO-NORMALIZACE!
stav:            "AKTIVNI"
```

### Případ 2: Smlouva s "DATUM DO"

**CSV:**
```
ČÍSLO SML,ÚSEK,DRUH SMLOUVY,PARTNER,NÁZEV SML,HODNOTA S DPH,DATUM DO
S-002/2025,LPPT,DODAVATELSKA,Acme Inc.,Služby IT,100000,31.12.2026
```

**Výsledek v DB:**
```sql
cislo_smlouvy:   "S-002/2025"
platnost_od:     NULL
platnost_do:     "2026-12-31"  ← Normalizováno, ale zachováno!
stav:            "AKTIVNI"
```

### Případ 3: Smlouva s "00.00.0000" (chyba v datech)

**CSV:**
```
ČÍSLO SML,ÚSEK,DRUH SMLOUVY,PARTNER,NÁZEV SML,HODNOTA S DPH,DATUM DO
S-003/2025,LPPT,DODAVATELSKA,Acme Inc.,Služby IT,100000,00.00.0000
```

**Výsledek v DB:**
```sql
cislo_smlouvy:   "S-003/2025"
platnost_od:     NULL
platnost_do:     "2099-12-31"  ← AUTO-NORMALIZACE (nevalidní vstup)!
stav:            "AKTIVNI"
```

---

## 🔐 Bezpečnostní Opatření

✅ **Token authentication** - `verify_token_v2()` 
✅ **Parameterized queries** - Ochrana proti SQL injection  
✅ **Error logging** - Všechny chyby normalizace se logují  
✅ **Transaction rollback** - Pokud import selže, všechny změny se vrátí  

---

## 📝 Poznámky pro Vývojáře

### Aby parsování CSV fungovalo správně:

1. **CSV SEPARATOR:** Podporován pouze `,` (comma-separated)
2. **CSV QUOTING:** Podporovány uvozovky: `"..., ..."`
3. **HEADER ROW:** Prvníí řádek je vždy header
4. **COLUMN MAPPING:** Flexible - hledá jednotlivá slova v hlavičce
   - `"ČÍSLO SML"` = `cislo_smlouvy`
   - `"ÚSEK"` = `usek_zkr`
   - atd.

### Excel Support (TODO):

Pokud bude potřeba Excel (`.xlsx`), bude potřeba:
```bash
composer require phpoffice/phpspreadsheet
```

### Logování:

Všechny normalizace se logují do `error_log()`:
```
SMLOUVY IMPORT: Smlouva bez 'platnost_do' -> normalizace na 2099-12-31
```

---

## 🐛 Známé Omezení

⚠️ **Excel format** - Momentálně NEsupportován  
→ **Workaround:** Exportuj Excel jako CSV v Google Sheets nebo LibreOffice

---

## 📚 Reference

- [Database Schema](./docs/setup/database-schema-25.sql)
- [Smlouvy API Spec](./apps/eeo-v2/client/docs/SMLOUVY-BACKEND-API-SPECIFICATION.md)
- [DB Structure Analysis](./SMLOUVY_IMPORT_STRUKTURA_ANALIZA.md)

---

## 🚀 Jak To Použít v Praxi

**Scenario:** Máš Excel se smlouvami bez "DATUM DO"

1. **Vyexportuj Excel jako CSV** (Google Sheets: File → Download → CSV)

2. **Pošli na backend:**
```bash
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/import-csv \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "token": "YOUR_TOKEN",
    "csv_data": "[CSV CONTENT HERE]"
  }'
```

3. **Backend vrátí:** `parsed_data[]` (bez datům DO → 31.12.2099)

4. **Frontend pošle na bulk-import:**
```bash
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "token": "YOUR_TOKEN",
    "data": [parsed_data_array],
    "overwrite_existing": false
  }'
```

5. **Hotovo!** Smlouvy jsou v DB s `platnost_do = 2099-12-31`

---

## ✨ Výhody Řešení

✅ **Žádné vyřazování smluv** - Pokud nemají "DATUM DO", nebudou vyloučeny!  
✅ **Automatická normalizace** - Není potřeba manuálně přidávat data  
✅ **Flexibilní import** - CSV i Excel (Excel TODO)  
✅ **Detekce chyb** - Jasné zprávy, pokud něco chybí  
✅ **Kompatibilita** - PHP 5.6, MySQL 5.5.43  
✅ **Bezpečnost** - Token auth + parameterized queries  

---

**Vznik:** 30. prosince 2025 23:42  
**Status:** ✅ Ready for Production
