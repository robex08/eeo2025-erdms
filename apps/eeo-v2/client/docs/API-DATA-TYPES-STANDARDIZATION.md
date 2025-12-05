# 📊 API Data Types Standardization - FE ↔ BE

**Datum:** 29. října 2025  
**Tabulka:** `25a_objednavky`  
**Cíl:** Sjednotit datové typy mezi Frontend a Backend

---

## 🔍 Aktuální Analýza DB Struktury

### Příklad Záznamu (ID: 11201)

```sql
SELECT * FROM `25a_objednavky` WHERE `id` = 11201;
```

---

## 📋 Problematické Sloupce - Analýza

### 1. **strediska_kod** ⚠️ KRITICKÉ

**Aktuální hodnota v DB:**
```json
[{"kod_stavu":"KLADNO","nazev_stavu":"Kladno"}]
```

**Typ:** `VARCHAR/TEXT` obsahující JSON array objektů

**Problémy:**
- ❌ Není to čisté JSON - je to JSON string v DB
- ❌ Nekonzistentní názvosloví: `kod_stavu` vs `nazev_stavu` (mělo by být `kod` a `nazev`)
- ❌ Frontend očekává array stringů/čísel, ne array objektů

**Návrh:**

#### Option A: Array stringů (kódů) 🏆 DOPORUČENO
```json
["KLADNO", "PRAHA", "MOST"]
```
**Výhody:** Jednoduché, rychlé, kompaktní  
**Frontend transformace:** Žádná nutná

#### Option B: Array objektů
```json
[
  {"kod": "KLADNO", "nazev": "Kladno"},
  {"kod": "PRAHA", "nazev": "Praha hlavní město"}
]
```
**Výhody:** Obsahuje všechny informace  
**Nevýhody:** Větší, redundantní (název je v číselníku)

---

### 2. **financovani** ⚠️ KRITICKÉ

**Aktuální hodnota v DB:**
```json
{
  "kod_stavu":"LP",
  "nazev_stavu":"Limitovaný příslib",
  "doplnujici_data":{
    "lp_kod":[1]
  }
}
```

**Typ:** `VARCHAR/TEXT` obsahující JSON objekt

**Problémy:**
- ❌ Nekonzistentní struktura: `kod_stavu` vs `kod`
- ❌ `lp_kod` je array, ale obsahuje jen číslo - měl by být string nebo ID
- ❌ Frontend očekává jiný formát

**Návrh:**

```json
{
  "typ": "LP",
  "nazev": "Limitovaný příslib",
  "lp_kody": [1, 5, 8]
}
```

**Změny:**
- `kod_stavu` → `typ`
- `nazev_stavu` → `nazev`
- `doplnujici_data.lp_kod` → `lp_kody` (rovnou v kořeni)

---

### 3. **druh_objednavky_kod** ⚠️ STŘEDNĚ KRITICKÉ

**Aktuální hodnota v DB:**
```json
{"kod_stavu":"AUTA","nazev_stavu":"Auta"}
```

**Typ:** `VARCHAR/TEXT` obsahující JSON objekt

**Problémy:**
- ❌ Nekonzistentní: Proč objekt? Stačí jen `kod`
- ❌ Duplicitní data (název je v číselníku)

**Návrh:**

#### Option A: Jen kód (string) 🏆 DOPORUČENO
```
"AUTA"
```
**Výhody:** Jednoduché, FE si najde název v číselníku  
**DB typ:** `VARCHAR(50)`

#### Option B: Objekt (pokud nutně potřeba)
```json
{"kod": "AUTA", "nazev": "Auta"}
```

---

### 4. **stav_workflow_kod** ⚠️ VYSOKÁ PRIORITA

**Aktuální hodnota v DB:**
```json
["SCHVALENA","ODESLANA","POTVRZENA","FAKTURACE","KONTROLA","ZKONTROLOVANA","DOKONCENA"]
```

**Typ:** `VARCHAR/TEXT` obsahující JSON array

**Status:** ✅ **DOBŘE!** Toto je SPRÁVNÝ formát!

**Návrh:** Ponechat jako je - array stringů (kódů stavů)

---

### 5. **dodavatel_zpusob_potvrzeni** ⚠️ STŘEDNĚ KRITICKÉ

**Aktuální hodnota v DB:**
```json
{"zpusob":["email"],"platba":"faktura"}
```

**Typ:** `VARCHAR/TEXT` obsahující JSON objekt

**Problémy:**
- ⚠️ `zpusob` je array stringů - OK
- ⚠️ `platba` by mělo být `zpusob_platby` pro konzistenci

**Návrh:**

```json
{
  "zpusob_potvrzeni": ["email", "telefon"],
  "zpusob_platby": "faktura"
}
```

---

### 6. **INTEGER vs STRING Sloupce** 🔢

#### ID Sloupce (Foreign Keys)

**Aktuální:**
```
uzivatel_id = 1
garant_uzivatel_id = 100
```

**Typ v DB:** `INT` nebo `BIGINT`

**Návrh:**

| Sloupec | DB Typ | FE Očekává | BE Posílá | Standardizace |
|---------|--------|------------|-----------|---------------|
| `id` | INT | number | number | ✅ OK |
| `uzivatel_id` | INT | number | number | ✅ OK |
| `garant_uzivatel_id` | INT | number | number | ✅ OK |
| `objednatel_id` | INT | number | number | ✅ OK |
| `schvalovatel_id` | INT | number | number | ✅ OK |
| `prikazce_id` | INT | number | number | ✅ OK |
| `dodavatel_id` | INT | number \| null | number \| null | ✅ OK |

**Pravidlo:** Všechny ID jsou `number` (INT v DB, number v JS)

#### Číselné hodnoty

**Aktuální:**
```
max_cena_s_dph = 25000.00
```

**Typ v DB:** `DECIMAL(10,2)`

**Návrh:**

| Sloupec | DB Typ | FE Očekává | BE Posílá | Standardizace |
|---------|--------|------------|-----------|---------------|
| `max_cena_s_dph` | DECIMAL | string nebo number | string | ⚠️ POZOR! |
| `castka` | DECIMAL | string nebo number | string | ⚠️ POZOR! |

**Důležité:** Pro peněžní částky doporučuji **STRING** v API kvůli přesnosti!

```javascript
// ❌ ŠPATNĚ - ztráta přesnosti
const cena = 25000.1234567; // JavaScript zaokrouhlí

// ✅ SPRÁVNĚ - přesné
const cena = "25000.12"; // String zachová přesnost
```

---

## 🎯 Standardizační Návrh

### A) JSON Sloupce - Jednotný Formát

#### 1. Jednoduchá Pole (Arrays)

**Kdy použít:** Seznam kódů bez dodatečných dat

```json
["KOD1", "KOD2", "KOD3"]
```

**Příklady:**
- `strediska_kod`: `["KLADNO", "PRAHA", "MOST"]`
- `stav_workflow_kod`: `["SCHVALENA", "ODESLANA"]`

#### 2. Objekty s Metadaty

**Kdy použít:** Potřeba uložit komplexní strukturu

```json
{
  "typ": "LP",
  "nazev": "Limitovaný příslib",
  "lp_kody": [1, 5, 8],
  "poznamka": "Dodatečné info"
}
```

**Příklady:**
- `financovani`
- `dodavatel_zpusob_potvrzeni`

#### 3. Pole Objektů

**Kdy použít:** Seznam položek s atributy

```json
[
  {"id": 1, "popis": "Položka 1", "cena": "1000.00"},
  {"id": 2, "popis": "Položka 2", "cena": "2000.00"}
]
```

**Příklady:**
- `polozky_objednavky` (mělo by být v separátní tabulce!)

---

### B) Názvosloví - Standardy

#### Konzistentní Pojmenování Klíčů

❌ **NEKONZISTENTNÍ:**
```json
{
  "kod_stavu": "KLADNO",
  "nazev_stavu": "Kladno"
}
```

✅ **KONZISTENTNÍ:**
```json
{
  "kod": "KLADNO",
  "nazev": "Kladno"
}
```

#### Standardní Klíče

| Typ Dat | Klíč | Příklad |
|---------|------|---------|
| Kód/ID položky | `kod` | `"kod": "KLADNO"` |
| Název položky | `nazev` | `"nazev": "Kladno"` |
| Popis | `popis` | `"popis": "Detailní popis"` |
| Částka | `castka` | `"castka": "1000.00"` |
| Datum | `datum` nebo `dt_*` | `"datum": "2025-10-27"` |
| Boolean | `je_*` nebo bez prefixu | `"je_aktivni": true` |

---

### C) Datové Typy - Mapa

| Kategorie | DB Typ | FE Očekává | BE Posílá (JSON) | Poznámka |
|-----------|--------|------------|------------------|----------|
| **ID (Primary Key)** | INT/BIGINT | number | number | Auto-increment |
| **Foreign Key** | INT/BIGINT | number \| null | number \| null | Nullable OK |
| **Peníze** | DECIMAL(10,2) | string | string | **STRING pro přesnost!** |
| **Datum** | DATE | string | string | ISO 8601: "2025-10-27" |
| **DateTime** | DATETIME | string | string | ISO 8601: "2025-10-27T01:54:06Z" |
| **Boolean** | TINYINT(1) | boolean | boolean (0/1) | MySQL TINYINT → boolean |
| **Kód číselníku** | VARCHAR(50) | string | string | Enum hodnota |
| **Text** | TEXT | string | string | Dlouhý text |
| **JSON Array** | JSON/TEXT | Array | Array | Parse v BE/FE |
| **JSON Object** | JSON/TEXT | Object | Object | Parse v BE/FE |

---

## 📝 Konkrétní Návrh pro Tabulku `25a_objednavky`

### Sloupce k Přepracování

#### 1. `strediska_kod` - ARRAY STRINGŮ

**Změna:**

```sql
-- Před:
strediska_kod = '[{"kod_stavu":"KLADNO","nazev_stavu":"Kladno"}]'

-- Po:
strediska_kod = '["KLADNO","PRAHA","MOST"]'
```

**FE Očekává:**
```typescript
strediska_kod: string[] // ["KLADNO", "PRAHA"]
```

**BE Posílá:**
```json
{
  "strediska_kod": ["KLADNO", "PRAHA", "MOST"]
}
```

---

#### 2. `financovani` - OBJEKT

**Změna:**

```sql
-- Před:
financovani = '{"kod_stavu":"LP","nazev_stavu":"...","doplnujici_data":{"lp_kod":[1]}}'

-- Po:
financovani = '{"typ":"LP","nazev":"Limitovaný příslib","lp_kody":[1,5,8]}'
```

**FE Očekává:**
```typescript
financovani: {
  typ: string;          // "LP" | "ROZPOCET" | ...
  nazev: string;        // "Limitovaný příslib"
  lp_kody?: number[];   // [1, 5, 8] - optional pro LP
}
```

**BE Posílá:**
```json
{
  "financovani": {
    "typ": "LP",
    "nazev": "Limitovaný příslib",
    "lp_kody": [1, 5, 8]
  }
}
```

---

#### 3. `druh_objednavky_kod` - STRING

**Změna:**

```sql
-- Před:
druh_objednavky_kod = '{"kod_stavu":"AUTA","nazev_stavu":"Auta"}'

-- Po:
druh_objednavky_kod = 'AUTA'
```

**FE Očekává:**
```typescript
druh_objednavky_kod: string // "AUTA"
```

**BE Posílá:**
```json
{
  "druh_objednavky_kod": "AUTA"
}
```

---

#### 4. `dodavatel_zpusob_potvrzeni` - OBJEKT

**Změna:**

```sql
-- Před:
dodavatel_zpusob_potvrzeni = '{"zpusob":["email"],"platba":"faktura"}'

-- Po:
dodavatel_zpusob_potvrzeni = '{"zpusob_potvrzeni":["email"],"zpusob_platby":"faktura"}'
```

**FE Očekává:**
```typescript
dodavatel_zpusob_potvrzeni: {
  zpusob_potvrzeni: string[];  // ["email", "telefon", "system"]
  zpusob_platby: string;       // "faktura" | "prevodka" | ...
}
```

**BE Posílá:**
```json
{
  "dodavatel_zpusob_potvrzeni": {
    "zpusob_potvrzeni": ["email", "telefon"],
    "zpusob_platby": "faktura"
  }
}
```

---

#### 5. Peněžní Částky - STRING

**Změna:**

```sql
-- DB typ zůstane: DECIMAL(10,2)
-- Ale v JSON posílat jako STRING
```

**FE Očekává:**
```typescript
max_cena_s_dph: string // "25000.00"
```

**BE Posílá:**
```json
{
  "max_cena_s_dph": "25000.00"
}
```

**FE → BE (ukládání):**
```json
{
  "max_cena_s_dph": "25000.00"
}
```

**BE převede na DECIMAL při INSERT/UPDATE**

---

## 🔧 Implementační Doporučení

### Backend (PHP)

#### Helper Funkce

```php
<?php
/**
 * Standardizace JSON sloupců při čtení z DB
 */
function standardizeOrderData($row) {
    $result = $row;
    
    // Strediska: Convert object array to string array
    if (!empty($row['strediska_kod'])) {
        $strediska = json_decode($row['strediska_kod'], true);
        if (is_array($strediska)) {
            // Pokud je to array objektů, extrahuj jen kódy
            $result['strediska_kod'] = array_map(function($item) {
                return is_array($item) ? $item['kod_stavu'] : $item;
            }, $strediska);
        }
    }
    
    // Financování: Rename keys
    if (!empty($row['financovani'])) {
        $financovani = json_decode($row['financovani'], true);
        if (is_array($financovani)) {
            $result['financovani'] = [
                'typ' => $financovani['kod_stavu'] ?? null,
                'nazev' => $financovani['nazev_stavu'] ?? null,
                'lp_kody' => $financovani['doplnujici_data']['lp_kod'] ?? []
            ];
        }
    }
    
    // Druh objednávky: Extract just the code
    if (!empty($row['druh_objednavky_kod'])) {
        $druh = json_decode($row['druh_objednavky_kod'], true);
        if (is_array($druh) && isset($druh['kod_stavu'])) {
            $result['druh_objednavky_kod'] = $druh['kod_stavu'];
        }
    }
    
    // Způsob potvrzení: Rename keys
    if (!empty($row['dodavatel_zpusob_potvrzeni'])) {
        $zpusob = json_decode($row['dodavatel_zpusob_potvrzeni'], true);
        if (is_array($zpusob)) {
            $result['dodavatel_zpusob_potvrzeni'] = [
                'zpusob_potvrzeni' => $zpusob['zpusob'] ?? [],
                'zpusob_platby' => $zpusob['platba'] ?? null
            ];
        }
    }
    
    // Peněžní částky: Convert to string
    $moneyFields = ['max_cena_s_dph', 'castka_celkem'];
    foreach ($moneyFields as $field) {
        if (isset($row[$field])) {
            $result[$field] = number_format($row[$field], 2, '.', '');
        }
    }
    
    // Booleany: Convert to proper boolean
    $boolFields = ['aktivni', 'potvrzeni_dokonceni_objednavky', 'potvrzeni_vecne_spravnosti'];
    foreach ($boolFields as $field) {
        if (isset($row[$field])) {
            $result[$field] = (bool)$row[$field];
        }
    }
    
    return $result;
}

/**
 * Standardizace JSON sloupců při zápisu do DB
 */
function prepareOrderDataForDB($data) {
    $result = $data;
    
    // Strediska: Ensure it's array of strings
    if (!empty($data['strediska_kod'])) {
        if (is_string($data['strediska_kod'])) {
            $strediska = json_decode($data['strediska_kod'], true);
        } else {
            $strediska = $data['strediska_kod'];
        }
        // Pokud je to array stringů, nech to tak
        if (is_array($strediska) && !empty($strediska)) {
            $result['strediska_kod'] = json_encode(array_values($strediska));
        }
    }
    
    // Financování: Convert from new format
    if (!empty($data['financovani'])) {
        if (is_string($data['financovani'])) {
            $financovani = json_decode($data['financovani'], true);
        } else {
            $financovani = $data['financovani'];
        }
        $result['financovani'] = json_encode($financovani);
    }
    
    // Druh objednávky: Just save the code
    if (!empty($data['druh_objednavky_kod']) && is_string($data['druh_objednavky_kod'])) {
        // Nech to jako string
        $result['druh_objednavky_kod'] = $data['druh_objednavky_kod'];
    }
    
    // Způsob potvrzení
    if (!empty($data['dodavatel_zpusob_potvrzeni'])) {
        if (is_string($data['dodavatel_zpusob_potvrzeni'])) {
            $zpusob = json_decode($data['dodavatel_zpusob_potvrzeni'], true);
        } else {
            $zpusob = $data['dodavatel_zpusob_potvrzeni'];
        }
        $result['dodavatel_zpusob_potvrzeni'] = json_encode($zpusob);
    }
    
    // Peněžní částky: Convert string to DECIMAL
    $moneyFields = ['max_cena_s_dph', 'castka_celkem'];
    foreach ($moneyFields as $field) {
        if (isset($data[$field])) {
            // MySQL DECIMAL expects string or number
            $result[$field] = is_string($data[$field]) ? $data[$field] : number_format($data[$field], 2, '.', '');
        }
    }
    
    return $result;
}
?>
```

#### API Endpoint Příklad

```php
<?php
// GET /api/orders/11201
function getOrder($orderId) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT * FROM 25a_objednavky WHERE id = ?");
    $stmt->execute([$orderId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$row) {
        http_response_code(404);
        return ['status' => 'error', 'message' => 'Order not found'];
    }
    
    // Standardizace před odesláním
    $standardized = standardizeOrderData($row);
    
    return [
        'status' => 'ok',
        'data' => $standardized
    ];
}

// PUT /api/orders/11201
function updateOrder($orderId, $data) {
    global $pdo;
    
    // Standardizace před uložením
    $prepared = prepareOrderDataForDB($data);
    
    // Build UPDATE query
    $fields = [];
    $values = [];
    foreach ($prepared as $key => $value) {
        if ($key !== 'id') {
            $fields[] = "`$key` = ?";
            $values[] = $value;
        }
    }
    $values[] = $orderId;
    
    $sql = "UPDATE 25a_objednavky SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    
    return ['status' => 'ok', 'message' => 'Order updated'];
}
?>
```

---

### Frontend (React/TypeScript)

#### TypeScript Interface

```typescript
// src/types/Order25.ts

export interface Order25 {
  // IDs
  id: number;
  cislo_objednavky: string;
  
  // Basic Info
  predmet: string;
  dt_objednavky: string; // ISO 8601
  
  // JSON Sloupce - STANDARDIZOVANÉ
  strediska_kod: string[]; // ["KLADNO", "PRAHA"]
  
  financovani: {
    typ: string; // "LP" | "ROZPOCET"
    nazev: string;
    lp_kody?: number[]; // Optional, pouze pro LP
  };
  
  druh_objednavky_kod: string; // "AUTA"
  
  stav_workflow_kod: string[]; // ["SCHVALENA", "ODESLANA"]
  
  dodavatel_zpusob_potvrzeni: {
    zpusob_potvrzeni: string[]; // ["email", "telefon"]
    zpusob_platby: string; // "faktura"
  };
  
  // Peníze - STRING!
  max_cena_s_dph: string; // "25000.00"
  
  // User IDs
  uzivatel_id: number;
  garant_uzivatel_id: number | null;
  objednatel_id: number;
  schvalovatel_id: number | null;
  prikazce_id: number | null;
  
  // Dodavatel
  dodavatel_id: number | null;
  dodavatel_nazev: string;
  dodavatel_adresa: string;
  dodavatel_ico: string;
  dodavatel_dic: string | null;
  
  // Datumy
  dt_schvaleni: string | null;
  dt_odeslani: string | null;
  dt_akceptace: string | null;
  dt_vytvoreni: string;
  dt_aktualizace: string;
  
  // Boolean
  aktivni: boolean;
  potvrzeni_dokonceni_objednavky: boolean;
  potvrzeni_vecne_spravnosti: boolean;
  
  // Text
  poznamka: string | null;
  schvaleni_komentar: string | null;
}
```

#### API Helper

```typescript
// src/services/api25orders.ts

/**
 * Převod FE formátu na BE formát před odesláním
 */
export function prepareOrderForAPI(order: Partial<Order25>): any {
  const result = { ...order };
  
  // Peníze: Ujisti se že jsou stringy
  if (result.max_cena_s_dph !== undefined) {
    result.max_cena_s_dph = String(result.max_cena_s_dph);
  }
  
  // JSON pole: Ujisti se že jsou správně formátované
  if (result.strediska_kod && Array.isArray(result.strediska_kod)) {
    // Array of strings - OK
  }
  
  if (result.financovani) {
    // Object - OK
  }
  
  return result;
}

/**
 * Validace dat z BE
 */
export function validateOrderFromAPI(data: any): Order25 {
  // Type checking a validace
  if (typeof data.id !== 'number') {
    throw new Error('Invalid order ID');
  }
  
  // Strediska: Must be array of strings
  if (!Array.isArray(data.strediska_kod)) {
    throw new Error('strediska_kod must be array');
  }
  
  // Financování: Must be object
  if (data.financovani && typeof data.financovani !== 'object') {
    throw new Error('financovani must be object');
  }
  
  // Peníze: Must be string
  if (data.max_cena_s_dph && typeof data.max_cena_s_dph !== 'string') {
    console.warn('max_cena_s_dph is not string, converting...');
    data.max_cena_s_dph = String(data.max_cena_s_dph);
  }
  
  return data as Order25;
}
```

---

## 🚀 Migrační Plán

### Fáze 1: Backend Úpravy (2-3 hodiny)

1. ✅ Vytvořit helper funkce `standardizeOrderData()` a `prepareOrderDataForDB()`
2. ✅ Upravit GET endpointy aby vracely standardizovaný formát
3. ✅ Upravit POST/PUT endpointy aby přijímaly standardizovaný formát
4. ✅ Otestovat na testovacím prostředí

### Fáze 2: Frontend Úpravy (1-2 hodiny)

1. ✅ Vytvořit TypeScript interface `Order25`
2. ✅ Aktualizovat API helpers
3. ✅ Otestovat že všechno funguje

### Fáze 3: Databázová Migrace (VOLITELNÉ - může počkat)

Pokud chceš vyčistit stará data v DB:

```sql
-- Migrace strediska_kod
UPDATE 25a_objednavky 
SET strediska_kod = JSON_EXTRACT(
  JSON_ARRAYAGG(JSON_EXTRACT(strediska_kod, '$[*].kod_stavu')),
  '$[0]'
)
WHERE JSON_VALID(strediska_kod);

-- Migrace druh_objednavky_kod
UPDATE 25a_objednavky
SET druh_objednavky_kod = JSON_UNQUOTE(JSON_EXTRACT(druh_objednavky_kod, '$.kod_stavu'))
WHERE JSON_VALID(druh_objednavky_kod);
```

**POZOR:** Před spuštěním migrace VŽDY zálohuj databázi!

---

## 📋 Checklist

### Backend Developer

- [ ] Implementovat `standardizeOrderData()` helper
- [ ] Implementovat `prepareOrderDataForDB()` helper
- [ ] Upravit GET `/api/orders/:id` endpoint
- [ ] Upravit POST `/api/orders` endpoint
- [ ] Upravit PUT `/api/orders/:id` endpoint
- [ ] Otestovat všechny endpointy s Postman
- [ ] Dokumentovat API změny

### Frontend Developer

- [ ] Vytvořit `Order25` TypeScript interface
- [ ] Aktualizovat `api25orders.ts` service
- [ ] Přidat validaci dat z API
- [ ] Otestovat načítání objednávek
- [ ] Otestovat ukládání objednávek
- [ ] Otestovat edge cases (null hodnoty, prázdná pole)

---

## 🎯 Závěrečná Doporučení

1. **Peníze vždy jako STRING** - Zabrání ztrátě přesnosti
2. **JSON sloupce - konzistentní struktura** - Usnadní práci s daty
3. **TypeScript na FE** - Prevence chyb
4. **Helper funkce na BE** - Centralizace logiky
5. **Testování** - Důkladně otestovat před nasazením

---

**Potřebuješ pomoct s implementací?** 🚀
