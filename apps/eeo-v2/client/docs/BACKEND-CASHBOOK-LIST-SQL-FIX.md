# 🔴 BACKEND SQL CHYBA - Endpoint `/cashbook-list`

**Datum:** 8. listopadu 2025  
**Priorita:** VYSOKÁ - Blokuje funkčnost pokladní knihy  
**Endpoint:** `POST /api.eeo/cashbook-list`

---

## 📋 Shrnutí problému

Endpoint `/cashbook-list` vrací **500 Internal Server Error** kvůli SQL chybám:

### Chyba 1: Missing column in ON clause
```
SQLSTATE[42S22]: Column not found: 1054 
Unknown column 'cb.prirazeni_pokladny_id' in 'on clause'
```
**Příčina:** Sloupec se jmenuje `prirazeni_id`, NE `prirazeni_pokladny_id`!

### Chyba 2: Missing column in field list
```
SQLSTATE[42S22]: Column not found: 1054 
Unknown column 'pa.cislo_pokladny' in 'field list'
```
**Příčina:** Tabulka `25a_pokladny_uzivatele` má sloupec `pokladna_id` (FK), nemá `cislo_pokladny`! Číslo pokladny je v tabulce `25a_pokladny` nebo už denormalizované v `25a_pokladni_knihy.cislo_pokladny`.

---

## 📊 Struktura databáze (AKTUÁLNÍ - SKUTEČNÁ)

### Tabulka: `25a_pokladni_knihy`

```sql
CREATE TABLE `25a_pokladni_knihy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `prirazeni_id` INT(11) NOT NULL,              -- ✅ FK na 25a_pokladny_uzivatele
  `pokladna_id` INT(11) NOT NULL,                -- ✅ FK na 25a_pokladny (denormalizace)
  `uzivatel_id` INT(10) NOT NULL,                -- ✅ FK na 25_uzivatele (majitel knihy)
  `rok` SMALLINT(4) NOT NULL,
  `mesic` TINYINT(2) NOT NULL,
  `cislo_pokladny` INT(11) NOT NULL,             -- ✅ Kopie z 25a_pokladny
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL,
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL,
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL,
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL,
  `prevod_z_predchoziho` DECIMAL(10,2) DEFAULT 0.00,
  `pocatecni_stav` DECIMAL(10,2) DEFAULT 0.00,
  `koncovy_stav` DECIMAL(10,2) DEFAULT 0.00,
  `celkove_prijmy` DECIMAL(10,2) DEFAULT 0.00,
  `celkove_vydaje` DECIMAL(10,2) DEFAULT 0.00,
  `pocet_zaznamu` INT(11) DEFAULT 0,
  `stav_knihy` ENUM('aktivni', 'uzavrena_uzivatelem', 'zamknuta_spravcem') DEFAULT 'aktivni',
  `uzavrena_uzivatelem_kdy` DATETIME DEFAULT NULL,
  `zamknuta_spravcem_kdy` DATETIME DEFAULT NULL,
  `zamknuta_spravcem_kym` INT(10) DEFAULT NULL,
  `poznamky` TEXT,
  `vytvoreno` DATETIME NOT NULL,
  `aktualizovano` DATETIME DEFAULT NULL,
  `vytvoril` INT(10) DEFAULT NULL,
  `aktualizoval` INT(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_uzivatel_pokladna_obdobi` (`uzivatel_id`, `pokladna_id`, `rok`, `mesic`),
  KEY `idx_prirazeni_id` (`prirazeni_id`),
  KEY `idx_pokladna_id` (`pokladna_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_rok_mesic` (`rok`, `mesic`),
  CONSTRAINT `fk_knihy_prirazeni` FOREIGN KEY (`prirazeni_id`) 
    REFERENCES `25a_pokladny_uzivatele` (`id`),
  CONSTRAINT `fk_knihy_pokladna` FOREIGN KEY (`pokladna_id`) 
    REFERENCES `25a_pokladny` (`id`),
  CONSTRAINT `fk_knihy_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci;
```

**DŮLEŽITÉ:** Tabulka má **denormalizovanou strukturu**:
- `uzivatel_id` - přímo v tabulce ✅
- `prirazeni_id` - FK na přiřazení
- `pokladna_id` - FK na pokladnu  
- Plus kopie dat (`cislo_pokladny`, `kod_pracoviste`, atd.) pro rychlejší dotazy

---

### Tabulka: `25a_pokladny_uzivatele`

```sql
CREATE TABLE `25a_pokladny_uzivatele` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `pokladna_id` INT(11) NOT NULL,               -- ✅ FK na 25a_pokladny (NE cislo_pokladny!)
  `uzivatel_id` INT(10) NOT NULL,               -- ✅ FK na 25_uzivatele
  `je_hlavni` TINYINT(1) DEFAULT 0,
  `platne_od` DATE NOT NULL,
  `platne_do` DATE DEFAULT NULL,
  `poznamka` TEXT,
  `vytvoreno` DATETIME NOT NULL,
  `vytvoril` INT(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pokladna_uzivatel_obdobi` (`pokladna_id`, `uzivatel_id`, `platne_od`),
  KEY `idx_pokladna_id` (`pokladna_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  CONSTRAINT `fk_prirazeni_pokladna` 
    FOREIGN KEY (`pokladna_id`) 
    REFERENCES `25a_pokladny` (`id`),
  CONSTRAINT `fk_prirazeni_uzivatel` 
    FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci;
```

**DŮLEŽITÉ:** Tabulka `25a_pokladny_uzivatele` **NEMÁ** sloupec `cislo_pokladny`!  
Má pouze `pokladna_id` (FK). Číslo pokladny je v tabulce `25a_pokladny`.

---

### Tabulka: `25a_pokladny` (master data)

```sql
CREATE TABLE `25a_pokladny` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cislo_pokladny` INT(11) NOT NULL,            -- ✅ Číslo pokladny (100, 101, 600...)
  `nazev` VARCHAR(255) DEFAULT NULL,
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL,
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL,
  `ciselna_rada_vpd` VARCHAR(10) NOT NULL,      -- ✅ VPD řada (např. "591")
  `vpd_od_cislo` INT(11) DEFAULT 1,
  `ciselna_rada_ppd` VARCHAR(10) NOT NULL,      -- ✅ PPD řada (např. "491")
  `ppd_od_cislo` INT(11) DEFAULT 1,
  `aktivni` TINYINT(1) DEFAULT 1,
  `poznamka` TEXT,
  `vytvoreno` DATETIME NOT NULL,
  `aktualizovano` DATETIME DEFAULT NULL,
  `vytvoril` INT(10) DEFAULT NULL,
  `aktualizoval` INT(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cislo_pokladny` (`cislo_pokladny`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci;
```

---

## 🔧 SPRÁVNÉ SQL ŘEŠENÍ

### ⭐ Varianta A: NEJJEDNODUŠŠÍ (DOPORUČENÁ)
**Data jsou denormalizovaná - není potřeba JOIN!**

```sql
SELECT 
    kb.id,
    kb.prirazeni_id,
    kb.pokladna_id,
    kb.uzivatel_id,
    kb.rok,
    kb.mesic,
    kb.stav_knihy,
    kb.prevod_z_predchoziho,
    kb.pocatecni_stav,
    kb.celkove_prijmy,
    kb.celkove_vydaje,
    kb.koncovy_stav,
    kb.pocet_zaznamu,
    kb.cislo_pokladny,              -- ✅ Denormalizované v knihách
    kb.kod_pracoviste,              -- ✅ Denormalizované v knihách
    kb.nazev_pracoviste,            -- ✅ Denormalizované v knihách
    kb.ciselna_rada_vpd,            -- ✅ Denormalizované v knihách
    kb.ciselna_rada_ppd,            -- ✅ Denormalizované v knihách
    kb.uzavrena_uzivatelem_kdy,
    kb.zamknuta_spravcem_kdy,
    kb.zamknuta_spravcem_kym,
    kb.poznamky,
    kb.vytvoreno,
    kb.aktualizovano
    
FROM 25a_pokladni_knihy kb
    
WHERE kb.uzivatel_id = :uzivatel_id
  AND kb.rok = :rok
  AND kb.mesic = :mesic
  
ORDER BY kb.vytvoreno DESC
LIMIT 1;
```

**✅ Tento dotaz je NEJRYCHLEJŠÍ a NEJJEDNODUŠŠÍ!**  
Není potřeba JOIN, všechna data jsou v `25a_pokladni_knihy`.

---

### Varianta B: S JOINy (pouze pokud potřebujete info z master dat)

```sql
SELECT 
    kb.id,
    kb.prirazeni_id,
    kb.pokladna_id,
    kb.uzivatel_id,
    kb.rok,
    kb.mesic,
    kb.stav_knihy,
    kb.prevod_z_predchoziho,
    kb.pocatecni_stav,
    kb.celkove_prijmy,
    kb.celkove_vydaje,
    kb.koncovy_stav,
    kb.pocet_zaznamu,
    kb.cislo_pokladny,
    kb.kod_pracoviste,
    kb.nazev_pracoviste,
    kb.ciselna_rada_vpd,
    kb.ciselna_rada_ppd,
    kb.uzavrena_uzivatelem_kdy,
    kb.zamknuta_spravcem_kdy,
    kb.zamknuta_spravcem_kym,
    kb.vytvoreno,
    kb.aktualizovano,
    -- Dodatečná data z přiřazení
    pa.je_hlavni,
    -- Dodatečná data z master pokladny
    p.nazev AS pokladna_nazev,
    p.aktivni AS pokladna_aktivni
    
FROM 25a_pokladni_knihy kb
INNER JOIN 25a_pokladny_uzivatele pa 
    ON kb.prirazeni_id = pa.id      -- ✅ SPRÁVNĚ: prirazeni_id
INNER JOIN 25a_pokladny p
    ON kb.pokladna_id = p.id        -- ✅ SPRÁVNĚ: pokladna_id
    
WHERE kb.uzivatel_id = :uzivatel_id
  AND kb.rok = :rok
  AND kb.mesic = :mesic
  AND (pa.platne_do IS NULL OR pa.platne_do >= CURDATE())
  
ORDER BY kb.vytvoreno DESC
LIMIT 1;
```

**⚠️ Tento dotaz je POMALEJŠÍ, použijte pouze pokud skutečně potřebujete data z přiřazení nebo master pokladny!**

---

## 🔍 Klíčové body SQL dotazu

1. **Sloupce přímo v knihách (denormalizace):**
   - `kb.uzivatel_id` ✅ Existuje!
   - `kb.cislo_pokladny` ✅ Existuje!
   - `kb.kod_pracoviste` ✅ Existuje!
   - `kb.ciselna_rada_vpd` ✅ Existuje!
   - `kb.ciselna_rada_ppd` ✅ Existuje!

2. **WHERE filtr (NEJJEDNODUŠŠÍ):**
   ```sql
   WHERE kb.uzivatel_id = :uzivatel_id
     AND kb.rok = :rok
     AND kb.mesic = :mesic
   ```
   ✅ SPRÁVNĚ - `uzivatel_id` je přímo v tabulce!

3. **JOIN podmínka (pokud potřebujete):**
   ```sql
   ON kb.prirazeni_id = pa.id
   ```
   ✅ SPRÁVNĚ - sloupec je `prirazeni_id`, NE `prirazeni_pokladny_id`!

4. **Kontrola platnosti (volitelná):**
   ```sql
   AND (pa.platne_do IS NULL OR pa.platne_do >= CURDATE())
   ```
   ✅ Ověřuje, že přiřazení pokladny je stále platné

---

## 📡 Frontend Request

```javascript
POST https://eeo.zachranka.cz/api.eeo/cashbook-list

Headers:
  Content-Type: application/json
  Authorization: Bearer <token>

Body:
{
  "uzivatel_id": 123,
  "rok": 2025,
  "mesic": 11
}
```

---

## ✅ Očekávaná Response

### Success (kniha existuje):

```json
{
  "status": "ok",
  "data": {
    "books": [
      {
        "id": 45,
        "prirazeni_pokladny_id": 12,
        "rok": 2025,
        "mesic": 11,
        "stav_knihy": "aktivni",
        "prevod_z_predchoziho": "1500.00",
        "celkove_prijmy": "2500.00",
        "celkove_vydaje": "800.00",
        "koncovy_stav": "3200.00",
        "pocet_zaznamu": 15,
        "uzavreno_datum": null,
        "uzavreno_uzivatel_id": null,
        "zamknuto_datum": null,
        "zamknuto_uzivatel_id": null,
        "vytvoreno": "2025-11-01 08:00:00",
        "aktualizovano": "2025-11-08 14:30:00",
        "cislo_pokladny": 600,
        "kod_pracoviste": "PB",
        "nazev_pracoviste": "Příbram",
        "ciselna_rada_vpd": "591",
        "ciselna_rada_ppd": "491",
        "uzivatel_id": 123,
        "je_hlavni": 1
      }
    ]
  }
}
```

### Success (kniha neexistuje):

```json
{
  "status": "ok",
  "data": {
    "books": []
  }
}
```

### Error:

```json
{
  "status": "error",
  "message": "Uživatel nemá přiřazenou žádnou pokladnu"
}
```

---

## 🧪 Testovací SQL dotazy

### Test 1: Existuje aktivní přiřazení pro uživatele?

```sql
SELECT 
    pa.id,
    pa.pokladna_id,
    pa.uzivatel_id,
    pa.je_hlavni,
    pa.platne_od,
    pa.platne_do,
    p.cislo_pokladny,
    p.kod_pracoviste,
    p.nazev_pracoviste,
    p.ciselna_rada_vpd,
    p.ciselna_rada_ppd
FROM 25a_pokladny_uzivatele pa
INNER JOIN 25a_pokladny p ON pa.pokladna_id = p.id
WHERE pa.uzivatel_id = 123 
  AND (pa.platne_do IS NULL OR pa.platne_do >= CURDATE())
ORDER BY pa.je_hlavni DESC;
```

**Očekávaný výsledek:** Minimálně 1 řádek s aktivním přiřazením  
**Poznámka:** Musíme JOINovat na `25a_pokladny` protože `cislo_pokladny` není v `25a_pokladny_uzivatele`!

---

### Test 2: Existuje kniha pro dané období?

```sql
SELECT 
    kb.id,
    kb.prirazeni_id,
    kb.pokladna_id,
    kb.uzivatel_id,
    kb.rok,
    kb.mesic,
    kb.stav_knihy,
    kb.cislo_pokladny
FROM 25a_pokladni_knihy kb
WHERE kb.uzivatel_id = 123
  AND kb.rok = 2025
  AND kb.mesic = 11;
```

**Očekávaný výsledek:** 
- 1 řádek pokud kniha existuje
- 0 řádků pokud kniha neexistuje (to je OK, frontend ji vytvoří)

---

### Test 3: Zkontrolovat všechny knihy uživatele

```sql
SELECT 
    kb.rok,
    kb.mesic,
    kb.stav_knihy,
    kb.koncovy_stav,
    pa.cislo_pokladny,
    kb.vytvoreno
FROM 25a_pokladni_knihy kb
INNER JOIN 25a_pokladny_uzivatele pa 
    ON kb.prirazeni_pokladny_id = pa.id
WHERE pa.uzivatel_id = 123
ORDER BY kb.rok DESC, kb.mesic DESC;
```

---

## 🐛 Co backend pravděpodobně dělá ŠPATNĚ (příklady)

### ❌ Chybný příklad 1: Špatný název sloupce v JOIN

```sql
-- ŠPATNĚ - sloupec se jmenuje 'prirazeni_id', ne 'prirazeni_pokladny_id'
SELECT kb.*, pa.cislo_pokladny
FROM 25a_pokladni_knihy kb
INNER JOIN 25a_pokladny_uzivatele pa 
    ON kb.prirazeni_pokladny_id = pa.id;  -- ❌ Sloupec 'prirazeni_pokladny_id' neexistuje!
```

**SPRÁVNĚ:**
```sql
ON kb.prirazeni_id = pa.id  -- ✅ Sloupec je 'prirazeni_id'
```

---

### ❌ Chybný příklad 2: JOINování přes nesprávné sloupce

```sql
-- ŠPATNĚ - pokus joinovat přes cislo_pokladny
SELECT kb.*, pa.*
FROM 25a_pokladni_knihy kb
INNER JOIN 25a_pokladny_uzivatele pa 
    ON kb.cislo_pokladny = pa.cislo_pokladny;  -- ❌ Chybí vazba přes ID!
```

**SPRÁVNĚ:**
```sql
ON kb.prirazeni_id = pa.id  -- ✅ JOIN přes FK vztah
```

---

### ❌ Chybný příklad 3: Zbytečný JOIN když data jsou denormalizovaná

```sql
-- NEEFEKTIVNÍ - joinuje se na pa.cislo_pokladny když už je v kb.cislo_pokladny
SELECT 
    kb.*,
    pa.cislo_pokladny,     -- ❌ Zbytečné, už je v kb.cislo_pokladny!
    pa.ciselna_rada_vpd    -- ❌ Zbytečné, už je v kb.ciselna_rada_vpd!
FROM 25a_pokladni_knihy kb
INNER JOIN 25a_pokladny_uzivatele pa 
    ON kb.prirazeni_id = pa.id;
```

**SPRÁVNĚ (bez JOINu):**
```sql
SELECT 
    kb.*  -- Už obsahuje všechna potřebná data
FROM 25a_pokladni_knihy kb
WHERE kb.uzivatel_id = ?;
```

---

## ✅ Kontrolní checklist

Před nasazením opravy zkontrolujte:

- [ ] SQL dotaz používá správné názvy sloupců
- [ ] WHERE filtr: `kb.uzivatel_id = ?` ✅ (sloupec existuje přímo v knihách!)
- [ ] Pokud je JOIN: `kb.prirazeni_id = pa.id` (NE `prirazeni_pokladny_id`)
- [ ] Kontrola platnosti (pokud je JOIN): `(pa.platne_do IS NULL OR pa.platne_do >= CURDATE())`
- [ ] Všechny SELECT sloupce existují v příslušných tabulkách
- [ ] SQL dotaz otestován přímo v MySQL konzoli
- [ ] Endpoint otestován přes Postman/curl s reálnými parametry
- [ ] Response obsahuje všechny potřebné sloupce pro frontend
- [ ] Error handling pro případ kdy uživatel nemá přiřazenou pokladnu

---

## 📞 Kontakt

Pro další dotazy nebo upřesnění kontaktujte frontend tým.

**Frontend očekává:**
- Pole `books` s knihami (může být prázdné)
- Každá kniha musí obsahovat info o přiřazení (`cislo_pokladny`, `ciselna_rada_vpd`, `ciselna_rada_ppd`)
- Response status `"ok"` při úspěchu, `"error"` při chybě
