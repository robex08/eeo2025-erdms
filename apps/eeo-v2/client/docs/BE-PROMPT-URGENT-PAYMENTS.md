# 🚨 BACKEND - Urgentní platby (Urgent Payments Report)

**Datum:** 27. listopadu 2025  
**Autor:** Frontend team  
**Pro:** Backend vývojář  
**Endpoint:** `POST /reports/urgent-payments`

---

## 📋 CO POTŘEBUJEME

Nový endpoint pro **report "Urgentní platby"** - zobrazení faktur, které je potřeba zaplatit v nejbližších dnech (prevence penále).

---

## 🎯 ÚČEL

**Use case:**
> Pracovník účtárny si každé ráno zobrazí faktury, které je potřeba zaplatit do X dní, 
> aby je stihla připravit k úhradě a vyhnula se penále za pozdní platby.

**Co hlídáme:**
- Faktury s blížící se splatností (výchozí: do 5 dní)
- Pouze **NEZAPLACENÉ** faktury (`fa_zaplaceno = 0`)
- Seřazené podle data splatnosti (nejbližší první)

---

## 🔧 TECHNICKÁ SPECIFIKACE

### Endpoint
```
POST /reports/urgent-payments
```

### Request Body (JSON)
```json
{
  "pocet_dni": 5,              // Počet dní do splatnosti (výchozí: 5)
  "datum_od": "2025-01-01",    // VOLITELNÉ - období vytvoření objednávky od
  "datum_do": "2025-12-31",    // VOLITELNÉ - období vytvoření objednávky do
  "utvar": "ZZS",              // VOLITELNÉ - filtr podle útvaru
  "dodavatel": "ABC s.r.o.",   // VOLITELNÉ - filtr podle názvu dodavatele (LIKE)
  "limit": 100,                // VOLITELNÉ - max počet výsledků (výchozí: 100)
  "offset": 0                  // VOLITELNÉ - pro stránkování (výchozí: 0)
}
```

### Response (JSON)
```json
{
  "success": true,
  "data": [
    {
      "id": 12345,
      "cislo_objednavky": "2025/1234",
      "dodavatel_nazev": "ABC s.r.o.",
      "dodavatel_ico": "12345678",
      "fa_cislo": "FV2025001234",
      "fa_datum_vystaveni": "2025-11-15",
      "fa_datum_splatnosti": "2025-11-29",
      "dnu_do_splatnosti": 2,
      "fakturovana_cena_bez_dph": 50000.00,
      "fakturovana_cena_s_dph": 60500.00,
      "mena": "CZK",
      "utvar": "ZZS",
      "oddeleni": "Oddělení nákupu",
      "datum_vytvoreni": "2025-11-10 10:30:00",
      "vytvoril_uzivatel": "Jan Novák",
      "stav": "REALIZOVANO"
    },
    {
      "id": 12346,
      "cislo_objednavky": "2025/1235",
      "dodavatel_nazev": "XYZ a.s.",
      "dodavatel_ico": "87654321",
      "fa_cislo": "FV2025001235",
      "fa_datum_vystaveni": "2025-11-18",
      "fa_datum_splatnosti": "2025-12-01",
      "dnu_do_splatnosti": 4,
      "fakturovana_cena_bez_dph": 75000.00,
      "fakturovana_cena_s_dph": 90750.00,
      "mena": "CZK",
      "utvar": "EEO",
      "oddeleni": "IT oddělení",
      "datum_vytvoreni": "2025-11-12 14:15:00",
      "vytvoril_uzivatel": "Marie Nová",
      "stav": "REALIZOVANO"
    }
  ],
  "summary": {
    "total_count": 2,
    "total_amount_bez_dph": 125000.00,
    "total_amount_s_dph": 151250.00,
    "earliest_due_date": "2025-11-29",
    "latest_due_date": "2025-12-01"
  },
  "filters_applied": {
    "pocet_dni": 5,
    "datum_od": null,
    "datum_do": null,
    "utvar": null,
    "dodavatel": null
  }
}
```

### Response v případě chyby
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parametr 'daysLimit' musí být kladné číslo"
  }
}
```

---

## 💾 SQL DOTAZ

### Tabulka: `orders25`

**Předpokládané sloupce** (ověř v DB):
```sql
-- Základní info objednávky
id                       INT PRIMARY KEY
cislo_objednavky        VARCHAR(50)
datum_vytvoreni         DATETIME
stav                    VARCHAR(50)

-- Dodavatel
dodavatel_nazev         VARCHAR(255)
dodavatel_ico           VARCHAR(20)

-- Faktura
fa_cislo                VARCHAR(50)
fa_datum_vystaveni      DATE
fa_datum_splatnosti     DATE
fa_zaplaceno            TINYINT(1)     -- 0 = nezaplaceno, 1 = zaplaceno
fakturovana_cena_bez_dph DECIMAL(15,2)
fakturovana_cena_s_dph   DECIMAL(15,2)

-- Ostatní
mena                    VARCHAR(3)
utvar                   VARCHAR(50)
oddeleni                VARCHAR(255)
vytvoril_uzivatel       VARCHAR(255)
```

### Production-ready SQL

```sql
SELECT 
  o.id,
  o.cislo_objednavky,
  o.dodavatel_nazev,
  o.dodavatel_ico,
  o.fa_cislo,
  o.fa_datum_vystaveni,
  o.fa_datum_splatnosti,
  DATEDIFF(o.fa_datum_splatnosti, CURDATE()) as dnu_do_splatnosti,
  o.fakturovana_cena_bez_dph,
  o.fakturovana_cena_s_dph,
  o.mena,
  o.utvar,
  o.oddeleni,
  o.datum_vytvoreni,
  o.vytvoril_uzivatel,
  o.stav
FROM orders25 o
WHERE 
  -- Pouze NEZAPLACENÉ faktury
  o.fa_zaplaceno = 0
  
  -- Faktura musí existovat
  AND o.fa_datum_splatnosti IS NOT NULL
  
  -- Splatnost je do X dní od dneška
  AND o.fa_datum_splatnosti BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
  
  -- VOLITELNÉ FILTRY (pokud jsou zadány):
  
  -- Filtr podle období vytvoření objednávky
  AND (? IS NULL OR o.datum_vytvoreni >= ?)
  AND (? IS NULL OR o.datum_vytvoreni <= ?)
  
  -- Filtr podle útvaru
  AND (? IS NULL OR o.utvar = ?)
  
  -- Filtr podle dodavatele (LIKE - umožňuje částečnou shodu)
  AND (? IS NULL OR o.dodavatel_nazev LIKE CONCAT('%', ?, '%'))

ORDER BY 
  o.fa_datum_splatnosti ASC,  -- Nejdříve nejbližší splatnost
  o.fakturovana_cena_s_dph DESC -- Pak největší částky

LIMIT ? OFFSET ?;
```

### Summary SQL (pro `summary` objekt)

```sql
SELECT 
  COUNT(*) as total_count,
  SUM(o.fakturovana_cena_bez_dph) as total_amount_bez_dph,
  SUM(o.fakturovana_cena_s_dph) as total_amount_s_dph,
  MIN(o.fa_datum_splatnosti) as earliest_due_date,
  MAX(o.fa_datum_splatnosti) as latest_due_date
FROM orders25 o
WHERE 
  o.fa_zaplaceno = 0
  AND o.fa_datum_splatnosti IS NOT NULL
  AND o.fa_datum_splatnosti BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
  -- ... stejné volitelné filtry jako hlavní dotaz
```

---

## 🔐 AUTORIZACE

**Kdo má přístup:**
- Role: `ADMIN`, `NAKUP`, `UCTARNA`, `VEDENI`
- Každý vidí pouze data svého útvaru (pokud není `ADMIN`)

**Kontrola:**
```php
// Pokud user NENÍ admin, filtrovat podle jeho útvaru
if (!$user->hasRole('ADMIN')) {
    $filters['utvar'] = $user->getUtvar();
}
```

---

## ✅ VALIDACE

### Povinné parametry
- Žádné (všechny volitelné, použijí se výchozí hodnoty)

### Validace
```php
// pocet_dni: kladné číslo 1-90
if (!is_null($pocet_dni)) {
    if (!is_numeric($pocet_dni) || $pocet_dni < 1 || $pocet_dni > 90) {
        return error('Parametr pocet_dni musí být číslo mezi 1 a 90');
    }
}

// datum_od, datum_do: platné datum
if (!is_null($datum_od) && !strtotime($datum_od)) {
    return error('Parametr datum_od musí být platné datum (YYYY-MM-DD)');
}

// limit: max 500
if (!is_null($limit)) {
    if (!is_numeric($limit) || $limit < 1 || $limit > 500) {
        return error('limit musí být číslo mezi 1 a 500');
    }
}
```

---

## 🧪 TESTOVACÍ PŘÍKLADY

### 1. Základní dotaz (výchozí hodnoty)
```json
POST /reports/urgent-payments
{}
```
Očekávaný výsledek: Všechny nezaplacené faktury se splatností do 5 dní

### 2. Urgentní platby do 3 dní
```json
POST /reports/urgent-payments
{
  "pocet_dni": 3
}
```

### 3. Platby pro konkrétního dodavatele
```json
POST /reports/urgent-payments
{
  "dodavatel": "ABC",
  "pocet_dni": 10
}
```
Očekávaný výsledek: Faktury od dodavatelů, kde název obsahuje "ABC"

### 4. Platby pro úsek ZZS
```json
POST /reports/urgent-payments
{
  "utvar": "ZZS",
  "pocet_dni": 7
}
```

### 5. Platby za určité období
```json
POST /reports/urgent-payments
{
  "datum_od": "2025-01-01",
  "datum_do": "2025-03-31",
  "pocet_dni": 5
}
```
Očekávaný výsledek: Pouze faktury z objednávek vytvořených v Q1 2025

---

## 📊 PERFORMANCE

### Indexy v DB (ověř/vytvoř pokud chybí)

```sql
-- Index pro rychlé vyhledávání nezaplacených faktur se splatností
CREATE INDEX idx_urgent_payments 
ON orders25 (fa_zaplaceno, fa_datum_splatnosti);

-- Index pro filtrování podle útvaru
CREATE INDEX idx_utvar 
ON orders25 (utvar);

-- Index pro filtrování podle dodavatele
CREATE INDEX idx_dodavatel 
ON orders25 (dodavatel_nazev);

-- Index pro datum vytvoření (filtrování období)
CREATE INDEX idx_datum_vytvoreni 
ON orders25 (datum_vytvoreni);
```

### Očekávaná rychlost
- < 100ms pro dataset do 10 000 objednávek
- < 500ms pro dataset do 100 000 objednávek

---

## 🐛 ERROR HANDLING

### Chybové stavy

| HTTP Status | Code | Message | Situace |
|------------|------|---------|---------|
| 400 | VALIDATION_ERROR | Invalid parameter 'pocet_dni' | Neplatná hodnota parametru |
| 401 | UNAUTHORIZED | Authentication required | Chybí autentizace |
| 403 | FORBIDDEN | Insufficient permissions | Nemá oprávnění na report |
| 500 | DB_ERROR | Database query failed | Chyba SQL dotazu |
| 500 | SERVER_ERROR | Internal server error | Neznámá chyba serveru |

---

## 📝 POZNÁMKY PRO BACKEND VÝVOJÁŘE

### 1. Struktura odpovědi
- Dodržet přesně JSON strukturu výše (frontend na ni počítá)
- Částky jako `float` s 2 desetinnými místy
- Datumy ve formátu `YYYY-MM-DD`
- Datetime ve formátu `YYYY-MM-DD HH:MM:SS`

### 2. NULL hodnoty
- Pokud některé pole chybí (např. `fa_cislo`), vrátit `null`, NE prázdný string
- Frontend to korektně zpracuje

### 3. Prázdný výsledek
```json
{
  "success": true,
  "data": [],
  "summary": {
    "total_count": 0,
    "total_amount_bez_dph": 0.00,
    "total_amount_s_dph": 0.00,
    "earliest_due_date": null,
    "latest_due_date": null
  },
  "filters_applied": { ... }
}
```

### 4. Memoizace / Cache
- Report se často volá (každé ráno), zvážit 5min cache
- Cache key: `urgent_payments:{user_id}:{hash(filters)}`

### 5. Logging
- Logovat všechna volání endpointu (audit trail)
- Logovat filtry (pro debugging)

---

## 🔄 INTEGRACE S FRONTENDEM

### Volání z React

```javascript
// src/services/api25reports.js

export const fetchUrgentPayments = async (filters = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/urgent-payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        pocet_dni: filters.pocet_dni || 5,
        datum_od: filters.datum_od || null,
        datum_do: filters.datum_do || null,
        utvar: filters.utvar || null,
        dodavatel: filters.dodavatel || null,
        limit: filters.limit || 100,
        offset: filters.offset || 0
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }

    return result;
  } catch (error) {
    console.error('Error fetching urgent payments:', error);
    throw error;
  }
};
```

---

## 📅 TERMÍN

**Priorita:** VYSOKÁ ⭐⭐⭐  
**Odhad práce:** 2-4 hodiny  
**Požadovaný termín:** Do konce týdne (29.11.2025)

---

## ❓ OTÁZKY?

Pokud je něco nejasné nebo potřebuješ upřesnit strukturu dat:
1. Zkontroluj skutečnou strukturu tabulky `orders25` v DB
2. Ověř, že pole `fa_*` skutečně existují
3. Případně konzultuj s frontend teamem

---

**Připravil:** Frontend team  
**Datum:** 27. listopadu 2025  
**Status:** READY FOR IMPLEMENTATION
