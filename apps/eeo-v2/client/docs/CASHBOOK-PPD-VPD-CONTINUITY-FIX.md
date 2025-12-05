# 🔢 CASHBOOK: Kontinuita PPD/VPD číslování a přepočet

**Datum:** 9. listopadu 2025  
**Status:** ⚠️ POŽADAVEK NA IMPLEMENTACI

---

## 🎯 POŽADAVKY

### 1. **Kontinuita číselné řady napříč měsíci v rámci roku**

✅ **JE JIŽ IMPLEMENTOVÁNO** - Číslování běží per-user per-year, NE per-měsíc.

**Příklad:**
```
Říjen 2025:
- PPD 050, 051, 052, 053

Listopad 2025 (pokračování):
- PPD 054, 055, 056, ... ✅ SPRÁVNĚ
```

**SQL dotaz v BE:**
```sql
SELECT COALESCE(MAX(p.cislo_poradi_v_roce), 0) + 1 AS next_number
FROM 25a_pokladni_polozky p
JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
WHERE k.uzivatel_id = :userId 
  AND k.rok = :year  -- ← KLÍČ: Rok, NE měsíc!
  AND p.typ_dokladu = :docType
  AND p.smazano = 0
```

---

### 2. **Zohlednit počáteční číslo (`vpd_od_cislo`, `ppd_od_cislo`)**

❌ **CHYBÍ** - Backend používá `COALESCE(MAX(...), 0) + 1`, což ignoruje počáteční stav.

**Problém:**
```
Nastavení: ppd_od_cislo = 50
První doklad: P491-001 ❌ ŠPATNĚ
Mělo by být: P491-050 ✅ SPRÁVNĚ
```

**Řešení:** Backend musí použít:
```sql
SELECT COALESCE(
    MAX(p.cislo_poradi_v_roce), 
    :startingNumber - 1  -- ← vpd_od_cislo nebo ppd_od_cislo z tabulky 25a_pokladny_uzivatele
) + 1 AS next_number
FROM 25a_pokladni_polozky p
JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
WHERE k.uzivatel_id = :userId 
  AND k.rok = :year
  AND p.typ_dokladu = :docType
  AND p.smazano = 0
```

**Kde vzít `startingNumber`?**
```sql
-- Najít aktivní přiřazení pokladny pro knihu
SELECT 
    pu.vpd_od_cislo,
    pu.ppd_od_cislo,
    pu.ciselna_rada_vpd,
    pu.ciselna_rada_ppd
FROM 25a_pokladni_knihy k
JOIN 25a_pokladny_uzivatele pu ON k.prirazeni_pokladny_id = pu.id
WHERE k.id = :bookId
  AND pu.aktivni = 1
```

---

### 3. **Přepočet PPD/VPD po uzavření předchozího měsíce**

❌ **NEIMPLEMENTOVÁNO** - Když je předchozí měsíc otevřený a přidávám doklady do aktuálního měsíce, čísla mohou být nesprávná.

**Scénář:**
```
STAV:
- Říjen 2025: AKTIVNÍ (ne uzavřený)
  * PPD: 050, 051, 052
- Listopad 2025: AKTIVNÍ
  * PPD: 053, 054, 055 (backend přiřadil)

AKCE:
Uživatel uzavře říjen → přidá do října PPD 056

PROBLÉM:
Listopad má PPD 053-055, ale měsíc říjen má vyšší číslo (056)!

ŘEŠENÍ:
Po uzavření října backend MUSÍ PŘEPOČÍTAT listopad:
- Původní listopad: 053, 054, 055
- Nový listopad: 057, 058, 059 ✅ SPRÁVNĚ
```

---

## 🔧 IMPLEMENTACE BACKENDU

### Krok 1: Upravit `getNextDocumentNumber()`

**Soubor:** `CashbookService.php` nebo ekvivalent

**Změna:**
```php
private function getNextDocumentNumber($bookId, $documentType) {
    // 1. Načíst knihu a přiřazení pokladny
    $book = $this->db->fetchOne("
        SELECT k.uzivatel_id, k.rok, k.prirazeni_pokladny_id
        FROM 25a_pokladni_knihy k
        WHERE k.id = ?
    ", [$bookId]);
    
    if (!$book) {
        throw new Exception('Kniha nenalezena');
    }
    
    // 2. Načíst počáteční číslo z přiřazení pokladny
    $assignment = $this->db->fetchOne("
        SELECT vpd_od_cislo, ppd_od_cislo
        FROM 25a_pokladny_uzivatele
        WHERE id = ? AND aktivni = 1
    ", [$book['prirazeni_pokladny_id']]);
    
    if (!$assignment) {
        throw new Exception('Přiřazení pokladny nenalezeno');
    }
    
    // 3. Určit startovní číslo podle typu dokladu
    $startingNumber = $documentType === 'prijem' 
        ? (int)$assignment['ppd_od_cislo']
        : (int)$assignment['vpd_od_cislo'];
    
    // Pokud není nastaveno, použít default 1
    if ($startingNumber < 1) {
        $startingNumber = 1;
    }
    
    // 4. Najít MAX číslo v roce PRO DANÉHO UŽIVATELE
    $result = $this->db->fetchOne("
        SELECT COALESCE(
            MAX(p.cislo_poradi_v_roce), 
            :startingNumber - 1
        ) + 1 AS next_number
        FROM 25a_pokladni_polozky p
        JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
        WHERE k.uzivatel_id = :userId 
          AND k.rok = :year
          AND p.typ_dokladu = :docType
          AND p.smazano = 0
    ", [
        'userId' => $book['uzivatel_id'],
        'year' => $book['rok'],
        'docType' => $documentType,
        'startingNumber' => $startingNumber
    ]);
    
    return (int)$result['next_number'];
}
```

**Vysvětlení:**
- ✅ Pokud je MAX = NULL (žádné doklady), vrátí `(startingNumber - 1) + 1 = startingNumber`
- ✅ Pokud je MAX = 52, vrátí `52 + 1 = 53`
- ✅ Pokud je ppd_od_cislo = 50 a žádné doklady, první bude 50
- ✅ Pokud je ppd_od_cislo = 1 a žádné doklady, první bude 1

---

### Krok 2: Funkce pro přepočet dokladů v následujících měsících

**Funkce:** `recalculateDocumentNumbersAfterMonth()`

```php
/**
 * Přepočítat čísla dokladů v měsících NÁSLEDUJÍCÍCH po uzavřeném měsíci
 * 
 * @param int $bookId ID uzavřené knihy
 * @return array ['recalculated_months' => [], 'affected_entries' => int]
 */
public function recalculateDocumentNumbersAfterMonth($bookId) {
    try {
        $this->db->beginTransaction();
        
        // 1. Načíst uzavřenou knihu
        $closedBook = $this->db->fetchOne("
            SELECT k.uzivatel_id, k.rok, k.mesic, k.prirazeni_pokladny_id
            FROM 25a_pokladni_knihy k
            WHERE k.id = ?
        ", [$bookId]);
        
        if (!$closedBook) {
            throw new Exception('Kniha nenalezena');
        }
        
        $userId = $closedBook['uzivatel_id'];
        $year = $closedBook['rok'];
        $closedMonth = $closedBook['mesic'];
        
        // 2. Načíst počáteční čísla z přiřazení
        $assignment = $this->db->fetchOne("
            SELECT vpd_od_cislo, ppd_od_cislo
            FROM 25a_pokladny_uzivatele
            WHERE id = ? AND aktivni = 1
        ", [$closedBook['prirazeni_pokladny_id']]);
        
        $vpdStart = (int)$assignment['vpd_od_cislo'] ?: 1;
        $ppdStart = (int)$assignment['ppd_od_cislo'] ?: 1;
        
        // 3. Najít MAX čísla v uzavřeném měsíci a předchozích
        $maxVPD = $this->getMaxDocumentNumberUpToMonth($userId, $year, $closedMonth, 'vydaj');
        $maxPPD = $this->getMaxDocumentNumberUpToMonth($userId, $year, $closedMonth, 'prijem');
        
        // Pokud žádné doklady, použít startovní - 1
        $nextVPD = max($maxVPD, $vpdStart - 1) + 1;
        $nextPPD = max($maxPPD, $ppdStart - 1) + 1;
        
        // 4. Přečíslovat následující měsíce (closedMonth + 1 až 12)
        $recalculatedMonths = [];
        $affectedEntries = 0;
        
        for ($month = $closedMonth + 1; $month <= 12; $month++) {
            // Najít knihu pro daný měsíc
            $futureBook = $this->db->fetchOne("
                SELECT id 
                FROM 25a_pokladni_knihy 
                WHERE uzivatel_id = ? AND rok = ? AND mesic = ?
            ", [$userId, $year, $month]);
            
            if (!$futureBook) {
                continue; // Kniha neexistuje, přeskočit
            }
            
            // Přečíslovat VPD doklady v tomto měsíci
            $vpdCount = $this->renumberEntriesInMonth(
                $futureBook['id'], 
                'vydaj', 
                $nextVPD
            );
            $nextVPD += $vpdCount;
            
            // Přečíslovat PPD doklady v tomto měsíci
            $ppdCount = $this->renumberEntriesInMonth(
                $futureBook['id'], 
                'prijem', 
                $nextPPD
            );
            $nextPPD += $ppdCount;
            
            if ($vpdCount > 0 || $ppdCount > 0) {
                $recalculatedMonths[] = $month;
                $affectedEntries += ($vpdCount + $ppdCount);
            }
        }
        
        $this->db->commit();
        
        return [
            'status' => 'ok',
            'recalculated_months' => $recalculatedMonths,
            'affected_entries' => $affectedEntries
        ];
        
    } catch (Exception $e) {
        $this->db->rollBack();
        throw $e;
    }
}

/**
 * Najít MAX číslo dokladu do určitého měsíce (včetně)
 */
private function getMaxDocumentNumberUpToMonth($userId, $year, $upToMonth, $docType) {
    $result = $this->db->fetchOne("
        SELECT COALESCE(MAX(p.cislo_poradi_v_roce), 0) AS max_number
        FROM 25a_pokladni_polozky p
        JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
        WHERE k.uzivatel_id = ?
          AND k.rok = ?
          AND k.mesic <= ?
          AND p.typ_dokladu = ?
          AND p.smazano = 0
    ", [$userId, $year, $upToMonth, $docType]);
    
    return (int)$result['max_number'];
}

/**
 * Přečíslovat položky v konkrétním měsíci
 * Vrací počet přečíslovaných položek
 */
private function renumberEntriesInMonth($bookId, $docType, &$startNumber) {
    // Načíst položky v pořadí podle data a ID
    $entries = $this->db->fetchAll("
        SELECT id, cislo_poradi_v_roce
        FROM 25a_pokladni_polozky
        WHERE pokladni_kniha_id = ?
          AND typ_dokladu = ?
          AND smazano = 0
        ORDER BY datum_zapisu ASC, id ASC
    ", [$bookId, $docType]);
    
    $count = 0;
    foreach ($entries as $entry) {
        // Přečíslovat pouze pokud se číslo změnilo
        if ((int)$entry['cislo_poradi_v_roce'] !== $startNumber) {
            $this->db->execute("
                UPDATE 25a_pokladni_polozky
                SET cislo_poradi_v_roce = ?
                WHERE id = ?
            ", [$startNumber, $entry['id']]);
            
            // Aktualizovat i cislo_dokladu (format: V591-XXX nebo P491-XXX)
            // TODO: Potřeba znát ciselna_rada_vpd/ppd z přiřazení
            $this->updateDocumentNumber($entry['id'], $startNumber, $docType);
            
            $count++;
        }
        $startNumber++;
    }
    
    return $count;
}

/**
 * Aktualizovat cislo_dokladu podle cislo_poradi_v_roce
 */
private function updateDocumentNumber($entryId, $orderNumber, $docType) {
    // Načíst přiřazení pokladny pro danou položku
    $entry = $this->db->fetchOne("
        SELECT p.id, k.prirazeni_pokladny_id
        FROM 25a_pokladni_polozky p
        JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
        WHERE p.id = ?
    ", [$entryId]);
    
    $assignment = $this->db->fetchOne("
        SELECT ciselna_rada_vpd, ciselna_rada_ppd
        FROM 25a_pokladny_uzivatele
        WHERE id = ? AND aktivni = 1
    ", [$entry['prirazeni_pokladny_id']]);
    
    // Načíst globální nastavení prefix
    $usePrefix = $this->getSetting('cashbook_use_prefix') == '1';
    
    // Vytvořit cislo_dokladu
    $letter = $docType === 'prijem' ? 'P' : 'V';
    
    if ($usePrefix && $assignment) {
        $prefix = $docType === 'prijem' 
            ? $assignment['ciselna_rada_ppd']
            : $assignment['ciselna_rada_vpd'];
        
        $documentNumber = sprintf('%s%s-%03d', $letter, $prefix, $orderNumber);
        // Příklad: V591-057
    } else {
        $documentNumber = sprintf('%s%03d', $letter, $orderNumber);
        // Příklad: V057
    }
    
    $this->db->execute("
        UPDATE 25a_pokladni_polozky
        SET cislo_dokladu = ?
        WHERE id = ?
    ", [$documentNumber, $entryId]);
}
```

---

### Krok 3: Volat přepočet po uzavření měsíce

**Endpoint:** `/cashbook-close-month`

**Před:**
```php
public function closeMonth($bookId) {
    // Zavřít měsíc
    $this->db->execute("
        UPDATE 25a_pokladni_knihy
        SET stav_knihy = 'uzavrena_uzivatelem'
        WHERE id = ?
    ", [$bookId]);
    
    return ['status' => 'ok'];
}
```

**Po:**
```php
public function closeMonth($bookId) {
    $this->db->beginTransaction();
    
    try {
        // 1. Zavřít měsíc
        $this->db->execute("
            UPDATE 25a_pokladni_knihy
            SET stav_knihy = 'uzavrena_uzivatelem'
            WHERE id = ?
        ", [$bookId]);
        
        // 2. PŘEPOČÍTAT následující měsíce
        $recalcResult = $this->recalculateDocumentNumbersAfterMonth($bookId);
        
        $this->db->commit();
        
        return [
            'status' => 'ok',
            'message' => 'Měsíc byl uzavřen',
            'recalculation' => $recalcResult
        ];
        
    } catch (Exception $e) {
        $this->db->rollBack();
        throw $e;
    }
}
```

---

## 🎨 FRONTEND VAROVÁNÍ

### Krok 4: Zobrazit warning když předchozí měsíc není uzavřený

**Soubor:** `CashBookPage.js`

**Logika:**
```javascript
// Zkontrolovat, zda předchozí měsíc je uzavřený
const checkPreviousMonthStatus = useCallback(async () => {
  if (!currentBook || !userId) return;
  
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  try {
    const result = await cashbookAPI.listBooks(userId, prevYear, prevMonth);
    
    if (result.status === 'ok' && result.data?.books?.length > 0) {
      const prevBook = result.data.books[0];
      
      // Pokud je předchozí měsíc AKTIVNÍ (ne uzavřený)
      if (prevBook.stav_knihy === 'aktivni') {
        setShowPreviousMonthWarning(true);
      } else {
        setShowPreviousMonthWarning(false);
      }
    }
  } catch (error) {
    console.error('Chyba při kontrole předchozího měsíce:', error);
  }
}, [userId, currentYear, currentMonth, currentBook]);

useEffect(() => {
  checkPreviousMonthStatus();
}, [checkPreviousMonthStatus]);
```

**Warning Box komponenta:**
```javascript
const PreviousMonthWarning = styled.div`
  background: linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%);
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
  
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  
  @media print {
    display: none;
  }
`;

const WarningIcon = styled.div`
  font-size: 1.5rem;
  color: #ff9800;
  line-height: 1;
  margin-top: 0.25rem;
`;

const WarningContent = styled.div`
  flex: 1;
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #f57c00;
    font-size: 1rem;
    font-weight: 600;
  }
  
  p {
    margin: 0.25rem 0;
    color: #5d4037;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  
  strong {
    color: #e65100;
  }
`;
```

**JSX:**
```jsx
{showPreviousMonthWarning && (
  <PreviousMonthWarning>
    <WarningIcon>
      <FontAwesomeIcon icon={faExclamationTriangle} />
    </WarningIcon>
    <WarningContent>
      <h4>⚠️ Předchozí měsíc není uzavřený</h4>
      <p>
        <strong>Pozor:</strong> Předchozí měsíc ({new Date(
          currentMonth === 1 ? currentYear - 1 : currentYear,
          (currentMonth === 1 ? 12 : currentMonth - 1) - 1
        ).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}) 
        není uzavřen.
      </p>
      <p>
        Čísla dokladů PPD a VPD v tomto měsíci se mohou po uzavření předchozího měsíce 
        <strong> automaticky přepočítat</strong> pro zachování správné posloupnosti.
      </p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
        💡 Doporučujeme nejprve uzavřít předchozí měsíce chronologicky od nejstaršího.
      </p>
    </WarningContent>
  </PreviousMonthWarning>
)}
```

---

## ✅ TESTOVACÍ SCÉNÁŘE

### Test 1: Počáteční číslo PPD = 50

**Setup:**
- Pokladna: ppd_od_cislo = 50
- Rok: 2025
- Žádné doklady v roce 2025

**Akce:** Vytvořit první příjem v lednu 2025

**Očekávaný výsledek:**
- První doklad: `P491-050` ✅
- Druhý doklad: `P491-051` ✅

---

### Test 2: Kontinuita napříč měsíci

**Setup:**
- Pokladna: ppd_od_cislo = 50
- Říjen 2025: PPD 050, 051, 052
- Říjen: UZAVŘEN

**Akce:** Vytvořit první příjem v listopadu 2025

**Očekávaný výsledek:**
- Listopad první doklad: `P491-053` ✅ (pokračuje, NE reset na 050)

---

### Test 3: Přepočet po uzavření předchozího měsíce

**Setup:**
- Říjen 2025: AKTIVNÍ (NE uzavřený)
  * PPD: 050, 051, 052
- Listopad 2025: AKTIVNÍ
  * PPD: 053, 054, 055 (přidáno dříve)

**Akce:**
1. Přidat do října PPD 056
2. Uzavřít říjen

**Očekávaný výsledek:**
- Backend automaticky přepočítá listopad:
  * Nový listopad PPD: 057, 058, 059 ✅
- Response obsahuje:
  ```json
  {
    "status": "ok",
    "message": "Měsíc byl uzavřen",
    "recalculation": {
      "recalculated_months": [11],
      "affected_entries": 3
    }
  }
  ```

---

### Test 4: Frontend warning - předchozí měsíc otevřený

**Setup:**
- Říjen 2025: AKTIVNÍ (NE uzavřený)
- Listopad 2025: AKTIVNÍ (aktuálně zobrazený)

**Očekávaný výsledek:**
- Zobrazí se žlutý warning box:
  ```
  ⚠️ Předchozí měsíc není uzavřený
  
  Pozor: Předchozí měsíc (říjen 2025) není uzavřen.
  
  Čísla dokladů PPD a VPD v tomto měsíci se mohou po uzavření 
  předchozího měsíce automaticky přepočítat pro zachování 
  správné posloupnosti.
  
  💡 Doporučujeme nejprve uzavřít předchozí měsíce chronologicky.
  ```

---

## 📋 CHECKLIST IMPLEMENTACE

### Backend

- [ ] Upravit `getNextDocumentNumber()` - zohlednit `vpd_od_cislo` a `ppd_od_cislo`
- [ ] Vytvořit `recalculateDocumentNumbersAfterMonth()` - přepočet následujících měsíců
- [ ] Vytvořit `getMaxDocumentNumberUpToMonth()` - najít MAX do daného měsíce
- [ ] Vytvořit `renumberEntriesInMonth()` - přečíslovat položky v měsíci
- [ ] Vytvořit `updateDocumentNumber()` - aktualizovat cislo_dokladu
- [ ] Upravit `/cashbook-close-month` - volat přepočet po uzavření
- [ ] Testovat všechny 4 scénáře výše

### Frontend

- [ ] Přidat state `showPreviousMonthWarning`
- [ ] Vytvořit `checkPreviousMonthStatus()` - kontrola předchozího měsíce
- [ ] Vytvořit styled komponenty: `PreviousMonthWarning`, `WarningIcon`, `WarningContent`
- [ ] Zobrazit warning pokud předchozí měsíc je AKTIVNÍ
- [ ] Testovat zobrazení warning v browseru

---

## 📚 SOUVISEJÍCÍ DOKUMENTACE

- `add_pocatecni_stav_fields.sql` - SQL pro přidání vpd_od_cislo/ppd_od_cislo
- `CASHBOOK-BE-MISSING-POCATECNI-STAV-FIELDS.md` - Původní požadavek na počáteční stav
- `docs/CASHBOOK-DB-MIGRATION-ANALYSIS.md` - Analýza DB struktury a číslování

---

**Status:** ⏳ Čeká na BE implementaci + FE warning box
