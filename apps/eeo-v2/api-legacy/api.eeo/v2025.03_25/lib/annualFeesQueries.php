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
if (!defined('TBL_ROCNI_POPLATKY_PRILOHY')) {
    define('TBL_ROCNI_POPLATKY_PRILOHY', '25a_rocni_poplatky_prilohy');
}

// ============================================================================
// 📋 LIST - Seznam ročních poplatků s filtry
// ============================================================================

function queryAnnualFeesList($pdo, $filters, $limit, $offset, $user = null) {
    $where = ['rp.aktivni = 1'];
    $params = [];
    
    // 🔐 HIERARCHICKÁ KONTROLA PŘÍSTUPU
    // 1. ADMIN → vidí vše
    // 2. Role UCETNI/HLAVNI_UCETNI → vidí vše
    // 3. Má jakékoliv právo ANNUAL_FEES_* → vidí vše
    // 4. Ostatní → vidí jen své + podřízené
    $hasFullAccess = false;
    
    if ($user) {
        // ADMIN má vše
        $isAdmin = (isset($user['is_admin']) && $user['is_admin']) || 
                   (isset($user['roles']) && (in_array('SUPERADMIN', $user['roles']) || in_array('ADMINISTRATOR', $user['roles'])));
        
        // Role UCETNI nebo HLAVNI_UCETNI má vše
        $hasAccountantRole = isset($user['roles']) && (in_array('UCETNI', $user['roles']) || in_array('HLAVNI_UCETNI', $user['roles']));
        
        // Má jakékoliv právo ANNUAL_FEES_* má vše
        $hasAnnualFeesPermission = false;
        if (isset($user['permissions']) && is_array($user['permissions'])) {
            foreach ($user['permissions'] as $perm) {
                if (isset($perm['kod_prava']) && strpos($perm['kod_prava'], 'ANNUAL_FEES_') === 0) {
                    $hasAnnualFeesPermission = true;
                    break;
                }
            }
        }
        
        $hasFullAccess = $isAdmin || $hasAccountantRole || $hasAnnualFeesPermission;
        
        // Pokud NEMÁ plný přístup → omezit na své + podřízené
        if (!$hasFullAccess && isset($user['id'])) {
            // Získat ID podřízených z hierarchie
            $subordinateIds = [];
            $hierarchySql = "
                SELECT podrizeny_id 
                FROM 25_uzivatele_hierarchie 
                WHERE nadrizeny_id = :user_id 
                AND aktivni = 1 
                AND (dt_do IS NULL OR dt_do >= CURDATE())
            ";
            $hierarchyStmt = $pdo->prepare($hierarchySql);
            $hierarchyStmt->execute([':user_id' => $user['id']]);
            while ($row = $hierarchyStmt->fetch(PDO::FETCH_ASSOC)) {
                $subordinateIds[] = (int)$row['podrizeny_id'];
            }
            
            // Přidat sebe + podřízené
            $accessibleUserIds = array_merge([$user['id']], $subordinateIds);
            
            // Filtr na vytvoril_uzivatel_id
            if (!empty($accessibleUserIds)) {
                $placeholders = implode(',', array_fill(0, count($accessibleUserIds), '?'));
                $where[] = "rp.vytvoril_uzivatel_id IN ($placeholders)";
                foreach ($accessibleUserIds as $uid) {
                    $params[] = $uid;
                }
            } else {
                // Pokud nemá ani podřízené, vidí jen své
                $where[] = 'rp.vytvoril_uzivatel_id = ?';
                $params[] = $user['id'];
            }
        }
    }

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
        switch ($filters['stav']) {
            case '_PO_SPLATNOSTI':
                // Má alespoň jednu položku po splatnosti
                $where[] = 'EXISTS (SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_POLOZKY . '` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav != "ZAPLACENO" AND datum_splatnosti < CURDATE())';
                break;
            case '_BLIZI_SE_SPLATNOST':
                // Má alespoň jednu položku blížící se splatnosti
                $where[] = 'EXISTS (SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_POLOZKY . '` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav != "ZAPLACENO" AND datum_splatnosti >= CURDATE() AND datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY))';
                break;
            case 'ZAPLACENO':
                // Všechny položky zaplacené
                $where[] = 'NOT EXISTS (SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_POLOZKY . '` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav != "ZAPLACENO")';
                break;
            case 'NEZAPLACENO':
                // Má alespoň jednu nezaplacenou položku (bez ohledu na splatnost)
                $where[] = 'EXISTS (SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_POLOZKY . '` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav != "ZAPLACENO")';
                break;
            case 'CASTECNE':
                // Některé zaplacené, ale ne všechny
                $where[] = 'EXISTS (SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_POLOZKY . '` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav = "ZAPLACENO")';
                $where[] = 'EXISTS (SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_POLOZKY . '` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav != "ZAPLACENO")';
                break;
            default:
                // Běžný stav
                $where[] = 'rp.stav = :stav';
                $params[':stav'] = $filters['stav'];
                break;
        }
    }
    if ($filters['smlouva_search']) {
        $where[] = '(s.cislo_smlouvy LIKE :search OR s.nazev_smlouvy LIKE :search)';
        $params[':search'] = '%' . $filters['smlouva_search'] . '%';
    }
    if ($filters['fulltext_search']) {
        // Fulltext vyhledávání ve VŠECH relevantních polích zobrazených na frontendu
        $where[] = '(
            -- Hlavní pole z tabulky rocni_poplatky
            rp.nazev LIKE :fulltext 
            OR rp.poznamka LIKE :fulltext
            OR rp.rok LIKE :fulltext
            
            -- Smlouva pole
            OR s.cislo_smlouvy LIKE :fulltext 
            OR s.nazev_smlouvy LIKE :fulltext
            OR s.nazev_firmy LIKE :fulltext
            OR s.ico LIKE :fulltext
            OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(rp.rozsirujici_data, "$.dodavatel_nazev")), "") LIKE :fulltext
            
            -- Číselníky
            OR cs_druh.nazev_stavu LIKE :fulltext
            OR cs_platba.nazev_stavu LIKE :fulltext
            OR cs_stav.nazev_stavu LIKE :fulltext
            
            -- Uživatelé
            OR CONCAT(u_vytvoril.jmeno, " ", COALESCE(u_vytvoril.prijmeni, "")) LIKE :fulltext
            OR CONCAT(u_aktualizoval.jmeno, " ", COALESCE(u_aktualizoval.prijmeni, "")) LIKE :fulltext
            OR u_vytvoril.jmeno LIKE :fulltext
            OR u_vytvoril.prijmeni LIKE :fulltext
            OR u_aktualizoval.jmeno LIKE :fulltext
            OR u_aktualizoval.prijmeni LIKE :fulltext
            
            -- Částky (formátované)
            OR CAST(rp.celkova_castka AS CHAR) LIKE :fulltext
            OR CAST(rp.zaplaceno_celkem AS CHAR) LIKE :fulltext
            OR CAST(rp.zbyva_zaplatit AS CHAR) LIKE :fulltext
            
            -- Hledání v podpoložkách (existuje položka s hledaným textem)
            OR EXISTS (
                SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_POLOZKY . '` rpp
                LEFT JOIN `25_uzivatele` u_item_aktualizoval ON rpp.aktualizoval_uzivatel_id = u_item_aktualizoval.id
                WHERE rpp.rocni_poplatek_id = rp.id 
                AND rpp.aktivni = 1
                AND (
                    rpp.nazev_polozky LIKE :fulltext
                    OR rpp.cislo_dokladu LIKE :fulltext
                    OR rpp.stav LIKE :fulltext
                    OR CONCAT(u_item_aktualizoval.jmeno, " ", COALESCE(u_item_aktualizoval.prijmeni, "")) LIKE :fulltext
                    OR u_item_aktualizoval.jmeno LIKE :fulltext
                    OR u_item_aktualizoval.prijmeni LIKE :fulltext
                    OR CAST(rpp.castka AS CHAR) LIKE :fulltext
                    OR DATE_FORMAT(rpp.datum_splatnosti, "%d.%m.%Y") LIKE :fulltext
                    OR DATE_FORMAT(rpp.datum_zaplaceno, "%d.%m.%Y") LIKE :fulltext
                )
            )
            
            -- Hledání v přílohách (existuje příloha s hledaným názvem souboru)
            OR EXISTS (
                SELECT 1 FROM `' . TBL_ROCNI_POPLATKY_PRILOHY . '` rpa
                WHERE rpa.rocni_poplatek_id = rp.id 
                AND (
                    rpa.originalni_nazev_souboru LIKE :fulltext
                    OR rpa.typ_prilohy LIKE :fulltext
                )
            )
            
            -- Computed hodnoty pro stavy
            OR "zaplaceno" LIKE :fulltext
            OR "nezaplaceno" LIKE :fulltext
            OR "částečně" LIKE :fulltext
            OR "castecne" LIKE :fulltext
        )';
        $params[':fulltext'] = '%' . $filters['fulltext_search'] . '%';
        // Druhý parametr pro has_subitem_match
        $params[':fulltext_subitems'] = '%' . $filters['fulltext_search'] . '%';
    }

    $whereClause = implode(' AND ', $where);

    // Celkový počet
    $countSql = "
        SELECT COUNT(*) 
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `25_smlouvy` s ON rp.smlouva_id = s.id
        LEFT JOIN `25_ciselnik_stavy` cs_druh ON rp.druh = cs_druh.kod_stavu AND cs_druh.typ_objektu = 'DRUH_ROCNIHO_POPLATKU'
        LEFT JOIN `25_ciselnik_stavy` cs_platba ON rp.platba = cs_platba.kod_stavu AND cs_platba.typ_objektu = 'PLATBA_ROCNIHO_POPLATKU'
        LEFT JOIN `25_ciselnik_stavy` cs_stav ON rp.stav = cs_stav.kod_stavu AND cs_stav.typ_objektu = 'ROCNI_POPLATEK'
        LEFT JOIN `25_uzivatele` u_vytvoril ON rp.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_aktualizoval ON rp.aktualizoval_uzivatel_id = u_aktualizoval.id
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
            rp.stav,
            cs_stav.nazev_stavu AS stav_nazev,
            rp.celkova_castka,
            rp.zaplaceno_celkem,
            rp.zbyva_zaplatit,
            rp.smlouva_id,
            s.cislo_smlouvy AS smlouva_cislo,
            s.nazev_smlouvy,
            COALESCE(s.nazev_firmy, JSON_UNQUOTE(JSON_EXTRACT(rp.rozsirujici_data, '$.dodavatel_nazev'))) AS dodavatel_nazev,
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
            (SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav = 'ZAPLACENO') AS pocet_zaplaceno,
            (SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav != 'ZAPLACENO' AND datum_splatnosti < CURDATE()) AS pocet_po_splatnosti,
            (SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE rocni_poplatek_id = rp.id AND aktivni = 1 AND stav != 'ZAPLACENO' AND datum_splatnosti >= CURDATE() AND datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY)) AS pocet_blizi_se_splatnost" . 
            ($filters['fulltext_search'] ? ",
            -- Příznak zda má shodu v podpoložkách (pro auto-rozbalení)
            CASE WHEN EXISTS (
                SELECT 1 FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                LEFT JOIN `25_uzivatele` u_item_aktualizoval ON rpp.aktualizoval_uzivatel_id = u_item_aktualizoval.id
                WHERE rpp.rocni_poplatek_id = rp.id 
                AND rpp.aktivni = 1
                AND (
                    rpp.nazev_polozky LIKE :fulltext_subitems
                    OR rpp.cislo_dokladu LIKE :fulltext_subitems
                    OR rpp.stav LIKE :fulltext_subitems
                    OR CONCAT(u_item_aktualizoval.jmeno, \" \", COALESCE(u_item_aktualizoval.prijmeni, \"\")) LIKE :fulltext_subitems
                    OR u_item_aktualizoval.jmeno LIKE :fulltext_subitems
                    OR u_item_aktualizoval.prijmeni LIKE :fulltext_subitems
                    OR CAST(rpp.castka AS CHAR) LIKE :fulltext_subitems
                    OR DATE_FORMAT(rpp.datum_splatnosti, \"%d.%m.%Y\") LIKE :fulltext_subitems
                    OR DATE_FORMAT(rpp.datum_zaplaceno, \"%d.%m.%Y\") LIKE :fulltext_subitems
                )
            ) OR EXISTS (
                SELECT 1 FROM `" . TBL_ROCNI_POPLATKY_PRILOHY . "` rpa
                WHERE rpa.rocni_poplatek_id = rp.id 
                AND (
                    rpa.originalni_nazev_souboru LIKE :fulltext_subitems
                    OR rpa.typ_prilohy LIKE :fulltext_subitems
                )
            ) THEN 1 ELSE 0 END AS has_subitem_match" : "") . "
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `25_smlouvy` s ON rp.smlouva_id = s.id
        LEFT JOIN `25_ciselnik_stavy` cs_druh ON rp.druh = cs_druh.kod_stavu AND cs_druh.typ_objektu = 'DRUH_ROCNIHO_POPLATKU'
        LEFT JOIN `25_ciselnik_stavy` cs_platba ON rp.platba = cs_platba.kod_stavu AND cs_platba.typ_objektu = 'PLATBA_ROCNIHO_POPLATKU'
        LEFT JOIN `25_ciselnik_stavy` cs_stav ON rp.stav = cs_stav.kod_stavu AND cs_stav.typ_objektu = 'ROCNI_POPLATEK'
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
            COALESCE(s.nazev_firmy, JSON_UNQUOTE(JSON_EXTRACT(rp.rozsirujici_data, '$.dodavatel_nazev'))) AS dodavatel_nazev,
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
            rozsirujici_data, vytvoril_uzivatel_id, dt_vytvoreni, 
            aktualizoval_uzivatel_id, dt_aktualizace, aktivni
        ) VALUES (
            :rocni_poplatek_id, :faktura_id, :poradi, :nazev_polozky,
            :castka, :cislo_dokladu, :datum_zaplaceno, :datum_splatnosti, :datum_zaplaceni, :stav, :poznamka,
            :rozsirujici_data, :vytvoril_uzivatel_id, :dt_vytvoreni, 
            :aktualizoval_uzivatel_id, :dt_aktualizace, 1
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
        ':dt_vytvoreni' => $data['dt_vytvoreni'],
        ':aktualizoval_uzivatel_id' => $data['vytvoril_uzivatel_id'], // Při vytvoření je to stejný uživatel
        ':dt_aktualizace' => $data['dt_vytvoreni'] // Při vytvoření je to stejný čas
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
// 🔍 GET ITEM - Načtení jedné položky
// ============================================================================

function queryGetAnnualFeeItem($pdo, $id) {
    $sql = "SELECT * FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` WHERE id = :id AND aktivni = 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
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
    $whereWithAlias = str_replace(['aktivni = 1', 'rok = :rok'], ['rp.aktivni = 1', 'rp.rok = :rok'], $where);
    $sqlDruh = "
        SELECT 
            rp.druh,
            cs.nazev_stavu AS druh_nazev,
            COUNT(*) AS pocet,
            SUM(rp.celkova_castka) AS castka_celkem
        FROM `" . TBL_ROCNI_POPLATKY . "` rp
        LEFT JOIN `25_ciselnik_stavy` cs ON rp.druh = cs.kod_stavu AND cs.typ_objektu = 'ROCNI_POPLATEK_DRUH'
        WHERE $whereWithAlias
        GROUP BY rp.druh, cs.nazev_stavu
    ";
    $stmtDruh = $pdo->prepare($sqlDruh);
    $stmtDruh->execute($params);
    $stats['podle_druhu'] = $stmtDruh->fetchAll(PDO::FETCH_ASSOC);

    // Dashboard statistiky - aktuální měsíc a po splatnosti
    $currentMonth = date('Y-m');
    $today = date('Y-m-d');
    
    // Separátní parametry pro dashboard dotaz
    $dashboardParams = [
        ':current_month_start' => $currentMonth . '-01',
        ':next_month_start' => date('Y-m-d', strtotime($currentMonth . '-01 +1 month')),
        ':today' => $today
    ];
    
    // Statistiky podle jednotlivých položek - s aliasy tabulek
    $sqlDashboard = "
        SELECT 
            SUM(CASE WHEN p.datum_splatnosti >= :current_month_start 
                     AND p.datum_splatnosti < :next_month_start 
                     AND p.stav != 'ZAPLACENO' THEN 1 ELSE 0 END) AS current_month,
            SUM(CASE WHEN p.datum_splatnosti >= :current_month_start 
                     AND p.datum_splatnosti < :next_month_start 
                     AND p.stav != 'ZAPLACENO' THEN p.castka ELSE 0 END) AS current_month_amount,
                     
            SUM(CASE WHEN p.datum_splatnosti < :today 
                     AND p.stav != 'ZAPLACENO' THEN 1 ELSE 0 END) AS overdue,
            SUM(CASE WHEN p.datum_splatnosti < :today 
                     AND p.stav != 'ZAPLACENO' THEN p.castka ELSE 0 END) AS overdue_amount,
                     
            SUM(CASE WHEN p.datum_splatnosti >= :today 
                     AND p.datum_splatnosti <= DATE_ADD(:today, INTERVAL 10 DAY) 
                     AND p.stav != 'ZAPLACENO' THEN 1 ELSE 0 END) AS due_soon,
            SUM(CASE WHEN p.datum_splatnosti >= :today 
                     AND p.datum_splatnosti <= DATE_ADD(:today, INTERVAL 10 DAY) 
                     AND p.stav != 'ZAPLACENO' THEN p.castka ELSE 0 END) AS due_soon_amount,
                     
            COUNT(DISTINCT r.id) AS total_active,
            SUM(DISTINCT r.celkova_castka) AS total_active_amount,
            
            SUM(CASE WHEN p.stav != 'ZAPLACENO' THEN p.castka ELSE 0 END) AS total_to_pay,
            SUM(CASE WHEN p.stav = 'ZAPLACENO' THEN p.castka ELSE 0 END) AS total_paid
        FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` p
        JOIN `" . TBL_ROCNI_POPLATKY . "` r ON p.rocni_poplatek_id = r.id
        WHERE r.aktivni = 1 AND p.aktivni = 1
    ";
    
    if ($rok) {
        $sqlDashboard .= ' AND r.rok = :rok_dashboard';
        $dashboardParams[':rok_dashboard'] = $rok;
    }
    
    $stmtDashboard = $pdo->prepare($sqlDashboard);
    $stmtDashboard->execute($dashboardParams);
    $dashboardStats = $stmtDashboard->fetch(PDO::FETCH_ASSOC);
    
    $stats['dashboard'] = [
        'dueSoon' => (int)$dashboardStats['due_soon'],
        'dueSoonAmount' => number_format((float)$dashboardStats['due_soon_amount'], 0, ',', ' '),
        'overdue' => (int)$dashboardStats['overdue'],
        'overdueAmount' => number_format((float)$dashboardStats['overdue_amount'], 0, ',', ' '),
        'currentMonth' => (int)$dashboardStats['current_month'],
        'currentMonthAmount' => number_format((float)$dashboardStats['current_month_amount'], 0, ',', ' '),
        'totalActive' => (int)$dashboardStats['total_active'],
        'totalActiveAmount' => number_format((float)$dashboardStats['total_active_amount'], 0, ',', ' '),
        'totalToPay' => number_format((float)$dashboardStats['total_to_pay'], 0, ',', ' '),
        'totalPaid' => number_format((float)$dashboardStats['total_paid'], 0, ',', ' '),
        'totalRemaining' => number_format((float)$dashboardStats['total_to_pay'], 0, ',', ' ')
    ];

    return $stats;
}
