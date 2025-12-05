# API25 Orders - Dokumentace pro pokročilý přehled objednávek

## Přehled

Tato dokumentace popisuje API endpointy potřebné pro pokročilý přehled objednávek v systému Orders25.

## Endpointy

### 1. Získání seznamu objednávek s pokročilým filtrováním

**Endpoint:** `POST /api.eeo/orders25/list`

**Popis:** Načte seznam objednávek z tabulky `25a_objednavky` s možnostmi pokročilého filtrování, řazení a stránkování.

**Request payload:**
```json
{
  "token": "string",
  "username": "string",
  "limit": 1000,
  "offset": 0,
  "order_by": "dt_vytvoreni",
  "order_direction": "DESC",
  "status": "NOVA|SCHVALENA|VYRIZENA|STORNOVA",
  "user_id": 123,
  "date_from": "2025-01-01",
  "date_to": "2025-12-31",
  "amount_from": 1000,
  "amount_to": 50000,
  "search": "hledaný text"
}
```

**Parametry:**
- `token` (string, required) - Autentizační token
- `username` (string, required) - Uživatelské jméno
- `limit` (integer, optional) - Maximální počet výsledků (default: 1000)
- `offset` (integer, optional) - Offset pro stránkování (default: 0)
- `order_by` (string, optional) - Sloupec pro řazení (default: "dt_vytvoreni")
- `order_direction` (string, optional) - Směr řazení ASC/DESC (default: "DESC")
- `status` (string, optional) - Filtr podle stavu objednávky
- `user_id` (integer, optional) - Filtr podle ID uživatele (objednatel)
- `date_from` (string, optional) - Filtr od data (YYYY-MM-DD)
- `date_to` (string, optional) - Filtr do data (YYYY-MM-DD)  
- `amount_from` (number, optional) - Filtr od částky
- `amount_to` (number, optional) - Filtr do částky
- `search` (string, optional) - Globální vyhledávání v textech

**Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": 1,
      "ev_cislo": "2025/001",
      "predmet": "Předmět objednávky",
      "poznamka": "Poznámka k objednávce",
      "objednatel_id": 123,
      "objednatel_jmeno": "Jan Novák",
      "garant_uzivatel_id": 124,
      "garant_jmeno": "Petr Svoboda",
      "vytvoril_uzivatel_id": 125,
      "vytvoril_jmeno": "Marie Nováková",
      "stav_id_num": 1,
      "nazev_stavu": "Nová",
      "dt_vytvoreni": "2025-10-11T09:30:00.000Z",
      "dt_upraveno": "2025-10-11T10:15:00.000Z",
      "pozadovany_termin": "2025-11-15",
      "cena_bez_dph": 10000.00,
      "dph_sazba": 21,
      "cena_s_dph": 12100.00,
      "dodavatel_nazev": "Dodavatel s.r.o.",
      "dodavatel_ico": "12345678"
    }
  ]
}
```

### 2. Získání statistik objednávek pro dashboard

**Endpoint:** `POST /api.eeo/orders25/stats`

**Popis:** Načte agregované statistiky objednávek pro zobrazení v dashboardu.

**Request payload:**
```json
{
  "token": "string",
  "username": "string",
  "action": "stats",
  "date_from": "2025-01-01",
  "date_to": "2025-12-31",
  "user_id": 123
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "total_count": 150,
    "by_status": {
      "NOVA": 25,
      "SCHVALENA": 45,
      "VYRIZENA": 70,
      "STORNOVA": 10
    },
    "total_amount": 1250000.00,
    "by_month": [
      {
        "month": "2025-01",
        "count": 12,
        "amount": 145000.00
      }
    ],
    "by_user": [
      {
        "user_id": 123,
        "user_name": "Jan Novák",
        "count": 15,
        "amount": 180000.00
      }
    ]
  }
}
```

## Implementované funkce v Orders25List

### Dashboard
- **Přehledové karty:** Celkový počet objednávek, počty podle stavů, celková hodnota
- **Možnost skrytí:** Dashboard lze skrýt pro více prostoru
- **Barevné rozlišení:** Každý stav má svou barvu

### Pokročilé filtrování
- **Globální vyhledávání:** Prohledává evidenční číslo, předmět, objednatele
- **Filtr podle stavu:** Dropdown s možnostmi Nová, Schválená, Vyřízená, Stornovaná
- **Filtr podle objednatele:** Dropdown se seznamem uživatelů
- **Datové filtry:** Od data, do data
- **Cenové filtry:** Od částky, do částky
- **Sbalitelné filtry:** Možnost skrytí pokročilých filtrů
- **Vymazání filtrů:** Tlačítko pro reset všech filtrů

### Tabulka s master/detail view
- **Rozbalitelné řádky:** Klik na šipku zobrazí detail objednávky
- **Řazení:** Klik na hlavičky sloupců
- **Sticky header:** Hlavička zůstává viditelná při scrollování
- **Barevné rozlišení:** Status badge s ikonami a barvami

### Detailní view (expandované řádky)
- **Základní informace:** ID, ev. číslo, předmět, poznámka
- **Osoby:** Objednatel, garant, vytvořil (s načtenými jmény)
- **Časové údaje:** Vytvořeno, upraveno, termín dodání
- **Cenové údaje:** Cena bez DPH, DPH, cena s DPH

### Akce
- **Editace:** Pro uživatele s oprávněním ORDER_EDIT_*
- **Náhled:** Pro všechny uživatele (TODO: implementovat)
- **Smazání:** Pro uživatele s oprávněním ORDER_MANAGE

### Stránkování
- **Konfigurovatelné:** 10, 25, 50, 100, 250 záznamů na stránku
- **Navigace:** První, předchozí, následující, poslední stránka
- **Informace:** Zobrazeno X z Y záznamů

### Export
- **CSV export:** Export filtrovaných dat do CSV souboru

### Oprávnění
- **ORDER_EDIT_ALL:** Může editovat všechny objednávky
- **ORDER_EDIT_OWN:** Může editovat vlastní objednávky
- **ORDER_MANAGE:** Může mazat objednávky

## Styling a UX

### Moderní design
- **Gradient pozadí:** Pro header a karty
- **Box shadows:** Jemné stíny pro hloubku
- **Hover efekty:** Animace při najíždění myší
- **Barevné akcenty:** Konzistentní s aplikací

### Responzivní layout
- **Grid layout:** Automatické přizpůsobení podle šířky
- **Flexbox:** Pro rozvržení prvků
- **Sbalitelné sekce:** Dashboard a filtry lze skrýt

### Accessibility
- **Klávesové zkratky:** Tab navigace
- **ARIA labely:** Pro screen readery
- **Kontrastní barvy:** Podle WCAG guidelines

## TODO - Budoucí rozšíření

1. **Preview objednávky:** Modální okno s detailním náhledem
2. **Bulk akce:** Možnost vybrat více objednávek a provést hromadnou akci
3. **Pokročilé řazení:** Více sloupců současně
4. **Uložené filtry:** Možnost uložit často používané kombinace filtrů
5. **Real-time updates:** WebSocket pro aktualizace v reálném čase
6. **Grafy:** Dashboard s grafy trendů a statistik
7. **Notifikace:** Upozornění na změny stavů objednávek
8. **Mobile view:** Optimalizace pro mobilní zařízení