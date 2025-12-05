# 🔧 BACKEND - POŽADAVKY NA DOPLNĚNÍ CASHBOOK API

**Datum:** 8. listopadu 2025  
**Priorita:** VYSOKÁ  
**Status:** VYŽADUJE DOPLNĚNÍ

---

## 🎯 ÚVOD

Děkujeme za implementaci základní verze Cashbook API! Bohužel zjistili jsme, že implementace neodpovídá schválené specifikaci v několika klíčových bodech. Tyto funkce jsou kritické pro správnou funkcionalitu systému a je nutné je doplnit.

**Odkaz na původní specifikaci:** `docs/CASHBOOK-DB-MIGRATION-ANALYSIS.md`

---

## ⚠️ KRITICKÉ ROZDÍLY

### 1. **TABULKA: `25a_pokladny_uzivatele` CHYBÍ**

**Problém:**  
API nepodporuje číselník přiřazení pokladen k uživatelům. V současné implementaci je `cislo_pokladny` jen sloupec v `25a_pokladni_knihy`, což neumožňuje:
- Více pokladen na uživatele
- Zástupy (dočasné přiřazení cizí pokladny)
- Historii přiřazení
- Definici číselných řad VPD/PPD per pokladna

**Schválená struktura:**
```sql
CREATE TABLE `25a_pokladny_uzivatele` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uzivatel_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID uživatele',
  `cislo_pokladny` INT(11) NOT NULL COMMENT 'Číslo pokladny (např. 1, 2, 3...)',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK, PB, ME)',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště',
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD - výdaje (např. 591)',
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD - příjmy (např. 491)',
  `je_hlavni` TINYINT(1) DEFAULT 0 COMMENT 'Hlavní pokladna uživatele',
  `platne_od` DATE NOT NULL COMMENT 'Platnost přiřazení od',
  `platne_do` DATE DEFAULT NULL COMMENT 'Platnost do (NULL = aktivní)',
  `poznamka` TEXT COMMENT 'Poznámka (např. "Zástup za kolegu")',
  `vytvoreno` DATETIME NOT NULL,
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_uzivatel_pokladna_obdobi` (`uzivatel_id`, `cislo_pokladny`, `platne_od`),
  CONSTRAINT `fk_pokladny_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci;
```

**Změny v `25a_pokladni_knihy`:**
```sql
-- PŘIDAT:
`prirazeni_pokladny_id` INT(11) NOT NULL COMMENT 'ID přiřazení pokladny (FK)',
`ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD (prefix)',
`ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD (prefix)',

-- FOREIGN KEY:
CONSTRAINT `fk_pokladni_knihy_prirazeni` FOREIGN KEY (`prirazeni_pokladny_id`) 
  REFERENCES `25a_pokladny_uzivatele` (`id`) ON DELETE RESTRICT
```

**Požadované API endpointy:**
```
POST /cashbook-assignments-list   // Seznam přiřazení pro uživatele
POST /cashbook-assignment-create  // Vytvořit přiřazení pokladny
POST /cashbook-assignment-update  // Upravit přiřazení
POST /cashbook-assignment-delete  // Smazat přiřazení
```

---

### 2. **STAVY KNIHY - NEÚPLNÉ**

**Problém:**  
API podporuje pouze `uzavrena` (0/1), ale schválená specifikace vyžaduje **dvoustupňové uzavírání**:

1. **Uživatel uzavře měsíc** → stav `uzavrena_uzivatelem`
2. **Notifikace správci**
3. **Správce zkontroluje a zamkne** → stav `zamknuta_spravcem`
4. **Možnost odemčení správcem**

**Současný stav (CHYBNÝ):**
```sql
`uzavrena` TINYINT(1) DEFAULT 0
`uzavrena_kdy` DATETIME DEFAULT NULL
`uzavrena_kym` INT(11) DEFAULT NULL
```

**Požadovaný stav:**
```sql
-- ZMĚNIT z TINYINT na ENUM:
`stav_knihy` ENUM('aktivni', 'uzavrena_uzivatelem', 'zamknuta_spravcem') DEFAULT 'aktivni',
`uzavrena_uzivatelem_kdy` DATETIME DEFAULT NULL COMMENT 'Kdy uživatel uzavřel měsíc',
`zamknuta_spravcem_kdy` DATETIME DEFAULT NULL COMMENT 'Kdy správce zamknul knihu',
`zamknuta_spravcem_kym` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID správce',

CONSTRAINT `fk_pokladni_knihy_spravce` FOREIGN KEY (`zamknuta_spravcem_kym`) 
  REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
```

**Požadované API změny:**

**Endpoint `/cashbook-close` změnit na:**
```json
// Request
{
  "username": "user",
  "token": "...",
  "book_id": 1,
  "akce": "uzavrit_mesic"  // nebo "zamknout_spravcem"
}

// Response
{
  "status": "ok",
  "data": {
    "stav_knihy": "uzavrena_uzivatelem",  // nebo "zamknuta_spravcem"
    "message": "Měsíc byl uzavřen uživatelem. Čeká na schválení správce."
  }
}
```

**Nový endpoint `/cashbook-lock`:**
```json
// Správce zamkne knihu po kontrole
{
  "username": "admin",
  "token": "...",
  "book_id": 1
}
```

**Oprávnění:**
- `uzavrit_mesic` - může uživatel (majitel knihy)
- `zamknout_spravcem` - pouze `CASH_BOOK_MANAGE`
- `odemknout` - pouze `CASH_BOOK_MANAGE`

---

### 3. **PREFIX DOKLADŮ - CHYBÍ**

**Problém:**  
API generuje pouze jednoduché číslo (P001, V001), ale specifikace vyžaduje **volitelný prefix** podle číselné řady.

**Požadované chování:**

```
Globální nastavení: cashbook_use_prefix (1/0)

Pokud cashbook_use_prefix = 1:
  - Výdaje: V{ciselna_rada_vpd}-001  např. V591-001, V591-002, ...
  - Příjmy: P{ciselna_rada_ppd}-001  např. P491-001, P491-002, ...

Pokud cashbook_use_prefix = 0:
  - Výdaje: V001, V002, ...
  - Příjmy: P001, P002, ...
```

**Tabulka `25a_nastaveni_globalni`:**
```sql
CREATE TABLE `25a_nastaveni_globalni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `klic` VARCHAR(100) NOT NULL,
  `hodnota` TEXT,
  `popis` VARCHAR(255) DEFAULT NULL,
  `vytvoreno` DATETIME NOT NULL,
  `aktualizovano` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_klic` (`klic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci;

-- Inicializace
INSERT INTO `25a_nastaveni_globalni` (`klic`, `hodnota`, `popis`, `vytvoreno`) 
VALUES ('cashbook_use_prefix', '1', 'Použít prefix v číslování dokladů (1=ano, 0=ne)', NOW());
```

**Změna v `25a_pokladni_polozky`:**
```sql
-- PŘIDAT:
`cislo_poradi_v_roce` INT(11) NOT NULL COMMENT 'Pořadové číslo v rámci roku (1-999)',
```

**PHP logika generování čísla dokladu:**
```php
// CashbookService.php

public function generateDocumentNumber($userId, $year, $documentType, $cashboxAssignment) {
    // Načíst globální nastavení
    $usePrefix = $this->getSetting('cashbook_use_prefix') == '1';
    
    // Získat další pořadové číslo v roce
    $nextNumber = $this->getNextDocumentNumber($userId, $year, $documentType);
    
    // Určit prefix podle typu dokladu
    if ($usePrefix && $cashboxAssignment) {
        $prefix = $documentType === 'prijem' 
            ? $cashboxAssignment['ciselna_rada_ppd']  // např. '491'
            : $cashboxAssignment['ciselna_rada_vpd']; // např. '591'
        
        $letter = $documentType === 'prijem' ? 'P' : 'V';
        $documentNumber = sprintf('%s%s-%03d', $letter, $prefix, $nextNumber);
        // Výsledek: V591-015 nebo P491-023
    } else {
        $letter = $documentType === 'prijem' ? 'P' : 'V';
        $documentNumber = sprintf('%s%03d', $letter, $nextNumber);
        // Výsledek: V015 nebo P023
    }
    
    return [
        'document_number' => $documentNumber,
        'order_in_year' => $nextNumber
    ];
}

private function getNextDocumentNumber($userId, $year, $documentType) {
    $sql = "
        SELECT COALESCE(MAX(p.cislo_poradi_v_roce), 0) + 1 AS next_number
        FROM 25a_pokladni_polozky p
        JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
        WHERE k.uzivatel_id = :userId 
          AND k.rok = :year
          AND p.typ_dokladu = :docType
          AND p.smazano = 0
    ";
    
    $result = $this->db->fetchOne($sql, [
        'userId' => $userId,
        'year' => $year,
        'docType' => $documentType
    ]);
    
    return $result['next_number'];
}
```

**Nový API endpoint:**
```
POST /cashbook-settings-get     // Získat nastavení
POST /cashbook-settings-update  // Upravit nastavení (pouze admin)
```

---

## 📋 SOUHRNNÝ CHECKLIST ÚPRAV

### Databáze:
- [ ] Vytvořit tabulku `25a_pokladny_uzivatele`
- [ ] Přidat sloupce do `25a_pokladni_knihy`:
  - [ ] `prirazeni_pokladny_id` + FK
  - [ ] `ciselna_rada_vpd`
  - [ ] `ciselna_rada_ppd`
- [ ] Změnit `uzavrena` na `stav_knihy` (ENUM)
- [ ] Přidat sloupce:
  - [ ] `uzavrena_uzivatelem_kdy`
  - [ ] `zamknuta_spravcem_kdy`
  - [ ] `zamknuta_spravcem_kym` + FK
- [ ] Přidat `cislo_poradi_v_roce` do `25a_pokladni_polozky`
- [ ] Vytvořit tabulku `25a_nastaveni_globalni`

### API Endpointy - NOVÉ:
- [ ] `POST /cashbook-assignments-list` - Seznam přiřazení
- [ ] `POST /cashbook-assignment-create` - Vytvořit přiřazení
- [ ] `POST /cashbook-assignment-update` - Upravit přiřazení
- [ ] `POST /cashbook-assignment-delete` - Smazat přiřazení
- [ ] `POST /cashbook-lock` - Zamknout knihu správcem
- [ ] `POST /cashbook-settings-get` - Získat nastavení
- [ ] `POST /cashbook-settings-update` - Upravit nastavení

### API Endpointy - ÚPRAVY:
- [ ] `/cashbook-list` - přidat info o přiřazení pokladny
- [ ] `/cashbook-get` - přidat info o přiřazení + číselné řady
- [ ] `/cashbook-create` - vyžadovat `prirazeni_pokladny_id`
- [ ] `/cashbook-close` - změnit na dvoustupňové uzavírání
- [ ] `/cashbook-reopen` - ošetřit 3 stavy
- [ ] `/cashbook-entry-create` - generovat číslo s prefixem
- [ ] `/cashbook-entry-update` - zachovat logiku prefixu

### PHP logika:
- [ ] Implementovat `generateDocumentNumber()` s podporou prefixu
- [ ] Upravit validace stavů knihy (3 stavy místo 2)
- [ ] Přidat kontrolu oprávnění pro zamykání
- [ ] Přidat metodu `getSetting()` pro globální nastavení

---

## 📄 KOMPLETNÍ SQL SKRIPTY

**K dispozici v:** `create_cashbook_tables.sql`

Tento soubor obsahuje kompletní CREATE TABLE statements včetně všech požadovaných změn.

---

## 🎯 PRIORITA IMPLEMENTACE

### Vysoká priorita (MUST HAVE):
1. ✅ Tabulka `25a_pokladny_uzivatele`
2. ✅ Stavy knihy (3 stavy)
3. ✅ API endpointy pro přiřazení

### Střední priorita (SHOULD HAVE):
4. ✅ Prefix dokladů (volitelný)
5. ✅ Globální nastavení

### Nízká priorita (NICE TO HAVE):
6. Notifikace (můžeme doplnit později)
7. Export PDF/Excel (můžeme doplnit později)

---

## ⏱️ ODHAD ČASU

- **Databázové změny:** 1-2 hodiny
- **Nové API endpointy:** 3-4 hodiny
- **Úpravy stávajících endpointů:** 2-3 hodiny
- **Testování:** 2 hodiny

**CELKEM: 8-11 hodin práce**

---

## 📞 KONTAKT

Pokud máte jakékoli dotazy k implementaci, prosím kontaktujte mě.

**Důležité:** Frontend implementaci nemůžeme zahájit dokud nebudou tyto změny dokončeny, protože bychom museli vše předělávat.

---

**Děkujeme za pochopení a spolupráci!** 🙏
