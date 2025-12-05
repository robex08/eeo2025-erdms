# Backend: invoices25/list Endpoint

**Datum implementace:** 30. listopadu 2025  
**Status:** ✅ IMPLEMENTOVÁNO  
**Priorita:** ✅ DOKONČENO

---

## 📋 Popis

Endpoint pro načtení **globálního seznamu všech faktur** (podobně jako existuje `orders25/list` pro objednávky).

**Stránka:** `src/pages/Invoices25List.js`  
**Volá:** `listInvoices25()` z `src/services/api25invoices.js`

---

## ✅ Aktuální Stav

```
POST https://eeo.zachranka.cz/api.eeo/invoices25/list
→ 200 OK ✅
```

**Endpoint funguje správně a vrací data včetně:**
- ✅ Číslo objednávky (`cislo_objednavky`)
- ✅ Název organizace (`organizace_nazev`)
- ✅ Jméno tvůrce faktury (`vytvoril_uzivatel`)
- ✅ Všechna fakturační data

---

## ✅ Požadovaný Endpoint

### URL
```
POST /api.eeo/invoices25/list
```

### Request Body

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "username": "admin",
  "page": 1,
  "per_page": 50,
  "filters": {
    "year": 2025,
    "objednavka_id": 456,
    "organizace_id": 789,
    "fa_dorucena": 1,
    "fa_cislo_vema": "FA-2025",
    "datum_od": "2025-01-01",
    "datum_do": "2025-12-31",
    "stredisko": "STR001"
  }
}
```

**Parametry:**
- `token` (string, povinné) - JWT autentizační token
- `username` (string, povinné) - Uživatelské jméno
- `page` (integer, volitelné, default: 1) - Číslo stránky
- `per_page` (integer, volitelné, default: 50, max: 100) - Počet záznamů na stránku
- `filters` (object, volitelné) - Objekt s filtry pro sloupcové vyhledávání

### Podporované filtry (všechny volitelné):

| Filtr | Typ | Popis | Příklad |
|-------|-----|-------|---------|
| `year` | int | Rok vystavení faktury | `2025` |
| `objednavka_id` | int | Faktury konkrétní objednávky | `456` |
| `organizace_id` | int | Faktury konkrétní organizace | `789` |
| `fa_dorucena` | 0/1 | 0=nedoručené, 1=doručené | `1` |
| `fa_cislo_vema` | string | Partial match v čísle faktury (LIKE) | `"FA-2025"` |
| `datum_od` | string | Datum vystavení od (YYYY-MM-DD) | `"2025-01-01"` |
| `datum_do` | string | Datum vystavení do (YYYY-MM-DD) | `"2025-12-31"` |
| `stredisko` | string | Hledání ve střediscích | `"STR001"` |

---

## 📤 Expected Response

### Success Response (200 OK)

```json
{
  "status": "ok",
  "data": {
    "faktury": [
    {
      "id": 123,
      "objednavka_id": 456,
      "cislo_objednavky": "O-1234",
      "organizace_id": 789,
      "organizace_nazev": "ZZS Kladno",
      "fa_cislo_vema": "FA-2025-001",
      "fa_datum_vystaveni": "2025-11-15",
      "fa_datum_splatnosti": "2025-12-15",
      "fa_datum_doruceni": "2025-11-16",
      "fa_castka": "25000.00",
      "fa_dorucena": 1,
      "fa_strediska_kod": "STR001",
      "fa_poznamka": "Poznámka k faktuře",
      "rozsirujici_data": null,
      "vytvoril_uzivatel_id": 5,
      "vytvoril_uzivatel": "Novák Jan",
      "dt_vytvoreni": "2025-11-15 10:30:00",
      "dt_aktualizace": "2025-11-16 08:15:00",
      "aktivni": 1
    },
    {
      "id": 124,
      "objednavka_id": 457,
      "cislo_objednavky": "O-1235",
      "organizace_id": 789,
      "organizace_nazev": "ZZS Kladno",
      "fa_cislo_vema": "FA-2025-002",
      "fa_datum_vystaveni": "2025-11-20",
      "fa_datum_splatnosti": "2025-12-20",
      "fa_datum_doruceni": null,
      "fa_castka": "15000.00",
      "fa_dorucena": 0,
      "fa_strediska_kod": "STR002",
      "fa_poznamka": null,
      "rozsirujici_data": {
        "isdoc": {
          "filename": "faktura.isdoc"
        }
      },
      "vytvoril_uzivatel_id": 5,
      "vytvoril_uzivatel": "Novák Jan",
      "dt_vytvoreni": "2025-11-20 14:45:00",
      "dt_aktualizace": "2025-11-20 14:45:00",
      "aktivni": 1
    }
    ],
    "pagination": {
      "page": 1,
      "per_page": 50,
      "total": 41,
      "total_pages": 1
    },
    "stats": {
      "celkem_faktur": 41,
      "celkova_castka": 450000.00,
      "dorucene": 25,
      "nedorucene": 16
    },
    "filters_applied": {
      "datum_od": "2025-01-01",
      "datum_do": "2025-12-31"
    }
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "status": "error",
  "message": "Neplatný token" 
}
```

**nebo staré API:**

```json
{
  "err": "Neplatný token"
}
```

---

## 🗄️ SQL Query (Návrh)

```sql
SELECT 
  f.id,
  f.objednavka_id,
  o.cislo_objednavky,
  o.organizace_id,
  org.nazev AS organizace_nazev,
  f.fa_cislo_vema,
  f.fa_datum_vystaveni,
  f.fa_datum_splatnosti,
  f.fa_datum_doruceni,
  f.fa_castka,
  f.fa_dorucena,
  f.fa_strediska_kod,
  f.fa_poznamka,
  f.rozsirujici_data,
  f.vytvoril_uzivatel_id,
  CONCAT(u.prijmeni, ' ', u.jmeno) AS vytvoril_uzivatel,
  f.dt_vytvoreni,
  f.dt_aktualizace,
  f.aktivni
FROM 25a_faktury f
LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
LEFT JOIN organizace org ON o.organizace_id = org.id
LEFT JOIN uzivatele u ON f.vytvoril_uzivatel_id = u.id
WHERE f.aktivni = 1
  -- Year filter
  AND (? IS NULL OR YEAR(f.fa_datum_vystaveni) = ?)
  
  -- Date range filter
  AND (? IS NULL OR f.fa_datum_vystaveni >= ?)
  AND (? IS NULL OR f.fa_datum_vystaveni <= ?)
  
  -- ID filters
  AND (? IS NULL OR f.objednavka_id = ?)
  AND (? IS NULL OR o.organizace_id = ?)
  
  -- Text filters (LIKE search)
  AND (? IS NULL OR f.fa_cislo_vema LIKE CONCAT('%', ?, '%'))
  AND (? IS NULL OR f.fa_strediska_kod LIKE CONCAT('%', ?, '%'))
  
  -- Status filters
  AND (? IS NULL OR f.fa_dorucena = ?)
  
  -- Role-based access control
  AND (
    -- ADMIN vidí vše
    ? = 1
    OR
    -- Non-admin vidí jen své org nebo své faktury
    (
      o.organizace_id = ?
      OR f.vytvoril_uzivatel_id = ?
    )
  )
ORDER BY f.fa_datum_vystaveni DESC, f.id DESC
LIMIT ? OFFSET ?
```

**Poznámky:**
- Filtrovat pouze `aktivni = 1` (nesmazané faktury)
- **Year filter** - `YEAR(fa_datum_vystaveni) = ?` pro filtrování podle roku
- **Date range** - `datum_od` a `datum_do` pro rozsah dat vystavení
- **ID filters** - Přesné hodnoty pro `objednavka_id` a `organizace_id`
- **LIKE search** - Partial match pro `fa_cislo_vema` a `stredisko` (fa_strediska_kod)
- **Status** - `fa_dorucena` (0=nedoručené, 1=doručené)
- **LIMIT/OFFSET** - Pro server-side paginaci
- **Řazení** - Sestupně podle data vystavení (nejnovější nahoře)

---

## 🔐 Oprávnění

### Role-Based Access Control

**ADMIN (admin_funkcni = 1):**
- ✅ Vidí **všechny faktury** v systému
- ✅ Bez omezení podle organizace nebo uživatele
- ✅ Plný přístup k filtrování a exportu

**Non-ADMIN uživatelé:**
- 🔒 Vidí pouze faktury k objednávkám **své organizace** (`organizace_id`)
- 🔒 Nebo faktury, které **sami vytvořili** (`vytvoril_uzivatel_id = current_user_id`)
- 🔒 Nemohou vidět faktury jiných organizací

### Implementace v SQL

```sql
WHERE f.aktivni = 1
  AND (
    -- ADMIN vidí vše
    ? = 1
    OR
    -- Non-admin vidí jen své org nebo své faktury
    (
      o.organizace_id = ?
      OR f.vytvoril_uzivatel_id = ?
    )
  )
```

**Parametry:**
- `?` = `admin_funkcni` (1 pro admina, 0 pro ostatní)
- `?` = `organizace_id` aktuálního uživatele
- `?` = `id` aktuálního uživatele

---

## 📊 Podobné Existující Endpointy

**Pro porovnání implementace:**

### 1. orders25/list
```
POST /api.eeo/orders25/list
→ Vrací seznam všech objednávek (+ enriched data)
```

### 2. invoices25/by-order
```
POST /api.eeo/invoices25/by-order
→ Vrací faktury pro konkrétní objednávku
Body: { token, username, objednavka_id }
```

### 3. invoices25/by-id
```
POST /api.eeo/invoices25/by-id
→ Vrací detail jedné faktury
Body: { token, username, id }
```

---

## ✅ Testing Checklist

- [x] Endpoint vrací všechny aktivní faktury pro admina
- [x] Endpoint respektuje user isolation pro non-admin uživatele
- [x] Filtr `year` (datum_od/datum_do) správně funguje
- [x] Pokud filtry nejsou zadány, vrátí všechny faktury
- [x] Prázdný seznam vrací `{ status: "ok", data: { faktury: [] } }`
- [x] Neplatný token vrací 401/403 nebo `{ err: "..." }`
- [x] Dotaz je optimalizovaný (index na `aktivni`, `fa_datum_vystaveni`)
- [x] JOIN s tabulkou objednávek pro `cislo_objednavky`
- [x] JOIN s tabulkou organizace pro `organizace_nazev`
- [x] JOIN s tabulkou uzivatele pro `vytvoril_uzivatel`
- [x] **Year filter** - Filtrování podle roku vystavení (`year`)
- [x] **Date range** - Rozsah dat vystavení (`datum_od`, `datum_do`)
- [x] **ID filtry** - Objednávka (`objednavka_id`) a organizace (`organizace_id`)
- [x] **Text filtry** - LIKE search pro číslo faktury (`fa_cislo_vema`)
- [x] **Text filtry** - LIKE search pro středisko (`stredisko`)
- [x] **Status filtry** - Doručená/Nedoručená (`fa_dorucena`: 0/1)
- [x] **Paginace** - LIMIT/OFFSET správně aplikován
- [x] **Response** - Vrací pagination, stats a filters_applied

---

## 📝 Frontend Implementation Reference

**Soubor:** `src/services/api25invoices.js`

```javascript
export async function listInvoices25({ token, username, year }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  try {
    const payload = {
      token,
      username
    };

    // Přidat rok, pokud je specifikován
    if (year) {
      payload.year = year;
    }

    const response = await api25invoices.post('invoices25/list', payload, {
      timeout: 30000
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při načítání faktur');
    }

    const data = response.data;

    // Kontrola chyb
    if (data.status === 'error' || data.err || data.error) {
      const errorMsg = data.message || data.err || data.error || 'Chyba při načítání faktur';
      throw new Error(errorMsg);
    }

    // Vrátit pole faktur
    return data.faktury || data.invoices || [];

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}
```

---

## ✅ Implementace Dokončena

### Frontend Features
Stránka `/invoices25` je plně funkční s následujícími funkcemi:
- 📊 Dashboard se statistikami (celkem, zaplacené, nezaplacené, po splatnosti)
- 🔍 **Sloupcové filtry FUNKČNÍ** - číslo faktury, objednávky, datumy, stav, uživatel
- 📄 Server-side paginace s nastavitelnou velikostí stránky (10/25/50/100/250)
- 📅 DatePicker pro filtrování podle dat
- 👤 Zobrazení čísla objednávky a názvu organizace
- ⚡ Akční tlačítko pro detail faktury
- 🎯 Role-based access control (ADMIN vs Non-ADMIN)

### Backend Features
- ✅ Endpoint `invoices25/list` plně implementován
- ✅ Přijímá parametry: token, username, page, per_page, filters
- ✅ Zpracovává všechny sloupcové filtry (LIKE search + přesné datum)
- ✅ Vrací strukturu: data { faktury, pagination, stats, filters_applied }
- ✅ JOINy pro objednávky, organizace, uživatele
- ✅ Role-based filtering (admin_funkcni kontrola)
- ✅ Optimalizovaný SQL s LIMIT/OFFSET

---

## 📞 Kontakt

Frontend Developer: _[vaše jméno]_  
Backend Developer: _[jméno BE vývojáře]_

**Otázky?** Kontaktujte frontend tým.
