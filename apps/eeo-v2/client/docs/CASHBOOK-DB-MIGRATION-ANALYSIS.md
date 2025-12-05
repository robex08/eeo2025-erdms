# 📊 ANALÝZA POKLADNÍ KNIHY - MIGRACE NA MySQL DB

**Datum:** 8. listopadu 2025  
**Autor:** AI Assistant  
**Status:** NÁVRH K DISKUZI

---

## 📋 OBSAH
1. [Současný stav](#současný-stav)
2. [Analýza dat](#analýza-dat)
3. [Návrh DB struktury](#návrh-db-struktury)
4. [API Endpoints](#api-endpoints)
5. [Implementační strategie](#implementační-strategie)
6. [Bezpečnost a oprávnění](#bezpečnost-a-oprávnění)
7. [Migrace dat](#migrace-dat)

---

## 🔍 SOUČASNÝ STAV

### Uložení dat
- **Úložiště:** localStorage prohlížeče
- **Klíč:** `cashbook_{userId}_{year}_{month}`
- **Příklad:** `cashbook_42_2025_11`
- **Formát:** JSON

### Struktura localStorage dat

```json
{
  "entries": [
    {
      "id": 1730987654321,
      "date": "2025-11-05",
      "documentNumber": "P001",
      "description": "Tržba za prodej materiálu",
      "person": "Jan Novák",
      "income": 1500,
      "expense": null,
      "balance": 1500,
      "lpCode": "LPIT01",
      "note": "Uhrazeno hotově",
      "isEditing": false
    },
    {
      "id": 1730987765432,
      "date": "2025-11-06",
      "documentNumber": "V001",
      "description": "Nákup kancelářských potřeb",
      "person": "Marie Dvořáková",
      "income": null,
      "expense": 850,
      "balance": 650,
      "lpCode": "LPIT02",
      "note": "Papíry, tonery",
      "isEditing": false
    }
  ],
  "carryOverAmount": 0,
  "lastModified": "2025-11-06T14:23:45.123Z"
}
```

### Funkční charakteristiky

#### ✅ Co funguje dobře:
- ✅ **Offline práce** - data dostupná i bez internetu
- ✅ **Rychlost** - okamžité načítání a ukládání
- ✅ **Automatické číslování dokladů** - P001-P999 (příjmy), V001-V999 (výdaje)
- ✅ **Přenos zůstatků** - automatický převod z předchozího měsíce
- ✅ **Oprávnění** - hierarchický systém (MANAGE → ALL → OWN)
- ✅ **Multi-uživatelský** - každý user má vlastní pokladnu
- ✅ **Export do PDF** - tisk a export

#### ❌ Problémy:
- ❌ **Ztráta dat při vymazání cache** - localStorage je volatilní
- ❌ **Žádná synchronizace** - data jen v jednom prohlížeči
- ❌ **Žádná záloha** - při selhání disku ztráta vše
- ❌ **Omezená kapacita** - localStorage limit ~5-10 MB
- ❌ **Žádný audit trail** - není historie změn
- ❌ **Multi-device problém** - nelze pracovat ze dvou zařízení
- ❌ **Kolaborace nulová** - administrátor nevidí pokladny ostatních
- ❌ **Export omezený** - nelze hromadně exportovat všechny pokladny

---

## 📊 ANALÝZA DAT

### Datové entity

#### 1. **Pokladní kniha** (cashbook)
- Identifikuje konkrétní pokladnu pro uživatele a období
- Obsahuje metadata o pokladně
- Nese převod z předchozího období

#### 2. **Položka pokladní knihy** (cashbook_entry)
- Jednotlivý záznam (příjem/výdaj)
- Obsahuje datum, doklad, částky, osobu, LP kód
- Má vazbu na pokladní knihu

#### 3. **Audit log** (cashbook_audit)
- Historie změn pro dodržení účetních pravidel
- Kdo, kdy, co změnil

### Datové vazby

```
25a_uzivatele (existující)
    ↓ 1:N
25a_pokladny_uzivatele (číselník přiřazení pokladen)
    ↓ 1:N
25a_pokladni_knihy
    ↓ 1:N
25a_pokladni_polozky
    ↓ 1:N
25a_pokladni_audit
```

### Velikost dat (odhad)

**Scénář:** 50 uživatelů, každý 20 záznamů/měsíc, uchovávat 5 let

- **Pokladní knihy:** 50 users × 12 měsíců × 5 let = **3000 záznamů**
- **Položky:** 3000 knih × 20 položek = **60 000 záznamů**
- **Audit log:** 60 000 × 3 změny průměrně = **180 000 záznamů**

**Velikost DB:**
- Cashbooks: 3000 × 0.5 KB = **1.5 MB**
- Entries: 60 000 × 1 KB = **60 MB**
- Audit: 180 000 × 0.3 KB = **54 MB**
- **CELKEM: ~120 MB** (za 5 let)

➡️ **Výkon není problém, MySQL to zvládne bez problémů**

---

## 🗄️ NÁVRH DB STRUKTURY

### MySQL 5.5.43 Kompatibilita
- ✅ InnoDB engine (ACID, foreign keys)
- ✅ UTF-8 charset (čeština)
- ✅ Datumy jako DATE/DATETIME
- ✅ Decimální čísla jako DECIMAL(10,2)
- ⚠️ **POZOR:** MySQL 5.5 nemá JSON typ - uložit jako TEXT

---

### Tabulka: `25a_pokladny_uzivatele`

**Popis:** Číselník přiřazení pokladen k uživatelům (podpora více pokladen + zástupy)

```sql
CREATE TABLE `25a_pokladny_uzivatele` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uzivatel_id` INT(11) NOT NULL COMMENT 'ID uživatele',
  `cislo_pokladny` INT(11) NOT NULL COMMENT 'Číslo pokladny (např. 1, 2, 3...)',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK, PB, ME)',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště',
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD (např. 591)',
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD (např. 491)',
  `je_hlavni` TINYINT(1) DEFAULT 0 COMMENT 'Hlavní pokladna uživatele',
  `platne_od` DATE NOT NULL COMMENT 'Platnost přiřazení od',
  `platne_do` DATE DEFAULT NULL COMMENT 'Platnost do (NULL = aktivní)',
  `poznamka` TEXT COMMENT 'Poznámka (např. "Zástup za kolegu")',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `vytvoril` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_uzivatel_pokladna_obdobi` (`uzivatel_id`, `cislo_pokladny`, `platne_od`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_cislo_pokladny` (`cislo_pokladny`),
  KEY `idx_platne_od_do` (`platne_od`, `platne_do`),
  CONSTRAINT `fk_pokladny_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25a_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Přiřazení pokladen k uživatelům';
```

**Použití:**
- Jeden uživatel může mít více pokladen (např. HK + PB)
- Historie přiřazení (platne_od → platne_do)
- Zástupy (dočasné přiřazení cizí pokladny)
- Každá pokladna může mít vlastní číselné řady (VPD/PPD)

**Příklad záznamů:**
```sql
-- Jan Novák má hlavní pokladnu č. 1 v HK
INSERT INTO 25a_pokladny_uzivatele VALUES 
(1, 42, 1, 'HK', 'Hradec Králové', '591', '491', 1, '2025-01-01', NULL, 'Hlavní pokladna', NOW(), 1);

-- Marie Dvořáková zastupuje pokladnu č. 2 v únoru
INSERT INTO 25a_pokladny_uzivatele VALUES 
(2, 43, 2, 'ME', 'Metličany', '521', '421', 0, '2025-02-01', '2025-02-28', 'Zástup za kolegu', NOW(), 1);
```

---

### Tabulka: `25a_pokladni_knihy`

**Popis:** Hlavní záznamy pokladních knih (jedna kniha = jeden měsíc pro jednu pokladnu)

```sql
CREATE TABLE `25a_pokladni_knihy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `prirazeni_pokladny_id` INT(11) NOT NULL COMMENT 'ID přiřazení pokladny (FK)',
  `uzivatel_id` INT(11) NOT NULL COMMENT 'ID uživatele (majitel pokladny)',
  `rok` SMALLINT(4) NOT NULL COMMENT 'Rok (např. 2025)',
  `mesic` TINYINT(2) NOT NULL COMMENT 'Měsíc (1-12)',
  `cislo_pokladny` INT(11) NOT NULL COMMENT 'Číslo pokladny (z tabulky přiřazení)',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK) - kopie z přiřazení',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště - kopie z přiřazení',
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD (prefix pro výdaje)',
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD (prefix pro příjmy)',
  `prevod_z_predchoziho` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Převod z předchozího měsíce (Kč)',
  `pocatecni_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Počáteční stav (= převod z předchozího)',
  `koncovy_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Konečný stav měsíce (Kč)',
  `celkove_prijmy` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové příjmy za měsíc (Kč)',
  `celkove_vydaje` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové výdaje za měsíc (Kč)',
  `pocet_zaznamu` INT(11) DEFAULT 0 COMMENT 'Počet záznamů v pokladní knize',
  `stav_knihy` ENUM('aktivni', 'uzavrena_uzivatelem', 'zamknuta_spravcem') DEFAULT 'aktivni' COMMENT 'Stav knihy',
  `uzavrena_uzivatelem_kdy` DATETIME DEFAULT NULL COMMENT 'Kdy uživatel uzavřel měsíc',
  `zamknuta_spravcem_kdy` DATETIME DEFAULT NULL COMMENT 'Kdy správce zamknul knihu',
  `zamknuta_spravcem_kym` INT(11) DEFAULT NULL COMMENT 'ID správce, který zamknul',
  `poznamky` TEXT COMMENT 'Poznámky k pokladní knize',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_prirazeni_obdobi` (`prirazeni_pokladny_id`, `rok`, `mesic`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_cislo_pokladny` (`cislo_pokladny`),
  KEY `idx_rok_mesic` (`rok`, `mesic`),
  KEY `idx_stav_knihy` (`stav_knihy`),
  CONSTRAINT `fk_pokladni_knihy_prirazeni` FOREIGN KEY (`prirazeni_pokladny_id`) 
    REFERENCES `25a_pokladny_uzivatele` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pokladni_knihy_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25a_uzivatele` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pokladni_knihy_spravce` FOREIGN KEY (`zamknuta_spravcem_kym`) 
    REFERENCES `25a_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Pokladní knihy - hlavní záznamy';
```

**Klíčové indexy:**
- `unique_prirazeni_obdobi` - zajistí, že jedno přiřazení má max 1 knihu na měsíc
- `idx_uzivatel_id` - rychlé dotazy na pokladny konkrétního uživatele
- `idx_cislo_pokladny` - filtrování podle čísla pokladny
- `idx_rok_mesic` - filtrování podle období
- `idx_stav_knihy` - rychlý výběr podle stavu (aktivní/uzavřená/zamknutá)

**Stavy knihy:**
- `aktivni` - uživatel může editovat
- `uzavrena_uzivatelem` - uživatel ukončil měsíc, čeká na schválení správce
- `zamknuta_spravcem` - správce zamknul, nelze dále editovat (kromě správce)

---

### Tabulka: `25a_pokladni_polozky`

**Popis:** Jednotlivé položky (záznamy) v pokladní knize

```sql
CREATE TABLE `25a_pokladni_polozky` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `pokladni_kniha_id` INT(11) NOT NULL COMMENT 'ID pokladní knihy (FK)',
  `datum_zapisu` DATE NOT NULL COMMENT 'Datum zápisu',
  `cislo_dokladu` VARCHAR(20) NOT NULL COMMENT 'Číslo dokladu (P001, V591-001, atd.)',
  `cislo_poradi_v_roce` INT(11) NOT NULL COMMENT 'Pořadové číslo v rámci roku (1-999)',
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
    REFERENCES `25a_uzivatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_castka_platna` CHECK (
    (castka_prijem IS NOT NULL AND castka_vydaj IS NULL) OR
    (castka_prijem IS NULL AND castka_vydaj IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Položky pokladní knihy';
```

**Klíčové indexy:**
- `idx_pokladni_kniha_id` - rychlé načtení všech záznamů knihy
- `idx_datum_zapisu` - filtrování podle data
- `idx_cislo_dokladu` - vyhledávání podle čísla dokladu
- `idx_smazano` - soft delete filtering

**Constraints:**
- `chk_castka_platna` - zajistí, že záznam je buď příjem NEBO výdaj (ne obojí)

---

### Tabulka: `25a_pokladni_audit`

**Popis:** Audit trail - historie všech změn v pokladních knihách

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
    REFERENCES `25a_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Audit log pokladních knih';
```

**Použití:**
- Sledování všech změn pro účetní kontrolu
- Forensic analýza při nesrovnalostech
- Compliance s účetními předpisy

---

### Tabulka: `25a_nastaveni_globalni`

**Popis:** Globální nastavení aplikace (včetně prefixu dokladů)

```sql
CREATE TABLE `25a_nastaveni_globalni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `klic` VARCHAR(100) NOT NULL COMMENT 'Klíč nastavení',
  `hodnota` TEXT COMMENT 'Hodnota (JSON nebo jednoduchá hodnota)',
  `popis` VARCHAR(255) DEFAULT NULL COMMENT 'Popis nastavení',
  `vytvoreno` DATETIME NOT NULL,
  `aktualizovano` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_klic` (`klic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci COMMENT='Globální nastavení aplikace';

-- Inicializace nastavení prefixu dokladů
INSERT INTO 25a_nastaveni_globalni (klic, hodnota, popis, vytvoreno) VALUES
('cashbook_use_prefix', '1', 'Použít prefix v číslování dokladů (1=ano, 0=ne)', NOW());
```

---

## 🔢 LOGIKA ČÍSLOVÁNÍ DOKLADŮ

### Algoritmus generování čísla dokladu

**Globální nastavení:**
- Pokud `cashbook_use_prefix = 1` → **S PREFIXEM**
- Pokud `cashbook_use_prefix = 0` → **BEZ PREFIXU**

**Formát čísla dokladu:**

| Nastavení | Příjem (PPD) | Výdaj (VPD) | Poznámka |
|-----------|--------------|-------------|----------|
| **S prefixem** | `P{prefix}-001` | `V{prefix}-001` | Prefix = číselná řada z tabulky přiřazení |
| **Bez prefixu** | `P001` | `V001` | Jednoduchý formát |

**Příklady:**

```sql
-- Pokladna č. 1 (HK) má VPD=591, PPD=491
-- S prefixem:
'V591-001', 'V591-002', 'V591-003'  -- výdaje
'P491-001', 'P491-002', 'P491-003'  -- příjmy

-- Bez prefixu:
'V001', 'V002', 'V003'  -- výdaje
'P001', 'P002', 'P003'  -- příjmy
```

**Číslování:**
- ✅ **Od začátku roku do konce roku** (1.1. → 31.12.)
- ✅ **V rámci UŽIVATELE a ROKU** (ne globálně, ne měsíčně)
- ✅ Leden: P001, P002... Únor: P003, P004... (pokračuje)
- ❌ NE reset na P001 každý měsíc

**SQL dotaz pro další číslo:**

```sql
-- S prefixem (např. VPD=591)
SELECT COALESCE(MAX(cislo_poradi_v_roce), 0) + 1 AS dalsi_cislo
FROM 25a_pokladni_polozky p
JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
WHERE k.uzivatel_id = ? 
  AND YEAR(p.datum_zapisu) = ?
  AND p.typ_dokladu = 'vydaj'
  AND p.smazano = 0;

-- Výsledek: 15 → číslo dokladu = 'V591-015'
```

**Backend PHP kód:**

```php
// CashbookService.php

public function generateDocumentNumber($userId, $year, $documentType, $cashboxAssignment) {
    // Načíst globální nastavení
    $usePrefix = $this->getSetting('cashbook_use_prefix') == '1';
    
    // Získat další pořadové číslo v roce
    $nextNumber = $this->getNextDocumentNumber($userId, $year, $documentType);
    
    // Určit prefix podle typu dokladu
    if ($usePrefix) {
        $prefix = $documentType === 'prijem' 
            ? $cashboxAssignment['ciselna_rada_ppd']  // např. '491'
            : $cashboxAssignment['ciselna_rada_vpd']; // např. '591'
        
        $letter = $documentType === 'prijem' ? 'P' : 'V';
        $documentNumber = sprintf('%s%s-%03d', $letter, $prefix, $nextNumber);
        // Výsledek: 'V591-015' nebo 'P491-023'
    } else {
        $letter = $documentType === 'prijem' ? 'P' : 'V';
        $documentNumber = sprintf('%s%03d', $letter, $nextNumber);
        // Výsledek: 'V015' nebo 'P023'
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

**Příklad postupu v roce 2025:**

| Měsíc | Datum | Typ | Číslo (s prefixem V591) | Číslo (bez prefixu) |
|-------|-------|-----|-------------------------|---------------------|
| Leden | 05.01 | Výdaj | V591-001 | V001 |
| Leden | 12.01 | Příjem | P491-001 | P001 |
| Leden | 20.01 | Výdaj | V591-002 | V002 |
| Únor | 03.02 | Výdaj | V591-003 | V003 |
| Únor | 15.02 | Příjem | P491-002 | P002 |
| ... | ... | ... | ... | ... |
| Prosinec | 28.12 | Výdaj | V591-125 | V125 |

---

## 🔌 API ENDPOINTS

### REST API Design

**Base URL:** `/api/v2/cashbook`

---

### 1. **Pokladní knihy**

#### `GET /api/v2/cashbook/books`
Získat seznam pokladních knih

**Query params:**
- `user_id` (int, optional) - filtr podle uživatele
- `year` (int, optional) - filtr podle roku
- `month` (int, optional) - filtr podle měsíce
- `is_closed` (bool, optional) - filtr podle stavu
- `page` (int, default 1) - stránkování
- `limit` (int, default 50) - počet záznamů na stránku

**Response:**
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": 123,
        "user_id": 42,
        "user_name": "Jan Novák",
        "year": 2025,
        "month": 11,
        "month_name": "Listopad",
        "cashbox_number": 600,
        "workplace_code": "HK",
        "workplace_name": "Hradec Králové",
        "carry_over_amount": 0,
        "opening_balance": 0,
        "closing_balance": 1500.50,
        "total_income": 5000.00,
        "total_expense": 3499.50,
        "entry_count": 25,
        "is_closed": false,
        "created_at": "2025-11-01T08:00:00Z",
        "updated_at": "2025-11-06T14:23:45Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_records": 1,
      "per_page": 50
    }
  }
}
```

**Oprávnění:**
- `CASH_BOOK_READ_OWN` - vidí pouze své knihy
- `CASH_BOOK_READ_ALL` - vidí všechny knihy
- `CASH_BOOK_MANAGE` - vidí vše + může editovat

---

#### `GET /api/v2/cashbook/books/:id`
Získat detail pokladní knihy

**Response:**
```json
{
  "success": true,
  "data": {
    "book": {
      "id": 123,
      "user_id": 42,
      "year": 2025,
      "month": 11,
      "cashbox_number": 600,
      "workplace_code": "HK",
      "workplace_name": "Hradec Králové",
      "carry_over_amount": 0,
      "opening_balance": 0,
      "closing_balance": 1500.50,
      "total_income": 5000.00,
      "total_expense": 3499.50,
      "entry_count": 25,
      "is_closed": false,
      "notes": null,
      "created_at": "2025-11-01T08:00:00Z",
      "updated_at": "2025-11-06T14:23:45Z"
    }
  }
}
```

---

#### `POST /api/v2/cashbook/books`
Vytvořit novou pokladní knihu

**Request:**
```json
{
  "user_id": 42,
  "year": 2025,
  "month": 11,
  "cashbox_number": 600,
  "workplace_code": "HK",
  "carry_over_amount": 1234.56,
  "notes": "Nová pokladna pro listopad"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "book_id": 123,
    "message": "Pokladní kniha byla úspěšně vytvořena"
  }
}
```

**Oprávnění:** `CASH_BOOK_CREATE`

---

#### `PUT /api/v2/cashbook/books/:id`
Aktualizovat pokladní knihu (metadata)

**Request:**
```json
{
  "carry_over_amount": 1500.00,
  "notes": "Opravený převod"
}
```

**Oprávnění:** `CASH_BOOK_EDIT_OWN` / `CASH_BOOK_EDIT_ALL`

---

#### `POST /api/v2/cashbook/books/:id/close`
Uzavřít pokladní knihu (nelze dále editovat)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Pokladní kniha byla uzavřena",
    "closed_at": "2025-11-30T23:59:59Z"
  }
}
```

**Oprávnění:** `CASH_BOOK_MANAGE`

---

#### `DELETE /api/v2/cashbook/books/:id`
Smazat pokladní knihu (kaskádově smaže i všechny záznamy)

**Oprávnění:** `CASH_BOOK_MANAGE`

---

### 2. **Položky pokladní knihy**

#### `GET /api/v2/cashbook/books/:book_id/entries`
Získat všechny položky konkrétní knihy

**Query params:**
- `include_deleted` (bool, default false) - zahrnout smazané záznamy

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": 456,
        "cashbook_id": 123,
        "entry_date": "2025-11-05",
        "document_number": "P001",
        "document_type": "income",
        "description": "Tržba za prodej materiálu",
        "person_name": "Jan Novák",
        "income_amount": 1500.00,
        "expense_amount": null,
        "balance_after": 1500.00,
        "lp_code": "LPIT01",
        "lp_description": "IT vybavení",
        "note": "Uhrazeno hotově",
        "row_order": 1,
        "is_deleted": false,
        "created_at": "2025-11-05T09:15:00Z",
        "updated_at": "2025-11-05T09:15:00Z"
      },
      {
        "id": 457,
        "entry_date": "2025-11-06",
        "document_number": "V001",
        "document_type": "expense",
        "description": "Nákup kancelářských potřeb",
        "person_name": "Marie Dvořáková",
        "income_amount": null,
        "expense_amount": 850.00,
        "balance_after": 650.00,
        "lp_code": "LPIT02",
        "note": "Papíry, tonery",
        "row_order": 2,
        "is_deleted": false
      }
    ],
    "summary": {
      "total_income": 1500.00,
      "total_expense": 850.00,
      "final_balance": 650.00,
      "entry_count": 2
    }
  }
}
```

**Oprávnění:** `CASH_BOOK_READ_OWN` / `CASH_BOOK_READ_ALL`

---

#### `POST /api/v2/cashbook/books/:book_id/entries`
Přidat novou položku

**Request:**
```json
{
  "entry_date": "2025-11-07",
  "document_type": "income",
  "description": "Příjem z prodeje",
  "person_name": "Petr Svoboda",
  "income_amount": 2500.00,
  "lp_code": "LPIT01",
  "note": "Platba kartou"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": 458,
      "document_number": "P002",
      "balance_after": 3150.00,
      "created_at": "2025-11-07T10:30:00Z"
    },
    "message": "Položka byla úspěšně přidána"
  }
}
```

**Oprávnění:** `CASH_BOOK_CREATE`

**Backend logika:**
1. Automaticky vygenerovat `document_number` (P002, V005, ...)
2. Přepočítat `balance_after` podle předchozích záznamů
3. Aktualizovat `total_income`/`total_expense` v `25a_cashbooks`
4. Vytvořit audit log záznam

---

#### `PUT /api/v2/cashbook/entries/:id`
Upravit existující položku

**Request:**
```json
{
  "description": "Opravený popis",
  "expense_amount": 900.00,
  "note": "Aktualizovaná poznámka"
}
```

**Backend logika:**
1. Ověřit, že kniha není uzavřená (`is_closed = 0`)
2. Uložit old_values do audit logu
3. Aktualizovat záznam
4. **Přepočítat všechny následující balances** (kvůli změně částky)
5. Aktualizovat souhrnné hodnoty v `25a_cashbooks`

**Oprávnění:** `CASH_BOOK_EDIT_OWN` / `CASH_BOOK_EDIT_ALL`

---

#### `DELETE /api/v2/cashbook/entries/:id`
Smazat položku (soft delete)

**Backend logika:**
1. Nastavit `is_deleted = 1`, `deleted_at = NOW()`
2. **Přepočítat všechny následující balances**
3. Aktualizovat souhrnné hodnoty v `25a_cashbooks`
4. Audit log

**Oprávnění:** `CASH_BOOK_DELETE_OWN` / `CASH_BOOK_DELETE_ALL`

---

#### `POST /api/v2/cashbook/entries/:id/restore`
Obnovit smazanou položku

**Oprávnění:** `CASH_BOOK_MANAGE`

---

### 3. **Hromadné operace**

#### `POST /api/v2/cashbook/books/:book_id/entries/bulk`
Hromadné přidání/editace položek (pro migraci z localStorage)

**Request:**
```json
{
  "entries": [
    {
      "id": null,
      "entry_date": "2025-11-01",
      "document_type": "income",
      "description": "První záznam",
      "income_amount": 1000.00
    },
    {
      "id": null,
      "entry_date": "2025-11-02",
      "document_type": "expense",
      "description": "Druhý záznam",
      "expense_amount": 500.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 2,
    "updated": 0,
    "failed": 0,
    "entries": [
      { "id": 459, "document_number": "P003" },
      { "id": 460, "document_number": "V002" }
    ]
  }
}
```

**Oprávnění:** `CASH_BOOK_MANAGE`

---

### 4. **Export a reporting**

#### `GET /api/v2/cashbook/books/:book_id/export/pdf`
Export pokladní knihy do PDF

**Response:** PDF soubor ke stažení

**Oprávnění:** `CASH_BOOK_EXPORT_OWN` / `CASH_BOOK_EXPORT_ALL`

---

#### `GET /api/v2/cashbook/books/:book_id/export/excel`
Export do Excel (CSV)

**Response:** CSV soubor ke stažení

---

#### `GET /api/v2/cashbook/reports/summary`
Souhrnná sestava za období

**Query params:**
- `user_id` (int, optional)
- `year` (int, required)
- `month_from` (int, optional)
- `month_to` (int, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "2025-01 až 2025-12",
    "total_income": 125000.00,
    "total_expense": 98500.00,
    "net_balance": 26500.00,
    "books_count": 12,
    "entries_count": 234
  }
}
```

**Oprávnění:** `CASH_BOOK_MANAGE`

---

### 5. **Audit trail**

#### `GET /api/v2/cashbook/audit`
Získat audit logy

**Query params:**
- `entity_type` (string, optional) - 'cashbook' nebo 'entry'
- `entity_id` (int, optional)
- `user_id` (int, optional)
- `action` (string, optional)
- `date_from` (date, optional)
- `date_to` (date, optional)
- `page` (int, default 1)
- `limit` (int, default 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 789,
        "entity_type": "entry",
        "entity_id": 456,
        "action": "update",
        "user_id": 42,
        "user_name": "Jan Novák",
        "old_values": "{\"expense_amount\": 800}",
        "new_values": "{\"expense_amount\": 900}",
        "ip_address": "192.168.1.100",
        "created_at": "2025-11-07T11:45:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_records": 450
    }
  }
}
```

**Oprávnění:** `CASH_BOOK_MANAGE`

---

## 🚀 IMPLEMENTAČNÍ STRATEGIE

### Fáze 1: **Příprava DB** (1-2 dny)

✅ **Úkoly:**
1. Vytvořit MySQL tabulky (`25a_cashbooks`, `25a_cashbook_entries`, `25a_cashbook_audit`)
2. Vytvořit triggery pro automatický update `updated_at`
3. Vytvořit stored procedures pro přepočítávání balances
4. Naplnit testovací data

**SQL skripty:**
- `create_cashbook_tables.sql`
- `create_cashbook_triggers.sql`
- `create_cashbook_procedures.sql`
- `seed_cashbook_test_data.sql`

---

### Fáze 2: **Backend API** (3-5 dnů)

✅ **Úkoly:**
1. Vytvořit PHP backend endpoints (REST API)
2. Implementovat oprávnění (hierarchie permissions)
3. Implementovat audit logging
4. Unit testy pro všechny endpointy
5. Dokumentace API (Swagger/OpenAPI)

**Soubory:**
- `api/v2/cashbook/CashbookController.php`
- `api/v2/cashbook/CashbookModel.php`
- `api/v2/cashbook/CashbookPermissions.php`
- `api/v2/cashbook/CashbookAudit.php`

---

### Fáze 3: **Frontend migrace** (2-3 dny)

✅ **Úkoly:**
1. Vytvořit service pro komunikaci s API (`cashbookService.js`)
2. Upravit `CashBookPage.js` pro použití API místo localStorage
3. Implementovat offline mode s queue (pro práci bez internetu)
4. Migrace existujících dat z localStorage do DB

**Změny:**
- `src/services/cashbookService.js` (NOVÝ)
- `src/pages/CashBookPage.js` (UPRAVIT)
- `src/utils/cashbookMigration.js` (NOVÝ - migrace dat)

---

### Fáze 4: **Testování** (2-3 dny)

✅ **Úkoly:**
1. Integration testy (FE + BE)
2. Performance testy (100+ položek v knize)
3. Security audit (SQL injection, XSS, CSRF)
4. User acceptance testing (UAT)

---

### Fáze 5: **Nasazení** (1 den)

✅ **Úkoly:**
1. Migrace dat z localStorage do DB (prod)
2. Deploy backend API
3. Deploy frontend změn
4. Monitoring a rollback plán

---

## 🔐 BEZPEČNOST A OPRÁVNĚNÍ

### Hierarchie oprávnění

```
SUPER_ADMIN (všemocný)
    ↓
CASH_BOOK_MANAGE (správce pokladny)
    ↓
CASH_BOOK_CREATE (vytváření záznamů)
    ↓
CASH_BOOK_*_ALL (práce se všemi pokladnami)
    ↓
CASH_BOOK_*_OWN (pouze vlastní pokladna)
```

### Oprávnění v `25a_permissions`

```sql
-- Hierarchie 1: Správa (nejvyšší)
INSERT INTO 25a_permissions (code, name, description, category) VALUES
('CASH_BOOK_MANAGE', 'Pokladna - Správa', 'Plná správa pokladních knih (vytváření, editace, mazání, uzavírání všech knih)', 'CASHBOOK');

-- Hierarchie 2: Vytváření
INSERT INTO 25a_permissions (code, name, description, category) VALUES
('CASH_BOOK_CREATE', 'Pokladna - Vytváření', 'Vytváření nových položek v pokladní knize', 'CASHBOOK');

-- Hierarchie 3: Operace nad všemi
INSERT INTO 25a_permissions (code, name, description, category) VALUES
('CASH_BOOK_READ_ALL', 'Pokladna - Čtení všech', 'Zobrazení všech pokladních knih', 'CASHBOOK'),
('CASH_BOOK_EDIT_ALL', 'Pokladna - Editace všech', 'Editace všech pokladních knih', 'CASHBOOK'),
('CASH_BOOK_DELETE_ALL', 'Pokladna - Mazání všech', 'Mazání záznamů ve všech pokladních knihách', 'CASHBOOK'),
('CASH_BOOK_EXPORT_ALL', 'Pokladna - Export všech', 'Export všech pokladních knih do PDF/Excel', 'CASHBOOK');

-- Hierarchie 4: Operace nad vlastními
INSERT INTO 25a_permissions (code, name, description, category) VALUES
('CASH_BOOK_READ_OWN', 'Pokladna - Čtení vlastní', 'Zobrazení vlastní pokladní knihy', 'CASHBOOK'),
('CASH_BOOK_EDIT_OWN', 'Pokladna - Editace vlastní', 'Editace vlastní pokladní knihy', 'CASHBOOK'),
('CASH_BOOK_DELETE_OWN', 'Pokladna - Mazání vlastní', 'Mazání záznamů ve vlastní pokladní knize', 'CASHBOOK'),
('CASH_BOOK_EXPORT_OWN', 'Pokladna - Export vlastní', 'Export vlastní pokladní knihy do PDF/Excel', 'CASHBOOK');
```

### Backend kontrola oprávnění

```php
// Příklad v CashbookController.php

public function getBooks($request) {
    $user = $this->getAuthenticatedUser();
    
    // Hierarchie oprávnění
    if ($user->isSuperAdmin()) {
        // Super admin vidí vše
        $books = CashbookModel::getAllBooks();
    } 
    elseif ($user->hasPermission('CASH_BOOK_MANAGE')) {
        // Manager vidí vše
        $books = CashbookModel::getAllBooks();
    }
    elseif ($user->hasPermission('CASH_BOOK_READ_ALL')) {
        // Vidí všechny knihy
        $books = CashbookModel::getAllBooks();
    }
    elseif ($user->hasPermission('CASH_BOOK_READ_OWN')) {
        // Vidí pouze vlastní
        $books = CashbookModel::getUserBooks($user->id);
    }
    else {
        // Žádné oprávnění
        return $this->error('Nedostatečná oprávnění', 403);
    }
    
    return $this->success(['books' => $books]);
}
```

---

## 📦 MIGRACE DAT

### Migrace localStorage → MySQL

**Scénář:** Uživatelé mají data v localStorage, potřebujeme je přesunout do DB.

**Strategie:**

1. **One-time automatická migrace při prvním načtení**
   - FE zjistí, že má data v localStorage
   - Nabídne migraci (dialog)
   - Po potvrzení: bulk API call
   - Vyčistí localStorage po úspěšné migraci

2. **Ruční migrace (admin)**
   - Admin tool pro import dat
   - Načte JSON z localStorage
   - Vytvoří knihy a položky v DB

**Frontend kód (automatická migrace):**

```javascript
// src/utils/cashbookMigration.js

import cashbookService from '../services/cashbookService';

export const migrateCashbookFromLocalStorage = async (userId) => {
  try {
    console.log('🔄 Zahajuji migraci pokladních knih z localStorage...');
    
    const localStorageKeys = Object.keys(localStorage);
    const cashbookKeys = localStorageKeys.filter(key => 
      key.startsWith(`cashbook_${userId}_`)
    );
    
    if (cashbookKeys.length === 0) {
      console.log('✅ Žádná data k migraci');
      return { success: true, migrated: 0 };
    }
    
    console.log(`📊 Nalezeno ${cashbookKeys.length} pokladních knih k migraci`);
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const key of cashbookKeys) {
      try {
        // Parsovat klíč: cashbook_{userId}_{year}_{month}
        const parts = key.split('_');
        const year = parseInt(parts[2]);
        const month = parseInt(parts[3]);
        
        // Načíst data
        const data = JSON.parse(localStorage.getItem(key));
        
        // Vytvořit knihu v DB
        const bookResponse = await cashbookService.createBook({
          user_id: userId,
          year: year,
          month: month,
          carry_over_amount: data.carryOverAmount || 0,
          notes: `Migrováno z localStorage (${new Date().toISOString()})`
        });
        
        if (!bookResponse.success) {
          throw new Error(bookResponse.message);
        }
        
        const bookId = bookResponse.data.book_id;
        
        // Bulk import položek
        if (data.entries && data.entries.length > 0) {
          const entriesPayload = data.entries.map(entry => ({
            entry_date: entry.date,
            document_type: entry.income ? 'income' : 'expense',
            description: entry.description || '',
            person_name: entry.person || null,
            income_amount: entry.income || null,
            expense_amount: entry.expense || null,
            lp_code: entry.lpCode || null,
            note: entry.note || null
          }));
          
          await cashbookService.bulkCreateEntries(bookId, entriesPayload);
        }
        
        results.success.push({ key, year, month, entries: data.entries.length });
        
      } catch (error) {
        console.error(`❌ Chyba při migraci ${key}:`, error);
        results.failed.push({ key, error: error.message });
      }
    }
    
    console.log('✅ Migrace dokončena:', results);
    
    // Po úspěšné migraci vyčistit localStorage
    if (results.success.length > 0 && results.failed.length === 0) {
      console.log('🗑️ Mažu stará data z localStorage...');
      cashbookKeys.forEach(key => localStorage.removeItem(key));
    }
    
    return {
      success: true,
      migrated: results.success.length,
      failed: results.failed.length,
      details: results
    };
    
  } catch (error) {
    console.error('❌ Kritická chyba při migraci:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

**Použití:**

```javascript
// V CashBookPage.js - useEffect

useEffect(() => {
  const checkMigration = async () => {
    // Zkontrolovat, zda už byla migrace provedena
    const migrationDone = localStorage.getItem(`cashbook_migration_done_${userDetail.id}`);
    
    if (!migrationDone) {
      // Najít localStorage data
      const hasLocalData = Object.keys(localStorage).some(key => 
        key.startsWith(`cashbook_${userDetail.id}_`)
      );
      
      if (hasLocalData) {
        // Nabídnout migraci
        const confirm = window.confirm(
          'Byly nalezeny data pokladní knihy v prohlížeči.\n\n' +
          'Chcete je přesunout do databáze pro bezpečnější uložení?\n\n' +
          '(Doporučeno)'
        );
        
        if (confirm) {
          const result = await migrateCashbookFromLocalStorage(userDetail.id);
          
          if (result.success) {
            showToast(`Úspěšně migrováno ${result.migrated} pokladních knih`, 'success');
            localStorage.setItem(`cashbook_migration_done_${userDetail.id}`, 'true');
            
            // Reload dat z DB
            loadCashbookFromDB();
          } else {
            showToast('Chyba při migraci dat', 'error');
          }
        }
      }
    }
  };
  
  if (userDetail?.id) {
    checkMigration();
  }
}, [userDetail]);
```

---

## ✅ VÝHODY PO MIGRACI

### ✅ Pro uživatele:
- ✅ **Bezpečnost dat** - žádná ztráta při vymazání cache
- ✅ **Multi-device** - přístup z jakéhokoli zařízení
- ✅ **Synchronizace** - automatická sync mezi zařízeními
- ✅ **Historie změn** - možnost vrátit se k předchozím verzím
- ✅ **Offline mode** - práce bez internetu (s queue)

### ✅ Pro administrátory:
- ✅ **Centrální přehled** - vidí pokladny všech uživatelů
- ✅ **Hromadný export** - export všech knih najednou
- ✅ **Audit trail** - forensic analýza změn
- ✅ **Reporty** - souhrnné sestavy za celou organizaci
- ✅ **Zálohy** - automatické DB backupy

### ✅ Pro systém:
- ✅ **Škálovatelnost** - zvládne tisíce knih
- ✅ **Performance** - optimalizované indexy
- ✅ **Integrita dat** - foreign keys, constraints
- ✅ **Compliance** - splňuje účetní standardy

---

## 🎯 DALŠÍ KROKY

1. **Schválení návrhu** - probrání struktury a API
2. **Vytvoření SQL skriptů** - příprava DB
3. **Implementace BE API** - PHP backend
4. **Úprava FE** - React komponenty
5. **Testování** - QA
6. **Nasazení** - prod deploy
7. **Migrace dat** - převod localStorage → DB

---

## 📝 8 KLÍČOVÝCH OTÁZEK K DISKUZI

### 1️⃣ **OFFLINE MODE** - Práce bez internetového připojení

**Kontext:**  
Nyní díky localStorage funguje pokladna i bez internetu. Po migraci na DB budeme závislí na síťovém připojení.

**Možnosti:**

**A) ŽÁDNÝ OFFLINE MODE**
- ✅ Jednoduché na implementaci
- ✅ Data vždy aktuální
- ❌ Nelze pracovat při výpadku internetu
- ❌ Problém na místech se špatným signálem

**B) OFFLINE MODE S QUEUE** ⭐ DOPORUČENO
- ✅ Práce i bez internetu
- ✅ Automatická synchronizace při obnovení připojení
- ⚠️ Složitější implementace (service worker + IndexedDB)
- ⚠️ Riziko konfliktů při multi-device použití
- 📊 Implementace: ~3-4 dny navíc

**C) HYBRIDNÍ REŽIM**
- localStorage jako primární + sync do DB na pozadí
- ✅ Nejrychlejší UX
- ❌ Složitá synchronizační logika
- ❌ Duplicita dat

**✅ ROZHODNUTÍ:** `[ B - OFFLINE MODE S QUEUE (localStorage + okamžitá propagace) ]`

**Implementace:**
- localStorage jako primární úložiště (rychlost + offline)
- Při každém potvrzení záznamu (Shift+Enter) → okamžitá propagace do DB
- Synchronizační mechanismus pro konzistenci dat
- Priority: localStorage = source of truth, DB = trvalé úložiště

---

### 2️⃣ **UZAVÍRÁNÍ KNIH** - Kdo může uzavřít měsíční knihu?

**Kontext:**  
Uzavřená kniha = nelze již editovat záznamy. Důležité pro účetní kontrolu.

**Možnosti:**

**A) POUZE SUPER ADMIN**
- ✅ Maximální kontrola
- ❌ Úzké hrdlo (jeden člověk)
- 👤 Vhodné pro: malé organizace (1-5 uživatelů)

**B) OPRÁVNĚNÍ `CASH_BOOK_MANAGE`** ⭐ DOPORUČENO
- ✅ Flexibilita (více správců)
- ✅ Škálovatelnost
- 👤 Vhodné pro: střední až velké organizace (5+ uživatelů)

**C) KAŽDÝ UZAVÍRÁ SVOU KNIHU**
- ✅ Nezávislost uživatelů
- ❌ Riziko předčasného uzavření
- ❌ Chybějící kontrolní mechanismus

**D) WORKFLOW - DVOUSTUPŇOVÉ SCHVALOVÁNÍ**
- 1. Uživatel "dokončí" knihu
- 2. Vedoucí "schválí a uzavře"
- ✅ Kontrola před uzavřením
- ⚠️ Složitější proces
- 📊 Implementace: +2-3 dny

**✅ ROZHODNUTÍ:** `[ D - WORKFLOW - DVOUSTUPŇOVÉ SCHVALOVÁNÍ ]`

**Proces:**
1. Uživatel pracuje s knihou (stav: `aktivni`)
2. Konec měsíce → uživatel klikne "Uzavřít měsíc" (stav: `uzavrena_uzivatelem`)
3. Notifikace správci pokladen
4. Správce zkontroluje a klikne "Zamknout knihu" (stav: `zamknuta_spravcem`)
5. Po zamknutí → nikdo nemůže editovat (kromě správce)

**Možnost odemčení:**  
✅ **ANO - správce může odemknout** (`CASH_BOOK_MANAGE`)
- Správce může odemknout zamknutou knihu (např. při chybě, doplnění dotace)
- Audit log zaznamená každé odemčení/zamknutí

**Notifikace:**
✅ ANO - správce dostane notifikaci při uzavření měsíce uživatelem

---

### 3️⃣ **EXPORT FORMÁTY** - Jaké formáty podporovat?

**Možnosti:**

**A) POUZE PDF** ⭐ MINIMÁLNÍ ŘEŠENÍ
- ✅ Rychlá implementace (~1 den)
- ✅ Vhodné pro tisk a archivaci
- ❌ Nelze dále zpracovávat data
- 📊 Knihovny: TCPDF, Dompdf

**B) PDF + EXCEL (CSV)**
- ✅ PDF pro tisk, Excel pro analýzy
- ✅ Účetní mohou data dále zpracovávat
- ⚠️ Implementace: +1 den navíc
- 📊 Knihovny: PhpSpreadsheet

**C) PDF + EXCEL + JSON API** ⭐ DOPORUČENO
- ✅ Maximální flexibilita
- ✅ JSON pro integrace (jiné systémy)
- ⚠️ Implementace: +1 den navíc

**✅ ROZHODNUTÍ:** `[ B - PDF + EXCEL (CSV) ]`

**Formáty:**
- PDF pro tisk a archivaci
- Excel/CSV pro další zpracování účetními

**Doplňující rozhodnutí:**
- ❌ **Hromadný export:** Zatím ne, přidáme později pokud bude potřeba
- ✅ **Export pouze celé knihy:** Ano, jednodušší implementace

---

### 4️⃣ **NOTIFIKACE** - Upozornění o důležitých událostech

**Kontext:**  
Automatické upozornění uživatelů na důležité události v pokladně.

**Možnosti:**

**A) ŽÁDNÉ NOTIFIKACE**
- ✅ Nejjednodušší
- ❌ Uživatelé musí aktivně kontrolovat

**B) IN-APP NOTIFIKACE** ⭐ MINIMÁLNÍ ŘEŠENÍ
- ✅ Zobrazení v aplikaci (zvonek 🔔)
- ✅ Rychlá implementace (~0.5 dne)
- ⚠️ Uživatel musí být přihlášen

**C) EMAIL NOTIFIKACE**
- ✅ Uživatel dostane info i mimo aplikaci
- ⚠️ Implementace: +1 den
- ⚠️ SMTP server, šablony emailů

**D) IN-APP + EMAIL** ⭐ DOPORUČENO
- ✅ Maximální dosah
- ⚠️ Implementace: +1.5 dne

**✅ ROZHODNUTÍ:** `[ B - IN-APP NOTIFIKACE ]`

**Implementace:**
- Notifikační zvonek v aplikaci
- Jednoduché, rychlé
- Email notifikace přidáme později pokud bude potřeba

**Kdy notifikovat:**
- ✅ **Uživatel uzavřel měsíc** → notifikace správci pokladen
- ✅ **Správce zamknul knihu** → notifikace uživateli
- ✅ **Správce odemknul knihu** → notifikace uživateli
- ❌ Ostatní události zatím neřešíme

---

### 5️⃣ **ČÍSLOVÁNÍ DOKLADŮ** - Globální nebo per-user?

**Kontext:**  
Čísla dokladů: P001, P002, V001, V002...

**Možnosti:**

**A) GLOBÁLNÍ NAPŘÍČ CELOU ORGANIZACÍ**
- Všichni uživatelé sdílí jednu řadu čísel
- P001 - Jan Novák, P002 - Marie Dvořáková, P003 - Jan Novák
- ✅ Jednoznačnost (jedno číslo = jeden doklad v celé firmě)
- ✅ Snadný audit
- ❌ Závislost mezi uživateli (musíme číslovat globálně)
- ⚠️ Složitější logika při vícero pokladnách

**B) PER-USER (KAŽDÝ MÁ SVOU ŘADU)** ⭐ DOPORUČENO
- Každý uživatel má vlastní číslování od P001
- Jan: P001, P002... | Marie: P001, P002...
- ✅ Nezávislost uživatelů
- ✅ Jednodušší implementace
- ⚠️ Číslo dokladu není globálně unikátní (nutno + ID uživatele)

**C) PER-POKLADNA (PODLE ČÍSLA POKLADNY)**
- Pokladna 600: P600-001, P600-002...
- Pokladna 601: P601-001, P601-002...
- ✅ Jednoznačnost
- ✅ Vhodné pro více pokladen na pracovišti
- ⚠️ Delší čísla dokladů

**✅ ROZHODNUTÍ:** `[ B - PER-USER (KAŽDÝ MÁ SVOU ŘADU) ]`

**Implementace:**
- Každý uživatel má vlastní číslování
- Čísla běží **od začátku roku do konce roku** (1.1. - 31.12.)
- **Prefix:** volitelný (globální nastavení)
  - S prefixem: `V591-001`, `P491-001`
  - Bez prefixu: `V001`, `P001`

**Reset číslování:**
✅ **ANO - každý rok od 001** (současný stav zachován)

---

### 6️⃣ **ARCHIVACE** - Co dělat se starými knihami?

**Kontext:**  
Po X letech nebudeme potřebovat staré knihy. Uchovávání všech dat navěky = plýtvání místem.

**Možnosti:**

**A) NEMAZAT NIKDY**
- ✅ Vše dostupné kdykoliv
- ❌ Rostoucí DB (ale při 120 MB za 5 let to není problém)

**B) ARCHIVACE PO X LETECH** ⭐ DOPORUČENO
- Po X letech přesunout do archivní tabulky
- ✅ Hlavní tabulka zůstane rychlá
- ✅ Data stále dostupná (ale jinak)
- ⚠️ Implementace: +1 den

**C) SMAZÁNÍ PO X LETECH**
- Po X letech smazat (s možností exportu před smazáním)
- ✅ Minimální velikost DB
- ❌ Riziko ztráty dat

**Účetní předpisy:**  
Účetní doklady je nutné uchovávat **minimálně 5 let** (někdy 10 let).

**✅ ROZHODNUTÍ:** `[ A - NEMAZAT NIKDY ]`

**Odůvodnění:**
- 120 MB za 5 let není problém
- Účetní předpisy vyžadují uchování dat 5-10 let
- Přidáme později pokud bude potřeba
- Ruční promazání adminem bude možné

---

### 7️⃣ **MULTI-POKLADNA** - Více pokladen pro jednoho uživatele?

**Kontext:**  
Nyní: 1 uživatel = 1 pokladna (číslo 600). Může nastat situace, kdy jeden člověk spravuje více pokladen?

**Scénáře:**
- Uživatel pracuje na více pracovištích (Hradec Králové + Pardubice)
- Různé typy pokladen (provozní / investiční)
- Zástup za kolegu (dočasná správa cizí pokladny)

**Možnosti:**

**A) JEDNA POKLADNA PER-USER** ⭐ SOUČASNÝ STAV
- ✅ Jednoduché
- ❌ Nelze spravovat více pokladen

**B) VÍCE POKLADEN PER-USER**
- Uživatel si může vytvořit více knih s různým `cislo_pokladny`
- ✅ Flexibilita
- ⚠️ Složitější UI (výběr pokladny)
- ⚠️ Implementace: +2 dny

**C) SDÍLENÍ POKLADEN (KOLABORACE)**
- Více uživatelů může sdílet jednu pokladnu
- ✅ Teamová práce
- ⚠️ Konflikty při současné editaci
- ⚠️ Implementace: +3-4 dny

**✅ ROZHODNUTÍ:** `[ B - VÍCE POKLADEN PER-USER ]`

**Implementace:**
- Uživatel může mít více pokladen (tabulka `25a_pokladny_uzivatele`)
- Podpora zástupů (dočasné přiřazení)
- Každá pokladna má vlastní číselné řady (VPD/PPD)

**UI:**
- Dropdown v hlavičce pro výběr aktivní pokladny
- Seznam "Moje pokladny" v nastavení

---

### 8️⃣ **WORKFLOW / SCHVALOVÁNÍ** - Proces schvalování knih

**Kontext:**  
Má kniha projít schvalovacím procesem před uzavřením?

**Možnosti:**

**A) ŽÁDNÝ WORKFLOW** ⭐ NEJJEDNODUŠŠÍ
- Uživatel vytvoří → uživatel uzavře (nebo admin)
- ✅ Rychlé
- ❌ Žádná kontrola

**B) JEDNOÚROVŇOVÉ SCHVÁLENÍ**
```
Uživatel (vytvoří + vyplní) 
    ↓
Vedoucí/Admin (zkontroluje + schválí + uzavře)
```
- ✅ Základní kontrola
- ⚠️ Implementace: +2 dny
- 📊 Stavy: `draft → na_schvaleni → schvaleno → uzavreno`

**C) DVOUÚROVŇOVÉ SCHVÁLENÍ**
```
Uživatel (vytvoří + vyplní)
    ↓
Vedoucí oddělení (1. schválení)
    ↓
Hlavní účetní/Admin (2. schválení + uzavření)
```
- ✅ Maximální kontrola
- ⚠️ Pomalejší proces
- ⚠️ Implementace: +3-4 dny

**D) VOLITELNÝ WORKFLOW**
- Admin si nastaví, zda workflow chce nebo ne
- ✅ Flexibilita
- ⚠️ Implementace: +4-5 dnů

**✅ ROZHODNUTÍ:** `[ Viz bod 2 - DVOUSTUPŇOVÉ UZAVÍRÁNÍ ]`

**Proces je již definován v bodě 2:**
1. Uživatel uzavře měsíc (stav: `uzavrena_uzivatelem`)
2. Notifikace správci (`CASH_BOOK_MANAGE`)
3. Správce zkontroluje a zamkne (stav: `zamknuta_spravcem`)
4. Správce může i v průběhu měsíce zasahovat (dotace, korekce)
5. Správce může knihu odemknout při potřebě

**Doplňující odpovědi:**
1. **Kdo schvaluje:** ✅ Uživatel s oprávněním `CASH_BOOK_MANAGE`
2. **Editace po uzavření:** ✅ ANO - správce může editovat i zamknutou knihu
3. **Zamítnutí:** ✅ Správce odemkne → uživatel opraví → znovu uzavře
4. **Notifikace:** ✅ ANO - in-app notifikace (email později)

---

## ✅ SOUHRNNÁ TABULKA ROZHODNUTÍ

| # | Téma | Naše volba | Implementační čas |
|---|------|-----------|-------------------|
| 1 | Offline mode | ✅ **localStorage + okamžitá sync** | +3 dny |
| 2 | Uzavírání knih | ✅ **Dvoustupňové (user → správce)** | +2 dny |
| 3 | Export formáty | ✅ **PDF + Excel** | +2 dny |
| 4 | Notifikace | ✅ **In-app** | +1 den |
| 5 | Číslování dokladů | ✅ **Per-user + rok, volitelný prefix** | +1 den |
| 6 | Archivace | ✅ **Nemazat (ručně později)** | +0 dní |
| 7 | Multi-pokladna | ✅ **Více pokladen per-user + zástupy** | +2 dny |
| 8 | Workflow | ✅ **Součást bodu 2** | +0 dní |
| | **CELKEM NAVÍC:** | | **+11 dní** |

**Základní implementace: 9-14 dní**  
**S rozšířeními: 20-25 dní**

---

## 📊 FINÁLNÍ SPECIFIKACE

### ✅ Schválená architektura

**4 hlavní tabulky:**
1. ✅ `25a_pokladny_uzivatele` - přiřazení pokladen k uživatelům
2. ✅ `25a_pokladni_knihy` - měsíční knihy
3. ✅ `25a_pokladni_polozky` - jednotlivé záznamy
4. ✅ `25a_pokladni_audit` - audit trail

**+ 1 pomocná:**
5. ✅ `25a_nastaveni_globalni` - globální konfigurace (prefix dokladů)

### ✅ Schválené vlastnosti

- ✅ **Číslo pokladny:** Číselník přiřazení, podpora více pokladen + zástupy
- ✅ **Číslování dokladů:** Per-user + rok, volitelný prefix (V591-001 / V001)
- ✅ **Uzavírání:** Dvoustupňové (uživatel → správce), možnost odemčení
- ✅ **Offline:** localStorage + okamžitá sync při potvrzení
- ✅ **Notifikace:** In-app při změně stavu knihy
- ✅ **Export:** PDF + Excel
- ✅ **Správce:** Může zasahovat i do otevřené knihy (dotace, korekce)

---

## 🎯 DOPORUČENÁ KONFIGURACE (pro rychlý start)

Pro **minimální funkční verzi** (MVP) doporučuji:

1. **Offline mode:** A (žádný) - přidáme později pokud bude potřeba
2. **Uzavírání:** B (CASH_BOOK_MANAGE) + možnost znovuotevření
3. **Export:** B (PDF + Excel)
4. **Notifikace:** B (in-app) - email přidáme později
5. **Číslování:** B (per-user) - současný stav
6. **Archivace:** A (nemazat) - řešit až při problémech s výkonem
7. **Multi-pokladna:** A (jedna per-user) - přidáme v2 pokud bude zájem
8. **Workflow:** A (žádný) - přidáme v2 pokud bude zájem

**Implementační čas MVP: 9-14 dní** (původní odhad)

Pokud ale chcete **robustní řešení** hned od začátku:
- Přidat offline mode (B)
- Přidat email notifikace (D)
- Přidat základní workflow (B)

**Implementační čas FULL: 16-22 dní**

---

**Co říkáte na tyto otázky? Můžeme projít jednotlivé body! 🚀**
