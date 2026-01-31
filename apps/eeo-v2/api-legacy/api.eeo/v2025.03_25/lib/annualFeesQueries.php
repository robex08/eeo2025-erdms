<?php
/**
 * ============================================================================
 * 💰 ROČNÍ POPLATKY - SQL QUERIES
 * ============================================================================
 * 
 * SQL dotazy pro Evidence ročních poplatků
 * Separace query logiky od business logiky (podle PHPAPI.prompt.md)
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

// Konstanty tabulek podle PHPAPI.prompt.md pravidel
if (!defined('TBL_ROCNI_POPLATKY')) {
    define('TBL_ROCNI_POPLATKY', '25a_rocni_poplatky');
}
if (!defined('TBL_ROCNI_POPLATKY_POLOZKY')) {
    define('TBL_ROCNI_POPLATKY_POLOZKY', '25a_rocni_poplatky_polozky');
}

// ============================================================================
// 📋 LIST - Seznam ročních poplatků s filtry
// ============================================================================

function queryAnnualFeesList($pdo, $filters, $limit, $offset) {
    $where = ['rp.aktivni = 1'];
    $params = [];

    // Filtry
    if ($filters['rok']) {
        $where[] = 'rp.rok = :rok';
        $params[':rok'] = $filters['rok'];
    }
    if ($filters['druh']) {
        $where[] = 'rp.druh = :druh';
        $params[':druh'] = $filters['druh'];
    }
    if ($filters['platba']) {
        $where[] = 'rp.platba = :platba';
        $params[':platba'] = $filters['platba'];
    }
    if ($filters['stav']) {
        $where[] = 'rp.stav = :stav';
        $params[':stav'] = $filters['stav'];
    }
    if ($filters['smlouva_search']) {
        $where[] = '(s.cislo_smlouvy LIKE :search OR s.nazev_smlouvy LIKE :search)';
        $params[':search'] = '%' . $filters['smlouva_search'] . '%';
    }

    $whereClause = implode(' AND ', $where);

    // Celkový počet
    $countSql = "
        SELECT COUNT(*) 
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `25_smlouvy` s ON rp.smlouva_id = s.id
        WHERE $whereClause
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();

    // Seznam - JEDNODUŠE bez složitého výpočtu stavu v SQL
    $sql = "
        SELECT 
            rp.id,
            rp.nazev,
            rp.poznamka,
            rp.rok,
            rp.druh,
            cs_druh.nazev_stavu AS druh_nazev,
            rp.platba,
            cs_platba.nazev_stavu AS platba_nazev,
            rp.celkova_castka,
            rp.zaplaceno_celkem,
            rp.zbyva_zaplatit,
            rp.smlouva_id,
            s.cislo_smlouvy AS smlouva_cislo,
            s.nazev_smlouvy,
            s.nazev_firmy AS dodavatel_nazev,
            s.ico AS dodavatel_ico,
            rp.dt_vytvoreni,
            rp.dt_aktualizace,
            rp.vytvoril_uzivatel_id,
            rp.aktualizoval_uzivatel_id,
            u_vytvoril.jmeno AS vytvoril_jmeno,
            u_vytvoril.prijmeni AS vytvoril_prijmeni,
            u_aktualizoval.jmeno AS aktualizoval_jmeno,
            u_aktualizoval.prijmeni AS aktualizoval_prijmeni,
            (SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE rocni_poplatek_id = rp.id AND aktivni = 1) AS pocet_polozek,
            (SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav = 'ZAPLACENO') AS pocet_zaplaceno
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `25_smlouvy` s ON rp.smlouva_id = s.id
        LEFT JOIN `25_ciselnik_stavy` cs_druh ON rp.druh = cs_druh.kod_stavu AND cs_druh.typ_objektu = 'DRUH_ROCNIHO_POPLATKU'
        LEFT JOIN `25_ciselnik_stavy` cs_platba ON rp.platba = cs_platba.kod_stavu AND cs_platba.typ_objektu = 'PLATBA_ROCNIHO_POPLATKU'
        LEFT JOIN `25_uzivatele` u_vytvoril ON rp.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_aktualizoval ON rp.aktualizoval_uzivatel_id = u_aktualizoval.id
        WHERE $whereClause
        ORDER BY rp.rok DESC, rp.dt_vytvoreni DESC
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
    $stmt->execute();

    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Načíst číselník stavů jednou
    $stavyMap = [];
    $stavyStmt = $pdo->query("SELECT kod_stavu, nazev_stavu FROM `25_ciselnik_stavy` WHERE typ_objektu = 'ROCNI_POPLATEK'");
    while ($row = $stavyStmt->fetch(PDO::FETCH_ASSOC)) {
        $stavyMap[$row['kod_stavu']] = $row['nazev_stavu'];
    }
    
    // Pro každý řádek dynamicky spočítat stav podle položek
    foreach ($items as &$item) {
        $pocet_polozek = (int)$item['pocet_polozek'];
        $pocet_zaplaceno = (int)$item['pocet_zaplaceno'];
        
        // JEDNODUCHÁ LOGIKA
        if ($pocet_polozek > 0 && $pocet_zaplaceno >= $pocet_polozek) {
            $stav = 'ZAPLACENO';
        } else if ($pocet_zaplaceno > 0) {
            $stav = 'CASTECNE';
        } else {
            $stav = 'NEZAPLACENO';
        }
        
        $item['stav'] = $stav;
        $item['stav_nazev'] = $stavyMap[$stav] ?? $stav; // Fallback na kód pokud chybí v číselníku
    }
    unset($item); // Break reference

    return [
        'items' => $items,
        'total' => $total
    ];
}

// ============================================================================
// 🔍 DETAIL - Detail včetně všech položek
// ============================================================================

function queryAnnualFeesDetail($pdo, $id) {
    // 1️⃣ Hlavička
    $sql = "
        SELECT 
            rp.*,
            cs_druh.nazev_stavu AS druh_nazev,
            cs_platba.nazev_stavu AS platba_nazev,
            cs_stav.nazev_stavu AS stav_nazev,
            s.cislo_smlouvy,
            s.nazev_smlouvy,
            s.platnost_od AS smlouva_platnost_od,
            s.platnost_do AS smlouva_platnost_do,
            s.nazev_firmy AS dodavatel_nazev,
            s.ico AS dodavatel_ico,
            s.dic AS dodavatel_dic,
            u_vytvoril.jmeno AS vytvoril_jmeno,
            u_vytvoril.prijmeni AS vytvoril_prijmeni,
            u_aktualizoval.jmeno AS aktualizoval_jmeno,
            u_aktualizoval.prijmeni AS aktualizoval_prijmeni
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `25_smlouvy` s ON rp.smlouva_id = s.id
        LEFT JOIN `25_ciselnik_stavy` cs_druh ON rp.druh = cs_druh.kod_stavu AND cs_druh.typ_objektu = 'DRUH_ROCNIHO_POPLATKU'
        LEFT JOIN `25_ciselnik_stavy` cs_platba ON rp.platba = cs_platba.kod_stavu AND cs_platba.typ_objektu = 'PLATBA_ROCNIHO_POPLATKU'
        LEFT JOIN `25_ciselnik_stavy` cs_stav ON rp.stav = cs_stav.kod_stavu AND cs_stav.typ_objektu = 'ROCNI_POPLATEK'
        LEFT JOIN `25_uzivatele` u_vytvoril ON rp.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_aktualizoval ON rp.aktualizoval_uzivatel_id = u_aktualizoval.id
        WHERE rp.id = :id AND rp.aktivni = 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);
    $hlavicka = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$hlavicka) {
        return null;
    }

    // 2️⃣ Položky
    $sqlPolozky = "
        SELECT 
            p.*,
            cs_stav.nazev_stavu AS stav_nazev,
            f.fa_cislo_vema AS faktura_cislo,
            f.fa_datum_vystaveni AS faktura_datum,
            u_vytvoril.jmeno AS vytvoril_jmeno,
            u_vytvoril.prijmeni AS vytvoril_prijmeni,
            u_aktualizoval.jmeno AS aktualizoval_jmeno,
            u_aktualizoval.prijmeni AS aktualizoval_prijmeni,
            p.cislo_dokladu,
            p.datum_zaplaceno
        FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` p
        LEFT JOIN `25_ciselnik_stavy` cs_stav ON p.stav = cs_stav.kod_stavu AND cs_stav.typ_objektu = 'ROCNI_POPLATEK'
        LEFT JOIN `25a_objednavky_faktury` f ON p.faktura_id = f.id
        LEFT JOIN `25_uzivatele` u_vytvoril ON p.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_aktualizoval ON p.aktualizoval_uzivatel_id = u_aktualizoval.id
        WHERE p.rocni_poplatek_id = :id AND p.aktivni = 1
        ORDER BY p.poradi ASC
    ";
    $stmtPolozky = $pdo->prepare($sqlPolozky);
    $stmtPolozky->execute([':id' => $id]);
    $polozky = $stmtPolozky->fetchAll(PDO::FETCH_ASSOC);

    $hlavicka['polozky'] = $polozky;
    return $hlavicka;
}

// ============================================================================
// ➕ INSERT - Vytvoření ročního poplatku
// ============================================================================

function queryInsertAnnualFee($pdo, $data) {
    $sql = "
        INSERT INTO `" . TBL_ROCNI_POPLATKY . "` (
            smlouva_id, nazev, popis, poznamka, rok,
            druh, platba, celkova_castka, zaplaceno_celkem, zbyva_zaplatit,
            stav, rozsirujici_data, vytvoril_uzivatel_id, dt_vytvoreni, aktivni
        ) VALUES (
            :smlouva_id, :nazev, :popis, :poznamka, :rok,
            :druh, :platba, :celkova_castka, :zaplaceno_celkem, :zbyva_zaplatit,
            :stav, :rozsirujici_data, :vytvoril_uzivatel_id, :dt_vytvoreni, 1
        )
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':smlouva_id' => $data['smlouva_id'],
        ':nazev' => $data['nazev'],
        ':popis' => $data['popis'],
        ':poznamka' => $data['poznamka'] ?? null,
        ':rok' => $data['rok'],
        ':druh' => $data['druh'],
        ':platba' => $data['platba'],
        ':celkova_castka' => $data['celkova_castka'],
        ':zaplaceno_celkem' => $data['zaplaceno_celkem'],
        ':zbyva_zaplatit' => $data['zbyva_zaplatit'],
        ':stav' => $data['stav'],
        ':rozsirujici_data' => $data['rozsirujici_data'],
        ':vytvoril_uzivatel_id' => $data['vytvoril_uzivatel_id'],
        ':dt_vytvoreni' => $data['dt_vytvoreni']
    ]);
    return $pdo->lastInsertId();
}

// ============================================================================
// ➕ INSERT - Vytvoření položky ročního poplatku
// ============================================================================

function queryInsertAnnualFeeItem($pdo, $data) {
    $sql = "
        INSERT INTO `" . TBL_ROCNI_POPLATKY_POLOZKY . "` (
            rocni_poplatek_id, faktura_id, poradi, nazev_polozky,
            castka, cislo_dokladu, datum_zaplaceno, datum_splatnosti, datum_zaplaceni, stav, poznamka,
            rozsirujici_data, vytvoril_uzivatel_id, dt_vytvoreni, aktivni
        ) VALUES (
            :rocni_poplatek_id, :faktura_id, :poradi, :nazev_polozky,
            :castka, :cislo_dokladu, :datum_zaplaceno, :datum_splatnosti, :datum_zaplaceni, :stav, :poznamka,
            :rozsirujici_data, :vytvoril_uzivatel_id, :dt_vytvoreni, 1
        )
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':rocni_poplatek_id' => $data['rocni_poplatek_id'],
        ':faktura_id' => $data['faktura_id'] ?? null,
        ':poradi' => $data['poradi'],
        ':nazev_polozky' => $data['nazev_polozky'],
        ':castka' => $data['castka'],
        ':cislo_dokladu' => $data['cislo_dokladu'] ?? null,
        ':datum_zaplaceno' => $data['datum_zaplaceno'] ?? null,
        ':datum_splatnosti' => $data['datum_splatnosti'],
        ':datum_zaplaceni' => $data['datum_zaplaceni'] ?? null,
        ':stav' => $data['stav'],
        ':poznamka' => $data['poznamka'] ?? null,
        ':rozsirujici_data' => $data['rozsirujici_data'] ?? null,
        ':vytvoril_uzivatel_id' => $data['vytvoril_uzivatel_id'],
        ':dt_vytvoreni' => $data['dt_vytvoreni']
    ]);
    return $pdo->lastInsertId();
}

// ============================================================================
// 🔄 UPDATE - Aktualizace ročního poplatku
// ============================================================================

function queryUpdateAnnualFee($pdo, $data) {
    $setClauses = [];
    $params = [':id' => $data['id']];

    $allowedFields = ['nazev', 'popis', 'poznamka', 'druh', 'stav', 'platba', 'celkova_castka', 'rozsirujici_data', 'aktualizoval_uzivatel_id', 'dt_aktualizace'];
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $setClauses[] = "`$field` = :$field";
            $params[":$field"] = $data[$field];
        }
    }

    if (empty($setClauses)) {
        return false;
    }

    $sql = "UPDATE `" . TBL_ROCNI_POPLATKY . "` SET " . implode(', ', $setClauses) . " WHERE id = :id AND aktivni = 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount() > 0;
}

// ============================================================================
// 📝 UPDATE - Aktualizace položky
// ============================================================================

function queryUpdateAnnualFeeItem($pdo, $data) {
    $setClauses = [];
    $params = [':id' => $data['id']];

    $allowedFields = ['nazev_polozky', 'castka', 'datum_splatnosti', 'stav', 'datum_zaplaceni', 'poznamka', 'faktura_id', 'cislo_dokladu', 'datum_zaplaceno', 'rozsirujici_data', 'aktualizoval_uzivatel_id', 'dt_aktualizace'];
    foreach ($allowedFields as $field) {
        // ✅ Použít array_key_exists místo isset, aby se mohly nastavit NULL hodnoty (např. faktura_id = NULL)
        if (array_key_exists($field, $data)) {
            $setClauses[] = "`$field` = :$field";
            $params[":$field"] = $data[$field];
        }
    }

    if (empty($setClauses)) {
        error_log("⚠️ queryUpdateAnnualFeeItem - žádná pole k aktualizaci!");
        return null;
    }

    $sql = "UPDATE `" . TBL_ROCNI_POPLATKY_POLOZKY . "` SET " . implode(', ', $setClauses) . " WHERE id = :id AND aktivni = 1";
    error_log("🔍 queryUpdateAnnualFeeItem SQL: " . $sql);
    error_log("🔍 queryUpdateAnnualFeeItem params: " . json_encode($params, JSON_UNESCAPED_UNICODE));
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Vrátit položku včetně rocni_poplatek_id pro přepočítání
    $selectSql = "SELECT * FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE id = :id";
    $selectStmt = $pdo->prepare($selectSql);
    $selectStmt->execute([':id' => $data['id']]);
    return $selectStmt->fetch(PDO::FETCH_ASSOC);
}

// ============================================================================
// 🔄 RECALCULATE - Přepočítání sum v hlavičce z položek
// ============================================================================

function queryRecalculateAnnualFeeSums($pdo, $rocni_poplatek_id) {
    // 1️⃣ Vypočítat sumy z položek
    $sql = "
        SELECT 
            SUM(castka) AS celkova_castka,
            SUM(CASE WHEN stav = 'ZAPLACENO' THEN castka ELSE 0 END) AS zaplaceno_celkem
        FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "`
        WHERE rocni_poplatek_id = :id AND aktivni = 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $rocni_poplatek_id]);
    $sums = $stmt->fetch(PDO::FETCH_ASSOC);

    $celkova = $sums['celkova_castka'] ?? 0;
    $zaplaceno = $sums['zaplaceno_celkem'] ?? 0;
    $zbyva = $celkova - $zaplaceno;
    
    // 2️⃣ Určit stav na základě zaplacenosti
    // Počet zaplacených položek (přesnější než porovnávání částek kvůli zaokrouhlování)
    $sqlCount = "
        SELECT COUNT(*) as total, SUM(CASE WHEN stav = 'ZAPLACENO' THEN 1 ELSE 0 END) as zaplaceno_count
        FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "`
        WHERE rocni_poplatek_id = :id AND aktivni = 1
    ";
    $stmtCount = $pdo->prepare($sqlCount);
    $stmtCount->execute([':id' => $rocni_poplatek_id]);
    $counts = $stmtCount->fetch(PDO::FETCH_ASSOC);
    
    $total_polozek = $counts['total'] ?? 0;
    $zaplaceno_polozek = $counts['zaplaceno_count'] ?? 0;
    
    $stav = 'NEZAPLACENO';
    if ($total_polozek > 0 && $zaplaceno_polozek >= $total_polozek) {
        // Všechny položky zaplaceny
        $stav = 'ZAPLACENO';
    } else if ($zaplaceno > 0 || $zaplaceno_polozek > 0) {
        // Alespoň něco zaplaceno
        $stav = 'CASTECNE';
    }

    // 3️⃣ Aktualizovat hlavičku včetně stavu
    $updateSql = "
        UPDATE `" . TBL_ROCNI_POPLATKY . "`
        SET 
            celkova_castka = :celkova,
            zaplaceno_celkem = :zaplaceno,
            zbyva_zaplatit = :zbyva,
            stav = :stav
        WHERE id = :id
    ";
    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute([
        ':celkova' => $celkova,
        ':zaplaceno' => $zaplaceno,
        ':zbyva' => $zbyva,
        ':stav' => $stav,
        ':id' => $rocni_poplatek_id
    ]);

    return true;
}

// ============================================================================
// 🗑️ SOFT DELETE - Deaktivace ročního poplatku a všech položek
// ============================================================================

function querySoftDeleteAnnualFeeWithConstants($pdo, $id, $user_id) {
    try {
        $pdo->beginTransaction();

        // Nejprve zkontroluj, zda roční poplatek existuje a je aktivní
        // Použití konstant podle PHPAPI.prompt.md pravidel
        $checkSql = "SELECT id FROM `" . TBL_ROCNI_POPLATKY . "` WHERE id = :id AND aktivni = 1";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':id' => $id]);
        
        if ($checkStmt->rowCount() === 0) {
            $pdo->rollback();
            error_log("❌ Annual Fees Delete: Poplatek ID $id neexistuje nebo již neaktivní");
            return false; // Nenalezen nebo již neaktivní
        }

        // Deaktivovat položky s použitím konstanty
        $sql1 = "
            UPDATE `" . TBL_ROCNI_POPLATKY_POLOZKY . "`
            SET 
                aktivni = 0,
                aktualizoval_uzivatel_id = :user_id,
                dt_aktualizace = :dt_aktualizace
            WHERE rocni_poplatek_id = :id
        ";
        $stmt1 = $pdo->prepare($sql1);
        $stmt1->execute([
            ':id' => $id,
            ':user_id' => $user_id,
            ':dt_aktualizace' => TimezoneHelper::getCurrentDatetimeCzech()
        ]);

        error_log("✅ Annual Fees Delete: Deaktivovány položky: " . $stmt1->rowCount());

        // Deaktivovat hlavičku s použitím konstanty
        $sql2 = "
            UPDATE `" . TBL_ROCNI_POPLATKY . "`
            SET 
                aktivni = 0,
                aktualizoval_uzivatel_id = :user_id,
                dt_aktualizace = :dt_aktualizace
            WHERE id = :id AND aktivni = 1
        ";
        $stmt2 = $pdo->prepare($sql2);
        $stmt2->execute([
            ':id' => $id,
            ':user_id' => $user_id,
            ':dt_aktualizace' => TimezoneHelper::getCurrentDatetimeCzech()
        ]);

        $affectedRows = $stmt2->rowCount();
        error_log("✅ Annual Fees Delete: Deaktivována hlavička, affected rows: " . $affectedRows);
        
        $pdo->commit();

        return $affectedRows > 0;
        
    } catch (Exception $e) {
        $pdo->rollback();
        error_log("❌ Annual Fees Delete Query Error: " . $e->getMessage());
        throw $e;
    }
}

// ============================================================================
// 🗑️ HARD DELETE - Fyzické smazání ročního poplatku z databáze (SQL DELETE)
// ============================================================================

function queryHardDeleteAnnualFee($pdo, $id) {
    try {
        $pdo->beginTransaction();

        // 1. Zkontroluj existence ročního poplatku
        $checkSql = "SELECT id FROM `" . TBL_ROCNI_POPLATKY . "` WHERE id = :id";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':id' => $id]);
        
        if ($checkStmt->rowCount() === 0) {
            $pdo->rollback();
            error_log("❌ Annual Fees Hard Delete: Poplatek ID $id neexistuje");
            return false; // Nenalezen
        }

        error_log("🔥 Hard Delete: Mazání ročního poplatku ID $id včetně všech položek");

        // 2. Smazat všechny položky (CASCADE delete)
        $deletePolicyStmt = "DELETE FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE rocni_poplatek_id = :id";
        $stmt1 = $pdo->prepare($deletePolicyStmt);
        $stmt1->execute([':id' => $id]);
        
        $deletedItems = $stmt1->rowCount();
        error_log("✅ Hard Delete: Smazáno $deletedItems položek pro roční poplatek ID $id");

        // 3. Smazat hlavičku ročního poplatku
        $deleteMainSql = "DELETE FROM `" . TBL_ROCNI_POPLATKY . "` WHERE id = :id";
        $stmt2 = $pdo->prepare($deleteMainSql);
        $stmt2->execute([':id' => $id]);
        
        $affectedRows = $stmt2->rowCount();
        error_log("✅ Hard Delete: Smazán roční poplatek ID $id, affected rows: " . $affectedRows);
        
        $pdo->commit();

        return $affectedRows > 0;
        
    } catch (Exception $e) {
        $pdo->rollback();
        error_log("❌ Annual Fees Hard Delete Error: " . $e->getMessage());
        throw $e;
    }
}

// ============================================================================

// Zachová původní funkci pro zpětnou kompatibilitu
function querySoftDeleteAnnualFee($pdo, $id, $user_id) {
    try {
        $pdo->beginTransaction();

        // Nejprve zkontroluj, zda roční poplatek existuje a je aktivní
        $checkSql = "SELECT id FROM `25a_rocni_poplatky` WHERE id = :id AND aktivni = 1";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':id' => $id]);
        
        if ($checkStmt->rowCount() === 0) {
            $pdo->rollback();
            return false; // Nenalezen nebo již neaktivní
        }

        // Deaktivovat položky
        $sql1 = "
            UPDATE `25a_rocni_poplatky_polozky`
            SET 
                aktivni = 0,
                aktualizoval_uzivatel_id = :user_id,
                dt_aktualizace = :dt_aktualizace
            WHERE rocni_poplatek_id = :id
        ";
        $stmt1 = $pdo->prepare($sql1);
        $stmt1->execute([
            ':id' => $id,
            ':user_id' => $user_id,
            ':dt_aktualizace' => TimezoneHelper::getCurrentDatetimeCzech()
        ]);

        error_log("✅ Annual Fees Delete: Deaktivovány položky: " . $stmt1->rowCount());

        // Deaktivovat hlavičku
        $sql2 = "
            UPDATE `25a_rocni_poplatky`
            SET 
                aktivni = 0,
                aktualizoval_uzivatel_id = :user_id,
                dt_aktualizace = :dt_aktualizace
            WHERE id = :id AND aktivni = 1
        ";
        $stmt2 = $pdo->prepare($sql2);
        $stmt2->execute([
            ':id' => $id,
            ':user_id' => $user_id,
            ':dt_aktualizace' => TimezoneHelper::getCurrentDatetimeCzech()
        ]);

        $affectedRows = $stmt2->rowCount();
        error_log("✅ Annual Fees Delete: Deaktivována hlavička, affected rows: " . $affectedRows);
        
        $pdo->commit();

        return $affectedRows > 0;
        
    } catch (Exception $e) {
        $pdo->rollback();
        error_log("❌ Annual Fees Delete Query Error: " . $e->getMessage());
        throw $e;
    }
}

// ============================================================================
// 📊 STATS - Statistiky
// ============================================================================

function queryAnnualFeesStats($pdo, $rok = null) {
    $where = 'aktivni = 1';
    $params = [];

    if ($rok) {
        $where .= ' AND rok = :rok';
        $params[':rok'] = $rok;
    }

    $sql = "
        SELECT 
            COUNT(*) AS celkem_poplatku,
            SUM(celkova_castka) AS celkova_castka_sum,
            SUM(zaplaceno_celkem) AS zaplaceno_sum,
            SUM(zbyva_zaplatit) AS zbyva_zaplatit_sum,
            SUM(CASE WHEN stav = 'ZAPLACENO' THEN 1 ELSE 0 END) AS zaplaceno_count,
            SUM(CASE WHEN stav = 'NEZAPLACENO' THEN 1 ELSE 0 END) AS nezaplaceno_count,
            SUM(CASE WHEN stav = 'V_RESENI' THEN 1 ELSE 0 END) AS v_reseni_count
        FROM `" . TBL_ROCNI_POPLATKY . "`
        WHERE $where
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // Statistiky podle druhu
    $sqlDruh = "
        SELECT 
            druh,
            cs.nazev_stavu AS druh_nazev,
            COUNT(*) AS pocet,
            SUM(celkova_castka) AS castka_celkem
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `25_ciselnik_stavy` cs ON rp.druh = cs.kod_stavu AND cs.typ_objektu = 'ROCNI_POPLATEK_DRUH'
        WHERE $where
        GROUP BY druh, cs.nazev_stavu
    ";
    $stmtDruh = $pdo->prepare($sqlDruh);
    $stmtDruh->execute($params);
    $stats['podle_druhu'] = $stmtDruh->fetchAll(PDO::FETCH_ASSOC);

    return $stats;
}
