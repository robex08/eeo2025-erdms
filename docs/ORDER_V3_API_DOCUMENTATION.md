# Order V3 API - Dokumentace

**Vytvořeno:** 2026-01-23  
**Autor:** AI Assistant  
**Verze:** 1.0

## 📋 Přehled

Order V3 API je optimalizované pro React frontend s důrazem na:
- 🚀 **Performance** - Server-side pagination, optimalizované JOINy
- 🔒 **Security** - Token autentizace, prepared statements
- 📊 **Stats** - Agregované statistiky pro dashboard
- 🔄 **Lazy Loading** - Podřádky se načítají na vyžádání

## 🎯 Endpointy

### 1. POST `/api.eeo/order-v3/list`

Načte seznam objednávek s paginací a volitelně statistikami.

**Request:**
```json
{
  "token": "xxx",
  "username": "user@domain.cz",
  "page": 1,
  "per_page": 50,
  "year": 2026,
  "filters": {
    "cislo_objednavky": "OBJ",
    "dodavatel_nazev": "ČSOB",
    "predmet": "notebook",
    "objednatel_jmeno": "Jan"
  },
  "sorting": [
    {"id": "dt_objednavky", "desc": true},
    {"id": "cislo_objednavky", "desc": false}
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "orders": [
      {
        "id": 123,
        "cislo_objednavky": "OBJ-2026-0001",
        "predmet": "Notebook Dell",
        "poznamka": "...",
        "dt_objednavky": "2026-01-15 10:30:00",
        "dt_vytvoreni": "2026-01-15 10:30:00",
        "dt_aktualizace": "2026-01-20 14:25:00",
        "zpusob_financovani": "Rozpočet",
        "max_cena_s_dph": 50000.00,
        "cena_s_dph": 48500.00,
        "stav_workflow_kod": "[\"NOVA\",\"KE_SCHVALENI\",\"SCHVALENA\"]",
        "stav_registru": "UVEREJNENA",
        "zverejnit": "ANO",
        "dodavatel_id": 45,
        "dodavatel_nazev": "ČSOB Leasing",
        "dodavatel_ico": "12345678",
        "objednatel_id": 71,
        "objednatel_jmeno": "Jan Novák",
        "objednatel_email": "jan.novak@zachranka.cz",
        "garant_id": 72,
        "garant_jmeno": "Marie Svobodová",
        "prikazce_id": 73,
        "prikazce_jmeno": "Petr Dvořák",
        "schvalovatel_id": 74,
        "schvalovatel_jmeno": "Jana Malá",
        "pocet_polozek": 3,
        "pocet_priloh": 2,
        "pocet_faktur": 1,
        "faktury_celkova_castka_s_dph": 48500.00,
        "registr_id": 456,
        "registr_iddt": "REG-2026-001",
        "dt_zverejneni": "2026-01-18 09:00:00",
        "registr_zverejnit": "ANO"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 50,
      "total": 127,
      "total_pages": 3
    },
    "stats": {
      "total": 127,
      "nove": 5,
      "ke_schvaleni": 12,
      "schvalene": 45,
      "potvrzene": 30,
      "uverejnene": 25,
      "dokoncene": 10
    }
  },
  "message": "Data načtena úspěšně"
}
```

**Parametry:**
- `page` - Číslo stránky (výchozí: 1)
- `per_page` - Záznamů na stránku (1-100, výchozí: 50)
- `year` - Rok objednávek (výchozí: aktuální rok)
- `filters` - Objekt filtrů (volitelné):
  - `cislo_objednavky` - LIKE search
  - `dodavatel_nazev` - LIKE search
  - `predmet` - LIKE search
  - `objednatel_jmeno` - LIKE search na jméno i příjmení
- `sorting` - Pole třídění (volitelné):
  - `id` - Název sloupce (dt_objednavky, cislo_objednavky, dodavatel_nazev, max_cena_s_dph, cena_s_dph)
  - `desc` - true/false

**Poznámky:**
- Statistiky (`stats`) se vrací POUZE pro první stránku (page=1) kvůli performance
- Pro refresh statistik použij endpoint `/order-v3/stats`

---

### 2. POST `/api.eeo/order-v3/stats`

Načte pouze statistiky objednávek (lehký endpoint pro dashboard refresh).

**Request:**
```json
{
  "token": "xxx",
  "username": "user@domain.cz",
  "year": 2026
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "total": 127,
    "nove": 5,
    "ke_schvaleni": 12,
    "schvalene": 45,
    "potvrzene": 30,
    "uverejnene": 25,
    "dokoncene": 10
  },
  "message": "Statistiky načteny úspěšně"
}
```

**Použití:**
- Pro periodický refresh statistik bez načítání celého seznamu
- Pro dashboard tiles
- Menší datový objem než `/list` endpoint

---

### 3. POST `/api.eeo/order-v3/items`

Načte položky a detail objednávky (lazy loading podřádků).

**Request:**
```json
{
  "token": "xxx",
  "username": "user@domain.cz",
  "order_id": 123
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "order_id": 123,
    "items": [
      {
        "id": 1,
        "nazev": "Notebook Dell Latitude 5520",
        "mnozstvi": 2,
        "jednotka": "ks",
        "cena_za_jednotku": 25000.00,
        "castka_celkem": 50000.00,
        "poznamka": "Specifikace: i5, 16GB RAM, 512GB SSD",
        "dt_vytvoreni": "2026-01-15 10:30:00"
      },
      {
        "id": 2,
        "nazev": "Myš Logitech MX Master 3",
        "mnozstvi": 2,
        "jednotka": "ks",
        "cena_za_jednotku": 1500.00,
        "castka_celkem": 3000.00,
        "poznamka": null,
        "dt_vytvoreni": "2026-01-15 10:31:00"
      }
    ],
    "attachments": [
      {
        "id": 10,
        "nazev_souboru": "obj-20260115-abc123.pdf",
        "nazev_originalu": "nabidka_dell.pdf",
        "typ_souboru": "application/pdf",
        "velikost_souboru": 125680,
        "popis": "Nabídka od dodavatele",
        "dt_nahrani": "2026-01-15 10:35:00"
      }
    ],
    "notes": "Objednávka schválena ředitelem. Dodání do 14 dnů."
  },
  "message": "Detail objednávky načten úspěšně"
}
```

**Použití:**
- Lazy loading při rozbalení řádku v tabulce
- Načítá pouze potřebná data pro konkrétní objednávku
- Optimalizace pro velké seznamy objednávek

---

## 🔒 Bezpečnost

### Autentizace
Všechny endpointy vyžadují:
- `token` - Auth token z přihlášení
- `username` - Email uživatele

Token se ověřuje pomocí `verify_token_v2()` funkce.

### SQL Injection prevence
- Všechny queries používají **prepared statements**
- Všechny uživatelské vstupy jsou escapovány
- Používají se konstanty tabulek (`TBL_OBJEDNAVKY`, `TBL_DODAVATELE`, atd.)

### Timezone handling
- Všechny databázové operace používají `TimezoneHelper::setMysqlTimezone($db)`
- Zajišťuje konzistentní ukládání a načítání časových značek v české časové zóně

---

## 📊 Optimalizace

### Indexy
Doporučené indexy pro optimální performance:

```sql
-- Hlavní indexy (měly by už existovat)
ALTER TABLE 25a_objednavky ADD INDEX idx_dt_objednavky (dt_objednavky);
ALTER TABLE 25a_objednavky ADD INDEX idx_dt_aktualizace (dt_aktualizace);
ALTER TABLE 25a_objednavky ADD INDEX idx_aktivni (aktivni);
ALTER TABLE 25a_objednavky ADD INDEX idx_dodavatel (dodavatel_id);

-- Složené indexy pro filtry
ALTER TABLE 25a_objednavky ADD INDEX idx_year_active (dt_objednavky, aktivni);
ALTER TABLE 25a_objednavky ADD INDEX idx_cislo_active (cislo_objednavky, aktivni);

-- Indexy pro JOINy
ALTER TABLE 25_dodavatele ADD INDEX idx_nazev (nazev);
ALTER TABLE 25_uzivatele ADD INDEX idx_jmeno_prijmeni (jmeno, prijmeni);
```

### Query optimalizace
- LEFT JOINy místo subqueries kde je to možné
- COUNT agregace v subqueries pro počty
- LIMIT + OFFSET pro paginaci
- Podmínka na `aktivni = 1` ve všech queries

### Response size
- Základní `/list` bez `items` - cca 5-10KB na stránku
- Detail `/items` - 1-5KB per order
- Stats `/stats` - < 1KB

---

## 🐛 Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (chybí parametry, neplatné hodnoty)
- `401` - Unauthorized (neplatný token)
- `405` - Method Not Allowed (pouze POST)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "status": "error",
  "message": "Popis chyby v češtině"
}
```

---

## 📝 Changelog

### v1.0 (2026-01-23)
- ✅ Iniciální implementace
- ✅ `order-v3/list` - Seznam s paginací
- ✅ `order-v3/stats` - Statistiky
- ✅ `order-v3/items` - Detail položek
- ✅ Server-side filtering a sorting
- ✅ Optimalizované queries s JOINy
- ✅ Timezone handling
- ✅ Security audit passed

---

## 🔗 Související dokumentace

- `/docs/PHP_API_SECURITY_AUDIT_20251220.md` - Bezpečnostní audit
- `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php` - Zdrojový kód
- `/.github/prompts/PHP_api.prompt.md` - API development guidelines
