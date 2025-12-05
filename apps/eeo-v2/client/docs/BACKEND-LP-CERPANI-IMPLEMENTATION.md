# Backend implementace: Limitované přísliby - čerpání a stav

## Úvod

Tento dokument popisuje kompletní backend implementaci pro sledování čerpání limitovaných příslibů (LP) z objednávek a pokladny pomocí **dvou tabulek**:

1. **`25_limitovane_prisliby`** - master data (záznamy LP, platnosti, limity)
2. **`25_limitovane_prisliby_cerpani`** - agregovaný stav čerpání podle kódů LP

Systém umožňuje efektivní sledování aktuálního stavu čerpání s podporou více záznamů stejného kódu (navýšení limitů).

## 1. Databázové změny

### 1.1 Nová tabulka `25_limitovane_prisliby_cerpani`

Tato tabulka agreguje stav čerpání pro každý **kód LP** (např. LPIT1). Jeden řádek = jeden kód.

```sql
CREATE TABLE `25_limitovane_prisliby_cerpani` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cislo_lp` VARCHAR(50) NOT NULL COMMENT 'Kód LP (např. LPIT1)',
  `kategorie` VARCHAR(50) NOT NULL COMMENT 'Typ LP (LPIT, LPZDR, LPÚČ, LPFIN)',
  `usek_id` INT(11) NOT NULL COMMENT 'ID úseku',
  `user_id` INT(11) NOT NULL COMMENT 'ID správce LP',
  `rok` YEAR NOT NULL COMMENT 'Rok platnosti',
  
  -- Agregované údaje za celý kód LP - celkový limit
  `celkovy_limit` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Suma všech vyse_financniho_kryti pro tento kód',
  
  -- TŘI TYPY ČERPÁNÍ z objednávek
  `rezervovano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Rezervace = suma max_cena_s_dph z objednávek (pesimistický odhad)',
  `predpokladane_cerpani` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Odhad = suma součtů položek objednávek (reálný odhad)',
  `skutecne_cerpano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Skutečnost = suma fakturovaných částek + pokladna (finální)',
  
  -- Čerpání z pokladny (vždy finální)
  `cerpano_pokladna` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Čerpání z pokladny (finální částky)',
  
  -- Vypočítané zůstatky pro každý typ
  `zbyva_rezervace` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle rezervace (limit - rezervovano)',
  `zbyva_predpoklad` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle odhadu (limit - predpokladane_cerpani)',
  `zbyva_skutecne` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle skutečnosti (limit - skutecne_cerpano)',
  
  -- Procenta čerpání pro každý typ
  `procento_rezervace` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento rezervace',
  `procento_predpoklad` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento odhadu',
  `procento_skutecne` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento skutečnosti',
  
  -- Metadata
  `pocet_zaznamu` INT(11) DEFAULT 1 COMMENT 'Počet záznamů LP (1 = základní, 2+ = s navýšením)',
  `ma_navyseni` TINYINT(1) DEFAULT 0 COMMENT '1 = má navýšení, 0 = jen základní záznam',
  `posledni_prepocet` DATETIME DEFAULT NULL COMMENT 'Časová značka posledního přepočtu',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_lp_rok` (`cislo_lp`, `rok`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_kategorie` (`kategorie`),
  KEY `idx_rok` (`rok`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Agregovaný stav čerpání LP podle kódů - TRI TYPY CERPANI';
```

**Popis sloupců:**

**Základní údaje:**
- `cislo_lp` - kód LP (např. LPIT1) - jeden řádek na kód
- `kategorie` - typ LP pro rychlé filtrování (LPIT, LPZDR, atd.)
- `celkovy_limit` - suma všech `vyse_financniho_kryti` záznamů s tímto kódem

**TŘI TYPY ČERPÁNÍ (objednávky):**
1. **`rezervovano`** - Pesimistický odhad podle `max_cena_s_dph`
   - Použití: "Kolik je maximálně zablokováno"
   - Výpočet: `SUM(max_cena_s_dph)` z objednávek s LP
   
2. **`predpokladane_cerpani`** - Reálný odhad podle součtu položek
   - Použití: "Kolik pravděpodobně utratíme"
   - Výpočet: `SUM(součet_položek_s_dph)` z objednávek s LP
   
3. **`skutecne_cerpano`** - Finální čerpání podle fakturace
   - Použití: "Kolik jsme skutečně utratili"
   - Výpočet: `SUM(fakturovana_castka)` z objednávek + `cerpano_pokladna`

**Pokladna:**
- `cerpano_pokladna` - vždy finální částka (jako fakturovaná)

**Zůstatky a procenta:**
- Pro každý typ čerpání jsou samostatné sloupce `zbyva_*` a `procento_*`
- Umožňuje vidět stav podle různých scénářů

**Metadata:**
- `pocet_zaznamu` - počet řádků v tabulce `25_limitovane_prisliby` s tímto kódem
- `ma_navyseni` - TRUE pokud existuje více než 1 záznam (navýšení)

### 1.2 Tabulka `25_limitovane_prisliby` zůstává BEZ ZMĚN

Původní tabulka obsahuje **jednotlivé záznamy** LP (původní + navýšení):

```sql
-- Příklad dat:
SELECT id, cislo_lp, platne_od, platne_do, vyse_financniho_kryti 
FROM 25_limitovane_prisliby 
WHERE cislo_lp = 'LPIT1';

-- Výsledek:
-- id | cislo_lp | platne_od  | platne_do  | vyse_financniho_kryti
-- 1  | LPIT1    | 2025-01-01 | 2025-12-31 | 5000.00
-- 2  | LPIT1    | 2025-10-01 | 2025-12-31 | 2000.00 (navýšení)
```

**Tato tabulka NEOBSAHUJE čerpání** - slouží jen jako master data.

### 1.3 TŘI TYPY ČERPÁNÍ - Detailní vysvětlení

**Problém:**
Každá objednávka prochází workflow a má různé fáze:
1. **KONCEPT / ROZPRACOVANA** - zadána `max_cena_s_dph` (např. 10 000 Kč s DPH) - ještě nemá položky
2. **SCHVALENA / ODESLANA** - přidány položky, součet = `SUM(cena_s_dph)` (např. 8 500 Kč s DPH)
3. **DOKONCENA** - vyplněna `fakturovana_castka` (skutečně např. 8 200 Kč s DPH) - finální

**Řešení - TŘI ÚROVNĚ SLEDOVÁNÍ:**

#### 1.3.1 Rezervace (pesimistický odhad)
```
rezervovano = SUM(max_cena_s_dph) WHERE limitovana_prisliba = 'LPIT1'
                                  AND status IN ('SCHVALENA', 'ODESLANA', 'DOKONCENA')
```
- **Kdy:** Objednávka má `max_cena_s_dph` (od stavu SCHVALENA)
- **Stavy:** SCHVALENA, ODESLANA, DOKONCENA
- **Účel:** "Kolik je maximálně zablokováno" - bezpečnostní rezerva
- **Zobrazení:** Menším fontem pod skutečným čerpáním

#### 1.3.2 Předpokládané čerpání (reálný odhad)
```
predpokladane_cerpani = SUM(soucet_polozek_s_dph) WHERE limitovana_prisliba = 'LPIT1'
                                                  AND status IN ('SCHVALENA', 'ODESLANA', 'DOKONCENA')
```
- **Kdy:** Objednávka má položky (od stavu SCHVALENA), ještě není fakturovaná
- **Stavy:** SCHVALENA, ODESLANA, DOKONCENA (ale bez `fakturovana_castka`)
- **Účel:** "Kolik pravděpodobně utratíme" - pracovní odhad
- **Výpočet:** Součet `SUM(pol.cena_s_dph)` - každá položka má jen cenu s DPH, NEMÁ množství
- **Zobrazení:** Menším fontem pod skutečným čerpáním

#### 1.3.3 Skutečné čerpání (finální)
```
skutecne_cerpano = SUM(fakturovana_castka) WHERE limitovana_prisliba = 'LPIT1'
                                           AND status = 'DOKONCENA'
                                           AND fakturovana_castka IS NOT NULL
                  + SUM(castka) FROM pokladna WHERE limitovana_prisliba = 'LPIT1'
```
- **Kdy:** Objednávka má stav DOKONCENA a vyplněnou `fakturovana_castka`
- **Stavy:** pouze DOKONCENA (s fakturou)
- **Účel:** "Kolik jsme SKUTEČNĚ utratili" - oficiální číslo
- **Zobrazení:** VELKÝM FONTEM v profilu - hlavní číslo
- **Pokladna:** Vždy se počítá (má jen finální částky)

**Poznámka k pokladně:**
- Pokladna má vždy JEN skutečné čerpání (finální částka)
- Neexistuje rezervace ani odhad - jde rovnou do `skutecne_cerpano`

### 1.4 Kontrola vazeb v existujících tabulkách

Ujistěte se, že tyto sloupce existují:

**V tabulce `25_objednavky`:**
- `max_cena_s_dph` (DECIMAL) - maximální cena objednávky s DPH (rezervace)
- `fakturovana_castka` (DECIMAL) - skutečně fakturovaná částka s DPH
- `status` (VARCHAR) - stav objednávky (KONCEPT, ROZPRACOVANA, SCHVALENA, ODESLANA, DOKONCENA, atd.)
- `datum_vytvoreni` (DATE/DATETIME) - datum vytvoření

**V tabulce `25_objednavky_polozky`:**
- `limitovana_prisliba` (VARCHAR) - číslo LP (např. 'LPIT1')
- `cena_s_dph` (DECIMAL) - cena položky s DPH (položka JE již kompletní cena, NEMÁ množství)
- *Součet položek = `SUM(cena_s_dph)` pro každou objednávku*

**V tabulce `25_pokladna`:**
- `status` (VARCHAR) - stav (otevřená, uzavřená, atd.)
- `datum` (DATE/DATETIME) - datum záznamu

**V tabulce `25_pokladna_polozky`:**
- `limitovana_prisliba` (VARCHAR) - číslo LP
- `castka` (DECIMAL) - částka položky (vždy finální)

### 1.5 Důležité: Logika čerpání pro jeden kód LP s více záznamy

**Princip:**
Jeden kód LP (např. LPIT1) může mít **více záznamů** s různými platnostmi (původní + navýšení).

**Příklad:**
```
LPIT1 | 2025-01-01 do 2025-12-31 | 5 000 Kč
LPIT1 | 2025-10-01 do 2025-12-31 | 2 000 Kč (navýšení)
```

**Celkový limit LPIT1 = 7 000 Kč**

**Čerpání s TŘEMI TYPY:**

**Objednávka #1 z 15.9.2025:**
- Max cena: 4 000 Kč (rezervace)
- Součet položek: 3 500 Kč (předpoklad)
- Fakturovaná částka: 3 200 Kč (skutečnost)

**Objednávka #2 z 15.10.2025:**
- Max cena: 3 000 Kč (rezervace)
- Součet položek: 2 800 Kč (předpoklad)
- Fakturovaná částka: 2 700 Kč (skutečnost)

**Výpočet v agregační tabulce:**
```
rezervovano           = 4 000 + 3 000 = 7 000 Kč
predpokladane_cerpani = 3 500 + 2 800 = 6 300 Kč
skutecne_cerpano      = 3 200 + 2 700 = 5 900 Kč

zbyva_rezervace  = 7 000 - 7 000 = 0 Kč       ❌ PLNĚ REZERVOVÁNO
zbyva_predpoklad = 7 000 - 6 300 = 700 Kč     ⚠️  TÉMĚŘ VYČERPÁNO
zbyva_skutecne   = 7 000 - 5 900 = 1 100 Kč   ✅ V POŘÁDKU
```

**DŮLEŽITÉ:**
- **Rezervace** ukazuje nejhorší scénář (co kdyby všechny max. ceny byly vyčerpány)
- **Předpoklad** ukazuje reálný odhad (podle aktuálních položek)
- **Skutečnost** ukazuje finální stav (co bylo fakturováno)

## 2. Backend PHP API - Nové soubory

### 2.1 Soubor: `api/limitovane-prisliby/prepocet.php`

```php
<?php
/**
 * API pro přepočet čerpání limitovaných příslibů
 * 
 * ARCHITEKTURA:
 * - Počítá agregované čerpání pro každý KÓD LP (např. LPIT1)
 * - Ukládá do tabulky 25_limitovane_prisliby_cerpani
 * - Jeden řádek = jeden kód LP
 */

require_once '../config/database.php';
require_once '../config/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Kontrola přihlášení
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Nepřihlášen']);
    exit();
}

/**
 * Přepočítá agregované čerpání pro konkrétní KÓD LP (např. 'LPIT1')
 * 
 * LOGIKA:
 * 1. Najde všechny záznamy s tímto kódem v tabulce 25_limitovane_prisliby
 * 2. Spočítá celkový limit (suma všech vyse_financniho_kryti)
 * 3. Spočítá celkové čerpání ze všech objednávek a pokladny
 * 4. Uloží/aktualizuje řádek v tabulce 25_limitovane_prisliby_cerpani
 * 
 * @param string $cislo_lp Kód LP (např. 'LPIT1')
 * @return bool Úspěch operace
 */
function prepocetCerpaniPodleCislaLP($cislo_lp) {
    global $conn;
    
    $lp_id = (int)$lp_id;
    
    $sql = "
        UPDATE 25_limitovane_prisliby lp
        SET 
            aktualne_cerpano = (
                -- Součet z objednávek (jen schválené/dokončené/realizované)
                -- POUZE v období platnosti tohoto záznamu LP
                COALESCE((
                    SELECT SUM(pol.celkova_cena)
                    FROM 25_objednavky obj
                    JOIN 25_objednavky_polozky pol ON obj.id = pol.objednavka_id
                    WHERE pol.limitovana_prisliba = lp.cislo_lp
                    AND obj.status IN ('SCHVALENA', 'ODESLANA', 'DOKONCENA')
                    AND DATE(obj.datum_vytvoreni) BETWEEN lp.platne_od AND lp.platne_do
                ), 0)
                +
                -- Součet z pokladny (jen uzavřené)
                -- POUZE v období platnosti tohoto záznamu LP
                COALESCE((
                    SELECT SUM(pol.castka)
                    FROM 25_pokladna p
                    JOIN 25_pokladna_polozky pol ON p.id = pol.pokladna_id
                    WHERE pol.limitovana_prisliba = lp.cislo_lp
                    AND p.status = 'uzavrena'
                    AND DATE(p.datum) BETWEEN lp.platne_od AND lp.platne_do
                ), 0)
            ),
            posledni_prepocet = NOW()
        WHERE lp.id = $lp_id
    ";
    
    $result = mysqli_query($conn, $sql);
    
    if (!$result) {
        error_log("Chyba při přepočtu LP ID $lp_id: " . mysqli_error($conn));
        return false;
    }
    
    return true;
}

/**
 * Přepočítá agregované čerpání pro konkrétní KÓD LP s TŘEMI TYPY ČERPÁNÍ
 * 
 * LOGIKA:
 * 1. Získá metadata o kódu LP (limit, období platnosti, atd.)
 * 2. Spočítá REZERVACI (max_cena_s_dph z objednávek)
 * 3. Spočítá PŘEDPOKLAD (součet položek objednávek)
 * 4. Spočítá SKUTEČNOST (fakturované částky + pokladna)
 * 5. Upsertuje data do agregační tabulky
 * 
 * @param string $cislo_lp Číslo LP (např. 'LPIT1')
 * @return bool Úspěch operace
 */
function prepocetCerpaniPodleCislaLP($cislo_lp) {
    global $conn;
    
    $cislo_lp_safe = mysqli_real_escape_string($conn, $cislo_lp);
    
    // KROK 1: Získat metadata o kódu LP
    $sql_meta = "
        SELECT 
            lp.cislo_lp,
            lp.kategorie,
            lp.usek_id,
            lp.user_id,
            YEAR(MIN(lp.platne_od)) as rok,
            SUM(lp.vyse_financniho_kryti) as celkovy_limit,
            COUNT(*) as pocet_zaznamu,
            (COUNT(*) > 1) as ma_navyseni,
            MIN(lp.platne_od) as nejstarsi_platnost,
            MAX(lp.platne_do) as nejnovejsi_platnost
        FROM 25_limitovane_prisliby lp
        WHERE lp.cislo_lp = '$cislo_lp_safe'
        GROUP BY lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id
        LIMIT 1
    ";
    
    $result_meta = mysqli_query($conn, $sql_meta);
    
    if (!$result_meta || mysqli_num_rows($result_meta) === 0) {
        error_log("LP '$cislo_lp' neexistuje");
        return false;
    }
    
    $meta = mysqli_fetch_assoc($result_meta);
    
    // KROK 2: REZERVACE - Spočítat celkové max_cena_s_dph z objednávek
    $sql_rezervace = "
        SELECT COALESCE(SUM(obj.max_cena_s_dph), 0) as rezervovano
        FROM 25_objednavky obj
        JOIN 25_objednavky_polozky pol ON obj.id = pol.objednavka_id
        WHERE pol.limitovana_prisliba = '$cislo_lp_safe'
        AND obj.status IN ('SCHVALENA', 'ODESLANA', 'DOKONCENA')
        AND DATE(obj.datum_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
        GROUP BY obj.id
    ";
    
    $result_rez = mysqli_query($conn, $sql_rezervace);
    $rezervovano = 0;
    while ($row = mysqli_fetch_assoc($result_rez)) {
        $rezervovano += $row['rezervovano'];
    }
    
    // KROK 3: PŘEDPOKLAD - Spočítat součty položek objednávek
    $sql_predpoklad = "
        SELECT obj.id, COALESCE(SUM(pol.cena_s_dph), 0) as soucet_polozek
        FROM 25_objednavky obj
        JOIN 25_objednavky_polozky pol ON obj.id = pol.objednavka_id
        WHERE pol.limitovana_prisliba = '$cislo_lp_safe'
        AND obj.status IN ('SCHVALENA', 'ODESLANA', 'DOKONCENA')
        AND DATE(obj.datum_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
        GROUP BY obj.id
    ";
    
    $result_pred = mysqli_query($conn, $sql_predpoklad);
    $predpokladane_cerpani = 0;
    while ($row = mysqli_fetch_assoc($result_pred)) {
        $predpokladane_cerpani += $row['soucet_polozek'];
    }
    
    // KROK 4: SKUTEČNOST - Fakturované částky z objednávek
    $sql_fakturovano = "
        SELECT COALESCE(SUM(obj.fakturovana_castka), 0) as fakturovano
        FROM 25_objednavky obj
        JOIN 25_objednavky_polozky pol ON obj.id = pol.objednavka_id
        WHERE pol.limitovana_prisliba = '$cislo_lp_safe'
        AND obj.status = 'DOKONCENA'
        AND obj.fakturovana_castka IS NOT NULL
        AND obj.fakturovana_castka > 0
        AND DATE(obj.datum_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
        GROUP BY obj.id
    ";
    
    $result_fakt = mysqli_query($conn, $sql_fakturovano);
    $fakturovano = 0;
    while ($row = mysqli_fetch_assoc($result_fakt)) {
        $fakturovano += $row['fakturovano'];
    }
    
    // KROK 5: Čerpání z pokladny (vždy finální)
    $sql_pokladna = "
        SELECT COALESCE(SUM(pol.castka), 0) as cerpano_pokl
        FROM 25_pokladna p
        JOIN 25_pokladna_polozky pol ON p.id = pol.pokladna_id
        WHERE pol.limitovana_prisliba = '$cislo_lp_safe'
        AND p.status = 'uzavrena'
        AND DATE(p.datum) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
    ";
    
    $result_pokl = mysqli_query($conn, $sql_pokladna);
    $cerpano_pokladna = $result_pokl ? mysqli_fetch_assoc($result_pokl)['cerpano_pokl'] : 0;
    
    // SKUTEČNÉ ČERPÁNÍ = fakturované objednávky + pokladna
    $skutecne_cerpano = $fakturovano + $cerpano_pokladna;
    
    // KROK 6: Vypočítat zůstatky a procenta
    $celkovy_limit = $meta['celkovy_limit'];
    
    $zbyva_rezervace = $celkovy_limit - $rezervovano;
    $zbyva_predpoklad = $celkovy_limit - $predpokladane_cerpani;
    $zbyva_skutecne = $celkovy_limit - $skutecne_cerpano;
    
    $procento_rezervace = $celkovy_limit > 0 ? round(($rezervovano / $celkovy_limit) * 100, 2) : 0;
    $procento_predpoklad = $celkovy_limit > 0 ? round(($predpokladane_cerpani / $celkovy_limit) * 100, 2) : 0;
    $procento_skutecne = $celkovy_limit > 0 ? round(($skutecne_cerpano / $celkovy_limit) * 100, 2) : 0;
    
    // KROK 7: Upsert do tabulky 25_limitovane_prisliby_cerpani
    $sql_upsert = "
        INSERT INTO 25_limitovane_prisliby_cerpani 
        (cislo_lp, kategorie, usek_id, user_id, rok, 
         celkovy_limit, 
         rezervovano, predpokladane_cerpani, skutecne_cerpano, cerpano_pokladna,
         zbyva_rezervace, zbyva_predpoklad, zbyva_skutecne,
         procento_rezervace, procento_predpoklad, procento_skutecne,
         pocet_zaznamu, ma_navyseni, posledni_prepocet)
        VALUES (
            '$cislo_lp_safe',
            '{$meta['kategorie']}',
            {$meta['usek_id']},
            {$meta['user_id']},
            {$meta['rok']},
            $celkovy_limit,
            $rezervovano,
            $predpokladane_cerpani,
            $skutecne_cerpano,
            $cerpano_pokladna,
            $zbyva_rezervace,
            $zbyva_predpoklad,
            $zbyva_skutecne,
            $procento_rezervace,
            $procento_predpoklad,
            $procento_skutecne,
            {$meta['pocet_zaznamu']},
            {$meta['ma_navyseni']},
            NOW()
        )
        ON DUPLICATE KEY UPDATE
            celkovy_limit = $celkovy_limit,
            rezervovano = $rezervovano,
            predpokladane_cerpani = $predpokladane_cerpani,
            skutecne_cerpano = $skutecne_cerpano,
            cerpano_pokladna = $cerpano_pokladna,
            zbyva_rezervace = $zbyva_rezervace,
            zbyva_predpoklad = $zbyva_predpoklad,
            zbyva_skutecne = $zbyva_skutecne,
            procento_rezervace = $procento_rezervace,
            procento_predpoklad = $procento_predpoklad,
            procento_skutecne = $procento_skutecne,
            pocet_zaznamu = {$meta['pocet_zaznamu']},
            ma_navyseni = {$meta['ma_navyseni']},
            posledni_prepocet = NOW()
    ";
    
    $result = mysqli_query($conn, $sql_upsert);
    
    if (!$result) {
        error_log("Chyba při upsert LP '$cislo_lp': " . mysqli_error($conn));
        return false;
    }
    
    return true;
}

/**
 * Přepočítá všechna LP pro daný rok
 * POZOR: Může trvat dlouho při velkém množství dat!
 * 
 * @param int $rok Rok pro přepočet (výchozí: aktuální rok)
 * @return array ['success' => bool, 'updated' => int, 'message' => string]
 */
function prepocetVsechLP($rok = null) {
    global $conn;
    
    if ($rok === null) {
        $rok = date('Y');
    }
    $rok = (int)$rok;
    
    // KROK 1: Získat všechny unikátní kódy LP pro daný rok
    $sql_kody = "
        SELECT DISTINCT cislo_lp
        FROM 25_limitovane_prisliby
        WHERE YEAR(platne_od) = $rok
        ORDER BY cislo_lp
    ";
    
    $result_kody = mysqli_query($conn, $sql_kody);
    
    if (!$result_kody) {
        return [
            'success' => false,
            'updated' => 0,
            'message' => 'Chyba při získávání kódů LP: ' . mysqli_error($conn)
        ];
    }
    
    $updated = 0;
    $failed = 0;
    
    // KROK 2: Přepočítat každý kód LP
    while ($row = mysqli_fetch_assoc($result_kody)) {
        if (prepocetCerpaniPodleCislaLP($row['cislo_lp'])) {
            $updated++;
        } else {
            $failed++;
        }
    }
    
    if ($failed > 0) {
        return [
            'success' => false,
            'updated' => $updated,
            'failed' => $failed,
            'message' => "Přepočítáno $updated kódů LP, $failed selhalo pro rok $rok"
        ];
    }
    
    return [
        'success' => true,
        'updated' => $updated,
        'message' => "Přepočítáno $updated kódů LP pro rok $rok"
    ];
}

/**
 * INICIALIZACE - Přepočítá všechna LP a nastaví počáteční stav
 * Tato funkce by měla být spuštěna jednorázově po implementaci
 * 
 * @param int $rok Rok pro inicializaci (výchozí: 2025)
 * @return array Detailní výsledek inicializace
 */
function inicializaceCerpaniLP($rok = 2025) {
    global $conn;
    
    $rok = (int)$rok;
    $log = [];
    
    // 1. Vymazat staré záznamy z tabulky čerpání pro daný rok
    $sql_delete = "
        DELETE FROM 25_limitovane_prisliby_cerpani 
        WHERE rok = $rok
    ";
    
    if (mysqli_query($conn, $sql_delete)) {
        $deleted_count = mysqli_affected_rows($conn);
        $log[] = "Vymazáno $deleted_count starých záznamů čerpání";
    } else {
        return [
            'success' => false,
            'message' => 'Chyba při mazání starých záznamů: ' . mysqli_error($conn),
            'log' => $log
        ];
    }
    
    // 2. Spočítat čerpání z objednávek (pro statistiku)
    $sql_obj = "
        SELECT 
            COUNT(DISTINCT pol.limitovana_prisliba) as pocet_lp,
            SUM(pol.celkova_cena) as celkem_obj
        FROM 25_objednavky obj
        JOIN 25_objednavky_polozky pol ON obj.id = pol.objednavka_id
        WHERE obj.status IN ('SCHVALENA', 'ODESLANA', 'DOKONCENA')
        AND YEAR(obj.datum_vytvoreni) = $rok
        AND pol.limitovana_prisliba IS NOT NULL
        AND pol.limitovana_prisliba != ''
    ";
    
    $result_obj = mysqli_query($conn, $sql_obj);
    
    if ($result_obj) {
        $row = mysqli_fetch_assoc($result_obj);
        $log[] = "Objednávky: Nalezeno {$row['pocet_lp']} různých kódů LP, celkem " . number_format($row['celkem_obj'], 2, ',', ' ') . " Kč";
    }
    
    // 3. Spočítat čerpání z pokladny (pro statistiku)
    $sql_pokl = "
        SELECT 
            COUNT(DISTINCT pol.limitovana_prisliba) as pocet_lp,
            SUM(pol.castka) as celkem_pokl
        FROM 25_pokladna p
        JOIN 25_pokladna_polozky pol ON p.id = pol.pokladna_id
        WHERE p.status = 'uzavrena'
        AND YEAR(p.datum) = $rok
        AND pol.limitovana_prisliba IS NOT NULL
        AND pol.limitovana_prisliba != ''
    ";
    
    $result_pokl = mysqli_query($conn, $sql_pokl);
    
    if ($result_pokl) {
        $row = mysqli_fetch_assoc($result_pokl);
        $log[] = "Pokladna: Nalezeno {$row['pocet_lp']} různých kódů LP, celkem " . number_format($row['celkem_pokl'], 2, ',', ' ') . " Kč";
    }
    
    // 4. Provést kompletní přepočet všech kódů LP
    $result = prepocetVsechLP($rok);
    $log[] = $result['message'];
    
    if (!$result['success']) {
        return [
            'success' => false,
            'message' => 'Chyba při přepočtu LP',
            'log' => $log
        ];
    }
    
    // 5. Získat statistiku z nové tabulky - TŘI TYPY
    $sql_stats = "
        SELECT 
            COUNT(*) as celkem_kodu,
            SUM(celkovy_limit) as celkovy_limit,
            SUM(rezervovano) as celkem_rezervovano,
            SUM(predpokladane_cerpani) as celkem_predpoklad,
            SUM(skutecne_cerpano) as celkem_skutecne,
            SUM(cerpano_pokladna) as celkem_pokladna,
            SUM(zbyva_rezervace) as celkem_zbyva_rezervace,
            SUM(zbyva_predpoklad) as celkem_zbyva_predpoklad,
            SUM(zbyva_skutecne) as celkem_zbyva_skutecne,
            AVG(procento_rezervace) as prumerne_procento_rezervace,
            AVG(procento_predpoklad) as prumerne_procento_predpoklad,
            AVG(procento_skutecne) as prumerne_procento_skutecne,
            SUM(pocet_zaznamu) as celkem_zaznamu,
            SUM(ma_navyseni) as pocet_s_navysenim,
            COUNT(CASE WHEN zbyva_rezervace < 0 THEN 1 END) as prekroceno_rezervace,
            COUNT(CASE WHEN zbyva_predpoklad < 0 THEN 1 END) as prekroceno_predpoklad,
            COUNT(CASE WHEN zbyva_skutecne < 0 THEN 1 END) as prekroceno_skutecne
        FROM 25_limitovane_prisliby_cerpani
        WHERE rok = $rok
    ";
    
    $result_stats = mysqli_query($conn, $sql_stats);
    $stats = mysqli_fetch_assoc($result_stats);
    
    return [
        'success' => true,
        'rok' => $rok,
        'statistika' => $stats,
        'log' => $log,
        'message' => 'Inicializace čerpání LP úspěšně dokončena'
    ];
}

// === ROUTING ===

$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];

// POST /api/limitovane-prisliby/prepocet
// Body: { "lp_id": 123 } nebo { "cislo_lp": "LPIT1" }
if ($method === 'POST' && strpos($request_uri, '/prepocet') !== false) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['lp_id'])) {
        $success = prepocetCerpaniLPPoID($data['lp_id']);
        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Přepočet dokončen' : 'Chyba při přepočtu'
        ]);
    } elseif (isset($data['cislo_lp'])) {
        $success = prepocetCerpaniPodleCislaLP($data['cislo_lp']);
        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Přepočet dokončen' : 'Chyba při přepočtu nebo LP neexistuje'
        ]);
    } elseif (isset($data['vsechna'])) {
        $rok = $data['rok'] ?? null;
        $result = prepocetVsechLP($rok);
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Vyžadováno lp_id nebo cislo_lp']);
    }
    exit();
}

// POST /api/limitovane-prisliby/inicializace
// Body: { "rok": 2025 }
if ($method === 'POST' && strpos($request_uri, '/inicializace') !== false) {
    // Pouze admin může inicializovat
    if ($_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Nedostatečná oprávnění']);
        exit();
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $rok = $data['rok'] ?? 2025;
    
    $result = inicializaceCerpaniLP($rok);
    echo json_encode($result);
    exit();
}

http_response_code(404);
echo json_encode(['error' => 'Endpoint nenalezen']);
?>
```

### 2.2 Soubor: `api/limitovane-prisliby/stav.php`

```php
<?php
/**
 * API pro získání agregovaného stavu LP
 * 
 * Čte data z tabulky 25_limitovane_prisliby_cerpani (jeden řádek = jeden kód)
 * 
 * GET /api/limitovane-prisliby/stav?cislo_lp=LPIT1
 * GET /api/limitovane-prisliby/stav?user_id=123
 * GET /api/limitovane-prisliby/stav?usek_id=4
 * GET /api/limitovane-prisliby/stav?rok=2025
 */

require_once '../config/database.php';
require_once '../config/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Kontrola přihlášení
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Nepřihlášen']);
    exit();
}

/**
 * Získá agregovaný stav konkrétního kódu LP
 * 
 * @param string $cislo_lp Kód LP (např. 'LPIT1')
 * @return array|null Agregovaný stav nebo null
 */
function getStavLP($cislo_lp) {
    global $conn;
    
    $cislo_lp_safe = mysqli_real_escape_string($conn, $cislo_lp);
    
    // Agregovaný stav z tabulky čerpání - TŘI TYPY
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.usek_id,
            c.user_id,
            c.rok,
            c.celkovy_limit,
            c.rezervovano,
            c.predpokladane_cerpani,
            c.skutecne_cerpano,
            c.cerpano_pokladna,
            c.zbyva_rezervace,
            c.zbyva_predpoklad,
            c.zbyva_skutecne,
            c.procento_rezervace,
            c.procento_predpoklad,
            c.procento_skutecne,
            c.pocet_zaznamu,
            c.ma_navyseni,
            c.posledni_prepocet,
            u.prijmeni,
            u.jmeno,
            us.nazev as usek_nazev
        FROM 25_limitovane_prisliby_cerpani c
        LEFT JOIN 25_uzivatele u ON c.user_id = u.id
        LEFT JOIN 25_useky us ON c.usek_id = us.id
        WHERE c.cislo_lp = '$cislo_lp_safe'
        AND c.rok = YEAR(CURDATE())
        LIMIT 1
    ";
    
    $result = mysqli_query($conn, $sql);
    
    if (!$result || mysqli_num_rows($result) === 0) {
        return null;
    }
    
    $row = mysqli_fetch_assoc($result);
    
    // Formátování výstupu - TŘI TYPY ČERPÁNÍ
    return [
        'id' => (int)$row['id'],
        'cislo_lp' => $row['cislo_lp'],
        'kategorie' => $row['kategorie'],
        'celkovy_limit' => (float)$row['celkovy_limit'],
        
        // TŘI TYPY ČERPÁNÍ
        'rezervovano' => (float)$row['rezervovano'],
        'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
        'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
        'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
        
        // ZŮSTATKY
        'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
        'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
        'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
        
        // PROCENTA
        'procento_rezervace' => (float)$row['procento_rezervace'],
        'procento_predpoklad' => (float)$row['procento_predpoklad'],
        'procento_skutecne' => (float)$row['procento_skutecne'],
        
        // STAVY
        'je_prekroceno_rezervace' => (float)$row['zbyva_rezervace'] < 0,
        'je_prekroceno_predpoklad' => (float)$row['zbyva_predpoklad'] < 0,
        'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
        
        // METADATA
        'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
        'ma_navyseni' => (bool)$row['ma_navyseni'],
        'rok' => (int)$row['rok'],
        'posledni_prepocet' => $row['posledni_prepocet'],
        'spravce' => [
            'prijmeni' => $row['prijmeni'],
            'jmeno' => $row['jmeno']
        ],
        'usek_nazev' => $row['usek_nazev']
    ];
}

/**
 * Získá seznam všech LP pro uživatele (agregované kódy)
 * 
 * @param int $user_id ID uživatele
 * @param int $rok Rok (výchozí: aktuální)
 * @return array Seznam LP
 */
function getStavLPProUzivatele($user_id, $rok = null) {
    global $conn;
    
    $user_id = (int)$user_id;
    $rok = $rok ? (int)$rok : date('Y');
    
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.celkovy_limit,
            c.rezervovano,
            c.predpokladane_cerpani,
            c.skutecne_cerpano,
            c.zbyva_rezervace,
            c.zbyva_predpoklad,
            c.zbyva_skutecne,
            c.procento_rezervace,
            c.procento_predpoklad,
            c.procento_skutecne,
            c.pocet_zaznamu,
            c.ma_navyseni,
            us.nazev as usek_nazev
        FROM 25_limitovane_prisliby_cerpani c
        LEFT JOIN 25_useky us ON c.usek_id = us.id
        WHERE c.user_id = $user_id
        AND c.rok = $rok
        ORDER BY c.kategorie, c.cislo_lp
    ";
    
    $result = mysqli_query($conn, $sql);
    $lp_list = [];
    
    while ($row = mysqli_fetch_assoc($result)) {
        $lp_list[] = [
            'id' => (int)$row['id'],
            'cislo_lp' => $row['cislo_lp'],
            'kategorie' => $row['kategorie'],
            'celkovy_limit' => (float)$row['celkovy_limit'],
            'rezervovano' => (float)$row['rezervovano'],
            'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
            'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
            'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
            'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
            'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
            'procento_rezervace' => (float)$row['procento_rezervace'],
            'procento_predpoklad' => (float)$row['procento_predpoklad'],
            'procento_skutecne' => (float)$row['procento_skutecne'],
            'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
            'ma_navyseni' => (bool)$row['ma_navyseni'],
            'usek_nazev' => $row['usek_nazev']
        ];
    }
    
    return $lp_list;
}

/**
 * Získá seznam všech LP pro úsek (agregované kódy)
 * 
 * @param int $usek_id ID úseku
 * @param int $rok Rok (výchozí: aktuální)
 * @return array Seznam LP
 */
function getStavLPProUsek($usek_id, $rok = null) {
    global $conn;
    
    $usek_id = (int)$usek_id;
    $rok = $rok ? (int)$rok : date('Y');
    
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.celkovy_limit,
            c.rezervovano,
            c.predpokladane_cerpani,
            c.skutecne_cerpano,
            c.zbyva_rezervace,
            c.zbyva_predpoklad,
            c.zbyva_skutecne,
            c.procento_rezervace,
            c.procento_predpoklad,
            c.procento_skutecne,
            c.pocet_zaznamu,
            c.ma_navyseni,
            u.prijmeni,
            u.jmeno
        FROM 25_limitovane_prisliby_cerpani c
        LEFT JOIN 25_uzivatele u ON c.user_id = u.id
        WHERE c.usek_id = $usek_id
        AND c.rok = $rok
        ORDER BY c.kategorie, c.cislo_lp
    ";
    
    $result = mysqli_query($conn, $sql);
    $lp_list = [];
    
    while ($row = mysqli_fetch_assoc($result)) {
        $lp_list[] = [
            'id' => (int)$row['id'],
            'cislo_lp' => $row['cislo_lp'],
            'kategorie' => $row['kategorie'],
            'celkovy_limit' => (float)$row['celkovy_limit'],
            'rezervovano' => (float)$row['rezervovano'],
            'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
            'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
            'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
            'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
            'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
            'procento_rezervace' => (float)$row['procento_rezervace'],
            'procento_predpoklad' => (float)$row['procento_predpoklad'],
            'procento_skutecne' => (float)$row['procento_skutecne'],
            'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
            'ma_navyseni' => (bool)$row['ma_navyseni'],
            'spravce' => [
                'prijmeni' => $row['prijmeni'],
                'jmeno' => $row['jmeno']
            ]
        ];
    }
    
    return $lp_list;
}

// === ROUTING ===

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rok = isset($_GET['rok']) ? (int)$_GET['rok'] : null;
    
    // GET /api/limitovane-prisliby/stav?cislo_lp=LPIT1
    if (isset($_GET['cislo_lp'])) {
        $cislo_lp = $_GET['cislo_lp'];
        $stav = getStavLP($cislo_lp);
        
        if ($stav === null) {
            http_response_code(404);
            echo json_encode(['error' => 'LP nenalezeno nebo nebylo přepočítáno']);
        } else {
            echo json_encode($stav);
        }
        exit();
    }
    
    // GET /api/limitovane-prisliby/stav?user_id=123&rok=2025
    if (isset($_GET['user_id'])) {
        $user_id = (int)$_GET['user_id'];
        $list = getStavLPProUzivatele($user_id, $rok);
        echo json_encode(['data' => $list, 'count' => count($list)]);
        exit();
    }
    
    // GET /api/limitovane-prisliby/stav?usek_id=4&rok=2025
    if (isset($_GET['usek_id'])) {
        $usek_id = (int)$_GET['usek_id'];
        $list = getStavLPProUsek($usek_id, $rok);
        echo json_encode(['data' => $list, 'count' => count($list)]);
        exit();
    }
    
    http_response_code(400);
    echo json_encode(['error' => 'Vyžadován parametr cislo_lp, user_id nebo usek_id']);
    exit();
}

http_response_code(405);
echo json_encode(['error' => 'Metoda není povolena']);
?>
```

## 3. Integrace do existujících API endpointů

### 3.1 V souboru `api/objednavky/update.php`

Po úspěšném uložení/aktualizaci objednávky přidat:

```php
// ... existující kód pro uložení objednávky ...

if ($objednavka_ulozena && in_array($new_status, ['schvaleno', 'dokonceno', 'realizovano', 'storno'])) {
    // Získat všechna LP použitá v této objednávce
    $sql_lp = "
        SELECT DISTINCT limitovana_prisliba 
        FROM 25_objednavky_polozky 
        WHERE objednavka_id = $objednavka_id
        AND limitovana_prisliba IS NOT NULL
        AND limitovana_prisliba != ''
    ";
    
    $result_lp = mysqli_query($conn, $sql_lp);
    
    // Přepočítat každé LP
    require_once '../limitovane-prisliby/prepocet.php';
    
    while ($row = mysqli_fetch_assoc($result_lp)) {
        prepocetCerpaniPodleCislaLP($row['limitovana_prisliba']);
    }
}
```

### 3.2 V souboru `api/objednavky/create.php`

Po vytvoření nové objednávky:

```php
// ... po uložení položek objednávky ...

if ($polozky_ulozeny) {
    // Přepočítat LP
    require_once '../limitovane-prisliby/prepocet.php';
    
    foreach ($polozky as $polozka) {
        if (!empty($polozka['limitovana_prisliba'])) {
            prepocetCerpaniPodleCislaLP($polozka['limitovana_prisliba']);
        }
    }
}
```

### 3.3 V souboru `api/pokladna/update.php`

Po změně stavu pokladny na 'uzavrena':

```php
// ... po uzavření pokladny ...

if ($pokladna_uzavrena) {
    // Získat všechna LP z položek pokladny
    $sql_lp = "
        SELECT DISTINCT limitovana_prisliba 
        FROM 25_pokladna_polozky 
        WHERE pokladna_id = $pokladna_id
        AND limitovana_prisliba IS NOT NULL
        AND limitovana_prisliba != ''
    ";
    
    $result_lp = mysqli_query($conn, $sql_lp);
    
    require_once '../limitovane-prisliby/prepocet.php';
    
    while ($row = mysqli_fetch_assoc($result_lp)) {
        prepocetCerpaniPodleCislaLP($row['limitovana_prisliba']);
    }
}
```

### 3.4 V souboru `api/pokladna/polozky-update.php`

Po přidání/úpravě/smazání položky pokladny:

```php
// ... po změně položky ...

if ($polozka_zmenena && $pokladna_uzavrena) {
    require_once '../limitovane-prisliby/prepocet.php';
    
    // Přepočítat staré i nové LP (pokud se změnilo)
    if (!empty($stare_lp)) {
        prepocetCerpaniPodleCislaLP($stare_lp);
    }
    if (!empty($nove_lp) && $nove_lp !== $stare_lp) {
        prepocetCerpaniPodleCislaLP($nove_lp);
    }
}
```

## 4. Inicializační script

### 4.1 Soubor: `scripts/inicializace-lp-cerpani.php`

```php
<?php
/**
 * Jednorázový inicializační script
 * Spustit z příkazové řádky: php scripts/inicializace-lp-cerpani.php
 * Nebo přes prohlížeč: http://localhost/scripts/inicializace-lp-cerpani.php?rok=2025&confirm=ano
 */

require_once '../api/config/database.php';
require_once '../api/limitovane-prisliby/prepocet.php';

// Ochrana proti náhodnému spuštění
if (php_sapi_name() !== 'cli') {
    // Pokud běží z prohlížeče, vyžadovat potvrzení
    if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'ano') {
        die('Pro spuštění inicializace přidejte parametr ?confirm=ano');
    }
}

echo "=== INICIALIZACE ČERPÁNÍ LIMITOVANÝCH PŘÍSLIBŮ ===\n\n";

$rok = isset($_GET['rok']) ? (int)$_GET['rok'] : 2025;

echo "Zahajuji inicializaci pro rok $rok...\n";
echo "Tato operace může trvat několik minut.\n\n";

$start_time = microtime(true);

$result = inicializaceCerpaniLP($rok);

$end_time = microtime(true);
$duration = round($end_time - $start_time, 2);

if ($result['success']) {
    echo "✓ ÚSPĚCH!\n\n";
    echo "Výsledky inicializace:\n";
    echo "---------------------\n";
    
    foreach ($result['log'] as $log_entry) {
        echo "• $log_entry\n";
    }
    
    echo "\nStatistika po inicializaci:\n";
    echo "---------------------\n";
    $stats = $result['statistika'];
    echo "Celkem LP: " . $stats['celkem_lp'] . "\n";
    echo "Celkový limit: " . number_format($stats['celkovy_limit'], 2, ',', ' ') . " Kč\n";
    echo "Celkově vyčerpáno: " . number_format($stats['celkove_cerpano'], 2, ',', ' ') . " Kč\n";
    echo "Celkem zbývá: " . number_format($stats['celkem_zbyva'], 2, ',', ' ') . " Kč\n";
    echo "Průměrné čerpání: " . round($stats['prumerne_procento'], 2) . " %\n";
    echo "Překročených LP: " . $stats['prekroceno'] . "\n";
    
    echo "\nČas zpracování: {$duration} sekund\n";
} else {
    echo "✗ CHYBA!\n\n";
    echo $result['message'] . "\n";
    echo "\nLog:\n";
    foreach ($result['log'] as $log_entry) {
        echo "• $log_entry\n";
    }
}

echo "\n=== INICIALIZACE DOKONČENA ===\n";
?>
```

## 5. Postup implementace

### Krok 1: Databáze
1. Spustit SQL příkazy pro rozšíření tabulky `25_limitovane_prisliby`
2. Ověřit, že indexy byly vytvořeny

### Krok 2: Backend soubory
1. Vytvořit složku `api/limitovane-prisliby/`
2. Vytvořit soubor `prepocet.php` s funkcemi
3. Vytvořit soubor `stav.php` pro API dotazy
4. Vytvořit složku `scripts/`
5. Vytvořit inicializační script `inicializace-lp-cerpani.php`

### Krok 3: Spuštění inicializace
```bash
# Z příkazové řádky
php scripts/inicializace-lp-cerpani.php

# Nebo v prohlížeči
http://localhost/scripts/inicializace-lp-cerpani.php?rok=2025&confirm=ano
```

### Krok 4: Integrace do existujících endpointů
1. Upravit `api/objednavky/update.php`
2. Upravit `api/objednavky/create.php`
3. Upravit `api/pokladna/update.php`
4. Upravit `api/pokladna/polozky-update.php`

### Krok 5: Testování
1. Vytvořit testovací objednávku s LP
2. Zkontrolovat, že se aktualizoval stav LP
3. Uzavřít pokladnu s LP
4. Zkontrolovat, že se aktualizoval stav LP
5. Otestovat API endpoint `/stav`

## 6. API Dokumentace pro frontend

### 6.1 Získat stav konkrétního LP

**Request:**
```
GET /api/limitovane-prisliby/stav?cislo_lp=LPIT1
```

**Response:**
```json
{
  "id": 1,
  "cislo_lp": "LPIT1",
  "kategorie": "LPIT",
  "cislo_uctu": "501",
  "nazev_uctu": "Spotřeba materiálu",
  "vyse_financniho_kryti": 1500000.00,
  "aktualne_cerpano": 561553.91,
  "zbyva": 938446.09,
  "procento_cerpani": 37.44,
  "je_prekroceno": false,
  "platne_od": "2025-01-01",
  "platne_do": "2025-12-31",
  "posledni_prepocet": "2025-11-20 22:45:30",
  "spravce": {
    "prijmeni": "Černohorský",
    "jmeno": "Jan"
  },
  "usek_nazev": "IT oddělení"
}
```

### 6.2 Získat všechna LP pro uživatele

**Request:**
```
GET /api/limitovane-prisliby/stav?user_id=85
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "cislo_lp": "LPIT1",
      "kategorie": "LPIT",
      "nazev_uctu": "Spotřeba materiálu",
      "vyse_financniho_kryti": 1500000.00,
      "aktualne_cerpano": 561553.91,
      "zbyva": 938446.09,
      "procento_cerpani": 37.44,
      "je_prekroceno": false
    },
    // ... další LP
  ],
  "count": 5
}
```

### 6.3 Manuální přepočet (admin pouze)

**Request:**
```
POST /api/limitovane-prisliby/prepocet
Content-Type: application/json

{
  "cislo_lp": "LPIT1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Přepočet dokončen"
}
```

### 6.4 Přepočet všech LP (admin pouze)

**Request:**
```
POST /api/limitovane-prisliby/prepocet
Content-Type: application/json

{
  "vsechna": true,
  "rok": 2025
}
```

**Response:**
```json
{
  "success": true,
  "updated": 37,
  "message": "Přepočítáno 37 záznamů LP pro rok 2025"
}
```

### 6.5 Získat seskupená LP podle kódu (budoucí rozšíření)

**Request:**
```
GET /api/limitovane-prisliby/stav-seskupene?rok=2025
```

**Response:**
```json
{
  "data": [
    {
      "cislo_lp": "LPIT1",
      "kategorie": "LPIT",
      "nazev_uctu": "Spotřeba materiálu",
      "zaznamy": [
        {
          "id": 1,
          "platne_od": "2025-01-01",
          "platne_do": "2025-12-31",
          "vyse_financniho_kryti": 5000.00,
          "aktualne_cerpano": 6500.00,
          "zbyva": -1500.00,
          "procento_cerpani": 130.00,
          "je_prekroceno": true
        },
        {
          "id": 2,
          "platne_od": "2025-10-01",
          "platne_do": "2025-12-31",
          "vyse_financniho_kryti": 2000.00,
          "aktualne_cerpano": 3500.00,
          "zbyva": -1500.00,
          "procento_cerpani": 175.00,
          "je_prekroceno": true,
          "poznamka": "Navýšení"
        }
      ],
      "celkovy_limit": 7000.00,
      "skutecne_cerpano": 6500.00,
      "skutecne_zbyva": 500.00,
      "skutecne_procento": 92.86,
      "ma_navyseni": true,
      "pocet_zaznamu": 2
    }
  ],
  "count": 1
}
```

## 7. Příklady čerpání s více záznamy stejného kódu

### Scénář 1: Základní LP + Navýšení

**Databáze:**
```
ID | cislo_lp | platne_od  | platne_do  | vyse_financniho_kryti
1  | LPIT1    | 2025-01-01 | 2025-12-31 | 5000.00
2  | LPIT1    | 2025-10-01 | 2025-12-31 | 2000.00 (navýšení)
```

**Objednávky:**
```
datum_vytvoreni | limitovana_prisliba | celkova_cena | status
2025-09-15      | LPIT1              | 3000.00      | schvaleno
2025-10-15      | LPIT1              | 2500.00      | schvaleno
2025-11-20      | LPIT1              | 1000.00      | schvaleno
```

**Výpočet čerpání:**

**Záznam ID=1 (celý rok):**
- Období: 2025-01-01 až 2025-12-31
- Čerpání: 3000 (září) + 2500 (říjen) + 1000 (listopad) = **6500 Kč**
- Limit: 5000 Kč
- **Zbytek: -1500 Kč** ❌ PŘEKROČENO

**Záznam ID=2 (navýšení od října):**
- Období: 2025-10-01 až 2025-12-31
- Čerpání: 2500 (říjen) + 1000 (listopad) = **3500 Kč**
- Limit: 2000 Kč
- **Zbytek: -1500 Kč** ❌ PŘEKROČENO

**Celkový dostupný limit LPIT1:** 5000 + 2000 = **7000 Kč**  
**Celkové skutečné čerpání:** 6500 Kč  
**Reálně zbývá:** 7000 - 6500 = **500 Kč**

### Scénář 2: Více navýšení v průběhu roku

**Databáze:**
```
ID | cislo_lp | platne_od  | platne_do  | vyse_financniho_kryti
1  | LPZDR1   | 2025-01-01 | 2025-12-31 | 10000.00
2  | LPZDR1   | 2025-04-01 | 2025-12-31 | 3000.00  (1. navýšení)
3  | LPZDR1   | 2025-09-01 | 2025-12-31 | 2000.00  (2. navýšení)
```

**Objednávky:**
```
datum_vytvoreni | limitovana_prisliba | celkova_cena | status
2025-02-10      | LPZDR1             | 4000.00      | schvaleno
2025-05-15      | LPZDR1             | 5000.00      | dokonceno
2025-10-20      | LPZDR1             | 3000.00      | realizovano
```

**Výpočet čerpání:**

**Záznam ID=1 (celý rok):**
- Čerpání: 4000 + 5000 + 3000 = **12000 Kč**
- Limit: 10000 Kč → **Překročeno o 2000 Kč**

**Záznam ID=2 (od dubna):**
- Čerpání: 5000 + 3000 = **8000 Kč**
- Limit: 3000 Kč → **Překročeno o 5000 Kč**

**Záznam ID=3 (od září):**
- Čerpání: 3000 Kč
- Limit: 2000 Kč → **Překročeno o 1000 Kč**

**Interpretace:**
- Celkový limit: 10000 + 3000 + 2000 = **15000 Kč**
- Celkové čerpání: **12000 Kč**
- V rámci celkového limitu: **OK** ✓
- Ale první záznam sám o sobě už je překročený

## 8. Poznámky k implementaci

### Výkon
- Přepočet jednoho LP trvá cca 50-200ms
- Inicializace všech LP (37 záznamů) trvá cca 5-10 sekund
- Pro více než 100 LP zvážit dávkové zpracování

### Stavy objednávek započítávané do čerpání
- `schvaleno` - schválená objednávka
- `dokonceno` - dokončená objednávka
- `realizovano` - realizovaná objednávka

**Nezapočítávají se:**
- `koncept` - rozpracovaná objednávka
- `storno` - stornovaná objednávka
- `odmitnuto` - odmítnutá objednávka

### Stavy pokladny započítávané do čerpání
- `uzavrena` - uzavřená pokladna

**Nezapočítává se:**
- `otevrena` - otevřená pokladna (rozpracovaná)

### Datumová logika
- **Objednávky**: Porovnává se `datum_vytvoreni` s intervalem `platne_od` až `platne_do`
- **Pokladna**: Porovnává se `datum` s intervalem `platne_od` až `platne_do`
- **BETWEEN operátor**: Zahrnuje oba krajní body (od i do včetně)
- **Více záznamů stejného kódu**: Každý záznam počítá jen své období, ale všechny používají stejný `cislo_lp`

### Bezpečnost
- Všechny API endpointy vyžadují přihlášení
- Inicializace a přepočet všech LP vyžaduje admin roli
- SQL injection ochrana pomocí `mysqli_real_escape_string`

### Logování
- Doporučeno logovat všechny přepočty do samostatného log souboru
- Ukládat informace o tom, kdo a kdy spustil přepočet
- Logovat překročení limitů

## 9. Frontend integrace (ZJEDNODUŠENO s novou architekturou)

### Zobrazení agregovaných dat LP

**API vrací hotová data - žádné seskupování!**

```javascript
// GET /api/limitovane-prisliby/stav?usek_id=4
const response = await fetch('/api/limitovane-prisliby/stav?usek_id=4');
const data = await response.json();

// data.data obsahuje:
[
  {
    cislo_lp: 'LPIT1',
    kategorie: 'LPIT',
    celkovy_limit: 7000.00,
    celkove_cerpano: 6500.00,
    celkove_zbyva: 500.00,
    celkove_procento: 92.86,
    je_prekroceno: false,
    pocet_zaznamu: 2,      // 2 = má navýšení
    ma_navyseni: true,
    usek_nazev: 'IT oddělení'
  },
  // ... další kódy LP
]
```

### Zobrazení v tabulce

```jsx
<table>
  <thead>
    <tr>
      <th>Kód LP</th>
      <th>Kategorie</th>
      <th>Celkový limit</th>
      <th>Vyčerpáno</th>
      <th>Zbývá</th>
      <th>%</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {data.data.map(lp => (
      <tr key={lp.cislo_lp}>
        <td>
          {lp.cislo_lp}
          {lp.ma_navyseni && <Badge>Navýšení</Badge>}
        </td>
        <td>{lp.kategorie}</td>
        <td>{formatCurrency(lp.celkovy_limit)}</td>
        <td>{formatCurrency(lp.celkove_cerpano)}</td>
        <td className={lp.je_prekroceno ? 'text-red' : 'text-green'}>
          {formatCurrency(lp.celkove_zbyva)}
        </td>
        <td>{lp.celkove_procento.toFixed(2)}%</td>
        <td>
          {lp.je_prekroceno ? '❌ Překročeno' : '✅ OK'}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Progress bar

```jsx
const getProgressColor = (procento) => {
  if (procento >= 100) return '#ef4444'; // červená
  if (procento >= 90) return '#f59e0b';  // oranžová
  if (procento >= 75) return '#eab308';  // žlutá
  return '#10b981';                       // zelená
};

<ProgressBar 
  value={lp.celkove_procento} 
  max={100}
  color={getProgressColor(lp.celkove_procento)}
/>
```

## 10. Budoucí rozšíření (volitelné)

1. **Notifikace při překročení limitu**
   - Email notifikace při překročení 90%, 100%, 110%
   - Push notifikace v aplikaci
   
2. **Detail kódu s více záznamy**
   - API endpoint `GET /api/limitovane-prisliby/detail?cislo_lp=LPIT1`
   - Vrátí agregovaný stav + seznam všech záznamů (původní + navýšení)
   - Frontend může zobrazit hierarchicky
   
3. **Historie změn čerpání**
   - Tabulka `25_limitovane_prisliby_cerpani_historie`
   - Snapshot stavu čerpání každý den/týden
   - Graf vývoje čerpání v čase

4. **Predikce čerpání**
   - Odhad, kdy bude limit vyčerpán
   - Doporučení navýšení limitu
   - Trend čerpání (lineární regrese)

5. **Export reportů**
   - Excel export stavu všech LP
   - PDF reporty pro vedení s grafy
   - Porovnání čerpání mezi úseky

6. **Dashboard pro správce LP**
   - Přehled všech LP na jedné stránce
   - Semafory (zelená/žlutá/červená) podle čerpání
   - Top 10 nejvíce čerpaných LP
   - Top 10 nejkritičtějších LP (blízko limitu)

---

## Souhrn klíčových změn

### ✅ Architektura DVĚ TABULKY (Verze 3.0)
1. **`25_limitovane_prisliby`** - master data (záznamy LP, platnosti, limity)
   - BEZE ZMĚN - žádné nové sloupce
   - Obsahuje jednotlivé záznamy (původní + navýšení)

2. **`25_limitovane_prisliby_cerpani`** - NOVÁ tabulka
   - Jeden řádek = jeden KÓD LP (např. LPIT1)
   - Obsahuje agregované čerpání (`celkovy_limit`, `celkove_cerpano`, `celkove_zbyva`)
   - Automaticky se přepočítává při změnách objednávek/pokladny

### ✅ Výhody nové architektury
- **Frontend jednoduchý** - jeden řádek API = jeden kód LP, žádné seskupování
- **Rychlé dotazy** - agregace již uložena, ne počítána při každém dotazu
- **Čistá separace** - master data vs. vypočtená data
- **Snadná údržba** - každá tabulka má jeden účel

### ✅ Správné řešení čerpání podle datumů
- Každý záznam LP má `platne_od` a `platne_do`
- Čerpání se agreguje ze všech záznamů stejného kódu
- Používá se `DATE(datum) BETWEEN platne_od AND platne_do`
- Nejstarší až nejnovější platnost = rozsah pro čerpání

### ✅ Podpora více záznamů stejného kódu
- Jeden kód (např. LPIT1) může mít více záznamů (původní + navýšení)
- Agregační tabulka sečte limity a spočítá celkové čerpání
- `pocet_zaznamu` ukazuje, kolik je záznamů (1 = základní, 2+ = navýšení)
- `ma_navyseni` flag pro rychlou detekci navýšení

### ✅ API vrací hotová data
- **GET /api/limitovane-prisliby/stav?usek_id=4** → agregované kódy LP
- Žádné seskupování na frontendu
- Jednoduchá integrace do UI

---

## SQL příkazy pro zrušení starých sloupců

Pokud jste již spustili ALTER TABLE z verze 1.0/2.0, zrušte tyto sloupce:

```sql
-- MySQL 5.5.43 - musíme nejprve dropnout indexy, pak vypočítané sloupce, pak normální

-- 1. Zrušit indexy
ALTER TABLE `25_limitovane_prisliby` DROP INDEX IF EXISTS `idx_lp_cislo`;
ALTER TABLE `25_limitovane_prisliby` DROP INDEX IF EXISTS `idx_lp_kategorie`;
ALTER TABLE `25_limitovane_prisliby` DROP INDEX IF EXISTS `idx_lp_user`;
ALTER TABLE `25_limitovane_prisliby` DROP INDEX IF EXISTS `idx_lp_usek`;

-- 2. Zrušit vypočítané sloupce (GENERATED) - musí jako první
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN IF EXISTS `procento_cerpani`;
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN IF EXISTS `zbyva`;

-- 3. Zrušit normální sloupce
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN IF EXISTS `posledni_prepocet`;
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN IF EXISTS `aktualne_cerpano`;
```

**Poznámka:** `DROP COLUMN IF EXISTS` není v MySQL 5.5, použijte bez IF EXISTS:

```sql
-- Pro MySQL 5.5.43 (bez IF EXISTS):

-- 1. Zrušit indexy (pokud existují, jinak ignorovat chyby)
ALTER TABLE `25_limitovane_prisliby` DROP INDEX `idx_lp_cislo`;
ALTER TABLE `25_limitovane_prisliby` DROP INDEX `idx_lp_kategorie`;
ALTER TABLE `25_limitovane_prisliby` DROP INDEX `idx_lp_user`;
ALTER TABLE `25_limitovane_prisliby` DROP INDEX `idx_lp_usek`;

-- 2. Zrušit vypočítané sloupce GENERATED
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN `procento_cerpani`;
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN `zbyva`;

-- 3. Zrušit normální sloupce
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN `posledni_prepocet`;
ALTER TABLE `25_limitovane_prisliby` DROP COLUMN `aktualne_cerpano`;
```

**Pokud indexy nebo sloupce neexistují, příkazy selžou - to je OK, pokračujte dalším.**

---

**Dokument vytvořen:** 20.11.2025  
**Poslední aktualizace:** 21.11.2025 00:15  
**Verze:** 3.0 - Architektura DVĚ TABULKY  
**Autor:** GitHub Copilot + Robert Holovský

**Historie verzí:**

**Verze 3.0 (21.11.2025):**
- 🔥 **BREAKING CHANGE:** Nová architektura se dvěma tabulkami
- ✅ Tabulka `25_limitovane_prisliby` zůstává BEZ ZMĚN
- ✅ Nová tabulka `25_limitovane_prisliby_cerpani` pro agregovaná data
- ✅ Kompletně přepsané PHP funkce pro novou architekturu
- ✅ API vrací hotová agregovaná data (jeden řádek = jeden kód)
- ✅ SQL příkazy pro zrušení starých sloupců (MySQL 5.5.43)
- ✅ Zjednodušení frontendu - žádné seskupování

**Verze 2.0 (20.11.2025):**
- ✅ Přidána podpora datumových intervalů platnosti LP
- ✅ Řešení více záznamů stejného kódu (navýšení)
- ✅ Upraveny SQL dotazy pro filtrování podle data

**Verze 1.0 (20.11.2025):**
- ✅ První verze s ALTER TABLE sloupci v původní tabulce
