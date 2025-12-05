# Chybějící sloupce v databázových tabulkách číselníků

**Datum:** 23. října 2025  
**Pro:** Backend tým  
**Od:** Frontend implementace číselníků

---

## 🔴 Kritické chyby - SQL Errors z produkce

### ❌ **POZICE** - SQL Error
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'u.nazev' in 'field list'
```

**Problém:** Backend v SQL dotazu používá alias `u.nazev`, ale tabulka úseků nemá sloupec `nazev`.  
**Správně má být:** `u.usek_nazev` nebo `u.nazev_useku` (podle skutečného názvu sloupce v DB)

**Řešení:** Opravit SQL dotaz v `/api.eeo/ciselniky/pozice/list` - změnit `u.nazev` na správný název sloupce.

---

### ❌ **ÚSEKY** - SQL Error
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'nazev' in 'order clause'
```

**Problém:** Backend v SQL dotazu používá `ORDER BY nazev`, ale tabulka úseků nemá sloupec `nazev`.  
**Správně má být:** `ORDER BY usek_nazev` nebo `ORDER BY nazev_useku` (podle skutečného názvu sloupce v DB)

**Řešení:** Opravit SQL dotaz v `/api.eeo/ciselniky/useky/list` - změnit `ORDER BY nazev` na správný název sloupce.

---

### ✅ **ORGANIZACE** - Funguje správně
```
✅ OrganizaceTab - API Result: [{…}]
📊 OrganizaceTab - Data length: 1
```

**Status:** API vrací data správně! 🎉

---

## 🔴 Kritické chyby - Chybějící sloupce v DB

### 1. **POZICE** (`ciselniky_pozice`)

**Aktuální stav podle API dokumentace:**
- ✅ `id` (PK)
- ✅ `nazev_pozice`
- ✅ `parent_id`
- ✅ `usek_id`

**❌ CHYBÍ důležité sloupce:**
- `popis` (TEXT) - Popis pozice/funkce
- `aktivni` (TINYINT/BOOLEAN, default 1) - Aktivní/Neaktivní stav

**Dopad:** Nelze filtrovat neaktivní pozice, nelze ukládat popis pozice.

---

### 2. **ÚSEKY** (`ciselniky_useky`)

**Aktuální stav podle API dokumentace:**
- ✅ `id` (PK)
- ✅ `nazev_useku` (nebo `usek_nazev`)
- ✅ `zkratka` (nebo `usek_zkr`)

**❌ CHYBÍ důležitý sloupec:**
- `aktivni` (TINYINT/BOOLEAN, default 1) - Aktivní/Neaktivní stav

**Dopad:** Nelze označit úsek jako neaktivní, nelze filtrovat neaktivní úseky.

---

### 3. **ORGANIZACE** (`ciselniky_organizace`)

**Aktuální stav podle API dokumentace:**
- ✅ `id` (PK)
- ✅ `nazev_organizace`
- ✅ `ico`
- ✅ `adresa` (pravděpodobně jeden sloupec)
- ✅ `email`
- ✅ `telefon`

**❌ CHYBÍ důležité sloupce pro strukturovanou adresu:**
- `ulice_cislo` (VARCHAR 200) - Ulice a číslo popisné/orientační
- `mesto` (VARCHAR 100) - Město
- `psc` (VARCHAR 10) - PSČ
- `zastoupeny` (VARCHAR 200) - Osoba zastupující organizaci (např. "Ing. Jan Novák, jednatel")
- `datova_schranka` (VARCHAR 50) - ID datové schránky

**Poznámka:** Pokud máte pouze jeden sloupec `adresa`, doporučujeme jej rozdělit na:
- `ulice_cislo`
- `mesto` 
- `psc`

To umožní:
- Lepší vyhledávání (filtr podle města)
- Validaci PSČ
- Strukturovaná data pro export
- Kompatibilita s českými standardy

**Dopad:** 
- Frontend musí používat jeden sloupec `adresa` místo strukturované adresy
- Nelze filtrovat podle města
- Komplikovanější validace a zobrazení

---

## � OKAMŽITÉ OPRAVY - SQL Dotazy v BE (PRIORITA 1)

### **POZICE** - Opravit JOIN s tabulkou úseků

**Chybný kód (současný stav):**
```sql
SELECT p.*, u.nazev as usek_nazev 
FROM ciselniky_pozice p
LEFT JOIN ciselniky_useky u ON p.usek_id = u.id
```

**Správný kód (oprava):**
```sql
SELECT p.*, u.usek_nazev as usek_nazev 
FROM ciselniky_pozice p
LEFT JOIN ciselniky_useky u ON p.usek_id = u.id
```
nebo (pokud je sloupec pojmenovaný jinak):
```sql
SELECT p.*, u.nazev_useku as usek_nazev 
FROM ciselniky_pozice p
LEFT JOIN ciselniky_useky u ON p.usek_id = u.id
```

**Soubor:** `/api.eeo/ciselniky/pozice/list` endpoint

---

### **ÚSEKY** - Opravit ORDER BY klauzuli

**Chybný kód (současný stav):**
```sql
SELECT * FROM ciselniky_useky ORDER BY nazev
```

**Správný kód (oprava):**
```sql
SELECT * FROM ciselniky_useky ORDER BY usek_nazev
```
nebo (pokud je sloupec pojmenovaný jinak):
```sql
SELECT * FROM ciselniky_useky ORDER BY nazev_useku
```

**Soubor:** `/api.eeo/ciselniky/useky/list` endpoint

---

### ⚠️ **ZJISTIT SKUTEČNÉ NÁZVY SLOUPCŮ**

Pro BE tým - prosím spusťte tento SQL dotaz a potvrďte názvy sloupců:

```sql
DESCRIBE ciselniky_useky;
```

A potvrďte, jestli sloupec je:
- ✅ `usek_nazev` (doporučeno dle Design Guidelines)
- ✅ `nazev_useku` (možná varianta)
- ❌ `nazev` (NEPOUŽÍVAT - generické jméno, špatná praxe)

---

## �📋 Doporučená SQL migrace

### POZICE - Přidat sloupce
```sql
ALTER TABLE `ciselniky_pozice`
ADD COLUMN `popis` TEXT NULL COMMENT 'Popis pozice/funkce',
ADD COLUMN `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní (1) / Neaktivní (0)';

-- Index pro rychlejší filtrování
CREATE INDEX `idx_aktivni` ON `ciselniky_pozice` (`aktivni`);
```

### ÚSEKY - Přidat sloupec
```sql
ALTER TABLE `ciselniky_useky`
ADD COLUMN `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní (1) / Neaktivní (0)';

-- Index pro rychlejší filtrování
CREATE INDEX `idx_aktivni` ON `ciselniky_useky` (`aktivni`);
```

### ORGANIZACE - Rozdělit adresu (DOPORUČENO)
```sql
-- Pokud chcete strukturovanou adresu:
ALTER TABLE `ciselniky_organizace`
ADD COLUMN `ulice_cislo` VARCHAR(200) NULL COMMENT 'Ulice a číslo popisné/orientační',
ADD COLUMN `mesto` VARCHAR(100) NULL COMMENT 'Město',
ADD COLUMN `psc` VARCHAR(10) NULL COMMENT 'PSČ',
ADD COLUMN `zastoupeny` VARCHAR(200) NULL COMMENT 'Zastoupen (jméno, funkce)',
ADD COLUMN `datova_schranka` VARCHAR(50) NULL COMMENT 'ID datové schránky';

-- Indexy pro vyhledávání
CREATE INDEX `idx_mesto` ON `ciselniky_organizace` (`mesto`);
CREATE INDEX `idx_ico` ON `ciselniky_organizace` (`ico`);

-- Pokud máte existující data v sloupci `adresa`, můžete je ručně rozdělit
-- nebo ponechat původní sloupec `adresa` jako zálohu
```

---

## 🔄 Frontend aktuální implementace (WORKAROUND)

Frontend aktuálně pracuje s dostupnými sloupci:

### POZICE
- ✅ Zobrazuje `nazev_pozice`, `parent_id`, `usek_id`
- ⚠️ **Pole `popis` a `aktivni` jsou připravena v dialogu, ale neukládají se do DB**

### ÚSEKY  
- ✅ Zobrazuje `nazev_useku`, `zkratka`
- ⚠️ **Pole `aktivni` je připraveno v filtru, ale chybí v DB**

### ORGANIZACE
- ✅ Zobrazuje `nazev_organizace`, `ico`
- ⚠️ **Používá jeden sloupec `adresa` místo `ulice_cislo`, `mesto`, `psc`**
- ⚠️ **Pole `zastoupeny`, `datova_schranka` jsou připravena, ale chybí v DB**

---

## ✅ Co funguje správně

Následující číselníky mají správnou strukturu dle Design Guidelines:

### LOKALITY
- ✅ `id`, `nazev`, `typ`, `parent_id`
- ✅ Kompletní struktura

### DODAVATELÉ (Read-only)
- ✅ Pouze čtení, struktura dle potřeby

### STAVY (Read-only)
- ✅ Pouze čtení, obsahuje `barva`

### ROLE (Read-only)
- ✅ Pouze čtení, obsahuje `aktivni`

### PRÁVA (Read-only)
- ✅ Pouze čtení

---

## 🎯 Priorita implementace

### 🔴 **VYSOKÁ PRIORITA** (Potřebné pro plnou funkcionalitu)
1. `pozice.aktivni` - Kritické pro filtrování a UI
2. `useky.aktivni` - Kritické pro filtrování a UI
3. `pozice.popis` - Důležité pro dokumentaci pozic

### 🟡 **STŘEDNÍ PRIORITA** (Vylepšení UX)
4. `organizace.ulice_cislo`, `mesto`, `psc` - Strukturovaná adresa
5. `organizace.zastoupeny` - Info o zastoupení
6. `organizace.datova_schranka` - Oficiální komunikace

---

## 📞 Kontakt

Pokud máte dotazy k této specifikaci, kontaktujte frontend tým.

**Frontend je připraven a čeká na doplnění sloupců v DB!** ✅
