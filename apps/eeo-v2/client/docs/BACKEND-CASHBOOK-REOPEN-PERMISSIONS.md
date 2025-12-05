# BACKEND: Oprávnění pro otevření uzavřeného měsíce

**Datum:** 9.11.2025  
**Endpoint:** `/api.eeo/cashbook/reopen-book`  
**Status:** ⚠️ POŽADAVEK NA OPRAVU

---

## 🚨 Problém

**Chyba:** Běžný uživatel s `CASH_BOOK_EDIT_OWN` dostává chybu:
```
Chyba při odemykání knihy: Nemáte oprávnění k této operaci
```

**Frontend požadavek:**
```javascript
POST /api.eeo/cashbook-reopen
{
  "uzivatel_id": 100,
  "token": "...",
  "book_id": 123
}
```

**Backend odpověď (ŠPATNĚ):**
```json
{
  "status": "error",
  "message": "Nemáte oprávnění k této operaci"
}
```

---

## 🔑 Oprávnění v DB (tabulka `25a_prava`)

Backend musí kontrolovat tato oprávnění z tabulky `25a_prava`:

| Kód oprávnění | Popis | Co umožňuje |
|---------------|-------|-------------|
| `CASH_BOOK_EDIT_OWN` | Editace vlastní pokladny | ✅ Uzavřít **vlastní** měsíc<br>✅ Otevřít **vlastní** uzavřený měsíc |
| `CASH_BOOK_EDIT_ALL` | Editace všech pokladen | ✅ Uzavřít **jakýkoli** měsíc<br>✅ Otevřít **jakýkoli** uzavřený měsíc |
| `CASH_BOOK_MANAGE` | Správa pokladen (admin) | ✅ Uzavřít **jakýkoli** měsíc<br>✅ Otevřít **jakýkoli** uzavřený měsíc<br>✅ Zamknout **jakýkoli** měsíc<br>✅ Odemknout **zamčený** měsíc |

**SQL dotaz pro kontrolu oprávnění:**
```sql
-- Zjistit, zda má uživatel oprávnění
SELECT p.kod 
FROM 25a_prava p
JOIN 25a_role_prava rp ON p.id = rp.pravo_id
JOIN 25a_role_uzivatele ru ON rp.role_id = ru.role_id
WHERE ru.uzivatel_id = ? 
  AND p.kod IN ('CASH_BOOK_EDIT_OWN', 'CASH_BOOK_EDIT_ALL', 'CASH_BOOK_MANAGE')
  AND ru.aktivni = 1
  AND rp.aktivni = 1
```

---

## ✅ Správné chování - Workflow

### 1. Uzavřít měsíc

**Akce:** Kliknutí na "Uzavřít měsíc"  
**Status:** `aktivni` → `uzavrena_uzivatelem`  
**Oprávnění:**
- `CASH_BOOK_EDIT_OWN` → ✅ může uzavřít **vlastní** knihu
- `CASH_BOOK_EDIT_ALL` → ✅ může uzavřít **jakoukoli** knihu
- `CASH_BOOK_MANAGE` → ✅ může uzavřít **jakoukoli** knihu

---

### 2. Otevřít měsíc

**Akce:** Kliknutí na "🔓 Otevřít měsíc"  
**Status:** `uzavrena_uzivatelem` → `aktivni`  
**Oprávnění:**
- `CASH_BOOK_EDIT_OWN` → ✅ může otevřít **vlastní** uzavřenou knihu
- `CASH_BOOK_EDIT_ALL` → ✅ může otevřít **jakoukoli** uzavřenou knihu
- `CASH_BOOK_MANAGE` → ✅ může otevřít **jakoukoli** uzavřenou knihu

**⚠️ KLÍČOVÉ:** Uživatel s `EDIT_OWN` nebo `EDIT_ALL` MUSÍ mít možnost otevřít uzavřený měsíc!

---

### 3. Zamknout měsíc (admin)

**Akce:** Kliknutí na "🔒 Zamknout"  
**Status:** `aktivni` → `zamknuta_spravcem`  
**Oprávnění:** `CASH_BOOK_MANAGE` (pouze admin)

---

### 4. Odemknout zamčený měsíc (admin)

**Akce:** Kliknutí na "🔓 Odemknout (Admin)"  
**Status:** `zamknuta_spravcem` → `aktivni`  
**Oprávnění:** `CASH_BOOK_MANAGE` (pouze admin)

**⚠️ DŮLEŽITÉ:** Běžný uživatel NEMŮŽE odemknout měsíc zamčený správcem!

---

## 📋 Backend API požadavky

### Endpoint: `/cashbook/reopen-book`

**Metoda:** POST

**Request Body:**
```json
{
  "book_id": 123
}
```

---

### ✅ Správná logika oprávnění (PHP)

```php
// Získat stav knihy z DB
$book = DB::query("
    SELECT stav_knihy, pokladna_id 
    FROM 25a_pokladni_knihy 
    WHERE id = ?
", [$book_id])->fetch();

if (!$book) {
    return ['status' => 'error', 'message' => 'Kniha nenalezena'];
}

$bookStatus = $book['stav_knihy'];
$pokladna_id = $book['pokladna_id'];

// Získat přiřazení uživatele k pokladně
$assignment = DB::query("
    SELECT id, uzivatel_id, je_hlavni
    FROM 25a_pokladny_uzivatele
    WHERE pokladna_id = ? AND uzivatel_id = ? AND aktivni = 1
", [$pokladna_id, $uzivatel_id])->fetch();

$isOwnCashbox = ($assignment && $assignment['uzivatel_id'] == $uzivatel_id);

// KONTROLA OPRÁVNĚNÍ podle stavu knihy
if ($bookStatus === 'zamknuta_spravcem') {
    // ❌ Zamčená správcem - jen admin může odemknout
    if (!hasPermission('CASH_BOOK_MANAGE')) {
        return [
            'status' => 'error', 
            'message' => 'Kniha je zamčená správcem. Kontaktujte administrátora.'
        ];
    }
    
} elseif ($bookStatus === 'uzavrena_uzivatelem') {
    // ✅ Uzavřená uživatelem - může otevřít:
    // 1. Admin s CASH_BOOK_MANAGE (vše)
    // 2. Uživatel s CASH_BOOK_EDIT_ALL (jakoukoli knihu)
    // 3. Uživatel s CASH_BOOK_EDIT_OWN (pouze vlastní knihu)
    
    $canReopen = false;
    
    if (hasPermission('CASH_BOOK_MANAGE')) {
        $canReopen = true; // Admin může vždy otevřít jakoukoli knihu
    } elseif (hasPermission('CASH_BOOK_EDIT_ALL')) {
        $canReopen = true; // EDIT_ALL může otevřít jakoukoli knihu
    } elseif (hasPermission('CASH_BOOK_EDIT_OWN') && $isOwnCashbox) {
        $canReopen = true; // EDIT_OWN může otevřít pouze vlastní knihu
    }
    
    if (!$canReopen) {
        return [
            'status' => 'error',
            'message' => 'Nemáte oprávnění otevřít tento měsíc'
        ];
    }
    
} else {
    // Neplatný stav pro odemykání
    return [
        'status' => 'error',
        'message' => 'Kniha není uzavřená nebo zamčená'
    ];
}

// Otevřít knihu (změnit stav na aktivní)
DB::query("
    UPDATE 25a_pokladni_knihy 
    SET stav_knihy = 'aktivni'
    WHERE id = ?
", [$book_id]);

return [
    'status' => 'ok',
    'message' => 'Kniha byla otevřena',
    'data' => [
        'book_id' => $book_id,
        'stav_knihy' => 'aktivni'
    ]
];
```

---

## 📊 Matice oprávnění - reopen-book endpoint

| Stav knihy | Uživatel | Oprávnění | Výsledek |
|------------|----------|-----------|----------|
| `uzavrena_uzivatelem` | Vlastník | `EDIT_OWN` | ✅ Může otevřít |
| `uzavrena_uzivatelem` | Cizí uživatel | `EDIT_OWN` | ❌ Nemá oprávnění |
| `uzavrena_uzivatelem` | Admin | `MANAGE` | ✅ Může otevřít |
| `zamknuta_spravcem` | Vlastník | `EDIT_OWN` | ❌ Zamčeno správcem |
| `zamknuta_spravcem` | Admin | `MANAGE` | ✅ Může odemknout |
| `aktivni` | Kdokoli | Jakékoli | ❌ Není uzavřená |

---

## 🔍 Testovací scénáře

### Test 1: Běžný uživatel - vlastní uzavřený měsíc

**Setup:**
- Uživatel: ID 100, oprávnění `CASH_BOOK_EDIT_OWN`
- Pokladna: ID 102, `cislo_pokladny` = 1
- Přiřazení: `uzivatel_id = 100`, `pokladna_id = 102`, `je_hlavni = 1`
- Kniha: `book_id = 456`, `stav_knihy = 'uzavrena_uzivatelem'`, `pokladna_id = 102`

**Request:**
```json
POST /cashbook/reopen-book
{
  "book_id": 456
}
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Kniha byla otevřena",
  "data": {
    "book_id": 456,
    "stav_knihy": "aktivni"
  }
}
```

**DB Check:**
```sql
SELECT stav_knihy FROM 25a_pokladni_knihy WHERE id = 456;
-- Expected: 'aktivni'
```

---

### Test 2: Uživatel EDIT_ALL - cizí uzavřený měsíc

**Setup:**
- Uživatel: ID 100, oprávnění `CASH_BOOK_EDIT_ALL`
- Pokladna: ID 103, `cislo_pokladny` = 2 (CIZÍ!)
- Přiřazení: `uzivatel_id = 200` (NE 100!)
- Kniha: `book_id = 457`, `stav_knihy = 'uzavrena_uzivatelem'`, `pokladna_id = 103`

**Request:**
```json
POST /cashbook/reopen-book
{
  "book_id": 457
}
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Kniha byla otevřena",
  "data": {
    "book_id": 457,
    "stav_knihy": "aktivni"
  }
}
```

**DB Check:**
```sql
SELECT stav_knihy FROM 25a_pokladni_knihy WHERE id = 457;
-- Expected: 'aktivni' (✅ EDIT_ALL může otevřít jakoukoli knihu!)
```

---

### Test 3: Uživatel EDIT_OWN - cizí uzavřený měsíc (ERROR)

**Setup:**
- Uživatel: ID 100, oprávnění `CASH_BOOK_EDIT_OWN` (bez EDIT_ALL!)
- Pokladna: ID 103, `cislo_pokladny` = 2 (CIZÍ!)
- Přiřazení: `uzivatel_id = 200` (NE 100!)
- Kniha: `book_id = 458`, `stav_knihy = 'uzavrena_uzivatelem'`, `pokladna_id = 103`

**Request:**
```json
POST /cashbook/reopen-book
{
  "book_id": 458
}
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Nemáte oprávnění otevřít tento měsíc"
}
```

**DB Check:**
```sql
SELECT stav_knihy FROM 25a_pokladni_knihy WHERE id = 458;
-- Expected: 'uzavrena_uzivatelem' (beze změny, ❌ EDIT_OWN nemůže otevřít cizí knihu)
```

---

### Test 4: Běžný uživatel - pokus o odemknutí zamčeného měsíce (ERROR)

**Setup:**
- Uživatel: ID 100, oprávnění `CASH_BOOK_EDIT_OWN` nebo `CASH_BOOK_EDIT_ALL`
- Pokladna: ID 102, `cislo_pokladny` = 1
- Kniha: `book_id = 459`, `stav_knihy = 'zamknuta_spravcem'`, `pokladna_id = 102`

**Request:**
```json
POST /cashbook/reopen-book
{
  "book_id": 459
}
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Kniha je zamčená správcem. Kontaktujte administrátora."
}
```

**DB Check:**
```sql
SELECT stav_knihy FROM 25a_pokladni_knihy WHERE id = 459;
-- Expected: 'zamknuta_spravcem' (beze změny, ❌ běžný uživatel nemůže odemknout zamčenou knihu)
```

---

### Test 5: Admin (MANAGE) - odemknutí zamčeného měsíce

**Setup:**
- Uživatel: ID 1, oprávnění `CASH_BOOK_MANAGE`
- Kniha: `book_id = 459`, `stav_knihy = 'zamknuta_spravcem'`

**Request:**
```json
POST /cashbook/reopen-book
{
  "book_id": 459
}
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Kniha byla otevřena",
  "data": {
    "book_id": 459,
    "stav_knihy": "aktivni"
  }
}
```

---

## 🎯 Klíčové body pro BE

1. ✅ **Uzavřená uživatelem** (`uzavrena_uzivatelem`):
   - `CASH_BOOK_MANAGE` → ✅ může otevřít **jakoukoli** knihu
   - `CASH_BOOK_EDIT_ALL` → ✅ může otevřít **jakoukoli** knihu
   - `CASH_BOOK_EDIT_OWN` + vlastní kniha → ✅ může otevřít **pouze vlastní** knihu
   - `CASH_BOOK_EDIT_OWN` + cizí kniha → ❌ nemá oprávnění

2. ✅ **Zamčená správcem** (`zamknuta_spravcem`):
   - `CASH_BOOK_MANAGE` → ✅ může odemknout
   - `CASH_BOOK_EDIT_ALL` → ❌ nemá oprávnění (pouze admin!)
   - `CASH_BOOK_EDIT_OWN` → ❌ nemá oprávnění (pouze admin!)

3. ✅ **Kontrola vlastnictví:**
   ```sql
   SELECT uzivatel_id 
   FROM 25a_pokladny_uzivatele 
   WHERE pokladna_id = ? AND uzivatel_id = ? AND aktivni = 1
   ```

4. ✅ **Frontend očekává:**
   - Pro `uzavrena_uzivatelem`:
     - `EDIT_OWN` → může otevřít **vlastní** knihu (tlačítko "Otevřít měsíc")
     - `EDIT_ALL` → může otevřít **jakoukoli** knihu (tlačítko "Otevřít měsíc")
     - `MANAGE` → může otevřít **jakoukoli** knihu (tlačítko "Otevřít měsíc")
   - Pro `zamknuta_spravcem`:
     - `MANAGE` → může odemknout (tlačítko "Odemknout (Admin)")
     - `EDIT_ALL` a `EDIT_OWN` → ❌ nemají oprávnění

---

## 📝 Změny v DB struktuře (ŽÁDNÉ)

Není třeba měnit strukturu DB. Stačí opravit logiku v backendu podle matice oprávnění výše.

---

## ✅ Checklist pro BE implementaci

- [ ] Upravit `/cashbook/reopen-book` endpoint
- [ ] Přidat kontrolu tří oprávnění: `CASH_BOOK_EDIT_OWN`, `CASH_BOOK_EDIT_ALL`, `CASH_BOOK_MANAGE`
- [ ] Pro `uzavrena_uzivatelem`:
  - [ ] `MANAGE` → ✅ povolit vše
  - [ ] `EDIT_ALL` → ✅ povolit jakoukoli knihu
  - [ ] `EDIT_OWN` → ✅ povolit pouze vlastní knihu
- [ ] Pro `zamknuta_spravcem`:
  - [ ] `MANAGE` → ✅ povolit odemknutí
  - [ ] `EDIT_ALL` a `EDIT_OWN` → ❌ blokovat
- [ ] Otestovat všech 5 scénářů výše
- [ ] Nasadit na produkci

---

## 🆘 Kontakt

Pokud máte dotazy k implementaci, kontaktujte frontend team.

**Status:** ⚠️ Čeká na BE implementaci
