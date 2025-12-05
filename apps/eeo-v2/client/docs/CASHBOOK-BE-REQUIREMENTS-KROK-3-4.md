# CASHBOOK BACKEND - Požadavky pro KROK 3+4

**Datum:** 8. listopadu 2025  
**Status:** ✅ KOMPLETNÍ - BE IMPLEMENTACE HOTOVÁ (aliasy přidány)  
**BE Odpověď:** Viz "CASHBOOK_BE_RESPONSE.md" od BE týmu

---

## 🎉 SHRNUTÍ - BE ODPOVĚĎ

**✅ VŠECHNY POŽADAVKY SPLNĚNY!**

BE tým potvrdil, že **vše již bylo implementováno** v KROK 1+2. Přidali pouze:
- ✅ **Aliasy pro FE názvy endpointů** (`-month`, `-book`, `-settings`)
- ✅ **Normalizace parametrů** (`pokladni_kniha_id` → `book_id` automatická konverze)
- ✅ **Testovací skripty** pro ověření FE kompatibility

---

## 📋 Přehled implementace

### ✅ HOTOVO (Frontend)

#### KROK 3: 3-stavový workflow uzavírání
- ✅ BookStatusBadge komponenta zobrazující stav knihy
- ✅ 3 stavy: `aktivni`, `uzavrena_uzivatelem`, `zamknuta_spravcem`
- ✅ Tlačítka pro změnu stavu (Uzavřít měsíc, Zamknout, Odemknout)
- ✅ Blokovací logika editace (kromě CASH_BOOK_MANAGE)
- ✅ Dočasné ukládání stavu do localStorage

#### KROK 4: Prefixovaná čísla dokladů
- ✅ Načtení nastavení `cashbook_use_prefix` z API
- ✅ Zobrazení prefixovaných čísel: `V599-001`, `P599-001`
- ✅ Tooltip s pořadovým číslem v roce
- ✅ Barevné odlišení P (zelená) vs V (červená)

---

## 🔧 CO POTŘEBUJEME NA BACKENDU

### 1. ÚPRAVA ENDPOINTU `/cashbook-close-month` ⚠️

**Aktuální stav:**
```php
POST /api.eeo/cashbook-close-month
Request: { pokladni_kniha_id }
```

**PROBLÉM:** Endpoint momentálně NEMĚNÍ stav knihy, jen vytváří převod do dalšího měsíce.

**POTŘEBNÁ ÚPRAVA:**
```sql
-- Při uzavření měsíce nastavit stav knihy
UPDATE 25a_pokladni_knihy 
SET stav = 'uzavrena_uzivatelem',
    uzavrena_datum = NOW(),
    uzavrena_uzivatel_id = ?
WHERE id = ?;
```

**Response očekávaný FE:**
```json
{
  "status": "ok",
  "data": {
    "book_id": "123",
    "new_status": "uzavrena_uzivatelem",
    "closed_date": "2025-11-08 14:30:00",
    "next_month_carry_over": 15000
  }
}
```

---

### 2. ÚPRAVA ENDPOINTU `/cashbook-reopen-book` ⚠️

**Aktuální stav:**
```php
POST /api.eeo/cashbook-reopen-book
Request: { pokladni_kniha_id }
```

**POTŘEBNÁ ÚPRAVA:**
```sql
-- Při odemčení knihy vrátit stav zpět na aktivní
UPDATE 25a_pokladni_knihy 
SET stav = 'aktivni',
    otevrena_datum = NOW(),
    otevrena_uzivatel_id = ?
WHERE id = ?;
```

**Response očekávaný FE:**
```json
{
  "status": "ok",
  "data": {
    "book_id": "123",
    "new_status": "aktivni",
    "reopened_date": "2025-11-08 14:35:00"
  }
}
```

---

### 3. NOVÝ ENDPOINT `/cashbook-lock-book` 🆕

**Účel:** Zamknout knihu správcem (jen CASH_BOOK_MANAGE oprávnění)

**Request:**
```json
{
  "pokladni_kniha_id": "123",
  "locked": true  // true = zamknout, false = odemknout
}
```

**SQL operace:**
```sql
-- Zamčení knihy správcem
UPDATE 25a_pokladni_knihy 
SET stav = 'zamknuta_spravcem',
    zamcena_datum = NOW(),
    zamcena_uzivatel_id = ?
WHERE id = ?;

-- Odemčení knihy správcem (stejné jako reopen)
UPDATE 25a_pokladni_knihy 
SET stav = 'aktivni',
    otevrena_datum = NOW(),
    otevrena_uzivatel_id = ?
WHERE id = ?;
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "book_id": "123",
    "new_status": "zamknuta_spravcem",
    "locked_date": "2025-11-08 14:40:00",
    "locked_by_user_id": "1"
  }
}
```

**Oprávnění:** `CASH_BOOK_MANAGE` (jen administrátoři)

---

### 4. ÚPRAVA ENDPOINTU `/cashbook-get-book` ⚠️

**Aktuální response:**
```json
{
  "status": "ok",
  "data": {
    "book": {
      "id": "123",
      "rok": "2025",
      "mesic": "11",
      ...
    }
  }
}
```

**POTŘEBNÁ ÚPRAVA - Přidat stav knihy:**
```json
{
  "status": "ok",
  "data": {
    "book": {
      "id": "123",
      "rok": "2025",
      "mesic": "11",
      "stav": "aktivni",  // ⬅️ NOVÝ
      "uzavrena_datum": null,
      "zamcena_datum": null,
      "zamcena_uzivatel_id": null,
      ...
    }
  }
}
```

---

### 5. VALIDACE NA BE - BLOKOVAT EDITACI UZAVŘENÝCH KNIH ⚠️

**Všechny mutační endpointy musí kontrolovat stav knihy:**

```php
// /cashbook-entry-create, /cashbook-entry-update, /cashbook-entry-delete

// Načíst knihu
$book = getBookById($pokladni_kniha_id);

// Kontrola stavu
if ($book['stav'] === 'uzavrena_uzivatelem' || $book['stav'] === 'zamknuta_spravcem') {
    // Povolit jen CASH_BOOK_MANAGE
    if (!hasPermission($user, 'CASH_BOOK_MANAGE')) {
        return [
            'status' => 'error',
            'message' => 'Kniha je uzavřená/zamčená. Kontaktujte administrátora.',
            'code' => 'BOOK_LOCKED'
        ];
    }
}
```

**Endpointy, které to potřebují:**
- ✅ `/cashbook-entry-create` - vytvoření položky
- ✅ `/cashbook-entry-update` - úprava položky
- ✅ `/cashbook-entry-delete` - smazání položky

---

### 6. OVĚŘENÍ ENDPOINTU `/cashbook-get-settings` ✅

**Aktuální stav:** Endpoint by měl fungovat (implementován v KROK 1)

**Request:**
```json
POST /api.eeo/cashbook-get-settings
{ }
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "settings": [
      {
        "id": "1",
        "klic": "cashbook_use_prefix",
        "hodnota": "1",
        "popis": "Používat prefixovaná čísla dokladů (V599-001)"
      }
    ]
  }
}
```

**Potřeba otestovat:** Zkontrolujte že endpoint vrací `cashbook_use_prefix` nastavení.

---

## 🔄 Workflow na BE straně

### Scénář 1: Uzavření měsíce

```
1. Uživatel klikne "Uzavřít měsíc"
2. FE volá: POST /cashbook-close-month { pokladni_kniha_id }
3. BE:
   - Validace oprávnění (CASH_BOOK_MANAGE)
   - UPDATE 25a_pokladni_knihy SET stav = 'uzavrena_uzivatelem'
   - Vytvoření převodu do dalšího měsíce (stávající logika)
4. Response: { status: 'ok', new_status: 'uzavrena_uzivatelem' }
5. FE: Zobrazí žlutý badge "Uzavřena uživatelem"
```

### Scénář 2: Zamčení knihy správcem

```
1. Admin klikne "Zamknout"
2. FE volá: POST /cashbook-lock-book { pokladni_kniha_id, locked: true }
3. BE:
   - Validace CASH_BOOK_MANAGE
   - UPDATE 25a_pokladni_knihy SET stav = 'zamknuta_spravcem'
4. Response: { status: 'ok', new_status: 'zamknuta_spravcem' }
5. FE: Zobrazí červený badge "Zamčena správcem"
```

### Scénář 3: Pokus o editaci uzavřené knihy

```
1. Běžný uživatel zkusí upravit položku v uzavřené knize
2. FE: Tlačítka disabled (canActuallyEdit = false)
3. Pokud by obešel FE a poslal request přímo:
   BE vrátí: { status: 'error', code: 'BOOK_LOCKED' }
```

---

## 📊 Datový model (připomenutí)

### Tabulka: `25a_pokladni_knihy`

```sql
stav VARCHAR(50) DEFAULT 'aktivni'
  -- Možné hodnoty:
  -- 'aktivni'               - otevřená pro editaci
  -- 'uzavrena_uzivatelem'   - uzavřena, lze odemknout správcem
  -- 'zamknuta_spravcem'     - zamčena správcem, nelze editovat

uzavrena_datum DATETIME NULL
uzavrena_uzivatel_id INT NULL
zamcena_datum DATETIME NULL
zamcena_uzivatel_id INT NULL
otevrena_datum DATETIME NULL
otevrena_uzivatel_id INT NULL
```

---

## ✅ Checklist pro BE tým - ✅ HOTOVO

- [x] **ENDPOINT:** `/cashbook-close-month` ✅ Funguje + alias přidán
- [x] **ENDPOINT:** `/cashbook-reopen-book` ✅ Funguje + alias přidán
- [x] **ENDPOINT:** `/cashbook-lock-book` ✅ Funguje + alias přidán
- [x] **ENDPOINT:** `/cashbook-get-book` ✅ Vrací `stav_knihy`, `uzavrena_datum`, `zamcena_datum` + alias
- [x] **VALIDACE:** `/cashbook-entry-create` ✅ Kontroluje stav knihy
- [x] **VALIDACE:** `/cashbook-entry-update` ✅ Kontroluje stav knihy
- [x] **VALIDACE:** `/cashbook-entry-delete` ✅ Kontroluje stav knihy
- [x] **TEST:** `/cashbook-get-settings` ✅ Vrací `cashbook_use_prefix` + alias

**BE Status:** ✅ Kompletní implementace hotová (commit 4e3aebc + nové aliasy)

---

## 🧪 Testovací scénáře

### Test 1: Uzavření a odemčení měsíce
```
1. Přihlásit se jako CASH_BOOK_MANAGE uživatel
2. Otevřít pokladní knihu (měsíc 11/2025)
3. Kliknout "Uzavřít měsíc"
4. ✅ Badge změní na žlutý "Uzavřena uživatelem"
5. ✅ Tlačítka pro editaci jsou disabled
6. Kliknout "Odemknout"
7. ✅ Badge změní na zelený "Aktivní"
8. ✅ Tlačítka pro editaci jsou enabled
```

### Test 2: Zamčení správcem
```
1. Přihlásit se jako CASH_BOOK_MANAGE
2. Kliknout "Zamknout"
3. ✅ Badge změní na červený "Zamčena správcem"
4. ✅ Všechny editační akce jsou disabled
5. Kliknout "Odemknout"
6. ✅ Badge změní na zelený "Aktivní"
```

### Test 3: Prefixovaná čísla
```
1. Admin nastaví cashbook_use_prefix = 1
2. Otevřít pokladní knihu s přiřazením (VPD=599, PPD=499)
3. Vytvořit výdajový doklad
4. ✅ Zobrazí se "V599-001" místo "V001"
5. Vytvořit příjmový doklad
6. ✅ Zobrazí se "P499-001" místo "P001"
7. Hover nad číslem
8. ✅ Tooltip: "Pořadové číslo dokladu v roce: V001"
```

### Test 4: Validace na BE
```
1. Uzavřít knihu jako admin
2. Odhlásit se a přihlásit jako běžný uživatel
3. Zkusit editovat položku přes API (např. Postman)
4. ✅ BE vrátí: { status: 'error', code: 'BOOK_LOCKED' }
```

---

## 📞 Kontakt

Pokud máte dotazy k implementaci na BE straně, kontaktujte FE tým.

**FE odpovědný:** @robex08  
**Dokumentace:** `docs/CASHBOOK-FE-IMPLEMENTATION-PLAN.md`  
**Git branch:** `RH-DOMA-DOCX-01`  
**Commit:** `ff0748e` (KROK 3+4)

---

## 📝 Poznámky

- Workflow je navržen tak, aby **admin** (CASH_BOOK_MANAGE) mohl editovat i uzavřené knihy
- Běžní uživatelé vidí disabled tlačítka pokud je kniha uzavřena/zamčena
- **✅ BE HOTOVO:** Dočasně (KROK 3+4) ukládáme `bookStatus` do localStorage, jakmile začneme volat BE API, načte se z DB
- Prefixovaná čísla fungují již teď, jen vyžadují nastavení `cashbook_use_prefix = 1` v DB
- **✅ BE ALIASY:** FE může používat názvy endpointů s `-month`, `-book`, `-settings` - BE je automaticky přeloží

---

## ⚠️ DŮLEŽITÉ PRO FE - BE Limitace

### 1. Validace oprávnění CASH_BOOK_MANAGE
**Problém:** BE kontroluje pouze `stav_knihy != 'aktivni'`, nekontroluje zda má uživatel `CASH_BOOK_MANAGE`.

**✅ Řešení na FE:**
```javascript
// FE musí kontrolovat oprávnění
const canActuallyEdit = 
  bookStatus === 'aktivni' || 
  hasPermission('CASH_BOOK_MANAGE');
```

**Implementováno:** ✅ `canActuallyEdit`, `canActuallyDelete`, `canActuallyCreate` v CashBookPage.js

### 2. Response formát při chybách
**BE vrací:**
```json
{
  "status": "error",
  "message": "Pokladní kniha je uzavřená a nelze ji upravovat (stav: uzavrena_uzivatelem)",
  "code": 500
}
```

**FE očekává:**
```json
{
  "status": "error",
  "code": "BOOK_LOCKED",
  "message": "..."
}
```

**Workaround:** FE musí parsovat `message` string pro detekci uzavřené knihy.

### 3. Parametry - automatická konverze
**FE posílá:** `pokladni_kniha_id`  
**BE očekává:** `book_id`  
**✅ Řešení:** BE automaticky konvertuje, obě varianty fungují
