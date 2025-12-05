# Frontend → Backend: API Contract - LP Tří typů čerpání

**Datum:** 21. listopadu 2025  
**Komponenta:** `LimitovanePrislibyManager.js`  
**Verze:** 3.0 - INLINE API (Order V2 Pattern)  
**Architektura:** Inline implementace v api.php, standardizované odpovědi

---

## ⚠️ ZMĚNA ARCHITEKTURY

API bylo **přepsáno** z externích handler souborů na **inline implementaci** přímo v `api.php`:
- ❌ SMAZÁNO: Externí handler soubory
- ✅ NOVĚ: Veškerá logika inline v api.php
- ✅ PATTERN: Stejný styl jako Order V2 - mysqli, verify_token_v2, standardizované {status, data, meta}

---

## API Endpointy

### GET /api.eeo/limitovane-prisliby/stav

**Parametry v URL (GET):**
- `username` - uživatelské jméno (required)
- `token` - autentizační token (required)
- `rok` - rok (required, default: 2025)
- `cislo_lp` - konkrétní LP kód (optional)
- `user_id` - filtr pro uživatele (optional)
- `usek_id` - filtr pro úsek (optional)

---

## Očekávaná Response Structure

### Standardizovaný formát (VŽDY):

```json
{
  "status": "ok",
  "data": { /* LP objekt */ } nebo [ /* array LP */ ],
  "meta": {
    "version": "v3.0",
    "tri_typy_cerpani": true,
    "timestamp": "2025-11-21 14:35:22",
    "count": 5  // pouze u array
  }
}
```

### A) Konkrétní LP (cislo_lp zadáno)

```json
{
  "status": "ok",
  "data": {
    "id": 1,
    "cislo_lp": "LPIT1",
    "kategorie": "LPIT",
    "nazev_uctu": "Spotřeba materiálu",
    "cislo_uctu": "501",
    "celkovy_limit": 1500000.00,
    
    "rezervovano": 650000.00,
    "predpokladane_cerpani": 580000.00,
    "skutecne_cerpano": 561553.91,
    "cerpano_pokladna": 28000.00,
    
    "zbyva_rezervace": 850000.00,
    "zbyva_predpoklad": 920000.00,
    "zbyva_skutecne": 938446.09,
    
    "procento_rezervace": 43.33,
    "procento_predpoklad": 38.67,
    "procento_skutecne": 37.44,
    
    "je_prekroceno_skutecne": false,
    "ma_navyseni": true,
    
    "spravce": {
      "prijmeni": "Černohorský",
      "jmeno": "Jan"
    },
    "usek_nazev": "IT oddělení",
    "usek_id": 4,
    "user_id": 85,
    "rok": 2025,
    "posledni_prepocet": "2025-11-21 14:35:22"
  }
]
```

### B) Všechna LP (user_id nebo usek_id zadáno)

```json
{
  "status": "ok",
  "data": [
    { /* LP objekt */ },
    { /* LP objekt */ }
  ],
  "meta": {
    "version": "v3.0",
    "tri_typy_cerpani": true,
    "count": 2,
    "timestamp": "2025-11-21 14:35:22"
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Unauthorized",
  "data": null
}
```

---

## Mapování BE → FE

Frontend očekává tato pole (mapování v `loadLPData()`):

| Backend pole | Frontend pole | Typ | Povinné | Poznámka |
|-------------|---------------|-----|---------|----------|
| `id` | `id` | int | ✅ | Primární klíč |
| `cislo_lp` | `cislo_lp` | string | ✅ | Kód LP (LPIT1, LPPT2) |
| `kategorie` | `kategorie` | string | ✅ | LPIT, LPPT, LPED |
| `nazev_uctu` | `nazev_uctu` | string | ❌ | Název účtu |
| `cislo_uctu` | `cislo_uctu` | string | ❌ | Číslo účtu |
| `celkovy_limit` | `vyse_financniho_kryti` | decimal | ✅ | Celkový limit |
| **TŘI TYPY:** | | | | |
| `rezervovano` | `rezervovano` | decimal | ✅ | Max. ceny objednávek |
| `predpokladane_cerpani` | `predpokladane_cerpani` | decimal | ✅ | Součet položek |
| `skutecne_cerpano` | `skutecne_cerpano` | decimal | ✅ | Fakturace + pokladna |
| `cerpano_pokladna` | `cerpano_pokladna` | decimal | ✅ | Samostatně pokladna |
| **ZŮSTATKY:** | | | | |
| `zbyva_rezervace` | `zbyva_rezervovano` | decimal | ✅ | Limit - rezervovano |
| `zbyva_predpoklad` | `zbyva_predpokladane` | decimal | ✅ | Limit - predpoklad |
| `zbyva_skutecne` | `zbyva_skutecne` | decimal | ✅ | Limit - skutecne |
| **PROCENTA:** | | | | |
| `procento_rezervace` | `procento_rezervovano` | decimal | ✅ | % rezervace |
| `procento_predpoklad` | `procento_predpokladane` | decimal | ✅ | % předpoklad |
| `procento_skutecne` | `procento_skutecne` | decimal | ✅ | % skutečnost |
| **STATUS:** | | | | |
| `je_prekroceno_skutecne` | `je_prekroceno` | boolean | ✅ | Překročeno? |
| `ma_navyseni` | `ma_navyseni` | boolean | ✅ | Má navýšení? |
| **METADATA:** | | | | |
| `spravce` | `spravce` | object | ✅ | { prijmeni, jmeno } |
| `usek_nazev` | `usek_nazev` | string | ✅ | Název úseku |
| `usek_id` | `usek_id` | int | ✅ | ID úseku |
| `user_id` | `user_id` | int | ✅ | ID správce |
| `rok` | `rok` | int | ✅ | Rok (2025) |
| `posledni_prepocet` | `posledni_prepocet` | datetime | ❌ | Timestamp |

---

## Zpětná kompatibilita

Frontend automaticky vytváří tato pole pro zpětnou kompatibilitu:

```javascript
aktualne_cerpano = skutecne_cerpano
zbyva = zbyva_skutecne
procento_cerpani = procento_skutecne
```

**Důvod:** Pokud by nějaký starý kód stále používal `aktualne_cerpano`, nebude padat.

---

## Příklady hodnot

### Normální stav (OK)

```json
{
  "celkovy_limit": 1500000.00,
  "rezervovano": 650000.00,
  "predpokladane_cerpani": 580000.00,
  "skutecne_cerpano": 561553.91,
  "zbyva_skutecne": 938446.09,
  "procento_skutecne": 37.44,
  "je_prekroceno_skutecne": false
}
```

### Varování (blízko limitu)

```json
{
  "celkovy_limit": 300000.00,
  "rezervovano": 290000.00,
  "predpokladane_cerpani": 280000.00,
  "skutecne_cerpano": 265000.00,
  "zbyva_skutecne": 35000.00,
  "procento_skutecne": 88.33,
  "je_prekroceno_skutecne": false
}
```

### Překročeno (nebezpečí)

```json
{
  "celkovy_limit": 500000.00,
  "rezervovano": 620000.00,
  "predpokladane_cerpani": 580000.00,
  "skutecne_cerpano": 510000.00,
  "zbyva_skutecne": -10000.00,
  "procento_skutecne": 102.00,
  "je_prekroceno_skutecne": true
}
```

---

## Datové typy a validace

### Decimal precision

```sql
DECIMAL(15,2) -- 15 číslic celkem, 2 desetinná místa
-- Rozsah: -9999999999999.99 až 9999999999999.99
```

### Boolean hodnoty

Backend může vracet:
- `true/false` (JSON boolean) ✅ Preferováno
- `1/0` (integer) ✅ Podporováno
- `"1"/"0"` (string) ⚠️ Bude fungovat, ale nedoporučeno

Frontend konvertuje: `(value === true || value === 1)`

### Datetime formát

Preferovaný formát: `YYYY-MM-DD HH:MM:SS`

Příklad: `"2025-11-21 14:35:22"`

---

## API Error Handling

### Success Response

```json
{
  "data": [ /* LP array */ ],
  "count": 5
}
```

### Error Response

```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

nebo

```json
{
  "err": "Chyba při načítání dat"
}
```

Frontend zachytává: `result.error || result.err`

---

## Inicializace a Přepočet API

### POST /api.eeo/limitovane-prisliby/inicializace

**Request:**
```json
{
  "rok": 2025,
  "force": true
}
```

**Response:**
```json
{
  "success": true,
  "count": 45,
  "message": "Inicializace dokončena"
}
```

### POST /api.eeo/limitovane-prisliby/prepocet

**Request:**
```json
{
  "rok": 2025
}
```

**Response:**
```json
{
  "success": true,
  "count": 45,
  "message": "Přepočet dokončen"
}
```

---

## Mock Data Fallback

V development módu (`NODE_ENV === 'development'`) pokud API selže, frontend automaticky použije mock data.

Mock data obsahují všechna požadovaná pole s realistickými hodnotami pro testování UI.

---

## Checklist pro Backend

- [ ] Endpoint `/api.eeo/limitovane-prisliby/stav` implementován
- [ ] Endpoint podporuje `?user_id={id}` parametr
- [ ] Response obsahuje všech **11 číselných polí** (rezervovano, predpokladane, skutecne, zbyva×3, procento×3, pokladna)
- [ ] Response obsahuje všechna **metadata** (spravce, usek_nazev, usek_id, user_id, rok)
- [ ] Boolean pole vrací `true/false` nebo `1/0`
- [ ] Decimal pole mají 2 desetinná místa
- [ ] Datetime v ISO formátu nebo `YYYY-MM-DD HH:MM:SS`
- [ ] Error handling vrací `{ "error": "..." }` nebo `{ "err": "..." }`
- [ ] API podporuje Authorization Bearer token
- [ ] Endpoint `/inicializace` funguje
- [ ] Endpoint `/prepocet` funguje

---

## Test Query

```bash
# Test jako admin (všechny LP)
curl -H "Authorization: Bearer {token}" \
  "https://eeo2025.zachranka.cz/api.eeo/limitovane-prisliby/stav"

# Test jako uživatel (jen své LP)
curl -H "Authorization: Bearer {token}" \
  "https://eeo2025.zachranka.cz/api.eeo/limitovane-prisliby/stav?user_id=85"

# Test inicializace
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"rok":2025,"force":true}' \
  "https://eeo2025.zachranka.cz/api.eeo/limitovane-prisliby/inicializace"
```

---

## Frontend Processing Pipeline

```
API Response
    ↓
Array.isArray check → extract data array
    ↓
Map each LP → parseFloat všech čísel
    ↓
Vytvoření zpětně kompatibilních polí
    ↓
setLpData(mappedData)
    ↓
Render v UI (velký font skutečnost, malý ostatní)
```

---

**Status:** ✅ Frontend připraven  
**Čeká na:** Backend implementaci podle docs/BACKEND-LP-CERPANI-IMPLEMENTATION.md
