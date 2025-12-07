# Analýza: Pokladna - Více LP kódů pod jedním dokladem

**Datum**: 7. prosince 2025  
**Požadavek**: Umožnit více položek s různými LP kódy pod jedním dokladem v pokladně

---

## 📋 POŽADAVKY

### 1. **LP kód povinný** (s výjimkami)
- Sloupec `lp_kod` musí být povinný pro VÝDAJE
- Pro PŘÍJMY (dotace pokladny) LP kód NENÍ povinný
- Validace na FE i BE

### 2. **Více položek pod jedním dokladem**
Příklad:
```
V599-005  Kancelář                          (doklad)
          ├─ Konvice          500 Kč   LPIT1  (podpoložka 1)
          └─ Oprava kávovaru  1320 Kč  LPIT4  (podpoložka 2)

V599-006  Ochranné pomůcky    2789 Kč  LPIE1  (jednoduchý doklad)

P499-002  Dotace pokladny     10000 Kč  (BEZ LP) (příjem)
```

### 3. **Přepočet LP** 
- Automatický přepočet výdajů k LP kódům
- Sčítání všech podpoložek se stejným LP kódem

### 4. **Přečíslování dokladů**
- Zachovat logiku přečíslování
- Počítat s více podpoložkami pod jedním dokladem

---

## 🗄️ SOUČASNÁ DB STRUKTURA

### Tabulka: `25a_pokladni_polozky`

```sql
CREATE TABLE `25a_pokladni_polozky` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pokladni_kniha_id` int(11) NOT NULL,
  `datum_zapisu` date NOT NULL,
  `cislo_dokladu` varchar(20) NOT NULL,        -- P001, V591-001
  `typ_dokladu` enum('prijem','vydaj') NOT NULL,
  `obsah_zapisu` varchar(500) NOT NULL,        -- Popis operace
  `komu_od_koho` varchar(255) DEFAULT NULL,
  `castka_prijem` decimal(10,2) DEFAULT NULL,
  `castka_vydaj` decimal(10,2) DEFAULT NULL,
  `zustatek_po_operaci` decimal(10,2) NOT NULL,
  `lp_kod` varchar(50) DEFAULT NULL,           -- ⚠️ NULLABLE
  `lp_popis` varchar(255) DEFAULT NULL,
  `poznamka` text DEFAULT NULL,
  `poradi_radku` int(11) NOT NULL DEFAULT 0,
  -- soft delete + metadata
  PRIMARY KEY (`id`)
);
```

**Problém současného řešení:**
- ✅ Jeden záznam = jeden doklad
- ❌ Pouze JEDEN LP kód na doklad
- ❌ Nelze rozdělit částku na více LP kódů
- ❌ LP kód není povinný

---

## 🎯 NAVRHOVANÉ ŘEŠENÍ

### **Varianta A: Hierarchická struktura (DOPORUČENO)**

Vytvoření **master-detail** vztahu:
- `25a_pokladni_polozky` = **hlavička dokladu**
- `25a_pokladni_polozky_detail` = **detailní položky s LP kódy**

#### Nová struktura DB:

```sql
-- ============================================
-- HLAVIČKA DOKLADU (master record)
-- ============================================
CREATE TABLE `25a_pokladni_polozky` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pokladni_kniha_id` int(11) NOT NULL,
  `datum_zapisu` date NOT NULL,
  `cislo_dokladu` varchar(20) NOT NULL,
  `typ_dokladu` enum('prijem','vydaj') NOT NULL,
  `obsah_zapisu` varchar(500) NOT NULL,        -- Hlavní popis
  `komu_od_koho` varchar(255) DEFAULT NULL,
  `castka_celkem` decimal(10,2) NOT NULL,       -- 🆕 Celková částka dokladu
  `zustatek_po_operaci` decimal(10,2) NOT NULL,
  `ma_detail` tinyint(1) DEFAULT 0,             -- 🆕 Flag: má podpoložky?
  `poznamka` text DEFAULT NULL,
  `poradi_radku` int(11) NOT NULL DEFAULT 0,
  -- soft delete + metadata
  PRIMARY KEY (`id`)
);

-- ============================================
-- DETAIL POLOŽEK (LP kódy)
-- ============================================
CREATE TABLE `25a_pokladni_polozky_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `polozka_id` int(11) NOT NULL,                -- FK → 25a_pokladni_polozky.id
  `poradi` int(11) NOT NULL DEFAULT 1,          -- Pořadí v rámci dokladu
  `popis` varchar(500) NOT NULL,                -- "Konvice", "Oprava kávovaru"
  `castka` decimal(10,2) NOT NULL,              -- Částka této podpoložky
  `lp_kod` varchar(50) NOT NULL,                -- 🔒 POVINNÉ pro výdaje
  `lp_popis` varchar(255) DEFAULT NULL,
  `poznamka` text DEFAULT NULL,
  `vytvoreno` datetime NOT NULL,
  `aktualizovano` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_polozka_id` (`polozka_id`),
  KEY `idx_lp_kod` (`lp_kod`),
  CONSTRAINT `fk_detail_polozka` FOREIGN KEY (`polozka_id`) 
    REFERENCES `25a_pokladni_polozky` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### Logika použití:

1. **Jednoduchý doklad** (1 LP kód):
   ```
   25a_pokladni_polozky:
   - id: 1
   - cislo_dokladu: "V599-006"
   - obsah_zapisu: "Ochranné pomůcky"
   - castka_celkem: 2789
   - ma_detail: 0 (false)
   
   25a_pokladni_polozky_detail:
   - id: 1
   - polozka_id: 1
   - popis: "Ochranné pomůcky"
   - castka: 2789
   - lp_kod: "LPIE1"
   ```

2. **Složený doklad** (více LP kódů):
   ```
   25a_pokladni_polozky:
   - id: 2
   - cislo_dokladu: "V599-005"
   - obsah_zapisu: "Kancelář - vybavení"
   - castka_celkem: 1820 (500 + 1320)
   - ma_detail: 1 (true)
   
   25a_pokladni_polozky_detail:
   - id: 2, polozka_id: 2, poradi: 1, popis: "Konvice", castka: 500, lp_kod: "LPIT1"
   - id: 3, polozka_id: 2, poradi: 2, popis: "Oprava kávovaru", castka: 1320, lp_kod: "LPIT4"
   ```

3. **Příjem bez LP**:
   ```
   25a_pokladni_polozky:
   - id: 3
   - cislo_dokladu: "P499-002"
   - typ_dokladu: "prijem"
   - obsah_zapisu: "Dotace pokladny"
   - castka_celkem: 10000
   - ma_detail: 0
   
   (žádný záznam v detail tabulce - pro příjmy není LP povinný)
   ```

---

## 🔧 IMPLEMENTAČNÍ PLÁN

### FÁZE 1: DB Migrace

**Soubor**: `/docs/setup/alter-cashbook-multi-lp.sql`

```sql
-- 1. Vytvořit novou tabulku pro detaily
CREATE TABLE `25a_pokladni_polozky_detail` (...);

-- 2. Upravit stávající tabulku
ALTER TABLE `25a_pokladni_polozky`
  ADD COLUMN `castka_celkem` decimal(10,2) AFTER `komu_od_koho`,
  ADD COLUMN `ma_detail` tinyint(1) DEFAULT 0 AFTER `castka_celkem`,
  MODIFY COLUMN `lp_kod` varchar(50) DEFAULT NULL COMMENT 'DEPRECATED - use detail table';

-- 3. Migrovat existující data
INSERT INTO `25a_pokladni_polozky_detail` 
  (polozka_id, poradi, popis, castka, lp_kod, lp_popis)
SELECT 
  id,
  1,
  obsah_zapisu,
  COALESCE(castka_vydaj, castka_prijem),
  lp_kod,
  lp_popis
FROM `25a_pokladni_polozky`
WHERE lp_kod IS NOT NULL;

-- 4. Update hlavičky
UPDATE `25a_pokladni_polozky`
SET 
  castka_celkem = COALESCE(castka_vydaj, castka_prijem),
  ma_detail = IF(lp_kod IS NOT NULL, 1, 0);
```

### FÁZE 2: Backend API (PHP)

**Soubory k úpravě:**
1. `models/CashbookEntryModel.php` - CRUD operace s detail záznamy
2. `services/CashbookService.php` - Validace LP povinnosti
3. `services/BalanceCalculator.php` - Přepočet zůstatků
4. `lib/cashbookHandlers.php` - Endpoints
5. `validators/EntryValidator.php` - Validace LP kódů

**Klíčové změny:**

```php
// CashbookEntryModel.php
class CashbookEntryModel {
    
    // 🆕 Uložit hlavičku + detail
    public function createEntryWithDetails($bookId, $masterData, $detailItems) {
        $this->db->beginTransaction();
        try {
            // 1. Vložit hlavičku
            $entryId = $this->insertMasterEntry($bookId, $masterData);
            
            // 2. Vložit detail položky
            foreach ($detailItems as $idx => $item) {
                $this->insertDetailItem($entryId, $idx + 1, $item);
            }
            
            $this->db->commit();
            return $entryId;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    // 🆕 Načíst entry včetně detailů
    public function getEntryWithDetails($entryId) {
        $master = $this->getEntryById($entryId);
        $details = $this->getDetailItems($entryId);
        
        return [
            'master' => $master,
            'details' => $details
        ];
    }
    
    private function getDetailItems($entryId) {
        $stmt = $this->db->prepare("
            SELECT * FROM 25a_pokladni_polozky_detail
            WHERE polozka_id = ?
            ORDER BY poradi
        ");
        $stmt->execute([$entryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

```php
// EntryValidator.php
class EntryValidator {
    
    public function validateLpRequired($typDokladu, $detailItems) {
        // LP je POVINNÝ pouze pro VÝDAJE
        if ($typDokladu !== 'vydaj') {
            return true; // Pro příjmy není LP povinný
        }
        
        // Pro výdaje kontrolovat, že každá detail položka má LP
        foreach ($detailItems as $item) {
            if (empty($item['lp_kod'])) {
                throw new ValidationException('LP kód je povinný pro všechny výdaje');
            }
        }
        
        return true;
    }
    
    public function validateDetailsSum($masterCastka, $detailItems) {
        $sum = array_sum(array_column($detailItems, 'castka'));
        
        if (abs($sum - $masterCastka) > 0.01) {
            throw new ValidationException(
                "Součet detail položek ($sum) se neshoduje s celkovou částkou ($masterCastka)"
            );
        }
        
        return true;
    }
}
```

### FÁZE 3: Frontend React (CashBookPage.js)

**Klíčové změny:**

```javascript
// Stav pro multi-LP editaci
const [editingEntry, setEditingEntry] = useState(null);
const [detailItems, setDetailItems] = useState([]);

// 🆕 Komponenta pro editaci detail položek
const DetailItemsEditor = ({ items, onChange, typDokladu }) => {
  const addItem = () => {
    onChange([...items, {
      id: `temp_${Date.now()}`,
      popis: '',
      castka: 0,
      lp_kod: '',
      lp_popis: ''
    }]);
  };
  
  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  
  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;
    onChange(updated);
  };
  
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.castka) || 0), 0);
  
  return (
    <div>
      <h4>Detailní položky</h4>
      {items.map((item, idx) => (
        <div key={item.id || idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input 
            placeholder="Popis"
            value={item.popis}
            onChange={(e) => updateItem(idx, 'popis', e.target.value)}
            style={{ flex: 2 }}
          />
          <input 
            type="number"
            placeholder="Částka"
            value={item.castka}
            onChange={(e) => updateItem(idx, 'castka', e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            value={item.lp_kod}
            onChange={(e) => updateItem(idx, 'lp_kod', e.target.value)}
            style={{ flex: 1 }}
            required={typDokladu === 'vydaj'}
          >
            <option value="">-- Vyberte LP --</option>
            {lpKodyList.map(lp => (
              <option key={lp.cislo_lp} value={lp.cislo_lp}>
                {lp.cislo_lp} - {lp.nazev}
              </option>
            ))}
          </select>
          <button onClick={() => removeItem(idx)}>🗑️</button>
        </div>
      ))}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <button onClick={addItem}>+ Přidat položku</button>
        <strong>Celkem: {totalAmount.toFixed(2)} Kč</strong>
      </div>
    </div>
  );
};

// 🆕 Uložení entry s detaily
const saveEntryWithDetails = async (masterData, detailItems) => {
  try {
    // Validace
    if (masterData.typ_dokladu === 'vydaj' && detailItems.length === 0) {
      showToast('Výdaj musí mít alespoň jednu položku s LP kódem', 'error');
      return;
    }
    
    const totalAmount = detailItems.reduce((sum, item) => 
      sum + parseFloat(item.castka || 0), 0
    );
    
    if (Math.abs(totalAmount - parseFloat(masterData.castka_celkem)) > 0.01) {
      showToast('Součet položek se neshoduje s celkovou částkou', 'error');
      return;
    }
    
    // API call
    const result = await cashbookAPI.createEntryWithDetails(currentBookId, {
      ...masterData,
      castka_celkem: totalAmount,
      ma_detail: detailItems.length > 0
    }, detailItems);
    
    if (result.status === 'ok') {
      showToast('Záznam byl uložen', 'success');
      await reloadEntries();
    }
  } catch (error) {
    showToast('Chyba při ukládání: ' + error.message, 'error');
  }
};
```

### FÁZE 4: Přepočet LP

**Funkce pro agregaci výdajů podle LP kódů:**

```php
// services/LPCalculationService.php
class LPCalculationService {
    
    public function recalculateLPForBook($bookId) {
        // Agregovat všechny detail položky podle LP kódu
        $sql = "
            SELECT 
                d.lp_kod,
                SUM(d.castka) as celkem_vydano,
                COUNT(DISTINCT p.id) as pocet_dokladu,
                COUNT(d.id) as pocet_polozek
            FROM 25a_pokladni_polozky_detail d
            JOIN 25a_pokladni_polozky p ON p.id = d.polozka_id
            WHERE p.pokladni_kniha_id = ?
              AND p.typ_dokladu = 'vydaj'
              AND p.smazano = 0
              AND d.lp_kod IS NOT NULL
            GROUP BY d.lp_kod
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$bookId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function recalculateLPForAllBooks($userId) {
        // Pro všechny knihy uživatele
        $books = $this->getActiveBooks($userId);
        
        $results = [];
        foreach ($books as $book) {
            $results[$book['id']] = $this->recalculateLPForBook($book['id']);
        }
        
        return $results;
    }
}
```

### FÁZE 5: Přečíslování dokladů

**Úprava v `renumberAllFutureMonths()`:**

```javascript
// Frontend - CashBookPage.js
const renumberAllFutureMonths = async () => {
  // ... stávající kód ...
  
  for (const entry of sortedEntries) {
    // ⚠️ ZMĚNA: Přečíslovat pouze HLAVIČKU (master), ne detail položky
    // Detail položky sdílejí číslo dokladu s hlavičkou
    
    const hasIncome = entry.castka_prijem && parseFloat(entry.castka_prijem) > 0;
    const hasExpense = entry.castka_vydaj && parseFloat(entry.castka_vydaj) > 0;
    
    let newNumber = null;
    
    if (hasIncome && !hasExpense) {
      lastP++;
      newNumber = `P${String(lastP).padStart(3, '0')}`;
    } else if (hasExpense && !hasIncome) {
      lastV++;
      newNumber = `V${String(lastV).padStart(3, '0')}`;
    }
    
    if (newNumber && newNumber !== entry.cislo_dokladu) {
      console.log(`  🔄 ${entry.cislo_dokladu} → ${newNumber}`);
      await cashbookAPI.updateEntry(entry.id, {
        cislo_dokladu: newNumber
      });
      
      // 🆕 Aktualizovat i všechny detail položky (mají stejné číslo dokladu)
      // Backend automaticky propaguje změnu do detail tabulky
    }
  }
  
  return { success: true, lastP, lastV };
};
```

---

## 📊 MIGRACE DAT - VLIV NA EXISTUJÍCÍ DATA

### ⚠️ KRITICKÁ OTÁZKA: Ovlivní to stávající data?

**ODPOVĚĎ: ANO, ale bezpečně a zpětně kompatibilně**

### 🔒 Strategie bezpečné migrace:

#### **FÁZE A: Příprava (bez změny dat)**

1. **Vytvoření nové detail tabulky**
   ```sql
   CREATE TABLE `25a_pokladni_polozky_detail` (...);
   ```
   - ✅ Přidává novou tabulku
   - ✅ **NEOVLIVŇUJE** stávající data
   - ✅ Stávající aplikace funguje beze změny

2. **Přidání nových sloupců do master tabulky**
   ```sql
   ALTER TABLE `25a_pokladni_polozky`
     ADD COLUMN `castka_celkem` decimal(10,2) AFTER `komu_od_koho`,
     ADD COLUMN `ma_detail` tinyint(1) DEFAULT 0 AFTER `castka_celkem`;
   ```
   - ✅ Přidává sloupce s výchozími hodnotami
   - ✅ **NERUŠÍ** stávající sloupce (`castka_prijem`, `castka_vydaj`, `lp_kod`)
   - ✅ Stará data zůstávají nedotčená

#### **FÁZE B: Migrace dat (kopírování, ne přepisování)**

```sql
-- Krok 1: Naplnit nové sloupce hodnotami ze starých
UPDATE `25a_pokladni_polozky`
SET 
  castka_celkem = COALESCE(castka_vydaj, castka_prijem, 0),
  ma_detail = IF(lp_kod IS NOT NULL, 1, 0)
WHERE castka_celkem IS NULL;
```
- ✅ Pouze **KOPÍRUJE** data do nových sloupců
- ✅ Staré sloupce (`castka_prijem`, `castka_vydaj`, `lp_kod`) **ZŮSTÁVAJÍ NEDOTČENÉ**

```sql
-- Krok 2: Vytvořit detail záznamy z existujících LP kódů
INSERT INTO `25a_pokladni_polozky_detail` 
  (polozka_id, poradi, popis, castka, lp_kod, lp_popis, vytvoreno)
SELECT 
  id,
  1,
  obsah_zapisu,
  COALESCE(castka_vydaj, castka_prijem),
  lp_kod,
  lp_popis,
  NOW()
FROM `25a_pokladni_polozky`
WHERE lp_kod IS NOT NULL
  AND smazano = 0;
```
- ✅ **DUPLIKUJE** LP data do detail tabulky
- ✅ Originální záznamy v `25a_pokladni_polozky` **ZŮSTÁVAJÍ**
- ✅ Vytváří se nové záznamy v detail tabulce

#### **FÁZE C: Duální režim (přechodné období)**

**Backend bude podporovat OBA režimy:**

```php
// CashbookEntryModel.php
public function getEntry($entryId) {
    $entry = $this->getMasterEntry($entryId);
    
    // Zkontrolovat, jestli má nový formát (detail tabulka)
    if ($entry['ma_detail']) {
        $entry['details'] = $this->getDetailItems($entryId);
    } else {
        // ZPĚTNÁ KOMPATIBILITA: vytvořit detail z původních sloupců
        if ($entry['lp_kod']) {
            $entry['details'] = [[
                'popis' => $entry['obsah_zapisu'],
                'castka' => $entry['castka_celkem'],
                'lp_kod' => $entry['lp_kod'],
                'lp_popis' => $entry['lp_popis']
            ]];
        }
    }
    
    return $entry;
}
```

**Frontend zobrazí data OBA formáty správně:**
- Staré záznamy (před migrací) → zobrazí jako jednoduchý záznam
- Nové záznamy (po migraci) → zobrazí s detaily

---

### 🛡️ BEZPEČNOSTNÍ OPATŘENÍ

#### 1. **Zachování původních sloupců (minimálně 6 měsíců)**

```sql
-- NE! (nebezpečné)
ALTER TABLE `25a_pokladni_polozky` DROP COLUMN `lp_kod`;

-- ANO! (bezpečné)
ALTER TABLE `25a_pokladni_polozky` 
  MODIFY COLUMN `lp_kod` varchar(50) DEFAULT NULL 
  COMMENT 'DEPRECATED - use 25a_pokladni_polozky_detail';
```

- ✅ Sloupce `lp_kod`, `lp_popis` označeny jako DEPRECATED
- ✅ Data v nich **ZŮSTÁVAJÍ** pro případ rollbacku
- ✅ Smazání až po 6 měsících stabilního provozu

#### 2. **Database Backup PŘED migrací**

```bash
# Automatický backup před migrací
mysqldump -u root -p eeo2025 \
  25a_pokladni_polozky \
  25a_pokladni_knihy \
  25a_pokladni_audit \
  > backup_cashbook_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

#### 3. **Rollback plán**

```sql
-- V případě problémů: ROLLBACK
-- Krok 1: Smazat detail tabulku
DROP TABLE IF EXISTS `25a_pokladni_polozky_detail`;

-- Krok 2: Vrátit původní sloupce
ALTER TABLE `25a_pokladni_polozky`
  DROP COLUMN `castka_celkem`,
  DROP COLUMN `ma_detail`;

-- Krok 3: Obnovit z backupu (pokud nutné)
mysql -u root -p eeo2025 < backup_cashbook_before_migration_*.sql
```

---

### 📋 VLIV NA KONKRÉTNÍ DATA

#### Příklad: Současný stav DB

```
25a_pokladni_polozky:
┌────┬────────────┬────────────────┬─────────┬────────────┬─────────┐
│ id │ cislo_dokl │ obsah_zapisu   │ castka_v│ lp_kod     │ smazano │
├────┼────────────┼────────────────┼─────────┼────────────┼─────────┤
│ 1  │ V599-005   │ Kancelář       │ 1820.00 │ LPIT1      │ 0       │
│ 2  │ V599-006   │ Ochranné pom.  │ 2789.00 │ LPIE1      │ 0       │
│ 3  │ P499-002   │ Dotace pokl.   │ 10000.00│ NULL       │ 0       │
└────┴────────────┴────────────────┴─────────┴────────────┴─────────┘
```

#### Po migraci: Oba režimy existují

```
25a_pokladni_polozky (master):
┌────┬────────────┬────────────────┬──────────────┬───────────┬─────────┬─────────┐
│ id │ cislo_dokl │ obsah_zapisu   │ castka_celkem│ ma_detail │ lp_kod  │ smazano │
├────┼────────────┼────────────────┼──────────────┼───────────┼─────────┼─────────┤
│ 1  │ V599-005   │ Kancelář       │ 1820.00      │ 1         │ LPIT1   │ 0       │ ← migrováno
│ 2  │ V599-006   │ Ochranné pom.  │ 2789.00      │ 1         │ LPIE1   │ 0       │ ← migrováno
│ 3  │ P499-002   │ Dotace pokl.   │ 10000.00     │ 0         │ NULL    │ 0       │ ← beze změny
└────┴────────────┴────────────────┴──────────────┴───────────┴─────────┴─────────┘
                                                                   ↑
                                                           stále existuje (DEPRECATED)

25a_pokladni_polozky_detail (nová tabulka):
┌────┬────────────┬────────┬────────────────┬─────────┬─────────┐
│ id │ polozka_id │ poradi │ popis          │ castka  │ lp_kod  │
├────┼────────────┼────────┼────────────────┼─────────┼─────────┤
│ 1  │ 1          │ 1      │ Kancelář       │ 1820.00 │ LPIT1   │ ← zkopírováno
│ 2  │ 2          │ 1      │ Ochranné pom.  │ 2789.00 │ LPIE1   │ ← zkopírováno
└────┴────────────┴────────┴────────────────┴─────────┴─────────┘
```

**Poznámky:**
- ✅ ID záznamů se **NEMĚNÍ**
- ✅ Číslování dokladů **ZACHOVÁNO**
- ✅ Originální data v `lp_kod` sloupci **ZŮSTÁVAJÍ** (pro jistotu)
- ✅ Nové záznamy v detail tabulce jsou **KOPIE**

#### Po vytvoření nového složeného dokladu (uživatelem):

```
25a_pokladni_polozky:
┌────┬────────────┬────────────────┬──────────────┬───────────┬─────────┐
│ id │ cislo_dokl │ obsah_zapisu   │ castka_celkem│ ma_detail │ lp_kod  │
├────┼────────────┼────────────────┼──────────────┼───────────┼─────────┤
│ 4  │ V599-007   │ Vybavení IT    │ 5320.00      │ 1         │ NULL    │ ← nový formát
└────┴────────────┴────────────────┴──────────────┴───────────┴─────────┘
                                                                   ↑
                                                            už se nepoužívá

25a_pokladni_polozky_detail:
┌────┬────────────┬────────┬────────────────┬─────────┬─────────┐
│ id │ polozka_id │ poradi │ popis          │ castka  │ lp_kod  │
├────┼────────────┼────────┼────────────────┼─────────┼─────────┤
│ 3  │ 4          │ 1      │ Monitor 27"    │ 3500.00 │ LPIT1   │
│ 4  │ 4          │ 2      │ Klávesnice     │ 820.00  │ LPIT4   │
│ 5  │ 4          │ 3      │ Myš            │ 1000.00 │ LPIT1   │
└────┴────────────┴────────┴────────────────┴─────────┴─────────┘
                                              ↑
                                    Více LP kódů pod jedním dokladem!
```

---

### ✅ CO SE NESTANE (záruky):

1. ❌ **Neztratí se žádná data** - vše se kopíruje, ne přepisuje
2. ❌ **Nezmění se ID záznamů** - všechny `id` zůstávají stejné
3. ❌ **Nezmění se čísla dokladů** - P001, V599-005 atd. zůstávají
4. ❌ **Nezmění se zůstatky** - přepočítávají se stejným algoritmem
5. ❌ **Neporuší se uzavřené měsíce** - migrují se i s jejich stavem
6. ❌ **Neztratí se audit log** - tabulka `25a_pokladni_audit` nedotčena

---

### 🎯 ZÁVĚR: MIGRACE JE BEZPEČNÁ

| Aspekt | Riziko | Ochrana |
|--------|--------|---------|
| Ztráta dat | ⚠️ STŘEDNÍ | ✅ Automatický backup před migrací |
| Poškození existujících záznamů | 🟢 NÍZKÉ | ✅ Pouze přidávání, ne mazání sloupců |
| Nemožnost rollbacku | 🟢 NÍZKÉ | ✅ Deprecated sloupce zachovány 6 měsíců |
| Konflikt s běžícím systémem | ⚠️ STŘEDNÍ | ✅ Migrace mimo provozní hodiny |
| Chybný přepočet zůstatků | 🟢 NÍZKÉ | ✅ Validace před/po migraci |

---

### 📅 DOPORUČENÝ POSTUP MIGRACE

1. **Pátek večer** (18:00): Oznámení uživatelům o plánované údržbě
2. **Pátek večer** (20:00): Automatický DB backup
3. **Pátek večer** (20:15): Spuštění migračního skriptu (15-30 min)
4. **Pátek večer** (21:00): Validace dat, testování
5. **Sobota ráno** (8:00): Monitoring, kontrola logů
6. **Pondělí** (9:00): Uživatelé začínají pracovat s novým systémem

**Fallback**: Pokud problém → rollback do nedělního večera

---

### Scénáře migrace (detailně):

1. **Existující jednoduchý záznam** (1 LP kód):
   - Zkopírovat do detail tabulky jako 1 položka
   - `ma_detail = 1`
   - Původní `lp_kod` sloupec ponechat (DEPRECATED)

2. **Existující záznam BEZ LP** (příjmy):
   - Ponechat bez detailů
   - `ma_detail = 0`
   - Nic nekopírovat do detail tabulky

3. **Nové složené záznamy** (po migraci):
   - Vytvořit hlavičku + N detail položek
   - Součet detailů = `castka_celkem`
   - Sloupec `lp_kod` ponechat prázdný (NULL)

---

## ✅ KONTROLNÍ SEZNAM

### Backend:
- [ ] Vytvořit migrační SQL skript
- [ ] Upravit `CashbookEntryModel` pro master-detail
- [ ] Přidat validaci LP povinnosti
- [ ] Upravit API endpoints (create, update, delete)
- [ ] Implementovat LP přepočet
- [ ] Upravit přečíslování dokladů
- [ ] Unit testy

### Frontend:
- [ ] Komponenta `DetailItemsEditor`
- [ ] UI pro přidání/odebrání položek
- [ ] Validace součtu částek
- [ ] Dropdown pro výběr LP kódu
- [ ] Zobrazení složených dokladů v tabulce
- [ ] Editace existujících složených dokladů

### Testování:
- [ ] Vytvoření jednoduchého dokladu (1 LP)
- [ ] Vytvoření složeného dokladu (více LP)
- [ ] Vytvoření příjmu bez LP
- [ ] Přečíslování dokladů
- [ ] Uzavření měsíce
- [ ] Přepočet LP agregace
- [ ] Migrace starých dat

---

## 💰 CENOVÝ ODHAD

### Časová náročnost po fázích:

| Fáze | Popis | Čas (hod) | Poznámka |
|------|-------|-----------|----------|
| **FÁZE 1** | DB Migrace | 4-6 h | SQL skript + testování migrace |
| | - Návrh DB struktury | 1 h | |
| | - Vytvoření SQL migračního skriptu | 2 h | |
| | - Testování migrace na testovacích datech | 1-2 h | |
| | - Backup strategie | 1 h | |
| **FÁZE 2** | Backend API (PHP) | 10-14 h | 5 souborů + validace |
| | - CashbookEntryModel.php | 3-4 h | CRUD pro master-detail |
| | - EntryValidator.php | 2 h | Validace LP, součtů |
| | - CashbookService.php | 2-3 h | Business logika |
| | - cashbookHandlers.php | 2-3 h | API endpoints |
| | - Unit testy backend | 2 h | |
| **FÁZE 3** | Frontend React | 12-16 h | Komponenty + UI/UX |
| | - DetailItemsEditor komponenta | 4-5 h | Multi-položky editor |
| | - CashBookPage.js úpravy | 3-4 h | Integrace editoru |
| | - UI pro zobrazení složených dokladů | 2-3 h | Expandable rows |
| | - LP dropdown + autocomplete | 2 h | |
| | - Validace na FE | 1-2 h | |
| **FÁZE 4** | LP Přepočet | 3-4 h | Agregace + reporting |
| | - LPCalculationService.php | 2-3 h | Agregace podle LP kódů |
| | - API endpoint pro LP summary | 1 h | |
| **FÁZE 5** | Přečíslování + Finalizace | 3-4 h | Upgrade stávající funkce |
| | - Úprava renumberAllFutureMonths() | 2 h | Zachovat detail vztahy |
| | - Testování přečíslování | 1-2 h | |
| **TESTOVÁNÍ** | Komplexní testování | 6-8 h | E2E + regrese |
| | - Testování CRUD operací | 2 h | |
| | - Testování edge cases | 2 h | |
| | - Regresní testy (uzavření, přečíslování) | 2-3 h | |
| **DOKUMENTACE** | Uživatelská dokumentace | 2 h | Návod pro EKO pokladní |

**Celkem: 40-54 hodin** ≈ **5-7 pracovních dní**

---

### Nákladová kalkulace (hodinová sazba):

| Profil | Sazba | Hodiny | Cena |
|--------|-------|--------|------|
| Senior Full-Stack Developer | 1200 Kč/h | 40-54 h | **48 000 - 64 800 Kč** |

**Střední odhad**: **~56 000 Kč** (47 hodin × 1200 Kč)

---

### Alternativní struktura (menší tým):

| Role | Sazba | Hodiny | Cena |
|------|-------|--------|------|
| Backend Developer | 1000 Kč/h | 20 h | 20 000 Kč |
| Frontend Developer | 1100 Kč/h | 20 h | 22 000 Kč |
| QA Tester | 700 Kč/h | 8 h | 5 600 Kč |
| **Celkem** | | **48 h** | **47 600 Kč** |

---

### Rizikový buffer:

| Položka | % | Částka |
|---------|---|--------|
| Základní vývoj | 100% | 56 000 Kč |
| **Rizikový buffer** (komplexní migrace dat) | +20% | +11 200 Kč |
| **CELKEM s rezervou** | | **67 200 Kč** |

---

### Dodatečné náklady (volitelné):

| Položka | Cena | Poznámka |
|---------|------|----------|
| Code review senior architektem | 3 600 Kč | 3h × 1200 Kč |
| Produkční deployment + monitoring | 4 800 Kč | 4h × 1200 Kč |
| Školení uživatelů (EKO pokladní) | 2 400 Kč | 2h × 1200 Kč |
| **Celkem dodatečné** | **10 800 Kč** | |

---

### 🎯 FINÁLNÍ CENA:

| Varianta | Cena | Zahrnuje |
|----------|------|----------|
| **Základní** | **56 000 Kč** | Vývoj + základní testování |
| **S rezervou** | **67 200 Kč** | + 20% buffer na rizika |
| **Premium** | **78 000 Kč** | + code review + deployment + školení |

---

### Rozložení nákladů:

```
DB Migrace (10%)      ██░░░░░░░░  5 600 Kč
Backend API (30%)     ██████░░░░  16 800 Kč
Frontend React (35%)  ███████░░░  19 600 Kč
LP Přepočet (7%)      █░░░░░░░░░  3 920 Kč
Přečíslování (7%)     █░░░░░░░░░  3 920 Kč
Testování (11%)       ██░░░░░░░░  6 160 Kč
```

---

### Return on Investment (ROI):

**Přínosy:**
- ✅ Automatizace LP evidence → úspora **~2 hod/měsíc** manuální práce
- ✅ Eliminace chyb v LP přiřazení → snížení revizí
- ✅ Lepší přehled o čerpání LP → rychlejší reporting
- ✅ Splnění požadavků EKO oddělení

**ROI break-even**: ~6-8 měsíců (při úspoře 2h/měsíc × 800 Kč/h = 1600 Kč/měsíc)

---

## 🎯 DOPORUČENÍ

1. **Priorita**: VYSOKÁ - zásadní funkcionalita pro EKO pokladní
2. **Složitost**: STŘEDNÍ - vyžaduje DB změny + BE + FE úpravy
3. **Čas**: ~5-7 pracovních dní (40-54 hodin)
4. **Náklady**: **56 000 - 78 000 Kč** (dle varianty)
5. **Riziko**: NÍZKÉ - hierarchická struktura je standard, dobře testovatelná
6. **ROI**: 6-8 měsíců

---

## 🚀 NEXT STEPS

1. ✅ Vytvořit tento dokument (hotovo)
2. ⏳ Review požadavků s uživatelem
3. ⏳ Schválit návrh DB struktury
4. ⏳ Vytvořit migrační SQL skript
5. ⏳ Implementovat backend API
6. ⏳ Implementovat frontend UI
7. ⏳ Testování na testovacích datech
8. ⏳ Migrace produkčních dat
9. ⏳ Deployment

---

**Otázky k zodpovězení:**
1. Má být možné editovat LP kód existujícího dokladu?
2. Má se LP kód automaticky doplňovat z číselníku?
3. Má být omezení na maximální počet podpoložek?
4. Má se historie změn LP kódů logovat v audit tabulce?
