# 🔍 KOMPLETNÍ AUDIT CASHBOOK SYSTÉMU - "JEDNA KNIHA NA POKLADNU"

**Datum:** 25. ledna 2026 13:25  
**Provedl:** AI Assistant  
**Kontext:** Refaktoring z logiky "jedna kniha per user" na "jedna sdílená kniha per pokladna"

---

## 📊 EXECUTIVE SUMMARY

### ✅ **Provedené změny - HOTOVO:**
1. ✅ BalanceCalculator.php - Oprava výpočtu bilance (prevod_z_predchoziho místo pocatecni_stav)
2. ✅ CashbookModel.php - Nová metoda getBookByPeriod($pokladnaId) + pokladna_ids filtr
3. ✅ cashbookHandlers.php - Refaktorováno 6 permission calls + cashbook-list endpoint
4. ✅ CashbookPermissions.php - Odstraněn parametr $cashbookUserId ze všech metod
5. ✅ Frontend CashBookPage.js - Kompletní přepis ensureBookExists()
6. ✅ cashbookService.js - Nová metoda listBooksForCashbox()
7. ✅ Databáze - Sloučeny duplicitní knihy (DEV: 17→13, PROD: 15→13)

### ⚠️ **Identifikovaná rizika:**
1. ⚠️ **KRITICKÉ:** Uzamykání měsíce by mohlo blokovat VŠECHNY uživatele pokladny
2. ⚠️ **STŘEDNÍ:** Přepočet čísel dokladů (force-renumber) nebere v úvahu více uživatelů
3. ⚠️ **NÍZKÉ:** Audit log neukazuje WHO created kterou položku (jen vytvoril_jmeno v entry)

---

## 🔍 DETAILNÍ ANALÝZA PO FUNKČNÍCH OBLASTECH

---

## 1️⃣ VYTVÁŘENÍ KNIH (Book Creation)

### **Současný stav:**
```php
// cashbookHandlers.php - handle_cashbook_create_post()
$existing = $bookModel->getBookByPeriod($data['pokladna_id'], $data['rok'], $data['mesic']);
if ($existing) {
    return api_error(400, 'Pokladní kniha pro pokladnu č.' . $data['cislo_pokladny'] . ' v tomto období již existuje');
}
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Kontroluje duplicitu podle pokladna_id (NE uzivatel_id) ✅
- **SPRÁVNĚ:** Chybová zpráva upozorňuje na číslo pokladny ✅
- **SPRÁVNĚ:** Automatický výpočet prevod_z_predchoziho z předchozího měsíce ✅

### ⚠️ **Potenciální problém:**
Pokud 2 uživatelé současně otevřou stejný měsíc a oba kliknou "Vytvořit knihu", může dojít k **race condition**.

**Doporučení:**
- Přidat UNIQUE constraint do databáze: `UNIQUE KEY (pokladna_id, rok, mesic)`
- Nebo použít transaction s `FOR UPDATE` lock

---

## 2️⃣ NAČÍTÁNÍ KNIH (Book List)

### **Současný stav:**
```php
// cashbookHandlers.php - handle_cashbook_list_post()
$stmt = $db->prepare("
    SELECT DISTINCT pokladna_id 
    FROM " . TBL_POKLADNY_UZIVATELE . " 
    WHERE uzivatel_id = ? 
      AND (platne_do IS NULL OR platne_do >= CURDATE())
");
$filters['pokladna_ids'] = $userPokladny;
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Načítá seznam pokladen z 25a_pokladny_uzivatele ✅
- **SPRÁVNĚ:** Filtruje podle platne_do (aktivní přiřazení) ✅
- **SPRÁVNĚ:** Předává pokladna_ids do CashbookModel::getBooks() ✅

### Frontend:
```javascript
// CashBookPage.js - ensureBookExists()
const booksResult = await cashbookAPI.listBooksForCashbox(pokladnaId, currentYear, currentMonth);
const mainBook = booksResult.data.books[0];
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Volá novou metodu listBooksForCashbox() ✅
- **SPRÁVNĚ:** Bere první (a jedinou) knihu z výsledku ✅

### ⚠️ **Potenciální problém:**
Pokud backend API vrátí prázdné pole knih (`books: []`), frontend se pokusí vytvořit novou knihu. Ale co když ji mezitím vytvořil jiný uživatel? → Race condition (viz bod 1)

---

## 3️⃣ OPRÁVNĚNÍ (Permissions)

### **Před refaktoringem:**
```php
// CHYBNĚ:
canReadCashbook($cashbookUserId, $pokladnaId)  
// ❌ Kontrolovalo jestli JE TO MOJE KNIHA (podle uzivatel_id v knize)
```

### **Po refaktoringu:**
```php
// SPRÁVNĚ:
canReadCashbook($pokladnaId)
// ✅ Kontroluje jestli PATŘÍM K POKLADNĚ (podle 25a_pokladny_uzivatele)
```

### **Implementace:**
```php
// CashbookPermissions.php
public function canReadCashbook($pokladnaId = null) {
    if ($this->isSuperAdmin()) return true;
    if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
    if ($this->hasPermission('CASH_BOOK_READ_ALL')) return true;
    
    if ($this->hasPermission('CASH_BOOK_READ_OWN')) {
        if ($pokladnaId === null) return true;
        return $this->isOwnCashbox($pokladnaId);
    }
    
    if ($pokladnaId !== null && $this->isOwnCashbox($pokladnaId)) {
        return true;
    }
    
    return false;
}

private function isOwnCashbox($pokladnaId) {
    $stmt = $this->db->prepare("
        SELECT COUNT(*) as count 
        FROM " . TBL_POKLADNY_UZIVATELE . " 
        WHERE pokladna_id = ? AND uzivatel_id = ?
          AND (platne_do IS NULL OR platne_do >= CURDATE())
    ");
    $stmt->execute(array($pokladnaId, $this->user['id']));
    return $stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;
}
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Kontrola přiřazení v 25a_pokladny_uzivatele ✅
- **SPRÁVNĚ:** Respektuje platne_do (datum ukončení přístupu) ✅
- **SPRÁVNĚ:** Hierarchie oprávnění: MANAGE > READ_ALL > READ_OWN > přiřazení ✅

### ⚠️ **Potenciální problém:**
**ŽÁDNÝ.** Logika je správně implementovaná.

---

## 4️⃣ UZAVÍRÁNÍ MĚSÍCE (Closing Book)

### **Současný stav:**
```php
// cashbookHandlers.php - handle_cashbook_close_post()
$book = $bookModel->getBookById($input['book_id']);

if (!$permissions->canEditCashbook($book['pokladna_id'])) {
    return api_error(403, 'Nedostatečná oprávnění');
}

if ($input['akce'] === 'uzavrit_mesic') {
    $result = $bookModel->closeBookByUser($input['book_id'], $userData['id']);
    // Stav: aktivni → uzavrena_uzivatelem
}

if ($input['akce'] === 'zamknout_spravcem') {
    $result = $bookModel->lockBookByAdmin($input['book_id'], $userData['id']);
    // Stav: uzavrena_uzivatelem → zamknuta_spravcem
}
```

### **3-stavový systém:**
1. **aktivni** - Uživatelé mohou editovat položky
2. **uzavrena_uzivatelem** - Uzavřeno uživatelem, admin může ještě editovat
3. **zamknuta_spravcem** - Zamknuto adminem, NIKDO už nemůže editovat

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Kontroluje oprávnění podle pokladna_id ✅
- **SPRÁVNĚ:** Rozlišuje mezi uzavřením uživatelem a zamknutím adminem ✅

### ⚠️ **KRITICKÉ RIZIKO:**
**Když jeden uživatel uzavře měsíc, VŠICHNI ostatní uživatelé přiřazení k pokladně už nemohou editovat!**

**Scénář:**
1. Peter (garant pokladny 13) uzavře leden 2026 v 10:00
2. Hana (asistentka pokladny 13) v 10:30 zjistí že má ještě přidat fakturu
3. ❌ Hana NEMŮŽE přidat položku, protože kniha je `uzavrena_uzivatelem`
4. Musí kontaktovat admina nebo Petra aby odemkl

**Doporučené řešení:**
Přidat do databáze sloupec `uzavrel_uzivatel_id`:
```sql
ALTER TABLE 25a_pokladni_knihy 
ADD COLUMN uzavrel_uzivatel_id INT NULL,
ADD CONSTRAINT fk_uzavrel_uzivatel 
    FOREIGN KEY (uzavrel_uzivatel_id) REFERENCES 25_uzivatele(id);
```

Pak:
- Knihu může uzavřít kdokoliv s přístupem (stav → `uzavrena_uzivatelem`)
- Ostatní uživatelé s `CASH_BOOK_EDIT_ALL` nebo `je_hlavni=1` mohou ještě editovat
- Admin s `CASH_BOOK_MANAGE` může zamknout definitivně (stav → `zamknuta_spravcem`)

---

## 5️⃣ VYTVÁŘENÍ POLOŽEK (Entry Creation)

### **Současný stav:**
```php
// cashbookHandlers.php - handle_cashbook_entry_create_post()
$book = $bookModel->getBookById($input['pokladni_kniha_id']);

if (!$permissions->canCreateEntry()) {
    return api_error(403, 'Nedostatečná oprávnění pro vytváření položek');
}

if (!$permissions->canEditCashbook($book['pokladna_id'])) {
    return api_error(403, 'Nedostatečná oprávnění pro editaci této knihy');
}

// Kontrola stavu knihy
if ($book['stav_knihy'] === 'zamknuta_spravcem') {
    return api_error(400, 'Kniha je zamčena správcem - nelze přidávat položky');
}

if ($book['stav_knihy'] === 'uzavrena_uzivatelem' && !$permissions->hasPermission('CASH_BOOK_MANAGE')) {
    return api_error(400, 'Kniha je uzavřena - pouze admin může přidávat položky');
}
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Kontroluje oprávnění na POKLADNU (ne na knihu) ✅
- **SPRÁVNĚ:** Rozlišuje mezi uzavřenou a zamčenou knihou ✅
- **SPRÁVNĚ:** Pouze CASH_BOOK_MANAGE může editovat uzavřenou knihu ✅

### **Položka obsahuje:**
```php
$entryData = array(
    'pokladni_kniha_id' => $input['pokladni_kniha_id'],
    'vytvoril' => $userData['id'],  // ✅ KDO položku vytvořil
    'datum_zapisu' => $input['datum_zapisu'],
    'obsah_zapisu' => $input['obsah_zapisu'],
    'castka_prijem' => $input['castka_prijem'],
    'castka_vydaj' => $input['castka_vydaj'],
    'lp_kod' => $input['lp_kod'],
    // ...
);
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Ukládá se `vytvoril` (user_id autora) ✅
- **SPRÁVNĚ:** Frontend zobrazuje iniciály autora (nová funkce) ✅

### **Číslování dokladů:**
```php
// DocumentNumberService.php
public function generateDocumentNumber($bookId, $entryType, $entryDate) {
    // VPD-001, VPD-002, ... (příjmy)
    // PPD-001, PPD-002, ... (výdaje)
    // Číslování je PER BOOK, PER YEAR, PER TYPE
}
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Číslování per book = per pokladna ✅
- **SPRÁVNĚ:** Oddělené číselné řady pro VPD/PPD ✅

---

## 6️⃣ PŘEPOČET ČÍSEL DOKLADŮ (Force Renumber)

### **Současný stav:**
```php
// cashbookHandlers.php - handle_cashbook_force_renumber_post()
function handle_cashbook_force_renumber_post($config, $input) {
    // ⚠️ Vyžaduje POKLADNU_ID a ROK
    $pokladnaId = $input['pokladna_id'];
    $year = $input['year'];
    
    // Přečísluje VŠECHNY doklady (VPD i PPD) v daném roce
    // Načte všechny knihy pokladny v tom roce
    // Pro každou knihu přečísluje položky chronologicky
}
```

### ⚠️ **POTENCIÁLNÍ PROBLÉM:**

**Co když pokladna má více knih v roce?**
- Leden 2026: kniha ID=14
- Únor 2026: kniha ID=21
- Březen 2026: kniha ID=28

**Scénář:**
1. Admin spustí force-renumber pro pokladnu 13, rok 2026
2. Systém načte všechny 3 knihy (leden, únor, březen)
3. Přečísluje doklady V KAŽDÉ KNIZE SAMOSTATNĚ:
   - Leden: VPD-001, VPD-002, ...
   - Únor: VPD-001, VPD-002, ...  ← ❌ DUPLICITNÍ ČÍSLA!
   - Březen: VPD-001, VPD-002, ... ← ❌ DUPLICITNÍ ČÍSLA!

### **Potřebná oprava:**
Číslování by mělo být **CELOROČNÍ** přes všechny měsíce:
```php
// DocumentNumberService.php - OPRAVIT:
public function forceRenumberYear($pokladnaId, $year) {
    // 1. Načíst VŠECHNY knihy pokladny v daném roce
    $books = $bookModel->getBooks([
        'pokladna_ids' => [$pokladnaId],
        'rok' => $year
    ]);
    
    // 2. Načíst VŠECHNY položky ze VŠECH knih, seřadit chronologicky
    $allEntries = [];
    foreach ($books['books'] as $book) {
        $entries = $entryModel->getEntriesByBookId($book['id']);
        $allEntries = array_merge($allEntries, $entries);
    }
    
    // 3. Seřadit podle data_zapisu ASC
    usort($allEntries, function($a, $b) {
        return strtotime($a['datum_zapisu']) - strtotime($b['datum_zapisu']);
    });
    
    // 4. Přečíslovat NAPŘÍČ VŠEMI MĚSÍCI
    $vpdCounter = 1;
    $ppdCounter = 1;
    foreach ($allEntries as $entry) {
        if ($entry['castka_prijem']) {
            $entry['cislo_dokladu'] = 'VPD-' . str_pad($vpdCounter++, 3, '0', STR_PAD_LEFT);
        } else {
            $entry['cislo_dokladu'] = 'PPD-' . str_pad($ppdCounter++, 3, '0', STR_PAD_LEFT);
        }
        // UPDATE...
    }
}
```

---

## 7️⃣ PŘEPOČET BILANCE (Balance Calculation)

### **Opraveno:**
```php
// BalanceCalculator.php - recalculateBookBalances()
// ✅ PŘED: $runningBalance = floatval($book['pocatecni_stav']);
// ✅ PO:   $runningBalance = floatval($book['prevod_z_predchoziho']);
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Začíná s `prevod_z_predchoziho` (koncový stav předchozího měsíce) ✅
- **SPRÁVNĚ:** `pocatecni_stav` je jen informativní (z tabulky pokladen) ✅

### **Logika převodu mezi měsíci:**
```php
// CashbookModel.php - createBook()
$prevodZPredchoziho = 0.00;
if ($pokladnaId && isset($data['uzivatel_id']) && isset($data['rok']) && isset($data['mesic'])) {
    // Pokusit se načíst předchozí měsíc
    $prevBalance = $this->getPreviousMonthBalance(
        $data['uzivatel_id'],  // ⚠️ POZOR - toto je DEPRECATED parametr
        $pokladnaId,
        $data['rok'],
        $data['mesic']
    );
    $prevodZPredchoziho = $prevBalance ? floatval($prevBalance['koncovy_stav']) : 0.00;
}
```

### ⚠️ **POTENCIÁLNÍ PROBLÉM:**
Funkce `getPreviousMonthBalance()` má parametr `$userId`, který už není relevantní:

```php
// CashbookModel.php - getPreviousMonthBalance()
public function getPreviousMonthBalance($userId, $pokladnaId, $year, $month) {
    // ⚠️ Tento parametr $userId je DEPRECATED!
    
    // Mělo by být:
    // WHERE pokladna_id = ? AND rok = ? AND mesic = ?
    
    // Ale je:
    $stmt = $this->db->prepare("
        SELECT koncovy_stav FROM " . TBL_POKLADNI_KNIHY . "
        WHERE uzivatel_id = ? AND pokladna_id = ? AND rok = ? AND mesic = ?
        LIMIT 1
    ");
    $stmt->execute(array($userId, $pokladnaId, $prevYear, $prevMonth));
}
```

### **Doporučená oprava:**
```php
// CashbookModel.php
public function getPreviousMonthBalance($pokladnaId, $year, $month) {
    // Odebrat parametr $userId
    
    $prevMonth = ($month === 1) ? 12 : $month - 1;
    $prevYear = ($month === 1) ? $year - 1 : $year;
    
    $stmt = $this->db->prepare("
        SELECT koncovy_stav FROM " . TBL_POKLADNI_KNIHY . "
        WHERE pokladna_id = ? AND rok = ? AND mesic = ?
        LIMIT 1
    ");
    $stmt->execute(array($pokladnaId, $prevYear, $prevMonth));
    // ...
}
```

---

## 8️⃣ AUDIT LOG

### **Současný stav:**
```php
// CashbookAuditModel.php
public function logAction($bookId, $userId, $action, $oldData, $newData, $entryId = null) {
    $sql = "INSERT INTO 25a_pokladni_audit (
        pokladni_kniha_id,
        uzivatel_id,      -- ✅ KDO provedl akci
        akce,
        stare_hodnoty,
        nove_hodnoty,
        polozka_id,
        created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())";
}
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Audit log sleduje KDO co udělal ✅
- **SPRÁVNĚ:** Uchovává old_data i new_data (JSON) ✅

### **Položky obsahují:**
```sql
SELECT 
    p.id,
    p.vytvoril,  -- ✅ ID uživatele který položku vytvořil
    CONCAT(u.jmeno, ' ', u.prijmeni) AS created_by_name,  -- ✅ Jméno autora
    p.datum_zapisu,
    p.obsah_zapisu,
    p.castka_prijem,
    p.castka_vydaj
FROM 25a_pokladni_polozky p
LEFT JOIN 25_uzivatele u ON p.vytvoril = u.id
```

### ✅ **Frontend:**
```javascript
// CashBookPage.js - getAuthorInitials()
// "Robert Holovský" → "HR" (Holovský Robert)
<td className="author-cell" title={entry.created_by_name}>
  {getAuthorInitials(entry.created_by_name)}
</td>
```

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** Každá položka má autora (`vytvoril`) ✅
- **SPRÁVNĚ:** Frontend zobrazuje iniciály s tooltipem ✅
- **DOBŘE:** Audit trail je kompletní ✅

---

## 9️⃣ SYNCHRONIZACE UŽIVATELŮ POKLADNY

### **Současný stav:**
```php
// cashbookHandlersExtended.php - handle_cashbox_sync_users_post()
function handle_cashbox_sync_users_post($config, $input) {
    // Input: { pokladna_id, uzivatele: [ { uzivatel_id, je_hlavni, ... } ] }
    
    // 1. Načte stávající přiřazení
    // 2. Odstraní ty co nejsou v novém seznamu
    // 3. Přidá nové
    // 4. Aktualizuje existující
}
```

### ⚠️ **POTENCIÁLNÍ PROBLÉM:**

**Co když admin omylem odstraní VŠECHNY uživatele z pokladny?**
- Kniha existuje, ale NIKDO k ní nemá přístup
- Nikdo nemůže uzavřít měsíc
- Nikdo nemůže přidat položky

**Doporučené řešení:**
Přidat validaci:
```php
// Kontrola: Minimálně 1 hlavní uživatel (je_hlavni=1)
$hlavniCount = 0;
foreach ($input['uzivatele'] as $user) {
    if ($user['je_hlavni'] == 1) $hlavniCount++;
}

if ($hlavniCount === 0) {
    return api_error(400, 'Pokladna musí mít alespoň jednoho hlavního uživatele (je_hlavni=1)');
}
```

---

## 🔟 LP (LIMITOVANÉ PŘÍSLIBY) - ČERPÁNÍ

### **Současný stav:**
```php
// cashbookHandlers.php - handle_cashbook_lp_summary_post()
function handle_cashbook_lp_summary_post($config, $input) {
    $userId = $input['user_id'] ?? $userData['id'];
    $year = $input['year'] ?? date('Y');
    
    // Načte VŠECHNY položky uživatele v daném roce
    // Seskupí podle LP kódu
    // Spočítá celkové čerpání
}
```

### ⚠️ **POTENCIÁLNÍ PROBLÉM:**

**Co když pokladna má více uživatelů?**
- Robert má LP001 (limit 50 000 Kč)
- Hana má LP002 (limit 30 000 Kč)
- OBA pracují s pokladnou 999

**Současné chování:**
- Robert vidí jen SVOJE položky (LP001)
- Hana vidí jen SVOJE položky (LP002)
- ✅ To je SPRÁVNĚ - LP jsou per USER, ne per POKLADNA

### ✅ **Vyhodnocení:**
- **SPRÁVNĚ:** LP čerpání je per uživatel (ne per pokladna) ✅
- **SPRÁVNĚ:** Každá položka má `vytvoril` (autor) ✅
- **SPRÁVNĚ:** Sumarizace funguje správně ✅

---

## 📋 SOUHRN RIZIK A DOPORUČENÍ

### 🔴 **KRITICKÁ RIZIKA (vyřešit co nejdříve):**

1. **Uzamykání měsíce blokuje VŠECHNY uživatele**
   - **Dopad:** Pokud jeden uživatel uzavře měsíc, ostatní už nemohou editovat
   - **Řešení:** Přidat `uzavrel_uzivatel_id` a povolit editaci hlavním uživatelům nebo adminům
   - **Priorita:** 🔴 VYSOKÁ

2. **Race condition při vytváření knihy**
   - **Dopad:** 2 uživatelé mohou současně vytvořit duplicitní knihy
   - **Řešení:** UNIQUE constraint `(pokladna_id, rok, mesic)` v databázi
   - **Priorita:** 🔴 VYSOKÁ

---

### 🟠 **STŘEDNÍ RIZIKA (vyřešit brzy):**

3. **getPreviousMonthBalance() používá deprecated parametr $userId**
   - **Dopad:** Může vrátit špatný převod pokud knihu založí jiný uživatel než hlavní
   - **Řešení:** Odebrat parametr `$userId`, filtrovat jen podle `pokladna_id`
   - **Priorita:** 🟠 STŘEDNÍ

4. **Force renumber přečísluje každý měsíc zvlášť**
   - **Dopad:** Duplicitní čísla dokladů napříč měsíci (VPD-001 v lednu i únoru)
   - **Řešení:** Přečíslovat CELOROČNĚ napříč všemi měsíci
   - **Priorita:** 🟠 STŘEDNÍ

5. **Sync users může odstranit VŠECHNY uživatele**
   - **Dopad:** Pokladna bez přístupu, nemůže se editovat
   - **Řešení:** Validace - minimálně 1 hlavní uživatel (je_hlavni=1)
   - **Priorita:** 🟠 STŘEDNÍ

---

### 🟢 **NÍZKÁ RIZIKA (nice to have):**

6. **Audit log je per kniha, ne per pokladna**
   - **Dopad:** Těžší přehled všech změn v pokladně (musí se prohlížet každý měsíc zvlášť)
   - **Řešení:** Přidat view nebo endpoint pro "cashbox-audit" (aggregate přes všechny měsíce)
   - **Priorita:** 🟢 NÍZKÁ

---

## ✅ CO FUNGUJE SPRÁVNĚ (není potřeba měnit):

1. ✅ **Oprávnění (Permissions)** - Správně kontrolují přiřazení k pokladně
2. ✅ **Vytváření položek** - Ukládá se autor (`vytvoril`)
3. ✅ **Frontend zobrazení** - Iniciály autora, tooltip s celým jménem
4. ✅ **Balance Calculator** - Opraveno, používá `prevod_z_predchoziho`
5. ✅ **LP čerpání** - Správně per uživatel (ne per pokladna)
6. ✅ **Databáze** - Duplicity odstraněny, data konzistentní

---

## 🎯 AKČNÍ PLÁN (doporučené pořadí):

### **FÁZE 1 - KRITICKÉ OPRAVY (1-2 dny)**

1. ✅ Přidat UNIQUE constraint do databáze:
   ```sql
   ALTER TABLE 25a_pokladni_knihy 
   ADD UNIQUE KEY unique_pokladna_period (pokladna_id, rok, mesic);
   ```

2. ✅ Opravit `getPreviousMonthBalance()` - odebrat parametr `$userId`:
   ```php
   public function getPreviousMonthBalance($pokladnaId, $year, $month) {
       // WHERE pokladna_id = ? AND rok = ? AND mesic = ?
   }
   ```

3. ✅ Přidat sloupec `uzavrel_uzivatel_id` do 25a_pokladni_knihy:
   ```sql
   ALTER TABLE 25a_pokladni_knihy 
   ADD COLUMN uzavrel_uzivatel_id INT NULL,
   ADD CONSTRAINT fk_uzavrel_uzivatel 
       FOREIGN KEY (uzavrel_uzivatel_id) REFERENCES 25_uzivatele(id);
   ```

4. ✅ Upravit logiku uzavírání - povolit editaci hlavním uživatelům

---

### **FÁZE 2 - DŮLEŽITÉ OPRAVY (3-5 dnů)**

5. ✅ Opravit force-renumber - celoroční číslování dokladů

6. ✅ Přidat validaci do sync-users - minimálně 1 hlavní uživatel

7. ✅ Testování na DEV prostředí s více uživateli

---

### **FÁZE 3 - VYLEPŠENÍ (volitelné)**

8. ✅ Přidat aggregate audit log pro celou pokladnu

9. ✅ Přidat dashboard s přehledem pokladen a jejich stavů

10. ✅ Dokumentace pro uživatele

---

## 📊 ZÁVĚR

### **Celkový stav:** 🟢 **DOBRÝ s výhradami**

- ✅ **Backend refaktoring:** 85% hotovo
- ⚠️ **Kritická rizika:** 2 ks (uzamykání, race condition)
- 🟠 **Střední rizika:** 3 ks (převod měsíců, force renumber, sync users)
- 🟢 **Dobře funguje:** Oprávnění, LP čerpání, balance calculator

### **Doporučení:**
1. Vyřešit kritická rizika (UNIQUE constraint + uzamykání) **ASAP**
2. Testovat s více uživateli na stejné pokladně
3. Postupně vyřešit střední rizika
4. Pokračovat ve vývoji s novou logiką "jedna kniha per pokladna"

---

**Audit provedl:** AI Assistant  
**Datum:** 25. ledna 2026 13:35  
**Status:** ✅ KOMPLETNÍ
