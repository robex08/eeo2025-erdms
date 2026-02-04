# ✅ ANALÝZA: Možnost zadávat nulovou částku u LP čerpání

**Datum:** 4. února 2026  
**Kontext:** Ověření, zda databáze a backend akceptují nulové hodnoty při čerpání LP v pokladně

---

## 🔍 ZJIŠTĚNÍ

### 1. **Databázová struktura**

#### Tabulka: `25a_pokladni_polozky_detail`
```sql
CREATE TABLE `25a_pokladni_polozky_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `polozka_id` int(11) NOT NULL,
  `poradi` int(11) NOT NULL DEFAULT 1,
  `popis` varchar(500) NOT NULL,
  `castka` decimal(10,2) NOT NULL,  -- ⚠️ NOT NULL, ale bez CHECK constraintu
  `lp_kod` varchar(50) NOT NULL,
  `lp_popis` varchar(255) DEFAULT NULL,
  `poznamka` text DEFAULT NULL,
  `vytvoreno` datetime NOT NULL DEFAULT current_timestamp(),
  `aktualizovano` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_polozka_id` (`polozka_id`),
  KEY `idx_lp_kod` (`lp_kod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Klíčové zjištění:**
- ✅ Sloupec `castka` je typu `DECIMAL(10,2) NOT NULL`
- ✅ **NENÍ** žádný CHECK constraint, který by zakazoval `castka = 0` nebo `castka < 0`
- ✅ Default hodnota není nastavena, takže DB vyžaduje explicitní hodnotu

---

### 2. **Test INSERT s nulovou částkou**

#### ✅ Test č. 1: Vložení `castka = 0.00`
```sql
START TRANSACTION;

INSERT INTO 25a_pokladni_polozky_detail 
(polozka_id, poradi, popis, castka, lp_kod, lp_popis) 
VALUES 
(4, 999, 'TEST: Nulová částka', 0.00, 'LPTEST', 'Test nulové částky');

SELECT * FROM 25a_pokladni_polozky_detail WHERE polozka_id = 4 AND poradi = 999;

ROLLBACK;
```

**Výsledek:**
```
+----+------------+------------------------+--------+---------+
| id | polozka_id | popis                  | castka | lp_kod  |
+----+------------+------------------------+--------+---------+
|  4 |          4 | TEST: Nulová částka    |   0.00 | LPTEST  |
+----+------------+------------------------+--------+---------+
```

✅ **ÚSPĚCH** - Nulová částka byla úspěšně vložena do databáze

---

#### ✅ Test č. 2: Vložení `castka = -100.50` (záporná hodnota)
```sql
START TRANSACTION;

INSERT INTO 25a_pokladni_polozky_detail 
(polozka_id, poradi, popis, castka, lp_kod, lp_popis) 
VALUES 
(4, 998, 'TEST: Záporná částka', -100.50, 'LPTEST', 'Test záporné částky');

SELECT * FROM 25a_pokladni_polozky_detail WHERE polozka_id = 4 AND poradi = 998;

ROLLBACK;
```

**Výsledek:**
```
+----+------------+--------------------------+---------+--------+
| id | polozka_id | popis                    | castka  | lp_kod |
+----+------------+--------------------------+---------+--------+
|  5 |          4 | TEST: Záporná částka     | -100.50 | LPTEST |
+----+------------+--------------------------+---------+--------+
```

⚠️ **POZOR** - I záporná částka je technicky akceptována databází!

---

### 3. **Backend validace (PHP)**

#### Soubor: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/CashbookEntryModel.php`

```php
public function insertDetailItem(int $entryId, int $poradi, array $data): int {
    $stmt = $this->db->prepare("
        INSERT INTO " . TBL_POKLADNI_POLOZKY_DETAIL . " (
            polozka_id, poradi, popis, castka, lp_kod, lp_popis, poznamka, vytvoreno
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $entryId,
        $poradi,
        $data['popis'],
        $data['castka'],  // ⚠️ Žádná validace hodnoty!
        $data['lp_kod'],
        $data['lp_popis'] ?? null,
        $data['poznamka'] ?? null
    ]);
    
    return (int) $this->db->lastInsertId();
}
```

**Zjištění:**
- ❌ **NENÍ žádná validace na minimální hodnotu částky**
- ❌ Neověřuje se, zda `castka > 0` nebo `castka >= 0`
- ✅ Částka se pouze předá do DB bez kontroly

---

#### Soubor: `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/validators/EntryValidator.php`

```php
/**
 * Validovat, že součet detail položek se shoduje s celkovou částkou
 */
public function validateDetailsSum(float $masterCastka, array $detailItems): bool {
    if (empty($detailItems)) {
        return true;
    }
    
    $detailSum = array_sum(array_column($detailItems, 'castka'));
    $rozdil = abs($masterCastka - $detailSum);
    
    // Tolerance 1 halíř
    if ($rozdil > 0.01) {
        throw new Exception(
            sprintf(
                "Součet detail položek (%.2f Kč) se neshoduje s celkovou částkou (%.2f Kč)",
                $detailSum,
                $masterCastka
            )
        );
    }
    
    return true;
}
```

**Zjištění:**
- ✅ Validuje se pouze **součet částek**
- ❌ **NEVALIDUJE se**, zda jednotlivé položky mají `castka > 0`
- ⚠️ Pokud by všechny položky měly `castka = 0`, součet by byl validní (0 == 0)

---

### 4. **Aktuální stav v databázi**

```sql
SELECT COUNT(*) as pocet_nul 
FROM 25a_pokladni_polozky_detail 
WHERE castka = 0 OR castka = 0.00;
```

**Výsledek:**
```
+-----------+
| pocet_nul |
+-----------+
|         0 |
+-----------+
```

✅ **V produkční DB momentálně nejsou žádné položky s nulovou částkou**

---

## 📋 SHRNUTÍ

| Aspekt | Stav | Poznámka |
|--------|------|----------|
| **DB struktura** | ✅ Akceptuje `castka = 0` | NOT NULL, ale bez CHECK constraintu |
| **DB test INSERT** | ✅ Úspěšný | `castka = 0.00` lze vložit bez chyby |
| **DB test záporná hodnota** | ⚠️ Akceptuje i záporné | `-100.50` je také povoleno! |
| **Backend model** | ❌ Bez validace | Žádná kontrola minimální hodnoty |
| **Backend validátor** | ⚠️ Částečná validace | Pouze součet, ne jednotlivé částky |
| **Frontend validace** | ❓ Neověřeno | Potřeba zkontrolovat React komponenty |
| **Produkční data** | ✅ Čisté | Žádné nulové položky v DB |

---

## ⚠️ RIZIKA A DOPORUČENÍ

### 🔴 **KRITICKÉ RIZIKO:**
**Databáze akceptuje i záporné částky!**

```sql
castka = -100.50  -- ✅ DB to přijme bez chyby
```

### ⚡ **DOPORUČENÍ:**

#### 1. **Přidat DB constraint (PRODUKCE)**
```sql
ALTER TABLE 25a_pokladni_polozky_detail 
ADD CONSTRAINT chk_castka_kladna 
CHECK (castka >= 0);
```

Nebo pokud chceme zakázat i nulu:
```sql
ALTER TABLE 25a_pokladni_polozky_detail 
ADD CONSTRAINT chk_castka_vetsi_nez_nula 
CHECK (castka > 0);
```

#### 2. **Přidat backend validaci**
V souboru `/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/validators/EntryValidator.php`:

```php
/**
 * Validovat detail položky
 */
public function validateDetailItem(array $item): array {
    $errors = [];
    
    // Validace popisu
    if (empty($item['popis']) || strlen(trim($item['popis'])) === 0) {
        $errors[] = 'Popis položky je povinný';
    }
    
    // ✅ NOVÁ VALIDACE: Částka musí být > 0
    if (!isset($item['castka']) || !is_numeric($item['castka'])) {
        $errors[] = 'Částka musí být číselná hodnota';
    } elseif ((float)$item['castka'] <= 0) {
        $errors[] = 'Částka musí být větší než 0 Kč';
    }
    
    // Validace LP kódu (pro výdaje)
    if (empty($item['lp_kod']) || strlen(trim($item['lp_kod'])) === 0) {
        $errors[] = 'LP kód je povinný';
    }
    
    return $errors;
}
```

#### 3. **Přidat frontend validaci**
V React komponentě pro pokladnu:

```javascript
const validateDetailItem = (item) => {
  const errors = {};
  
  if (!item.popis || item.popis.trim() === '') {
    errors.popis = 'Popis je povinný';
  }
  
  const castka = parseFloat(item.castka);
  if (isNaN(castka) || castka <= 0) {
    errors.castka = 'Částka musí být větší než 0 Kč';
  }
  
  if (!item.lp_kod || item.lp_kod.trim() === '') {
    errors.lp_kod = 'LP kód je povinný';
  }
  
  return errors;
};
```

---

## � PRODUKČNÍ DATABÁZE (eeo2025) - OVĚŘENÍ

### Struktura produkční tabulky
```
Field         | Type          | Null | Key | Default
--------------+---------------+------+-----+-----------------
id            | int(11)       | NO   | PRI | NULL (auto_inc)
polozka_id    | int(11)       | NO   | MUL | NULL
poradi        | int(11)       | NO   | MUL | 1
popis         | varchar(500)  | NO   |     | NULL
castka        | decimal(10,2) | NO   |     | NULL  ⚠️ STEJNÉ JAKO DEV
lp_kod        | varchar(50)   | NO   | MUL | NULL
lp_popis      | varchar(255)  | YES  |     | NULL
```

✅ **Struktura je IDENTICKÁ s DEV databází**

### Aktuální stav produkčních dat

```sql
-- Celkový počet záznamů
SELECT COUNT(*) FROM 25a_pokladni_polozky_detail;
-- Výsledek: 3 záznamy

-- Záznamy s nulovou částkou
SELECT COUNT(*) WHERE castka = 0;
-- Výsledek: 0 záznamů

-- Záznamy se zápornou částkou
SELECT COUNT(*) WHERE castka < 0;
-- Výsledek: 0 záznamů

-- Statistika částek
MIN: 1400.00 Kč
MAX: 5571.00 Kč
AVG: 3335.00 Kč
```

✅ **Produkční data jsou čistá** - žádné nulové ani záporné částky

### ✅ Test INSERT v produkci (s ROLLBACK)

#### Test 1: Nulová částka
```sql
START TRANSACTION;
INSERT INTO 25a_pokladni_polozky_detail 
VALUES (129, 9999, 'TEST: Nulová částka', 0.00, 'LPTEST', ...);
-- ✅ ÚSPĚCH: Záznam byl vytvořen s castka = 0.00
ROLLBACK;
```

#### Test 2: Záporná částka
```sql
START TRANSACTION;
INSERT INTO 25a_pokladni_polozky_detail 
VALUES (129, 9998, 'TEST: Záporná částka', -500.00, 'LPTEST', ...);
-- ✅ ÚSPĚCH: Záznam byl vytvořen s castka = -500.00
ROLLBACK;
```

**Ověření po testech:**
```
COUNT(*) = 3  ✅ Stále pouze původní data
```

### 🔴 KRITICKÉ ZJIŠTĚNÍ PRO PRODUKCI

**Produkční databáze `eeo2025` má STEJNÉ BEZPEČNOSTNÍ RIZIKO jako DEV:**

1. ✅ Lze vložit `castka = 0.00`
2. ⚠️ Lze vložit i `castka = -500.00` (ZÁPORNÉ!)
3. ❌ Žádný CHECK constraint nebrání neplatným hodnotám

---

## 🎯 ZÁVĚR

**Odpověď na otázku:** 

✅ **ANO, obě databáze (DEV i PRODUKCE) AKCEPTUJÍ nulovou i zápornou částku u LP čerpání**

### Stav databází:

| Databáze | Struktura | Nulové částky | Záporné částky | Test INSERT |
|----------|-----------|---------------|----------------|-------------|
| **EEO-OSTRA-DEV** | `DECIMAL(10,2) NOT NULL` | 0 záznamů | 0 záznamů | ✅ Úspěšný |
| **eeo2025 (PROD)** | `DECIMAL(10,2) NOT NULL` | 0 záznamů | 0 záznamů | ✅ Úspěšný |

### Klíčové poznatky:

- ✅ DB sloupec je `DECIMAL(10,2) NOT NULL` bez CHECK constraintu
- ✅ Úspěšně lze vložit `castka = 0.00` v **obou** databázích
- ⚠️ DB akceptují i **záporné** částky v **obou** databázích!
- ✅ Backend neprovádí validaci minimální hodnoty
- ✅ Aktuálně **žádná** produkční data s nulovou/zápornou částkou

**Doporučení:**
1. 🔴 **URGENTNĚ** přidat DB constraint do **OBOU** databází proti záporným hodnotám
2. ⚠️ Rozhodnout, zda povolit `castka = 0` (logicky nedává smysl pro LP čerpání)
3. ✅ Přidat validaci v backendu a frontendu

---

**Poznámka:** Pokud má být `castka = 0` zakázána, je potřeba:
1. Přidat CHECK constraint do **DEV i PRODUKCE**
2. Přidat validaci do PHP backendu
3. Přidat validaci do React formuláře

### 📋 SQL pro opravu (DEV + PRODUKCE):

```sql
-- Varianta 1: Povolit nulu, zakázat záporné
ALTER TABLE 25a_pokladni_polozky_detail 
ADD CONSTRAINT chk_castka_kladna 
CHECK (castka >= 0);

-- Varianta 2: Zakázat i nulu (doporučeno)
ALTER TABLE 25a_pokladni_polozky_detail 
ADD CONSTRAINT chk_castka_vetsi_nez_nula 
CHECK (castka > 0);
```
