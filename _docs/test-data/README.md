# 🧪 Testovací CSV Soubory pro Import Smluv

Tento adresář obsahuje testovací CSV soubory pro validaci importu smluv.

---

### ✅ `smlouvy-test-zero-values.csv`

**Účel:** Test nulových a chybějících finančních hodnot + dopočtu DPH  
**Počet řádků:** 7 smluv  
**Testované případy:**
1. Obě hodnoty prázdné → měly by se nastavit na 0
2. Jen hodnota S DPH → dopočítá se BEZ DPH
3. Jen hodnota BEZ DPH → dopočítá se S DPH
4. Obě hodnoty 0 → ponechají se 0
5. Hodnoty s mezerami (100 000) → parsuje se jako 100000
6. Hodnoty s čárkou (121,000.50) → parsuje se jako 121000.50
7. Nevalidní hodnoty (abc, xyz) → nastaví se 0

**Očekávaný výsledek:** ✅ PASS (200 OK)

**Příklad očekávaného výstupu:**
```json
{
  "parsed_data": [
    {
      "cislo_smlouvy": "S-357/75030926/22",
      "hodnota_bez_dph": 0,
      "hodnota_s_dph": 0,
      "_note_hodnoty": "AUTO: Obě hodnoty nastaveny na 0 (chyběly)"
    },
    {
      "cislo_smlouvy": "019/75030926/17",
      "hodnota_bez_dph": 100000,
      "hodnota_s_dph": 121000,
      "_note_hodnoty": "AUTO: Hodnota bez DPH dopočítána (21% DPH)"
    },
    {
      "cislo_smlouvy": "16/06/127",
      "hodnota_bez_dph": 100000,
      "hodnota_s_dph": 121000,
      "_note_hodnoty": "AUTO: Hodnota s DPH dopočítána (21% DPH)"
    }
  ]
}
```

---

## 📂 Soubory

### ✅ `smlouvy-test-valid.csv`

**Účel:** Validní CSV s všemi povinnými sloupci  
**Počet řádků:** 5 smluv  
**Speciální případy:**
- 3 smlouvy bez `DATUM DO` → měly by se nastavit na 2099-12-31
- 2 smlouvy s konkrétním datem

**Očekávaný výsledek:** ✅ PASS (200 OK)

```bash
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/import-csv \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"your_user\",
    \"token\": \"your_token\",
    \"csv_data\": \"$(cat smlouvy-test-valid.csv | sed 's/"/\\"/g')\"
  }"
```

---

### ❌ `smlouvy-test-missing-druh.csv`

**Účel:** CSV s chybějícím povinným sloupcem `DRUH SMLOUVY`  
**Počet řádků:** 1 smlouva  
**Chybějící:** DRUH SMLOUVY

**Očekávaný výsledek:** ❌ FAIL (400 Bad Request)

**Error response:**
```json
{
  "status": "error",
  "message": "CSV neobsahuje všechny povinné sloupce",
  "missing_columns": ["DRUH SMLOUVY / DRUH"]
}
```

---

### ✅ `smlouvy-test-alternative-names.csv`

**Účel:** Test alternativních názvů sloupců  
**Počet řádků:** 1 smlouva  
**Alternativní názvy:**
- `ČÍSLO SMLOUVY` místo `ČÍSLO SML`
- `DRUH` místo `DRUH SMLOUVY`
- `PŘEDMĚT SML` místo `NÁZEV SML`
- `HODNOTA` místo `HODNOTA S DPH`

**Očekávaný výsledek:** ✅ PASS (200 OK)

**Poznámka:** Všechny alternativní názvy by měly být rozpoznány!

---

## 🚀 Jak Testovat

### 1. Nastavení Autentizace

Prvně získej token:

```bash
curl -X POST http://localhost/api.eeo/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tvuj_login@example.com",
    "password": "tvoje_heslo"
  }'
```

Response:
```json
{
  "token": "abc123xyz..."
}
```

### 2. Test Validního CSV

```bash
# Načti CSV jako string
CSV_DATA=$(cat smlouvy-test-valid.csv)

# Pošli na endpoint
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/import-csv \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"tvoj_login@example.com\",
    \"token\": \"abc123xyz\",
    \"csv_data\": \"$CSV_DATA\"
  }"
```

**Očekávaný response:**
```json
{
  "status": "ok",
  "data": {
    "parsed_data": [
      {
        "cislo_smlouvy": "S-001/2025",
        "usek_zkr": "LPPT",
        "druh_smlouvy": "DODAVATELSKA",
        "nazev_firmy": "Acme Corporation",
        "nazev_smlouvy": "Služby IT a technická podpora",
        "hodnota_s_dph": "100000",
        "platnost_do": "2099-12-31",
        "_note_platnost_do": "AUTO (chybělo)"
      },
      ...
    ],
    "parsed_rows_count": 5
  }
}
```

### 3. Test CSV s Chybějícím Sloupcem

```bash
CSV_DATA=$(cat smlouvy-test-missing-druh.csv)

curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/import-csv \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"tvoj_login@example.com\",
    \"token\": \"abc123xyz\",
    \"csv_data\": \"$CSV_DATA\"
  }"
```

**Očekávaný response:**
```json
{
  "status": "error",
  "message": "CSV neobsahuje všechny povinné sloupce",
  "missing_columns": ["DRUH SMLOUVY / DRUH"],
  "recognized_columns": ["cislo_smlouvy", "usek_zkr", "nazev_firmy", "nazev_smlouvy", "hodnota_s_dph"],
  "help": "Ujistěte se, že CSV má hlavičku s názvy: ČÍSLO SML, ÚSEK, DRUH SMLOUVY, PARTNER, NÁZEV SML, HODNOTA S DPH"
}
```

### 4. Test Alternativních Názvů

```bash
CSV_DATA=$(cat smlouvy-test-alternative-names.csv)

curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/import-csv \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"tvoj_login@example.com\",
    \"token\": \"abc123xyz\",
    \"csv_data\": \"$CSV_DATA\"
  }"
```

**Očekávaný response:**
```json
{
  "status": "ok",
  "data": {
    "parsed_data": [
      {
        "cislo_smlouvy": "S-007/2025",
        "usek_zkr": "LPPT",
        "druh_smlouvy": "DODAVATELSKA",
        "nazev_firmy": "Alternative Names Test",
        "nazev_smlouvy": "Test alternativních názvů sloupců",
        "hodnota_s_dph": "99999",
        "platnost_do": "2099-12-31",
        "_note_platnost_do": "AUTO (chybělo)",
        "poznamka": "Tento CSV testuje alternativní názvy"
      }
    ],
    "parsed_rows_count": 1
  }
}
```

✅ Všechny alternativní názvy rozpoznány!

---

## 🧪 Automatizovaný Test Script

Pro kompletní test všech souborů:

```bash
#!/bin/bash

# Konfigurace
API_URL="http://localhost/api.eeo"
USERNAME="tvoj_login@example.com"
PASSWORD="tvoje_heslo"

# 1. Login
echo "🔐 Přihlašuji se..."
TOKEN=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.token')

echo "✅ Token: $TOKEN"

# 2. Test validního CSV
echo ""
echo "📝 Test 1: Validní CSV..."
CSV_DATA=$(cat smlouvy-test-valid.csv)
RESPONSE=$(curl -s -X POST "$API_URL/ciselniky/smlouvy/import-csv" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"token\":\"$TOKEN\",\"csv_data\":\"$CSV_DATA\"}")

echo "$RESPONSE" | jq '.'
echo ""

# 3. Test CSV s chybějícím sloupcem
echo "📝 Test 2: CSV s chybějícím DRUH SMLOUVY..."
CSV_DATA=$(cat smlouvy-test-missing-druh.csv)
RESPONSE=$(curl -s -X POST "$API_URL/ciselniky/smlouvy/import-csv" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"token\":\"$TOKEN\",\"csv_data\":\"$CSV_DATA\"}")

echo "$RESPONSE" | jq '.'
echo ""

# 4. Test alternativních názvů
echo "📝 Test 3: Alternativní názvy sloupců..."
CSV_DATA=$(cat smlouvy-test-alternative-names.csv)
RESPONSE=$(curl -s -X POST "$API_URL/ciselniky/smlouvy/import-csv" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"token\":\"$TOKEN\",\"csv_data\":\"$CSV_DATA\"}")

echo "$RESPONSE" | jq '.'
echo ""

echo "✅ Všechny testy dokončeny!"
```

Ulož jako `test-import.sh` a spusť:

```bash
chmod +x test-import.sh
./test-import.sh
```

---

## 📊 Interpretace Výsledků

### ✅ Success (200 OK)

```json
{
  "status": "ok",
  "data": {
    "parsed_data": [...],
    "parsed_rows_count": 5
  }
}
```

**Co to znamená:**
- CSV byl úspěšně parsován
- Všechny povinné sloupce byly nalezeny
- Data jsou připravena k importu
- Pokračuj voláním `/ciselniky/smlouvy/bulk-import`

### ❌ Error (400 Bad Request)

```json
{
  "status": "error",
  "message": "CSV neobsahuje všechny povinné sloupce",
  "missing_columns": ["DRUH SMLOUVY / DRUH"]
}
```

**Co to znamená:**
- CSV hlavička neobsahuje všechny povinné sloupce
- Uprav CSV (přidej chybějící sloupce)
- Zkus znovu

### ⚠️ Warning (200 OK s varováním v logu)

```
[error_log] CSV import: Nerozpoznané sloupce (budou ignorovány): NĚJAKÝ SLOUPEC
```

**Co to znamená:**
- CSV obsahuje sloupce, které systém nerozpozná
- Import proběhne úspěšně
- Nerozpoznané sloupce budou ignorovány
- Není nutná akce (pokud neočekáváš, že by tyto sloupce měly být importovány)

---

## 📚 Související Dokumentace

- **Technický Souhrn:** `CSV_IMPORT_VALIDATION_SUMMARY.md`
- **Changelog:** `CHANGELOG_CSV_EXCEL_SMLOUVY_IMPORT.md`
- **Quick Start:** `QUICKSTART_CSV_SMLOUVY_IMPORT.md`
- **API Spec:** `IMPLEMENTATION_SUMMARY_CSV_SMLOUVY.md`

---

**Vytvořeno:** 30. prosince 2025  
**Autor:** Backend Team
