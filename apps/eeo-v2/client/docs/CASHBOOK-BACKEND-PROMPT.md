# 🛠️ BACKEND PROMPT - Pokladní kniha API

**Pro:** Backend vývojový tým  
**Datum:** 8. listopadu 2025  
**Technologie:** PHP 7.4+, MySQL 5.5.43, REST API  
**Souvisí s:** `CASHBOOK-DB-MIGRATION-ANALYSIS.md`

---

## 🎯 ZADÁNÍ

Implementovat kompletní REST API pro správu pokladních knih (cashbooks) včetně:
- CRUD operace pro pokladní knihy a jejich položky
- Automatické přepočítávání zůstatků
- Audit logging všech změn
- Hierarchický systém oprávnění
- Export do PDF a Excel

---

## 📦 STRUKTURA PROJEKTU

```
api/v2/cashbook/
├── index.php                    # Router API endpointů
├── CashbookController.php       # Hlavní controller
├── models/
│   ├── CashbookModel.php       # Model pro 25a_cashbooks
│   ├── CashbookEntryModel.php  # Model pro 25a_cashbook_entries
│   └── CashbookAuditModel.php  # Model pro 25a_cashbook_audit
├── services/
│   ├── CashbookService.php     # Business logika
│   ├── DocumentNumberService.php # Generování čísel dokladů
│   └── BalanceCalculator.php   # Přepočítávání zůstatků
├── middleware/
│   ├── CashbookPermissions.php # Kontrola oprávnění
│   └── AuditMiddleware.php     # Audit logging
├── validators/
│   ├── CashbookValidator.php   # Validace inputů
│   └── EntryValidator.php      # Validace položek
└── exports/
    ├── PdfExporter.php         # Export do PDF
    └── ExcelExporter.php       # Export do Excel
```

---

## 🗄️ DATABÁZOVÉ TABULKY

### 1. `25a_pokladni_knihy`

**SQL skript:** `sql/create_pokladni_knihy_tables.sql`

```sql
CREATE TABLE `25a_pokladni_knihy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uzivatel_id` INT(11) NOT NULL COMMENT 'ID uživatele (majitel pokladny)',
  `rok` SMALLINT(4) NOT NULL COMMENT 'Rok (např. 2025)',
  `mesic` TINYINT(2) NOT NULL COMMENT 'Měsíc (1-12)',
  `cislo_pokladny` INT(11) DEFAULT 600 COMMENT 'Číslo pokladny (default 600)',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK)',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště',
  `prevod_z_predchoziho` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Převod z předchozího měsíce (Kč)',
  `pocatecni_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Počáteční stav (= převod z předchozího)',
  `koncovy_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Konečný stav měsíce (Kč)',
  `celkove_prijmy` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové příjmy za měsíc (Kč)',
  `celkove_vydaje` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové výdaje za měsíc (Kč)',
  `pocet_zaznamu` INT(11) DEFAULT 0 COMMENT 'Počet záznamů v pokladní knize',
  `uzavrena` TINYINT(1) DEFAULT 0 COMMENT 'Uzavřená kniha (0=aktivní, 1=uzavřená)',
  `uzavrena_kdy` DATETIME DEFAULT NULL COMMENT 'Datum a čas uzavření knihy',
  `uzavrena_kym` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který uzavřel',
  `poznamky` TEXT COMMENT 'Poznámky k pokladní knize',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_uzivatel_obdobi` (`uzivatel_id`, `rok`, `mesic`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_rok_mesic` (`rok`, `mesic`),
  KEY `idx_uzavrena` (`uzavrena`),
  CONSTRAINT `fk_pokladni_knihy_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25a_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pokladni_knihy_uzavrena_kym` FOREIGN KEY (`uzavrena_kym`) 
    REFERENCES `25a_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Pokladní knihy - hlavní záznamy';
```

### 2. `25a_pokladni_polozky`

```sql
CREATE TABLE `25a_pokladni_polozky` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `pokladni_kniha_id` INT(11) NOT NULL COMMENT 'ID pokladní knihy (FK)',
  `datum_zapisu` DATE NOT NULL COMMENT 'Datum zápisu',
  `cislo_dokladu` VARCHAR(20) NOT NULL COMMENT 'Číslo dokladu (P001, V001)',
  `typ_dokladu` ENUM('prijem', 'vydaj') NOT NULL COMMENT 'Typ dokladu (příjem/výdaj)',
  `obsah_zapisu` VARCHAR(500) NOT NULL COMMENT 'Obsah zápisu (popis operace)',
  `komu_od_koho` VARCHAR(255) DEFAULT NULL COMMENT 'Jméno osoby (komu/od koho)',
  `castka_prijem` DECIMAL(10,2) DEFAULT NULL COMMENT 'Příjem (Kč)',
  `castka_vydaj` DECIMAL(10,2) DEFAULT NULL COMMENT 'Výdaj (Kč)',
  `zustatek_po_operaci` DECIMAL(10,2) NOT NULL COMMENT 'Zůstatek po této operaci (Kč)',
  `lp_kod` VARCHAR(50) DEFAULT NULL COMMENT 'Kód LP (limitované přísliby)',
  `lp_popis` VARCHAR(255) DEFAULT NULL COMMENT 'Popis LP kódu',
  `poznamka` TEXT COMMENT 'Poznámka k záznamu',
  `poradi_radku` INT(11) NOT NULL DEFAULT 0 COMMENT 'Pořadí řádku (pro sorting)',
  `smazano` TINYINT(1) DEFAULT 0 COMMENT 'Soft delete (0=aktivní, 1=smazaný)',
  `smazano_kdy` DATETIME DEFAULT NULL COMMENT 'Datum smazání',
  `smazano_kym` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který smazal',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  KEY `idx_pokladni_kniha_id` (`pokladni_kniha_id`),
  KEY `idx_datum_zapisu` (`datum_zapisu`),
  KEY `idx_cislo_dokladu` (`cislo_dokladu`),
  KEY `idx_typ_dokladu` (`typ_dokladu`),
  KEY `idx_smazano` (`smazano`),
  KEY `idx_lp_kod` (`lp_kod`),
  CONSTRAINT `fk_polozky_pokladni_kniha` FOREIGN KEY (`pokladni_kniha_id`) 
    REFERENCES `25a_pokladni_knihy` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_polozky_smazano_kym` FOREIGN KEY (`smazano_kym`) 
    REFERENCES `25a_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_castka_platna` CHECK (
    (castka_prijem IS NOT NULL AND castka_vydaj IS NULL) OR
    (castka_prijem IS NULL AND castka_vydaj IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Položky pokladní knihy';
```

### 3. `25a_pokladni_audit`

```sql
CREATE TABLE `25a_pokladni_audit` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `typ_entity` ENUM('kniha', 'polozka') NOT NULL COMMENT 'Typ entity (kniha/položka)',
  `entita_id` INT(11) NOT NULL COMMENT 'ID entity (pokladni_kniha_id nebo polozka_id)',
  `akce` ENUM('vytvoreni', 'uprava', 'smazani', 'obnoveni', 'uzavreni', 'otevreni') NOT NULL COMMENT 'Typ akce',
  `uzivatel_id` INT(11) NOT NULL COMMENT 'ID uživatele, který provedl akci',
  `stare_hodnoty` TEXT COMMENT 'Staré hodnoty (JSON)',
  `nove_hodnoty` TEXT COMMENT 'Nové hodnoty (JSON)',
  `ip_adresa` VARCHAR(45) DEFAULT NULL COMMENT 'IP adresa uživatele',
  `user_agent` VARCHAR(255) DEFAULT NULL COMMENT 'User agent prohlížeče',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum a čas akce',
  PRIMARY KEY (`id`),
  KEY `idx_entita` (`typ_entity`, `entita_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_akce` (`akce`),
  KEY `idx_vytvoreno` (`vytvoreno`),
  CONSTRAINT `fk_audit_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25a_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Audit log pokladních knih';
```

### 4. Triggery pro auto-update

```sql
-- Auto update timestamp pro pokladní knihy
DELIMITER $$
CREATE TRIGGER `tr_pokladni_knihy_before_update`
BEFORE UPDATE ON `25a_pokladni_knihy`
FOR EACH ROW
BEGIN
  SET NEW.aktualizovano = NOW();
END$$

-- Auto update timestamp pro položky
CREATE TRIGGER `tr_pokladni_polozky_before_update`
BEFORE UPDATE ON `25a_pokladni_polozky`
FOR EACH ROW
BEGIN
  SET NEW.aktualizovano = NOW();
END$$
DELIMITER ;
```

---

## 🔐 OPRÁVNĚNÍ

### Přidat do `25a_permissions`

```sql
-- Hierarchie 1: Správa (nejvyšší)
INSERT INTO 25a_permissions (code, name, description, category, created_at) VALUES
('CASH_BOOK_MANAGE', 'Pokladna - Správa', 'Plná správa pokladních knih (vytváření, editace, mazání, uzavírání všech knih)', 'CASHBOOK', NOW());

-- Hierarchie 2: Vytváření
INSERT INTO 25a_permissions (code, name, description, category, created_at) VALUES
('CASH_BOOK_CREATE', 'Pokladna - Vytváření', 'Vytváření nových položek v pokladní knize', 'CASHBOOK', NOW());

-- Hierarchie 3: Operace nad všemi
INSERT INTO 25a_permissions (code, name, description, category, created_at) VALUES
('CASH_BOOK_READ_ALL', 'Pokladna - Čtení všech', 'Zobrazení všech pokladních knih', 'CASHBOOK', NOW()),
('CASH_BOOK_EDIT_ALL', 'Pokladna - Editace všech', 'Editace všech pokladních knih', 'CASHBOOK', NOW()),
('CASH_BOOK_DELETE_ALL', 'Pokladna - Mazání všech', 'Mazání záznamů ve všech pokladních knihách', 'CASHBOOK', NOW()),
('CASH_BOOK_EXPORT_ALL', 'Pokladna - Export všech', 'Export všech pokladních knih do PDF/Excel', 'CASHBOOK', NOW());

-- Hierarchie 4: Operace nad vlastními
INSERT INTO 25a_permissions (code, name, description, category, created_at) VALUES
('CASH_BOOK_READ_OWN', 'Pokladna - Čtení vlastní', 'Zobrazení vlastní pokladní knihy', 'CASHBOOK', NOW()),
('CASH_BOOK_EDIT_OWN', 'Pokladna - Editace vlastní', 'Editace vlastní pokladní knihy', 'CASHBOOK', NOW()),
('CASH_BOOK_DELETE_OWN', 'Pokladna - Mazání vlastní', 'Mazání záznamů ve vlastní pokladní knize', 'CASHBOOK', NOW()),
('CASH_BOOK_EXPORT_OWN', 'Pokladna - Export vlastní', 'Export vlastní pokladní knihy do PDF/Excel', 'CASHBOOK', NOW());
```

### Kontrola oprávnění (PHP)

```php
// CashbookPermissions.php

class CashbookPermissions {
    
    private $user;
    private $db;
    
    public function __construct($user, $db) {
        $this->user = $user;
        $this->db = $db;
    }
    
    /**
     * Kontrola, zda má uživatel oprávnění číst pokladní knihu
     */
    public function canReadCashbook($cashbookUserId) {
        // Super admin může vše
        if ($this->user->isSuperAdmin()) {
            return true;
        }
        
        // CASH_BOOK_MANAGE může vše
        if ($this->hasPermission('CASH_BOOK_MANAGE')) {
            return true;
        }
        
        // CASH_BOOK_READ_ALL může číst všechny knihy
        if ($this->hasPermission('CASH_BOOK_READ_ALL')) {
            return true;
        }
        
        // CASH_BOOK_READ_OWN může číst pouze své knihy
        if ($this->hasPermission('CASH_BOOK_READ_OWN') && $cashbookUserId == $this->user->id) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Kontrola, zda může editovat
     */
    public function canEditCashbook($cashbookUserId) {
        if ($this->user->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_EDIT_OWN') && $cashbookUserId == $this->user->id) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může mazat
     */
    public function canDeleteEntry($cashbookUserId) {
        if ($this->user->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_DELETE_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_DELETE_OWN') && $cashbookUserId == $this->user->id) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může exportovat
     */
    public function canExportCashbook($cashbookUserId) {
        if ($this->user->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_EXPORT_ALL')) return true;
        if ($this->hasPermission('CASH_BOOK_EXPORT_OWN') && $cashbookUserId == $this->user->id) return true;
        return false;
    }
    
    /**
     * Kontrola, zda může vytvářet záznamy
     */
    public function canCreateEntry() {
        if ($this->user->isSuperAdmin()) return true;
        if ($this->hasPermission('CASH_BOOK_MANAGE')) return true;
        if ($this->hasPermission('CASH_BOOK_CREATE')) return true;
        return false;
    }
    
    /**
     * Helper pro kontrolu oprávnění
     */
    private function hasPermission($permissionCode) {
        return $this->user->hasPermission($permissionCode);
    }
}
```

---

## 📡 API ENDPOINTS

### Base URL: `/api/v2/cashbook`

### 1. **GET /books** - Seznam pokladních knih

**Query params:**
- `user_id` (int, optional) - filtr podle uživatele
- `year` (int, optional) - filtr podle roku
- `month` (int, optional) - filtr podle měsíce
- `is_closed` (bool, optional) - filtr podle stavu
- `page` (int, default 1)
- `limit` (int, default 50)

**Controller:**

```php
// CashbookController.php

public function getBooks($request) {
    try {
        $user = $this->getAuthenticatedUser();
        $permissions = new CashbookPermissions($user, $this->db);
        
        // Parsovat query parametry
        $filters = [
            'user_id' => $request->query('user_id'),
            'year' => $request->query('year'),
            'month' => $request->query('month'),
            'is_closed' => $request->query('is_closed'),
            'page' => $request->query('page', 1),
            'limit' => $request->query('limit', 50)
        ];
        
        // Určit, jaké knihy může uživatel vidět
        $canReadAll = $user->isSuperAdmin() || 
                      $user->hasPermission('CASH_BOOK_MANAGE') ||
                      $user->hasPermission('CASH_BOOK_READ_ALL');
        
        if (!$canReadAll) {
            // Může vidět pouze vlastní
            if (!$user->hasPermission('CASH_BOOK_READ_OWN')) {
                return $this->error('Nedostatečná oprávnění', 403);
            }
            $filters['user_id'] = $user->id;
        }
        
        // Získat knihy z DB
        $service = new CashbookService($this->db);
        $result = $service->getBooks($filters);
        
        return $this->success([
            'books' => $result['books'],
            'pagination' => $result['pagination']
        ]);
        
    } catch (Exception $e) {
        return $this->error($e->getMessage(), 500);
    }
}
```

**Model:**

```php
// CashbookModel.php

class CashbookModel {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Získat seznam knih s filtrováním a stránkováním
     */
    public function getBooks($filters) {
        $sql = "
            SELECT 
                cb.*,
                u.username,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS user_name
            FROM 25a_cashbooks cb
            LEFT JOIN 25a_users u ON cb.user_id = u.id
            WHERE 1=1
        ";
        
        $params = [];
        
        // Aplikovat filtry
        if (!empty($filters['user_id'])) {
            $sql .= " AND cb.user_id = ?";
            $params[] = $filters['user_id'];
        }
        
        if (!empty($filters['year'])) {
            $sql .= " AND cb.year = ?";
            $params[] = $filters['year'];
        }
        
        if (!empty($filters['month'])) {
            $sql .= " AND cb.month = ?";
            $params[] = $filters['month'];
        }
        
        if (isset($filters['is_closed'])) {
            $sql .= " AND cb.is_closed = ?";
            $params[] = $filters['is_closed'] ? 1 : 0;
        }
        
        // Počet celkem (pro pagination)
        $countSql = "SELECT COUNT(*) as total FROM (" . $sql . ") as subquery";
        $stmt = $this->db->prepare($countSql);
        $stmt->execute($params);
        $totalRecords = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Stránkování
        $page = max(1, intval($filters['page']));
        $limit = max(1, min(100, intval($filters['limit'])));
        $offset = ($page - 1) * $limit;
        
        $sql .= " ORDER BY cb.year DESC, cb.month DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        // Provést dotaz
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'books' => $books,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => ceil($totalRecords / $limit)
            ]
        ];
    }
}
```

---

### 2. **GET /books/:id** - Detail pokladní knihy

```php
public function getBook($request, $bookId) {
    try {
        $user = $this->getAuthenticatedUser();
        
        // Načíst knihu
        $model = new CashbookModel($this->db);
        $book = $model->getBookById($bookId);
        
        if (!$book) {
            return $this->error('Pokladní kniha nenalezena', 404);
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($user, $this->db);
        if (!$permissions->canReadCashbook($book['user_id'])) {
            return $this->error('Nedostatečná oprávnění', 403);
        }
        
        return $this->success(['book' => $book]);
        
    } catch (Exception $e) {
        return $this->error($e->getMessage(), 500);
    }
}
```

---

### 3. **POST /books** - Vytvořit novou knihu

```php
public function createBook($request) {
    try {
        $user = $this->getAuthenticatedUser();
        
        // Validace vstupu
        $validator = new CashbookValidator();
        $data = $validator->validateCreate($request->body());
        
        // Kontrola oprávnění
        if (!$user->hasPermission('CASH_BOOK_CREATE') && 
            !$user->hasPermission('CASH_BOOK_MANAGE') &&
            !$user->isSuperAdmin()) {
            return $this->error('Nedostatečná oprávnění', 403);
        }
        
        // Vytvořit knihu
        $service = new CashbookService($this->db);
        $bookId = $service->createBook($data, $user->id);
        
        // Audit log
        $audit = new CashbookAuditModel($this->db);
        $audit->logAction('cashbook', $bookId, 'create', $user->id, null, $data, $request);
        
        return $this->success([
            'book_id' => $bookId,
            'message' => 'Pokladní kniha byla úspěšně vytvořena'
        ], 201);
        
    } catch (Exception $e) {
        return $this->error($e->getMessage(), 500);
    }
}
```

---

### 4. **GET /books/:book_id/entries** - Položky knihy

```php
public function getEntries($request, $bookId) {
    try {
        $user = $this->getAuthenticatedUser();
        
        // Načíst knihu
        $bookModel = new CashbookModel($this->db);
        $book = $bookModel->getBookById($bookId);
        
        if (!$book) {
            return $this->error('Pokladní kniha nenalezena', 404);
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($user, $this->db);
        if (!$permissions->canReadCashbook($book['user_id'])) {
            return $this->error('Nedostatečná oprávnění', 403);
        }
        
        // Načíst položky
        $includeDeleted = $request->query('include_deleted', false);
        $entryModel = new CashbookEntryModel($this->db);
        $entries = $entryModel->getEntriesByBookId($bookId, $includeDeleted);
        
        // Vypočítat souhrnné hodnoty
        $summary = [
            'total_income' => array_sum(array_column($entries, 'income_amount')),
            'total_expense' => array_sum(array_column($entries, 'expense_amount')),
            'final_balance' => $book['closing_balance'],
            'entry_count' => count($entries)
        ];
        
        return $this->success([
            'entries' => $entries,
            'summary' => $summary
        ]);
        
    } catch (Exception $e) {
        return $this->error($e->getMessage(), 500);
    }
}
```

---

### 5. **POST /books/:book_id/entries** - Přidat položku

**DŮLEŽITÉ:** Po přidání položky je nutné:
1. Vygenerovat číslo dokladu
2. Přepočítat balance_after pro novou položku
3. Přepočítat balance_after pro všechny následující položky
4. Aktualizovat souhrnné hodnoty v `25a_cashbooks`

```php
public function createEntry($request, $bookId) {
    try {
        $user = $this->getAuthenticatedUser();
        
        // Načíst knihu
        $bookModel = new CashbookModel($this->db);
        $book = $bookModel->getBookById($bookId);
        
        if (!$book) {
            return $this->error('Pokladní kniha nenalezena', 404);
        }
        
        // Kontrola, že kniha není uzavřená
        if ($book['is_closed']) {
            return $this->error('Pokladní kniha je uzavřená a nelze ji upravovat', 400);
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($user, $this->db);
        if (!$permissions->canCreateEntry()) {
            return $this->error('Nedostatečná oprávnění', 403);
        }
        
        // Validace vstupu
        $validator = new EntryValidator();
        $data = $validator->validateCreate($request->body());
        
        // Začít transakci
        $this->db->beginTransaction();
        
        try {
            // Vytvořit položku
            $service = new CashbookService($this->db);
            $entryId = $service->createEntry($bookId, $data, $user->id);
            
            // Získat vytvořenou položku (s vygenerovaným doc_number a balance)
            $entryModel = new CashbookEntryModel($this->db);
            $entry = $entryModel->getEntryById($entryId);
            
            // Audit log
            $audit = new CashbookAuditModel($this->db);
            $audit->logAction('entry', $entryId, 'create', $user->id, null, $data, $request);
            
            $this->db->commit();
            
            return $this->success([
                'entry' => $entry,
                'message' => 'Položka byla úspěšně přidána'
            ], 201);
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        return $this->error($e->getMessage(), 500);
    }
}
```

---

### 6. **PUT /entries/:id** - Upravit položku

**DŮLEŽITÉ:** Při změně částky (income/expense) je nutné přepočítat všechny následující balance_after!

```php
public function updateEntry($request, $entryId) {
    try {
        $user = $this->getAuthenticatedUser();
        
        // Načíst položku
        $entryModel = new CashbookEntryModel($this->db);
        $entry = $entryModel->getEntryById($entryId);
        
        if (!$entry) {
            return $this->error('Položka nenalezena', 404);
        }
        
        // Načíst knihu
        $bookModel = new CashbookModel($this->db);
        $book = $bookModel->getBookById($entry['cashbook_id']);
        
        // Kontrola, že kniha není uzavřená
        if ($book['is_closed']) {
            return $this->error('Pokladní kniha je uzavřená a nelze ji upravovat', 400);
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($user, $this->db);
        if (!$permissions->canEditCashbook($book['user_id'])) {
            return $this->error('Nedostatečná oprávnění', 403);
        }
        
        // Validace vstupu
        $validator = new EntryValidator();
        $data = $validator->validateUpdate($request->body());
        
        // Začít transakci
        $this->db->beginTransaction();
        
        try {
            // Uložit staré hodnoty pro audit
            $oldValues = $entry;
            
            // Aktualizovat položku
            $service = new CashbookService($this->db);
            $service->updateEntry($entryId, $data, $user->id);
            
            // Audit log
            $audit = new CashbookAuditModel($this->db);
            $audit->logAction('entry', $entryId, 'update', $user->id, $oldValues, $data, $request);
            
            $this->db->commit();
            
            return $this->success(['message' => 'Položka byla úspěšně aktualizována']);
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        return $this->error($e->getMessage(), 500);
    }
}
```

---

## 🔢 BUSINESS LOGIKA

### Service: Přepočítávání zůstatků

```php
// BalanceCalculator.php

class BalanceCalculator {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Přepočítat všechny zůstatky v pokladní knize
     * 
     * @param int $bookId ID pokladní knihy
     * @return bool Success
     */
    public function recalculateBookBalances($bookId) {
        try {
            // Načíst knihu
            $stmt = $this->db->prepare("SELECT * FROM 25a_cashbooks WHERE id = ?");
            $stmt->execute([$bookId]);
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            // Načíst všechny aktivní položky seřazené chronologicky
            $stmt = $this->db->prepare("
                SELECT * FROM 25a_cashbook_entries 
                WHERE cashbook_id = ? AND is_deleted = 0
                ORDER BY entry_date ASC, id ASC
            ");
            $stmt->execute([$bookId]);
            $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Začít s opening balance (carry over)
            $runningBalance = floatval($book['opening_balance']);
            
            $totalIncome = 0;
            $totalExpense = 0;
            
            // Procházet položky a přepočítávat
            foreach ($entries as $entry) {
                // Aktualizovat running balance
                if ($entry['income_amount']) {
                    $runningBalance += floatval($entry['income_amount']);
                    $totalIncome += floatval($entry['income_amount']);
                }
                if ($entry['expense_amount']) {
                    $runningBalance -= floatval($entry['expense_amount']);
                    $totalExpense += floatval($entry['expense_amount']);
                }
                
                // Uložit nový balance
                $updateStmt = $this->db->prepare("
                    UPDATE 25a_cashbook_entries 
                    SET balance_after = ? 
                    WHERE id = ?
                ");
                $updateStmt->execute([$runningBalance, $entry['id']]);
            }
            
            // Aktualizovat souhrnné hodnoty v cashbooks
            $updateBookStmt = $this->db->prepare("
                UPDATE 25a_cashbooks 
                SET 
                    total_income = ?,
                    total_expense = ?,
                    closing_balance = ?,
                    entry_count = ?
                WHERE id = ?
            ");
            $updateBookStmt->execute([
                $totalIncome,
                $totalExpense,
                $runningBalance,
                count($entries),
                $bookId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přepočítávání balances: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Přepočítat zůstatky pouze pro položky po určitém datu
     * (optimalizace - nemusíme přepočítávat celou knihu)
     */
    public function recalculateBalancesAfterDate($bookId, $entryDate) {
        // Podobná logika jako recalculateBookBalances,
        // ale načte pouze položky >= $entryDate
    }
}
```

---

### Service: Generování čísel dokladů

```php
// DocumentNumberService.php

class DocumentNumberService {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Vygenerovat nové číslo dokladu
     * 
     * @param int $bookId ID pokladní knihy
     * @param string $type 'income' nebo 'expense'
     * @param string $entryDate Datum zápisu (pro správné pořadí)
     * @return string Číslo dokladu (např. "P001" nebo "V023")
     */
    public function generateDocumentNumber($bookId, $type, $entryDate) {
        try {
            // Načíst knihu (potřebujeme year)
            $stmt = $this->db->prepare("SELECT year FROM 25a_cashbooks WHERE id = ?");
            $stmt->execute([$bookId]);
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            $year = $book['year'];
            $prefix = ($type === 'income') ? 'P' : 'V';
            
            // Najít všechny položky stejného typu v daném roce
            // (napříč všemi knihami stejného uživatele)
            $stmt = $this->db->prepare("
                SELECT e.* 
                FROM 25a_cashbook_entries e
                JOIN 25a_cashbooks b ON e.cashbook_id = b.id
                WHERE b.year = ? 
                  AND e.document_type = ?
                  AND e.is_deleted = 0
                ORDER BY e.entry_date ASC, e.id ASC
            ");
            $stmt->execute([$year, $type]);
            $existingEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Najít pozici nové položky v chronologickém pořadí
            $position = 1;
            foreach ($existingEntries as $entry) {
                if ($entry['entry_date'] < $entryDate) {
                    $position++;
                } elseif ($entry['entry_date'] === $entryDate) {
                    // Stejné datum - použít ID pro určení pořadí
                    $position++;
                }
            }
            
            // Formát: P001, P002, ... nebo V001, V002, ...
            $documentNumber = $prefix . str_pad($position, 3, '0', STR_PAD_LEFT);
            
            return $documentNumber;
            
        } catch (Exception $e) {
            error_log("Chyba při generování čísla dokladu: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Přečíslovat všechny doklady v knize
     * (volat po smazání/obnovení záznamu)
     */
    public function renumberBookDocuments($bookId) {
        try {
            // Načíst knihu
            $stmt = $this->db->prepare("SELECT * FROM 25a_cashbooks WHERE id = ?");
            $stmt->execute([$bookId]);
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $year = $book['year'];
            
            // Přečíslovat příjmy
            $this->renumberDocumentsByType($year, 'income', 'P');
            
            // Přečíslovat výdaje
            $this->renumberDocumentsByType($year, 'expense', 'V');
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přečíslování dokladů: " . $e->getMessage());
            return false;
        }
    }
    
    private function renumberDocumentsByType($year, $type, $prefix) {
        // Načíst všechny položky typu v roce
        $stmt = $this->db->prepare("
            SELECT e.id 
            FROM 25a_cashbook_entries e
            JOIN 25a_cashbooks b ON e.cashbook_id = b.id
            WHERE b.year = ? 
              AND e.document_type = ?
              AND e.is_deleted = 0
            ORDER BY e.entry_date ASC, e.id ASC
        ");
        $stmt->execute([$year, $type]);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Přečíslovat
        $position = 1;
        foreach ($entries as $entry) {
            $documentNumber = $prefix . str_pad($position, 3, '0', STR_PAD_LEFT);
            
            $updateStmt = $this->db->prepare("
                UPDATE 25a_cashbook_entries 
                SET document_number = ? 
                WHERE id = ?
            ");
            $updateStmt->execute([$documentNumber, $entry['id']]);
            
            $position++;
        }
    }
}
```

---

## 📤 EXPORT DO PDF

```php
// PdfExporter.php

require_once 'vendor/autoload.php'; // TCPDF nebo Dompdf

use TCPDF;

class PdfExporter {
    
    /**
     * Exportovat pokladní knihu do PDF
     */
    public function exportCashbook($book, $entries) {
        $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
        
        // Nastavení dokumentu
        $pdf->SetCreator('ZZS Pokladní systém');
        $pdf->SetAuthor('ZZS');
        $pdf->SetTitle('Pokladní kniha ' . $book['month'] . '/' . $book['year']);
        
        // Nastavení okrajů
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        
        // Přidat stránku
        $pdf->AddPage();
        
        // Hlavička
        $pdf->SetFont('dejavusans', 'B', 16);
        $pdf->Cell(0, 10, 'POKLADNÍ KNIHA', 0, 1, 'C');
        
        $pdf->SetFont('dejavusans', '', 12);
        $pdf->Cell(0, 7, 'Zdravotnická záchranná služba', 0, 1, 'C');
        $pdf->Cell(0, 7, 'Pokladna č. ' . $book['cashbox_number'], 0, 1, 'C');
        $pdf->Cell(0, 7, 'Období: ' . $book['month'] . '/' . $book['year'], 0, 1, 'C');
        $pdf->Ln(5);
        
        // Převod z předchozího měsíce
        $pdf->SetFont('dejavusans', '', 10);
        $pdf->Cell(100, 7, 'Převod z předchozího měsíce:', 0, 0, 'L');
        $pdf->Cell(0, 7, number_format($book['opening_balance'], 2, ',', ' ') . ' Kč', 0, 1, 'R');
        $pdf->Ln(3);
        
        // Tabulka položek
        $pdf->SetFont('dejavusans', 'B', 9);
        
        // Hlavička tabulky
        $pdf->SetFillColor(220, 220, 220);
        $pdf->Cell(10, 7, '#', 1, 0, 'C', true);
        $pdf->Cell(25, 7, 'Datum', 1, 0, 'C', true);
        $pdf->Cell(20, 7, 'Doklad', 1, 0, 'C', true);
        $pdf->Cell(50, 7, 'Obsah', 1, 0, 'C', true);
        $pdf->Cell(30, 7, 'Komu/Od', 1, 0, 'C', true);
        $pdf->Cell(25, 7, 'Příjem', 1, 0, 'C', true);
        $pdf->Cell(25, 7, 'Výdaj', 1, 0, 'C', true);
        $pdf->Cell(25, 7, 'Zůstatek', 1, 1, 'C', true);
        
        // Data
        $pdf->SetFont('dejavusans', '', 8);
        $rowNum = 1;
        foreach ($entries as $entry) {
            $pdf->Cell(10, 6, $rowNum, 1, 0, 'C');
            $pdf->Cell(25, 6, date('d.m.Y', strtotime($entry['entry_date'])), 1, 0, 'C');
            $pdf->Cell(20, 6, $entry['document_number'], 1, 0, 'C');
            $pdf->Cell(50, 6, mb_substr($entry['description'], 0, 30), 1, 0, 'L');
            $pdf->Cell(30, 6, mb_substr($entry['person_name'], 0, 20), 1, 0, 'L');
            $pdf->Cell(25, 6, $entry['income_amount'] ? number_format($entry['income_amount'], 2, ',', ' ') : '', 1, 0, 'R');
            $pdf->Cell(25, 6, $entry['expense_amount'] ? number_format($entry['expense_amount'], 2, ',', ' ') : '', 1, 0, 'R');
            $pdf->Cell(25, 6, number_format($entry['balance_after'], 2, ',', ' '), 1, 1, 'R');
            $rowNum++;
        }
        
        // Souhrnné hodnoty
        $pdf->Ln(5);
        $pdf->SetFont('dejavusans', 'B', 10);
        $pdf->Cell(100, 7, 'Celkové příjmy:', 0, 0, 'L');
        $pdf->Cell(0, 7, number_format($book['total_income'], 2, ',', ' ') . ' Kč', 0, 1, 'R');
        
        $pdf->Cell(100, 7, 'Celkové výdaje:', 0, 0, 'L');
        $pdf->Cell(0, 7, number_format($book['total_expense'], 2, ',', ' ') . ' Kč', 0, 1, 'R');
        
        $pdf->Cell(100, 7, 'Konečný zůstatek:', 0, 0, 'L');
        $pdf->Cell(0, 7, number_format($book['closing_balance'], 2, ',', ' ') . ' Kč', 0, 1, 'R');
        
        // Output PDF
        return $pdf->Output('pokladni_kniha_' . $book['year'] . '_' . $book['month'] . '.pdf', 'D');
    }
}
```

---

## ✅ CHECKLIST IMPLEMENTACE

### Fáze 1: Databáze (1 den)
- [ ] Vytvořit tabulky `25a_cashbooks`, `25a_cashbook_entries`, `25a_cashbook_audit`
- [ ] Vytvořit triggery pro auto-update timestamps
- [ ] Přidat oprávnění do `25a_permissions`
- [ ] Naplnit testovací data

### Fáze 2: Backend Models (1 den)
- [ ] `CashbookModel.php` - CRUD pro books
- [ ] `CashbookEntryModel.php` - CRUD pro entries
- [ ] `CashbookAuditModel.php` - audit logging

### Fáze 3: Backend Services (2 dny)
- [ ] `CashbookService.php` - business logika
- [ ] `BalanceCalculator.php` - přepočítávání zůstatků
- [ ] `DocumentNumberService.php` - generování čísel dokladů

### Fáze 4: API Endpoints (2 dny)
- [ ] GET /books - seznam knih
- [ ] GET /books/:id - detail knihy
- [ ] POST /books - vytvořit knihu
- [ ] PUT /books/:id - upravit knihu
- [ ] DELETE /books/:id - smazat knihu
- [ ] GET /books/:id/entries - položky knihy
- [ ] POST /books/:id/entries - přidat položku
- [ ] PUT /entries/:id - upravit položku
- [ ] DELETE /entries/:id - smazat položku (soft delete)
- [ ] POST /books/:id/close - uzavřít knihu
- [ ] POST /books/:id/entries/bulk - hromadný import

### Fáze 5: Export (1 den)
- [ ] `PdfExporter.php` - export do PDF
- [ ] `ExcelExporter.php` - export do Excel/CSV
- [ ] GET /books/:id/export/pdf
- [ ] GET /books/:id/export/excel

### Fáze 6: Testování (2 dny)
- [ ] Unit testy pro všechny modely
- [ ] Integration testy pro API endpoints
- [ ] Performance testy (100+ položek)
- [ ] Security audit (SQL injection, XSS)

### Fáze 7: Dokumentace (0.5 dne)
- [ ] API dokumentace (Swagger/OpenAPI)
- [ ] README pro deployment
- [ ] Databázové schéma (ERD diagram)

---

## 🚨 DŮLEŽITÉ POZNÁMKY

### 1. **Transakce**
Všechny operace s entries MUSÍ být v transakci, protože:
- Vytvoření/editace entry → přepočet balances → update cashbooks
- Pokud cokoli selže, musí se rollbacknout vše

### 2. **Přepočítávání balances**
Po KAŽDÉ změně entry (create, update, delete) je nutné přepočítat:
- `balance_after` pro všechny následující položky
- `total_income`, `total_expense`, `closing_balance` v `25a_cashbooks`

### 3. **Generování čísel dokladů**
Čísla dokladů jsou **globální pro celý rok** (ne per měsíc):
- P001 v lednu → P002 v únoru → P003 v březnu
- Je nutné načítat položky napříč všemi měsíci daného roku

### 4. **Soft delete**
Položky se NIKDY nemažou natvrdo (kvůli auditu):
- Nastavit `is_deleted = 1`, `deleted_at = NOW()`
- Přepočítat balances (jako by položka neexistovala)
- Možnost obnovení (restore endpoint)

### 5. **Uzavírání knih**
Uzavřená kniha (`is_closed = 1`):
- NELZE přidávat/editovat/mazat položky
- Pouze admin může znovu otevřít (reopen)

### 6. **Performance**
- Indexy na všech FK a filtrovaných sloupcích
- Limit stránkování max 100 záznamů
- Cachovat seznam LP kódů (mění se zřídka)

---

**Hodně štěstí s implementací! 🚀**

Pokud máte otázky, pište na: backend-team@zzs.cz
