# 🔧 CASHBOOK BE - CHYBĚJÍCÍ POLE PRO POČÁTEČNÍ STAV DOKLADŮ

**Datum:** 8. listopadu 2025  
**Priorita:** 🔥 **VYSOKÁ** - Blokuje správné číslování dokladů  
**Status:** ⏳ Čeká na BE implementaci

---

## 🐛 PROBLÉM

V tabulce `25a_pokladny_uzivatele` **chybí pole pro počáteční stav dokladů** (`od`) pro VPD i PPD doklady.

### Současný stav DB:

```sql
CREATE TABLE `25a_pokladny_uzivatele` (
  ...
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD - výdaje (např. 591)',
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD - příjmy (např. 491)',
  -- ❌ CHYBÍ: vpd_od_cislo
  -- ❌ CHYBÍ: ppd_od_cislo
  ...
);
```

### Co to způsobuje:

- ❌ Nelze nastavit počáteční číslo dokladu (např. začínat od 50 místo od 1)
- ❌ Migrační problémy při převodu starých dat
- ❌ Uživatelé nemohou navázat na existující číslování
- ❌ FE dialogy nemají kam ukládat počáteční stav

---

## ✅ POŽADOVANÉ ŘEŠENÍ

### 1. Rozšířit DB tabulku `25a_pokladny_uzivatele`

Přidat **2 nová pole**:

```sql
ALTER TABLE `25a_pokladny_uzivatele`
ADD COLUMN `vpd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo VPD dokladu (výdaje od, např. 1)' 
  AFTER `ciselna_rada_vpd`,
ADD COLUMN `ppd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo PPD dokladu (příjmy od, např. 1)' 
  AFTER `ciselna_rada_ppd`;
```

**Výchozí hodnota:** `1` (začíná od čísla 1)

---

## 📊 STRUKTURA PO ÚPRAVĚ

```sql
CREATE TABLE `25a_pokladny_uzivatele` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uzivatel_id` INT(10) UNSIGNED NOT NULL,
  `cislo_pokladny` INT(11) NOT NULL,
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL,
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL,
  
  -- VPD (výdaje)
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD (např. 591)',
  `vpd_od_cislo` INT(11) DEFAULT 1 COMMENT 'Počáteční číslo VPD dokladu (výdaje od)',
  
  -- PPD (příjmy)
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD (např. 491)',
  `ppd_od_cislo` INT(11) DEFAULT 1 COMMENT 'Počáteční číslo PPD dokladu (příjmy od)',
  
  `je_hlavni` TINYINT(1) DEFAULT 0,
  `platne_od` DATE NOT NULL,
  `platne_do` DATE DEFAULT NULL,
  `poznamka` TEXT,
  `vytvoreno` DATETIME NOT NULL,
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci;
```

---

## 🎯 POUŽITÍ

### Příklad dat:

| uzivatel_id | cislo_pokladny | ciselna_rada_vpd | vpd_od_cislo | ciselna_rada_ppd | ppd_od_cislo |
|-------------|----------------|------------------|--------------|------------------|--------------|
| 1           | 100            | 599              | **1**        | 499              | **1**        |
| 2           | 101            | 591              | **50**       | 491              | **25**       |
| 3           | 102            | 592              | **100**      | 492              | **1**        |

### Výsledné číslování dokladů:

**Uživatel 1 (pokladna 100):**
- Výdaje: `V599-001`, `V599-002`, `V599-003`, ... ✅ (začíná od 1)
- Příjmy: `P499-001`, `P499-002`, `P499-003`, ... ✅ (začíná od 1)

**Uživatel 2 (pokladna 101):**
- Výdaje: `V591-050`, `V591-051`, `V591-052`, ... ✅ (začíná od 50)
- Příjmy: `P491-025`, `P491-026`, `P491-027`, ... ✅ (začíná od 25)

**Uživatel 3 (pokladna 102):**
- Výdaje: `V592-100`, `V592-101`, `V592-102`, ... ✅ (začíná od 100)
- Příjmy: `P492-001`, `P492-002`, `P492-003`, ... ✅ (začíná od 1)

---

## 🔄 MIGRACE EXISTUJÍCÍCH DAT

### Krok 1: Přidat sloupce (s výchozí hodnotou)

```sql
ALTER TABLE `25a_pokladny_uzivatele`
ADD COLUMN `vpd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo VPD dokladu (výdaje od)' 
  AFTER `ciselna_rada_vpd`,
ADD COLUMN `ppd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo PPD dokladu (příjmy od)' 
  AFTER `ciselna_rada_ppd`;
```

### Krok 2: Aktualizovat existující záznamy (pokud potřeba)

```sql
-- Pokud existují starší pokladny s pokročilým číslováním,
-- lze je ručně upravit:

UPDATE `25a_pokladny_uzivatele`
SET 
  `vpd_od_cislo` = 50,  -- Začínat od 50
  `ppd_od_cislo` = 25   -- Začínat od 25
WHERE `id` = 123;  -- ID konkrétního přiřazení
```

---

## 🔧 BACKEND - ÚPRAVY ENDPOINTŮ

### 1. `/cashbox-assignments-list` (GET)

**Přidat do response:**

```json
{
  "status": "ok",
  "data": {
    "assignments": [
      {
        "id": "1",
        "uzivatel_id": "1",
        "cislo_pokladny": "100",
        "ciselna_rada_vpd": "599",
        "vpd_od_cislo": 1,           // ← NOVÉ POLE
        "ciselna_rada_ppd": "499",
        "ppd_od_cislo": 1,           // ← NOVÉ POLE
        "je_hlavni": "1",
        "platne_od": "2025-11-08",
        "platne_do": null,
        "aktivni": true
      }
    ]
  }
}
```

### 2. `/cashbox-assignment-create` (POST)

**Přidat do payload:**

```json
{
  "auth": "...",
  "uzivatel_id": 123,
  "cislo_pokladny": 100,
  "ciselna_rada_vpd": "599",
  "vpd_od_cislo": 1,        // ← NOVÉ POLE (volitelné, default=1)
  "ciselna_rada_ppd": "499",
  "ppd_od_cislo": 1,        // ← NOVÉ POLE (volitelné, default=1)
  "platne_od": "2025-11-08",
  "platne_do": null
}
```

**SQL INSERT:**

```php
$query = "INSERT INTO 25a_pokladny_uzivatele (
  uzivatel_id,
  cislo_pokladny,
  ciselna_rada_vpd,
  vpd_od_cislo,           -- ← NOVÉ
  ciselna_rada_ppd,
  ppd_od_cislo,           -- ← NOVÉ
  platne_od,
  platne_do,
  vytvoreno,
  vytvoril
) VALUES (
  :uzivatel_id,
  :cislo_pokladny,
  :ciselna_rada_vpd,
  :vpd_od_cislo,          -- ← NOVÉ (default=1 pokud NULL)
  :ciselna_rada_ppd,
  :ppd_od_cislo,          -- ← NOVÉ (default=1 pokud NULL)
  :platne_od,
  :platne_do,
  NOW(),
  :vytvoril
)";
```

### 3. `/cashbox-assignment-update` (POST)

**Přidat do payload:**

```json
{
  "auth": "...",
  "assignment_id": 123,
  "vpd_cislo": "599",
  "vpd_od_cislo": 1,        // ← NOVÉ POLE
  "ppd_cislo": "499",
  "ppd_od_cislo": 1,        // ← NOVÉ POLE
  "platne_od": "2025-11-08",
  "platne_do": null
}
```

**SQL UPDATE:**

```php
$query = "UPDATE 25a_pokladny_uzivatele 
SET 
  ciselna_rada_vpd = :vpd_cislo,
  vpd_od_cislo = :vpd_od_cislo,        -- ← NOVÉ
  ciselna_rada_ppd = :ppd_cislo,
  ppd_od_cislo = :ppd_od_cislo,        -- ← NOVÉ
  platne_od = :platne_od,
  platne_do = :platne_do
WHERE id = :assignment_id";
```

---

## 🎨 FRONTEND - ÚPRAVY DIALOGŮ

FE dialogy budou upraveny samostatně (viz další commit), ale očekávají:

### EditAssignmentDialog.js

```javascript
// Přidat do formData:
const [formData, setFormData] = useState({
  vpd_cislo: '',
  vpd_od_cislo: 1,       // ← NOVÉ
  ppd_cislo: '',
  ppd_od_cislo: 1,       // ← NOVÉ
  platne_od: '',
  platne_do: ''
});
```

### AddAssignmentDialog.js

```javascript
// Přidat do formData:
const [formData, setFormData] = useState({
  uzivatel_id: '',
  cislo_pokladny: '',
  vpd_cislo: '',
  vpd_od_cislo: 1,       // ← NOVÉ (výchozí hodnota)
  ppd_cislo: '',
  ppd_od_cislo: 1,       // ← NOVÉ (výchozí hodnota)
  platne_od: '',
  platne_do: ''
});
```

---

## ✅ CHECKLIST PRO BE TÝM

- [ ] 1. Spustit ALTER TABLE SQL skript (přidat `vpd_od_cislo` a `ppd_od_cislo`)
- [ ] 2. Aktualizovat `/cashbox-assignments-list` endpoint (vrátit nová pole)
- [ ] 3. Aktualizovat `/cashbox-assignment-create` endpoint (přijímat nová pole)
- [ ] 4. Aktualizovat `/cashbox-assignment-update` endpoint (přijímat nová pole)
- [ ] 5. Otestovat vytvoření nového přiřazení s vlastním počátečním stavem
- [ ] 6. Otestovat editaci existujícího přiřazení (změna počátečního stavu)
- [ ] 7. Ověřit, že staré záznamy mají výchozí hodnotu `1`

---

## 📦 SQL SKRIPTY

### Kompletní ALTER TABLE skript:

```sql
-- Přidat pole pro počáteční stav dokladů
ALTER TABLE `25a_pokladny_uzivatele`
ADD COLUMN `vpd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo VPD dokladu (výdaje od, např. 1)' 
  AFTER `ciselna_rada_vpd`,
ADD COLUMN `ppd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo PPD dokladu (příjmy od, např. 1)' 
  AFTER `ciselna_rada_ppd`;

-- Ověření změny
SHOW COLUMNS FROM `25a_pokladny_uzivatele` LIKE '%_od_cislo';

-- Očekávaný výstup:
-- +---------------+----------+------+-----+---------+-------+
-- | Field         | Type     | Null | Key | Default | Extra |
-- +---------------+----------+------+-----+---------+-------+
-- | vpd_od_cislo  | int(11)  | YES  |     | 1       |       |
-- | ppd_od_cislo  | int(11)  | YES  |     | 1       |       |
-- +---------------+----------+------+-----+---------+-------+
```

---

## 🎯 VÝSLEDEK

Po implementaci:

✅ **DB:** Tabulka `25a_pokladny_uzivatele` má pole `vpd_od_cislo` a `ppd_od_cislo`  
✅ **BE:** Všechny 3 endpointy (`list`, `create`, `update`) pracují s novými poli  
✅ **FE:** Dialogy umožní nastavit počáteční stav dokladů (viz následující commit)  
✅ **Číslování:** Doklady začínají od požadovaného čísla (např. V591-050)

---

## 📞 KONTAKT

Pokud je něco nejasné, pište do Slacku nebo GitHubu issue.

**Status:** ⏳ Čeká na BE implementaci (ALTER TABLE + 3 endpointy)
