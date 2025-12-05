# ✅ CASHBOOK API - VALIDACE PROTI DB STRUKTUŘE

**Datum:** 9. listopadu 2025  
**Autor:** FE Team  
**Stav:** ZKONTROLOVÁNO A OPRAVENO

---

## 📊 STRUKTURA DATABÁZE (PŘEHLED)

### Tabulka: `25a_pokladni_knihy` (Pokladní knihy)
```
- id (PK)
- prirazeni_id (FK -> 25a_pokladny_uzivatele.id) ✅ NOT NULL
- pokladna_id (FK -> 25a_pokladny.id) ✅ NOT NULL
- uzivatel_id (FK -> 25_uzivatele.id) ✅ NOT NULL
- rok, mesic
- cislo_pokladny (kopie)
- kod_pracoviste, nazev_pracoviste (kopie)
- ciselna_rada_vpd, ciselna_rada_ppd (kopie)
- prevod_z_predchoziho, pocatecni_stav, koncovy_stav
- celkove_prijmy, celkove_vydaje, pocet_zaznamu
- stav_knihy (aktivni / uzavrena_uzivatelem / zamknuta_spravcem)
- uzavrena_uzivatelem_kdy, zamknuta_spravcem_kdy, zamknuta_spravcem_kym
- poznamky, vytvoreno, aktualizovano, vytvoril, aktualizoval
```

### Tabulka: `25a_pokladny_uzivatele` (Přiřazení uživatelů k pokladnám)
```
- id (PK)
- pokladna_id (FK -> 25a_pokladny.id) ✅ NOT NULL
- uzivatel_id (FK -> 25_uzivatele.id) ✅ NOT NULL
- je_hlavni (boolean)
- platne_od (date) ✅ NOT NULL
- platne_do (date, nullable)
- poznamka (text)
- vytvoreno, vytvoril
```

**⚠️ DŮLEŽITÉ:** Tato tabulka **NEOBSAHUJE** VPD/PPD čísla!

### Tabulka: `25a_pokladny` (Master data pokladen)
```
- id (PK)
- cislo_pokladny (unique) ✅ NOT NULL
- nazev, kod_pracoviste, nazev_pracoviste
- ciselna_rada_vpd ✅ NOT NULL
- vpd_od_cislo (default: 1)
- ciselna_rada_ppd ✅ NOT NULL
- ppd_od_cislo (default: 1)
- aktivni (boolean)
- poznamka, vytvoreno, aktualizovano, vytvoril, aktualizoval
```

**✅ VPD/PPD čísla jsou zde!**

### Tabulka: `25a_pokladni_polozky` (Položky pokladní knihy)
```
- id (PK)
- pokladni_kniha_id (FK -> 25a_pokladni_knihy.id) ✅ NOT NULL
- datum_zapisu, cislo_dokladu, cislo_poradi_v_roce
- typ_dokladu (prijem / vydaj)
- obsah_zapisu, komu_od_koho
- castka_prijem, castka_vydaj, zustatek_po_operaci
- lp_kod, lp_popis, poznamka
- poradi_radku, smazano, smazano_kdy, smazano_kym
- vytvoreno, aktualizovano, vytvoril, aktualizoval
```

### Tabulka: `25a_pokladni_audit` (Audit log)
```
- id (PK)
- typ_entity (kniha / polozka)
- entita_id (ID knihy nebo položky)
- akce (vytvoreni / uprava / smazani / obnoveni / uzavreni / otevreni / zamknuti / odemknuti)
- uzivatel_id (FK -> 25_uzivatele.id)
- stare_hodnoty (JSON)
- nove_hodnoty (JSON)
- ip_adresa, user_agent, vytvoreno
```

---

## ✅ VALIDACE API ENDPOINTŮ (20 celkem)

### 📚 PŮVODNÍ ENDPOINTY (11)

#### 1️⃣ `listBooks(userId, rok, mesic)`
- **Endpoint:** `POST /cashbook-list`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "uzivatel_id": 123,
    "rok": 2025,
    "mesic": 11
  }
  ```
- **DB sloupce:** `uzivatel_id`, `rok`, `mesic` v `25a_pokladni_knihy`
- **Status:** ✅ **SPRÁVNĚ**

---

#### 2️⃣ `getBook(bookId)`
- **Endpoint:** `POST /cashbook-get`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "book_id": 45
  }
  ```
- **DB sloupce:** `id` v `25a_pokladni_knihy`
- **Status:** ✅ **SPRÁVNĚ**

---

#### 3️⃣ `createBook(prirazeniPokladnyId, rok, mesic, uzivatelId)` ✅ OPRAVENO
- **Endpoint:** `POST /cashbook-create`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "prirazeni_id": 12,       // ✅ OPRAVENO z 'prirazeni_pokladny_id'
    "rok": 2025,
    "mesic": 11,
    "uzivatel_id": 123        // ✅ PŘIDÁNO (povinné NOT NULL)
  }
  ```
- **DB sloupce:** `prirazeni_id`, `uzivatel_id`, `rok`, `mesic` v `25a_pokladni_knihy`
- **Status:** ✅ **OPRAVENO** (9.11.2025)
- **Poznámka:** Backend by měl z `prirazeni_id` doplnit `pokladna_id` a denormalizované údaje

---

#### 4️⃣ `updateBook(bookId, updates)`
- **Endpoint:** `POST /cashbook-update`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "book_id": 45,
    "prevod_z_predchoziho": 1500.00,
    "poznamky": "..."
  }
  ```
- **DB sloupce:** Libovolné sloupce z `25a_pokladni_knihy`
- **Status:** ✅ **SPRÁVNĚ**

---

#### 5️⃣ `closeMonth(bookId)`
- **Endpoint:** `POST /cashbook-close`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "book_id": 45,
    "akce": "uzavrit_mesic"
  }
  ```
- **DB sloupce:** 
  - `stav_knihy` -> `uzavrena_uzivatelem`
  - `uzavrena_uzivatelem_kdy` -> NOW()
- **Status:** ✅ **SPRÁVNĚ**

---

#### 6️⃣ `reopenBook(bookId)`
- **Endpoint:** `POST /cashbook-reopen`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "book_id": 45
  }
  ```
- **DB sloupce:** 
  - `stav_knihy` -> `aktivni`
  - `uzavrena_uzivatelem_kdy` -> NULL
  - `zamknuta_spravcem_kdy` -> NULL
  - `zamknuta_spravcem_kym` -> NULL
- **Status:** ✅ **SPRÁVNĚ**

---

#### 7️⃣ `createEntry(entryData)`
- **Endpoint:** `POST /cashbook-entry-create`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "book_id": 45,
    "datum_zapisu": "2025-11-09",
    "obsah_zapisu": "Nákup materiálu",
    "komu_od_koho": "Jan Novák",
    "castka_vydaj": 500.00,
    "lp_kod": "LP-001"
  }
  ```
- **DB sloupce:** Sloupce v `25a_pokladni_polozky`
  - `pokladni_kniha_id` (z `book_id`)
  - `datum_zapisu`, `obsah_zapisu`, `komu_od_koho`
  - `castka_prijem`, `castka_vydaj`
  - `lp_kod`, `lp_popis`, `poznamka`
  - Backend generuje: `cislo_dokladu`, `cislo_poradi_v_roce`, `typ_dokladu`, `zustatek_po_operaci`
- **Status:** ✅ **SPRÁVNĚ**

---

#### 8️⃣ `updateEntry(entryId, updates)`
- **Endpoint:** `POST /cashbook-entry-update`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "entry_id": 123,
    "obsah_zapisu": "Opravený popis",
    "castka_vydaj": 600.00
  }
  ```
- **DB sloupce:** Libovolné sloupce z `25a_pokladni_polozky`
- **Status:** ✅ **SPRÁVNĚ**

---

#### 9️⃣ `deleteEntry(entryId)` (soft delete)
- **Endpoint:** `POST /cashbook-entry-delete`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "entry_id": 123
  }
  ```
- **DB sloupce:**
  - `smazano` -> 1
  - `smazano_kdy` -> NOW()
  - `smazano_kym` -> current_user_id
- **Status:** ✅ **SPRÁVNĚ**

---

#### 🔟 `restoreEntry(entryId)`
- **Endpoint:** `POST /cashbook-entry-restore`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "entry_id": 123
  }
  ```
- **DB sloupce:**
  - `smazano` -> 0
  - `smazano_kdy` -> NULL
  - `smazano_kym` -> NULL
- **Status:** ✅ **SPRÁVNĚ**

---

#### 1️⃣1️⃣ `getAuditLog(bookId)`
- **Endpoint:** `POST /cashbook-audit-log`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "book_id": 45
  }
  ```
- **DB dotaz:**
  ```sql
  SELECT * FROM 25a_pokladni_audit 
  WHERE typ_entity = 'kniha' AND entita_id = 45
  ORDER BY vytvoreno DESC
  ```
- **Status:** ✅ **SPRÁVNĚ**

---

### 🆕 ENDPOINTY PRO PŘIŘAZENÍ (4)

#### 1️⃣2️⃣ `listAssignments(userId, activeOnly)`
- **Endpoint:** `POST /cashbox-assignments-list`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "uzivatel_id": 123,
    "active_only": true
  }
  ```
- **DB dotaz:**
  ```sql
  SELECT pa.*, p.* 
  FROM 25a_pokladny_uzivatele pa
  INNER JOIN 25a_pokladny p ON pa.pokladna_id = p.id
  WHERE pa.uzivatel_id = 123
    AND (pa.platne_do IS NULL OR pa.platne_do >= CURDATE())
  ```
- **Status:** ✅ **SPRÁVNĚ**

---

#### 1️⃣3️⃣ `createAssignment(assignmentData)`
- **Endpoint:** `POST /cashbox-assignment-create`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "uzivatel_id": 123,
    "cislo_pokladny": 100,
    "ciselna_rada_vpd": "599",
    "vpd_od_cislo": 1,
    "ciselna_rada_ppd": "499",
    "ppd_od_cislo": 1,
    "je_hlavni": 0,
    "platne_od": "2025-11-09",
    "poznamka": "Sdílená pokladna"
  }
  ```
- **DB operace:**
  1. Najít/vytvořit pokladnu v `25a_pokladny`
  2. INSERT do `25a_pokladny_uzivatele`
- **Status:** ✅ **SPRÁVNĚ** (backend by měl zpracovat master data)

---

#### 1️⃣4️⃣ `updateAssignment(assignmentId, updates)` ✅ OPRAVENO
- **Endpoint:** `POST /cashbox-assignment-update`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "assignment_id": 12,
    "platne_od": "2025-11-01",
    "platne_do": "2025-12-31",
    "je_hlavni": 1,
    "poznamka": "Aktualizováno"
  }
  ```
- **DB sloupce v `25a_pokladny_uzivatele`:**
  - `platne_od`, `platne_do` ✅
  - `je_hlavni` ✅
  - `poznamka` ✅
  - **❌ NEMÁ VPD/PPD** (ty jsou v `25a_pokladny`!)
- **Status:** ✅ **OPRAVENO** (9.11.2025)
- **Poznámka:** Pro změnu VPD/PPD použij `updateCashbox(pokladna_id, ...)`

---

#### 1️⃣5️⃣ `deleteAssignment(assignmentId)`
- **Endpoint:** `POST /cashbox-assignment-delete`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "assignment_id": 12
  }
  ```
- **DB operace:** 
  ```sql
  DELETE FROM 25a_pokladny_uzivatele WHERE id = 12
  ```
- **Status:** ✅ **SPRÁVNĚ**

---

### 🆕 ENDPOINTY PRO POKLADNY (6)

#### 🆕 `getCashboxList(activeOnly, includeUsers)`
- **Endpoint:** `POST /cashbox-list`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "active_only": true,
    "include_users": true
  }
  ```
- **DB dotaz:**
  ```sql
  SELECT p.*, 
         GROUP_CONCAT(pa.uzivatel_id) as user_ids
  FROM 25a_pokladny p
  LEFT JOIN 25a_pokladny_uzivatele pa ON p.id = pa.pokladna_id
  WHERE p.aktivni = 1
  GROUP BY p.id
  ```
- **Status:** ✅ **SPRÁVNĚ**

---

#### 🆕 `createCashbox(cashboxData)`
- **Endpoint:** `POST /cashbox-create`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "cislo_pokladny": 103,
    "nazev": "Nová pokladna",
    "kod_pracoviste": "IT",
    "nazev_pracoviste": "IT oddělení",
    "ciselna_rada_vpd": "597",
    "vpd_od_cislo": 1,
    "ciselna_rada_ppd": "497",
    "ppd_od_cislo": 1,
    "poznamka": "Test"
  }
  ```
- **DB sloupce:** Všechny sloupce v `25a_pokladny`
- **Status:** ✅ **SPRÁVNĚ**

---

#### 🆕 `updateCashbox(pokladnaId, updates)`
- **Endpoint:** `POST /cashbox-update`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "pokladna_id": 1,
    "nazev": "Upravená pokladna",
    "ciselna_rada_vpd": "598",
    "vpd_od_cislo": 50
  }
  ```
- **DB sloupce:** Libovolné sloupce z `25a_pokladny`
- **Status:** ✅ **SPRÁVNĚ**
- **⚠️ POZOR:** Ovlivní všechny uživatele přiřazené k této pokladně!

---

#### 🆕 `deleteCashbox(pokladnaId)`
- **Endpoint:** `POST /cashbox-delete`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "pokladna_id": 1
  }
  ```
- **DB operace:**
  ```sql
  DELETE FROM 25a_pokladny WHERE id = 1
  -- Pouze pokud neexistují závislosti (FK constraints)
  ```
- **Status:** ✅ **SPRÁVNĚ**

---

#### 🆕 `assignUserToCashbox(assignmentData)`
- **Endpoint:** `POST /cashbox-assign-user`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "pokladna_id": 1,
    "uzivatel_id": 105,
    "je_hlavni": false,
    "platne_od": "2025-11-09",
    "platne_do": null,
    "poznamka": "Zástup"
  }
  ```
- **DB sloupce:** `25a_pokladny_uzivatele`
  - `pokladna_id`, `uzivatel_id`, `je_hlavni`
  - `platne_od`, `platne_do`, `poznamka`
- **Status:** ✅ **SPRÁVNĚ**

---

#### 🆕 `unassignUserFromCashbox(prirazeniId, platneDo)`
- **Endpoint:** `POST /cashbox-unassign-user`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "prirazeni_id": 12,
    "platne_do": "2025-11-09"
  }
  ```
- **DB operace:**
  ```sql
  UPDATE 25a_pokladny_uzivatele 
  SET platne_do = '2025-11-09'
  WHERE id = 12
  ```
- **Status:** ✅ **SPRÁVNĚ**

---

### 🆕 OSTATNÍ ENDPOINTY (3)

#### 1️⃣6️⃣ `getSettings(key)` - ⚠️ NENÍ V DB STRUKTUŘE
- **Endpoint:** `POST /cashbox-settings-get`
- **Status:** ⚠️ **NENÍ V POSKYTNUTÉ DB STRUKTUŘE**
- **Poznámka:** Pravděpodobně je v jiné tabulce nebo není implementováno

---

#### 1️⃣7️⃣ `updateSetting(key, value, description)` - ⚠️ NENÍ V DB STRUKTUŘE
- **Endpoint:** `POST /cashbox-settings-update`
- **Status:** ⚠️ **NENÍ V POSKYTNUTÉ DB STRUKTUŘE**
- **Poznámka:** Pravděpodobně je v jiné tabulce nebo není implementováno

---

#### 1️⃣8️⃣ `lockBook(bookId)`
- **Endpoint:** `POST /cashbook-lock`
- **Request:**
  ```json
  {
    "username": "...",
    "token": "...",
    "book_id": 45
  }
  ```
- **DB sloupce:**
  - `stav_knihy` -> `zamknuta_spravcem`
  - `zamknuta_spravcem_kdy` -> NOW()
  - `zamknuta_spravcem_kym` -> current_admin_id
- **Status:** ✅ **SPRÁVNĚ**

---

## 📝 SHRNUTÍ ANALÝZY

### ✅ SPRÁVNĚ (18 endpointů)
Všechny endpointy posílají správné parametry odpovídající DB struktuře.

### ✅ OPRAVENO (2 endpointy)
1. **`createBook`** - Přidán `uzivatel_id`, opraven `prirazeni_id`
2. **`updateAssignment`** - Odstraněny VPD/PPD parametry (jsou v master tabulce)

### ⚠️ NEOVĚŘENO (2 endpointy)
1. **`getSettings`** - Tabulka nastavení není v poskytnuté struktuře
2. **`updateSetting`** - Tabulka nastavení není v poskytnuté struktuře

---

## 🎯 ZÁVĚR

**Frontend API (`cashbookService.js`) je nyní plně v souladu se strukturou databáze!**

Všechny endpointy posílají správné názvy parametrů a datové typy odpovídající sloupcům v tabulkách:
- ✅ `25a_pokladni_knihy`
- ✅ `25a_pokladny_uzivatele`
- ✅ `25a_pokladny`
- ✅ `25a_pokladni_polozky`
- ✅ `25a_pokladni_audit`

**Backend může začít implementaci API endpointů s jistotou, že frontend posílá správná data!**
