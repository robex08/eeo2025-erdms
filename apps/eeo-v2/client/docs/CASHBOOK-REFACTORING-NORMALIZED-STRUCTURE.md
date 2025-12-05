# 🔄 REFACTORING POKLADNÍ KNIHY - NORMALIZOVANÁ STRUKTURA

**Datum:** 8. listopadu 2025  
**Priorita:** 🔥 **VYSOKÁ** - Nutné pro podporu sdílených pokladen  
**Status:** ✅ SQL připraveno, čeká na aplikaci

---

## 🎯 DŮVOD REFACTORINGU

### ❌ Problém současné struktury:

**1 tabulka** `25a_pokladny_uzivatele`:
```
uzivatel_id | cislo_pokladny | ciselna_rada_vpd | vpd_od_cislo | ciselna_rada_ppd | ppd_od_cislo
------------|----------------|------------------|--------------|------------------|-------------
1           | 100            | 599              | 1            | 499              | 1
102         | 100            | 599              | 1            | 499              | 1
105         | 101            | 598              | 50           | 498              | 25
```

**Problémy:**
- ❌ **Duplicita** - VPD/PPD čísla opakují se pro každého uživatele
- ❌ **Nesynchronizace** - pokud má 5 uživatelů pokladnu 100, musíme upravit 5 řádků
- ❌ **Chyby** - při změně VPD můžeme zapomenout na některého uživatele
- ❌ **Nekonzistence** - jeden uživatel může mít VPD=599, druhý VPD=598 u stejné pokladny

---

## ✅ NOVÁ NORMALIZOVANÁ STRUKTURA

### 📊 Schéma:

```
┌─────────────────────┐
│  25a_pokladny       │  ← MASTER DATA (1x pokladna)
├─────────────────────┤
│ id (PK)             │
│ cislo_pokladny (UQ) │
│ nazev               │
│ ciselna_rada_vpd    │─┐
│ vpd_od_cislo        │ │
│ ciselna_rada_ppd    │ │
│ ppd_od_cislo        │ │
│ kod_pracoviste      │ │
│ aktivni             │ │
└─────────────────────┘ │
                        │
                        │ 1:N
                        │
┌─────────────────────────────┐
│ 25a_pokladny_uzivatele      │  ← PŘIŘAZENÍ (N uživatelů)
├─────────────────────────────┤
│ id (PK)                     │
│ pokladna_id (FK) ───────────┘
│ uzivatel_id (FK)            │
│ je_hlavni                   │
│ platne_od                   │
│ platne_do                   │
│ poznamka                    │
└─────────────────────────────┘
                        │
                        │ 1:N
                        │
┌─────────────────────┐ │
│ 25a_pokladni_knihy  │─┘
├─────────────────────┤
│ id (PK)             │
│ prirazeni_id (FK)   │
│ pokladna_id (FK)    │
│ uzivatel_id (FK)    │
│ rok, mesic          │
│ ...                 │
└─────────────────────┘
```

---

## 📋 DETAILY TABULEK

### 1️⃣ `25a_pokladny` - Definice pokladny

**Účel:** Centrální definice pokladny (VPD/PPD čísla, pracoviště)

| Pole | Typ | Popis |
|------|-----|-------|
| `id` | INT PK | ID pokladny |
| `cislo_pokladny` | INT UNIQUE | Číslo pokladny (100, 101...) |
| `nazev` | VARCHAR | Název ("Sdílená pokladna IT") |
| `kod_pracoviste` | VARCHAR | Kód pracoviště (HK, PB) |
| `ciselna_rada_vpd` | VARCHAR | VPD prefix (599) |
| `vpd_od_cislo` | INT | VPD počáteční číslo (1) |
| `ciselna_rada_ppd` | VARCHAR | PPD prefix (499) |
| `ppd_od_cislo` | INT | PPD počáteční číslo (1) |
| `aktivni` | TINYINT | Aktivní pokladna |

**Příklad:**
```sql
INSERT INTO 25a_pokladny (cislo_pokladny, nazev, ciselna_rada_vpd, vpd_od_cislo, ...)
VALUES (100, 'Sdílená IT pokladna', '599', 1, '499', 1, NOW(), 1);
```

### 2️⃣ `25a_pokladny_uzivatele` - Přiřazení (many-to-many)

**Účel:** Propojení uživatelů s pokladnami

| Pole | Typ | Popis |
|------|-----|-------|
| `id` | INT PK | ID přiřazení |
| `pokladna_id` | INT FK | → `25a_pokladny.id` |
| `uzivatel_id` | INT FK | → `25_uzivatele.id` |
| `je_hlavni` | TINYINT | Hlavní pokladna uživatele |
| `platne_od` | DATE | Platnost přiřazení od |
| `platne_do` | DATE | Platnost do (NULL = aktivní) |
| `poznamka` | TEXT | "Zástup", "Sdílená" |

**Unique key:** `(pokladna_id, uzivatel_id, platne_od)`

**Příklad:**
```sql
-- User 1 má pokladnu 100
INSERT INTO 25a_pokladny_uzivatele (pokladna_id, uzivatel_id, platne_od)
VALUES (1, 1, '2025-11-08');

-- User 102 TAKÉ má pokladnu 100 (sdílená)
INSERT INTO 25a_pokladny_uzivatele (pokladna_id, uzivatel_id, platne_od)
VALUES (1, 102, '2025-11-08');
```

### 3️⃣ `25a_pokladni_knihy` - Měsíční knihy (upraveno)

**Změny:**
- `prirazeni_pokladny_id` → `prirazeni_id` (FK na `25a_pokladny_uzivatele`)
- Přidáno `pokladna_id` (FK na `25a_pokladny`) - denormalizace pro rychlost

---

## 🎯 POUŽITÍ

### Scénář 1: Sdílená pokladna

**Potřeba:** User 1 a User 102 sdílí pokladnu 100 (VPD=599, PPD=499)

```sql
-- 1. Vytvořit pokladnu (1x)
INSERT INTO 25a_pokladny (cislo_pokladny, ciselna_rada_vpd, ciselna_rada_ppd, ...)
VALUES (100, '599', '499', ...);

-- 2. Přiřadit User 1
INSERT INTO 25a_pokladny_uzivatele (pokladna_id, uzivatel_id, ...)
VALUES (1, 1, ...);

-- 3. Přiřadit User 102 (stejná pokladna!)
INSERT INTO 25a_pokladny_uzivatele (pokladna_id, uzivatel_id, ...)
VALUES (1, 102, ...);

-- ✅ Oba uživatelé mají STEJNÁ VPD/PPD čísla
-- ✅ Změna VPD se projeví automaticky u obou
```

### Scénář 2: Změna VPD/PPD

**Potřeba:** Změnit VPD pokladny 100 z 599 na 598

```sql
-- Starý způsob: UPDATE 5 řádků (pokud je 5 uživatelů)
UPDATE 25a_pokladny_uzivatele 
SET ciselna_rada_vpd = '598' 
WHERE cislo_pokladny = 100;  -- 5 řádků affected

-- Nový způsob: UPDATE 1 řádek
UPDATE 25a_pokladny 
SET ciselna_rada_vpd = '598' 
WHERE cislo_pokladny = 100;  -- 1 řádek affected

-- ✅ Automaticky platí pro všechny uživatele
```

### Scénář 3: Zástup

**Potřeba:** User 102 zastupuje User 1 na pokladně 100 od 15.11. do 30.11.

```sql
-- User 102 již má aktivní přiřazení
SELECT * FROM 25a_pokladny_uzivatele WHERE uzivatel_id = 102;

-- Změna je jen v datech platnosti
-- Systém automaticky ví, že má stejné VPD/PPD jako User 1
```

---

## 🚀 MIGRACE

### Postup aplikace:

1. **Zálohovat data** (pokud existují)
```sql
CREATE TABLE 25a_pokladny_uzivatele_backup AS 
SELECT * FROM 25a_pokladny_uzivatele;
```

2. **Spustit skript:**
```bash
mysql -u root -p dbname < refactor_cashbook_normalized_structure.sql
```

3. **Ověřit strukturu:**
```sql
SHOW TABLES LIKE '25a_%';
SELECT * FROM 25a_pokladny;
SELECT * FROM 25a_pokladny_uzivatele;
```

---

## 🔄 ZMĚNY V API

### Backend endpointy (vyžaduje úpravu):

**1. `/cashbox-assignments-list`**
```php
// PŘED:
SELECT * FROM 25a_pokladny_uzivatele WHERE uzivatel_id = ?

// PO: JOIN na pokladny
SELECT 
  pu.*,
  p.cislo_pokladny,
  p.ciselna_rada_vpd,
  p.vpd_od_cislo,
  p.ciselna_rada_ppd,
  p.ppd_od_cislo,
  p.nazev AS nazev_pokladny
FROM 25a_pokladny_uzivatele pu
JOIN 25a_pokladny p ON p.id = pu.pokladna_id
WHERE pu.uzivatel_id = ?
```

**2. `/cashbox-assignment-create`**
```php
// PŘED: INSERT do 25a_pokladny_uzivatele (všechna pole)

// PO: 
// 1. Najít/vytvořit pokladnu v 25a_pokladny
// 2. INSERT do 25a_pokladny_uzivatele (jen ID + user + datumy)
```

**3. `/cashbox-assignment-update`**
```php
// PŘED: UPDATE VPD/PPD v přiřazení

// PO: UPDATE v 25a_pokladny (ovlivní všechny uživatele)
```

---

## ✅ VÝHODY

1. **Sdílené pokladny** ✅
   - Více uživatelů = 1 pokladna
   - Stejné VPD/PPD pro všechny

2. **Centrální správa** ✅
   - Změna VPD jednou → platí všude
   - Žádná duplicita

3. **Historie** ✅
   - Platnost přiřazení (od-do)
   - Zástupy, rotace

4. **Normalizace** ✅
   - VPD/PPD uloženo 1x
   - Konzistence dat

---

## 📊 TESTOVACÍ DATA

Skript obsahuje příklady:

| Pokladna | VPD | PPD | Uživatelé |
|----------|-----|-----|-----------|
| 100 | V599 | P499 | User 1, User 102 (sdílená) |
| 101 | V598 | P498 | User 105 |
| 102 | V597 | P497 | User 100 |

---

**Status:** ✅ SQL připraveno  
**Další krok:** Aplikace na DB + úprava backend API

