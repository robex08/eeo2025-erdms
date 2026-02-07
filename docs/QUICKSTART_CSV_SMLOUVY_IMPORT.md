# 🚀 QUICK START: Import CSV Smluv

**Tato příručka vám pomůže importovat smlouvy z CSV souboru do systému.**

---

## 📋 Co Potřebuješ

1. ✅ CSV soubor se smlouvami
2. ✅ Přihlášení do systému (token)
3. ✅ Minimálně tyto sloupce:
   - `ČÍSLO SML` (povinné)
   - `ÚSEK` (povinné)
   - `DRUH SMLOUVY` (povinné) 🆕
   - `PARTNER` (povinné)
   - `NÁZEV SML` (povinné)
   - `HODNOTA S DPH` (povinné)

---

## ✨ Novinky - Co Se Změnilo

🎉 **NEJDŮLEŽITĚJŠÍ NOVINKA:**
> Pokud smlouva nemá `DATUM DO` (konec platnosti), **nevylučuje se a nastaví se na 31.12.2099**

💰 **NOVÉ: Inteligentní zpracování finančních hodnot:**
- ✅ **Nulové hodnoty povoleny** - smlouvy s hodnotou 0 Kč se importují
- ✅ **Automatický dopočet DPH** - pokud máš jen jednu hodnotu, druhá se dopočítá (21% DPH)
- ✅ **Parsování formátů** - rozumí "100 000", "1234,56", "1234.56"
- ✅ **Tolerantní k chybám** - pokud hodnota není číslo → nastaví se 0

**Příklady zpracování hodnot:**
| CSV hodnota bez DPH | CSV hodnota s DPH | Co systém udělá | Výsledek |
|---|---|---|---|
| 100000 | (prázdné) | Dopočítá s DPH | bez: 100000, s: 121000 |
| (prázdné) | 121000 | Dopočítá bez DPH | bez: 100000, s: 121000 |
| (prázdné) | (prázdné) | Nastaví obě na 0 | bez: 0, s: 0 |
| "abc" | "xyz" | Nerozpozná → 0 | bez: 0, s: 0 |
| 100 000 | (prázdné) | Parsuje + dopočítá | bez: 100000, s: 121000 |

✅ **Více sloupců je volitelných:**
- `DATUM OD` - volitelné (chybí → necháš prázdné)
- `DATUM DO` - volitelné (chybí → auto-nastaví se 31.12.2099)
- `HODNOTA BEZ DPH` - volitelné (chybí → dopočítá se nebo 0)
- `HODNOTA S DPH` - volitelné (chybí → dopočítá se nebo 0)

✅ **Flexibilní mapování sloupců:**
- Sloupce se automaticky detekují
- Pracuje i se špatným psaním ("ČÍSLO SMLOUVY" místo "ČÍSLO SML")

---

## 📊 Příklad CSV Souboru

```csv
ČÍSLO SML,ÚSEK,DRUH SMLOUVY,PARTNER,NÁZEV SML,HODNOTA S DPH,DATUM DO
S-001/2025,LPPT,DODAVATELSKA,Acme Inc.,Služby IT,100000,
S-002/2025,LPPT,DODAVATELSKA,Beta Corp.,Pronájem,,31.12.2026
S-003/2025,LPPT,DODAVATELSKA,Gamma Ltd.,Opravy,0,
```

**Co se stane:**
| Smlouva | HODNOTA S DPH | HODNOTA BEZ DPH | Co systém udělá | DATUM DO |
|---------|---|---|---|---|
| S-001/2025 | 100000 | (prázdné) | Dopočítá bez DPH: 82644.63 | 2099-12-31 |
| S-002/2025 | (prázdné) | (prázdné) | Nastaví obě na 0 | 2026-12-31 |
| S-003/2025 | 0 | (prázdné) | Ponechá 0, dopočítá 0 | 2099-12-31 |

---

## 🔄 Krok za Krokem

### Krok 1: Připravit CSV

Máš Excel se smlouvami?
```
1. Otevři Excel → Google Sheets
2. Stáhni jako CSV: File → Download → .csv (comma-separated values)
3. Ulož na počítač
```

CSV soubor by měl vypadat takto:
```
ČÍSLO SML,ÚSEK,DRUH SMLOUVY,PARTNER,NÁZEV SML,HODNOTA S DPH,DATUM DO
S-001/2025,LPPT,DODAVATELSKA,Acme Inc.,Služby IT,100000,
```

### Krok 2: Přihlášení

```bash
# Potřebuješ:
USERNAME = "tvoj_login@example.com"
PASSWORD = "tvoje_heslo"
API_URL = "http://localhost/api.eeo"
```

Prvně si vezmi token:
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

### Krok 3: Poslat CSV na Import

**🔍 NYNÍ S INTELIGENTNÍ VALIDACÍ HLAVIČKY!**

Endpoint automaticky:
- ✅ Zkontroluje, že CSV má všechny povinné sloupce
- ✅ Rozpozná variace názvů sloupců (např. "Číslo smlouvy" i "Číslo sml")
- ✅ Upozorní na nerozpoznané sloupce
- ✅ Poskytne detailní error report, pokud něco chybí

```bash
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/import-csv \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tvuj_login@example.com",
    "token": "abc123xyz",
    "csv_data": "ČÍSLO SML,ÚSEK,DRUH SMLOUVY,...\nS-001/2025,LPPT,DODAVATELSKA,..."
  }'
```

Response se vrátí:
```json
{
  "status": "ok",
  "data": {
    "parsed_data": [
      {
        "cislo_smlouvy": "S-001/2025",
        "usek_zkr": "LPPT",
        "druh_smlouvy": "DODAVATELSKA",
        "partner_nazev": "Acme Inc.",
        "nazev_smlouvy": "Služby IT",
        "hodnota_s_dph": "100000",
        "platnost_do": "2099-12-31",
        "_note_platnost_do": "AUTO (chybělo)"
      }
    ],
    "parsed_rows_count": 1,
    "_info": "Data jsou připravena k importu. Pošli je na /ciselniky/smlouvy/bulk-import"
  }
}
```

### Krok 4: Poslat na Finální Import

```bash
curl -X POST http://localhost/api.eeo/ciselniky/smlouvy/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tvuj_login@example.com",
    "token": "abc123xyz",
    "data": [
      {
        "cislo_smlouvy": "S-001/2025",
        "usek_zkr": "LPPT",
        "druh_smlouvy": "DODAVATELSKA",
        "nazev_firmy": "Acme Inc.",
        "nazev_smlouvy": "Služby IT",
        "hodnota_s_dph": "100000",
        "platnost_do": "2099-12-31"
      }
    ],
    "overwrite_existing": false
  }'
```

Response:
```json
{
  "status": "ok",
  "data": {
    "celkem_radku": 1,
    "uspesne_importovano": 1,
    "aktualizovano": 0,
    "preskoceno_duplicit": 0,
    "chyb": 0,
    "chybove_zaznamy": []
  }
}
```

✅ **HOTOVO! Smlouva je v databázi!**

---

## 🔍 Detaily - Jak Funguje

### Co je `DRUH SMLOUVY`?

Povinné pole - určuje typ smlouvy. Příklady:
- `DODAVATELSKA` - Dodavatelská smlouva
- `NAJEMNI` - Nájemní smlouva
- `RAMCOVA` - Rámcová smlouva
- `POSKYTOVANI_SLUZEB` - Poskytování služeb
- `KUPNI` - Kupní smlouva
- atd.

**Jak to zjistíš?** Podívej se v systému, jaké hodnoty se používají.

### Co je `DATUM DO`?

Konec platnosti smlouvy. Příklady:
- `31.12.2026` - Do konce roku 2026
- `30.06.2025` - Do konce június 2025
- (prázdné) - Bez data → Auto-nastaví se **31.12.2099**

### Co se Děje s Chybějícím `DATUM DO`?

```
STARÉ CHOVÁNÍ:
CSV bez DATUM DO → CHYBA → Smlouva se NEVLOŽÍ

NOVÉ CHOVÁNÍ:
CSV bez DATUM DO → OK! → Nastaví se 31.12.2099 → Smlouva se VLOŽÍ
```

Proč 31.12.2099? Protože:
- ✅ Smlouva se neuzná za "vypršelou" (stav = AKTIVNI)
- ✅ Funguje pro dlouhodobé smlouvy bez konkrétního konce
- ✅ Je to prakticky "nekonečná" smlouva pro systém

---

## 🧪 Testovací Příklady Validace

### Test 1: CSV s chybějícím povinným sloupcem

**CSV:**
```csv
ČÍSLO SML,ÚSEK,PARTNER,NÁZEV SML,HODNOTA S DPH
S-001/2025,LPPT,Acme Inc.,Služby IT,100000
```

**Response:**
```json
{
  "status": "error",
  "message": "CSV neobsahuje všechny povinné sloupce",
  "missing_columns": ["DRUH SMLOUVY / DRUH"],
  "recognized_columns": ["cislo_smlouvy", "usek_zkr", "nazev_firmy", "nazev_smlouvy", "hodnota_s_dph"],
  "unrecognized_columns": [],
  "help": "Ujistěte se, že CSV má hlavičku s názvy: ČÍSLO SML, ÚSEK, DRUH SMLOUVY, PARTNER, NÁZEV SML, HODNOTA S DPH"
}
```

### Test 2: CSV s nerozpoznanými sloupci

**CSV:**
```csv
ČÍSLO SML,ÚSEK,DRUH SMLOUVY,PARTNER,NÁZEV SML,HODNOTA S DPH,NĚJAKÝ SLOUPEC,DALŠÍ SLOUPEC
S-001/2025,LPPT,DODAVATELSKA,Acme Inc.,Služby IT,100000,xyz,abc
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "parsed_data": [...],
    "_warning": "Nerozpoznané sloupce byly ignorovány (viz server log)"
  }
}
```
*(Nerozpoznané sloupce se logují do error_log, ale neblokují import)*

### Test 3: CSV s alternativními názvy sloupců (FUNGUJE!)

**CSV:**
```csv
ČÍSLO SMLOUVY,ÚSEK,DRUH,PARTNER,PŘEDMĚT SML,HODNOTA
S-001/2025,LPPT,DODAVATELSKA,Acme Inc.,Služby IT,100000
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "parsed_data": [{
      "cislo_smlouvy": "S-001/2025",
      "usek_zkr": "LPPT",
      "druh_smlouvy": "DODAVATELSKA",
      "partner_nazev": "Acme Inc.",
      "nazev_smlouvy": "Služby IT",
      "hodnota_s_dph": "100000",
      "platnost_do": "2099-12-31",
      "_note_platnost_do": "AUTO (chybělo)"
    }]
  }
}
```
✅ **Všechny alternativní názvy rozpoznány!**

---

## 🐛 Řešení Problémů

### Problém: "Chybí povinné sloupce"

**Řešení:** Zkontroluj, že CSV má všechny tyto sloupce:
```
ČÍSLO SML, ÚSEK, DRUH SMLOUVY, PARTNER, NÁZEV SML, HODNOTA S DPH
```

**Nová 5-úrovňová validace:**
✅ **Validace 1:** Kontrola, že hlavička má minimálně 6 sloupců
✅ **Validace 2:** Detekce povinných sloupců (6 povinných polí)
✅ **Validace 3:** Hlášení chybějících sloupců s detailní zprávou
✅ **Validace 4:** Varování o nerozpoznaných sloupcích (loguje se)
✅ **Validace 5:** Kontrola celkového počtu rozpoznaných sloupců

**Error response obsahuje:**
```json
{
  "status": "error",
  "message": "CSV neobsahuje všechny povinné sloupce",
  "missing_columns": ["DRUH SMLOUVY"],
  "recognized_columns": ["cislo_smlouvy", "usek_zkr", ...],
  "unrecognized_columns": ["NĚJAKÝ NEZNÁMÝ SLOUPEC"],
  "help": "Ujistěte se, že CSV má hlavičku s názvy: ...",
  "detected_header_raw": ["ČÍSLO SML", "ÚSEK", ...]
}
```

Nejčastější chyby:
- ❌ "Číslo smlouvy" místo "Číslo sml" → **NYNÍ ROZPOZNÁ OBA VARIANTY!**
- ❌ Chybí "DRUH SMLOUVY" (TO JE NOVÉ!)
- ❌ Sloupec se jmenuje "FIRMA" místo "PARTNER"
- ❌ Hlavička má méně než 6 sloupců

### Problém: "Neplatný druh smlouvy"

**Řešení:** Zkontroluj, že "DRUH SMLOUVY" je ze seznamu:
```
DODAVATELSKA, NAJEMNI, RAMCOVA, KUPNI, POSKYTOVANI_SLUZEB
```

Nejčastěji se používá: `DODAVATELSKA` nebo `RAMCOVA`

### Problém: "Úsek nenalezen"

**Řešení:** Zkontroluj, že "ÚSEK" existuje v systému:
```
Příklady: LPPT, LPIT, LPL, LPN, LPZOS, LPR, LPP, LPA
```

Pokud neznáš správný ÚSEK, podívej se v systému: Nastavení → Úseky

### Problém: "Import se vytváří s chybou"

**Řešení:** Přečti si chybovou zprávu v response:
```json
{
  "status": "error",
  "message": "CSV import error: ...",
  "parse_errors": ["Chybí povinné sloupce: ...."]
}
```

---

## 💾 Python Script (Advanced)

Pokud ses programátor, tady je Python script pro import:

```python
import requests
import csv
import sys

# Konfigurace
USERNAME = "tvuj_login@example.com"
PASSWORD = "tvoje_heslo"
API_URL = "http://localhost/api.eeo"
CSV_FILE = "smlouvy.csv"

# 1. Login
login_response = requests.post(f"{API_URL}/login", json={
    "username": USERNAME,
    "password": PASSWORD
})
token = login_response.json()["token"]

# 2. Přečti CSV
with open(CSV_FILE, 'r', encoding='utf-8') as f:
    csv_data = f.read()

# 3. Import CSV
import_response = requests.post(f"{API_URL}/ciselniky/smlouvy/import-csv", json={
    "username": USERNAME,
    "token": token,
    "csv_data": csv_data
})

parsed_data = import_response.json()["data"]["parsed_data"]
print(f"✅ Parsováno {len(parsed_data)} smluv")

# 4. Bulk Import
bulk_response = requests.post(f"{API_URL}/ciselniky/smlouvy/bulk-import", json={
    "username": USERNAME,
    "token": token,
    "data": parsed_data,
    "overwrite_existing": False
})

result = bulk_response.json()["data"]
print(f"✅ Importováno: {result['uspesne_importovano']}")
print(f"❌ Chyb: {result['chyb']}")
```

Spuštění:
```bash
python3 import_smlouvy.py
```

---

## 📞 Podpora

Pokud máš problém:

1. **Přečti si chybovou zprávu** - obsahuje podrobnosti
2. **Zkontroluj CSV formát** - má správné sloupce?
3. **Zkontroluj data** - jsou hodnoty validní?
4. **Podívej se do logů:** `tail -f /var/log/apache2/error.log`

---

## 📚 Další Dokumentace

- **Detailní Technical Docs:** `_docs/CHANGELOG_CSV_EXCEL_SMLOUVY_IMPORT.md`
- **API Specification:** `apps/eeo-v2/client/docs/SMLOUVY-BACKEND-API-SPECIFICATION.md`
- **Database Schema:** `docs/setup/database-schema-25.sql`

---

**Úspěšně jsi importoval smlouvy! 🎉**

Otázky? Podívej se do `IMPLEMENTATION_SUMMARY_CSV_SMLOUVY.md` nebo se obrať na backend tým.
