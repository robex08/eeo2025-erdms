<?php

/**
 * API handlers pro přepočet a správu čerpání limitovaných příslibů - VERZE 2 PDO
 * 
 * ARCHITEKTURA: DVĚ TABULKY + TŘI TYPY ČERPÁNÍ
 * 1. 25_limitovane_prisliby - master data (záznamy LP)
 * 2. 25_limitovane_prisliby_cerpani - agregovaná data s třemi typy čerpání
 * 
 * TŘI TYPY ČERPÁNÍ (objednávky):
 * 1. REZERVACE (rezervovano) - pesimistický odhad podle max_cena_s_dph
 * 2. PŘEDPOKLAD (predpokladane_cerpani) - reálný odhad podle součtu položek
 * 3. SKUTEČNOST (skutecne_cerpano) - finální čerpání podle fakturovaných částek
 * 
 * POKLADNA: Vždy jen skutečné čerpání (finální částky)
 * 
 * REFACTOR: mysqli -> PDO prepared statements (PHP 5.6+, MySQL 5.5.43)
 * Datum: 2025-12-20
 * 
 * ✅ POUŽÍVÁ GLOBÁLNÍ TBL_* KONSTANTY Z api.php
 */

/**
 * Přepočítá agregované čerpání pro konkrétní LP podle ID s TŘEMI TYPY ČERPÁNÍ
 * 
 * @param PDO $pdo Databázové spojení
 * @param int $lp_id ID LP z tabulky 25_limitovane_prisliby
 * @param int $rok Rok pro který se má provést přepočet (pokud NULL, užije se rok z platne_od)
 * @return array Result array with status
 */
function prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id, $rok = null) {
    $lp_id = (int)$lp_id;
    $rok = $rok !== null ? (int)$rok : null; // Rok může být null - pak se určí z metadata
    
    try {
        // KROK 1: Získat metadata o LP (agregace z master tabulky podle ID)
        $sql_meta = "
            SELECT 
                lp.id as lp_id,
                lp.cislo_lp,
                lp.kategorie,
                lp.usek_id,
                lp.user_id,
                -- ✅ Rok LP určený podle platnosti:
                -- Pokud LP přechází přes roky (31.12.2025-31.12.2026), použít rok s DELŠÍ platností
                -- Pro LP platné většinu roku 2026 → rok = 2026
                CASE 
                    WHEN YEAR(MIN(lp.platne_od)) != YEAR(MAX(lp.platne_do)) THEN
                        -- LP přechází přes roky → použít rok platne_do (primární rok)
                        YEAR(MAX(lp.platne_do))
                    ELSE
                        -- LP v rámci jednoho roku → rok platne_od
                        YEAR(MIN(lp.platne_od))
                END as rok,
                SUM(lp.vyse_financniho_kryti) as celkovy_limit,
                MIN(lp.cislo_uctu) as cislo_uctu,
                MIN(lp.nazev_uctu) as nazev_uctu,
                COUNT(*) as pocet_zaznamu,
                (COUNT(*) > 1) as ma_navyseni,
                MIN(lp.platne_od) as nejstarsi_platnost,
                MAX(lp.platne_do) as nejnovejsi_platnost
            FROM " . TBL_LP_MASTER . " lp
            WHERE lp.id = :lp_id
            GROUP BY lp.id, lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($sql_meta);
        $stmt->execute(['lp_id' => $lp_id]);
        $meta = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$meta) {
            return [
                'success' => false,
                'error' => "LP ID '$lp_id' neexistuje v master tabulce"
            ];
        }
        
        // OPRAVA: Pokud byl rok předán jako parametr (z inicializace), přepsat rok z metadata
        if ($rok !== null) {
            $meta['rok'] = $rok;
        }
        
        // KROK 2: REZERVACE - max_cena_s_dph pro schválené objednávky (pesimistický odhad)
        // STAVY: SCHVALENA pouze (schválená, ale ještě nejsou položky)
        // ⚠️ Neschválené objednávky ('Ke schválení') se do rezervace NEPOČÍTAJÍ
        // ✅ POUZE objednávky BEZ faktur A BEZ položek (pokud má, započítá se do předpokladu/skutečně)
        // ✅ Podporuje NEW formát (JSON) i OLD formát (plain string)
        // ⚠️ OPRAVA 8.2.2026: Přidán filtr na položky - priority logic (faktury > položky > max_cena)
        $sql_rezervace = "
            SELECT 
                obj.id,
                obj.max_cena_s_dph,
                obj.financovani
            FROM " . TBL_OBJEDNAVKY . " obj
            LEFT JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id AND fakt.aktivni = 1
            LEFT JOIN " . TBL_OBJEDNAVKY_POLOZKY . " pol ON pol.objednavka_id = obj.id
            WHERE obj.aktivni = 1
            AND obj.financovani IS NOT NULL
            AND obj.financovani != ''
            AND obj.stav_objednavky IN ('Schválená')
            AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
            AND fakt.id IS NULL
            AND pol.id IS NULL
        ";
        
        $stmt_rez = $pdo->prepare($sql_rezervace);
        $stmt_rez->execute([
            'datum_od' => $meta['nejstarsi_platnost'],
            'datum_do' => $meta['nejnovejsi_platnost']
        ]);
        
        $rezervovano = 0;
        while ($row = $stmt_rez->fetch(PDO::FETCH_ASSOC)) {
            $financovani_raw = $row['financovani'];
            $financovani = json_decode($financovani_raw, true);
            
            $lp_match = false;
            $pocet_lp = 1;
            
            // NEW formát: JSON s lp_kody array
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $lp_match = true;
                    $pocet_lp = count($lp_ids);
                }
            }
            // OLD formát: plain string LP kód
            elseif (preg_match('/^LP[A-Z]+[0-9]+$/', $financovani_raw)) {
                if ($financovani_raw === $meta['cislo_lp']) {
                    $lp_match = true;
                    $pocet_lp = 1;
                }
            }
            
            if ($lp_match) {
                $podil = $pocet_lp > 0 ? ((float)$row['max_cena_s_dph'] / $pocet_lp) : 0;
                $rezervovano += $podil;
            }
        }
        
        // KROK 3: PŘEDPOKLAD - suma položek pro objednávky odeslané dodavat eli (přesnější odhad)
        // STAV: ODESLANA (odeslána dodavateli, potvrzena dodavatelem)
        // ✅ POUZE objednávky BEZ faktur (pokud má faktury, započítá se do skutečně)
        // ✅ Podporuje NEW formát (JSON) i OLD formát (plain string)
        // ✅ OPRAVA: Sčítá POUZE položky s tímto lp_id (ne všechny položky / počet LP)
        // KROK 3: PŘEDPOKLAD - suma pro objednávky BEZ potvrzené věcné správnosti faktury
        // ✅ Započítávají se POUZE objednávky které NEMAJÍ ŽÁDNOU fakturu s věcnou správností
        // ⚠️ FIX: Pokud objednávka má fakturu s věcnou pro JAKÝKOLIV LP kód → čerpání se určuje POUZE z LP rozpisu faktur, NE z objednávky
        // ✅ PRIORITA:
        //    1. Pokud faktura (bez věcné) má LP rozpis v 25a_faktury_lp_cerpani → použij rozpis
        //    2. Jinak pokud má obj. POLOŽKY s lp_id → sečti je
        //    3. Jinak použij max_cena_s_dph / pocet_lp
        $sql_predpoklad = "
            SELECT 
                obj.id,
                obj.financovani,
                obj.max_cena_s_dph,
                SUM(CASE WHEN pol.lp_id = :lp_id_predpoklad THEN pol.cena_s_dph ELSE 0 END) as suma_lp_polozky,
                SUM(pol.cena_s_dph) as suma_cena_vse,
                COALESCE((
                    SELECT SUM(flp.castka)
                    FROM 25a_faktury_lp_cerpani flp
                    INNER JOIN 25a_objednavky_faktury fakt2 ON fakt2.id = flp.faktura_id
                    WHERE flp.lp_id = :lp_id_predpoklad_rozpis
                    AND fakt2.objednavka_id = obj.id
                    AND fakt2.aktivni = 1
                    AND fakt2.stav != 'STORNO'
                    AND fakt2.potvrdil_vecnou_spravnost_id IS NULL
                ), 0) as suma_lp_rozpis_v_procesu,
                COALESCE((
                    SELECT 1
                    FROM 25a_faktury_lp_cerpani flp_any
                    INNER JOIN 25a_objednavky_faktury fakt3 ON fakt3.id = flp_any.faktura_id
                    WHERE fakt3.objednavka_id = obj.id
                    AND fakt3.aktivni = 1
                    AND fakt3.stav != 'STORNO'
                    AND fakt3.potvrdil_vecnou_spravnost_id IS NULL
                    LIMIT 1
                ), 0) as ma_lp_rozpis_v_procesu
            FROM " . TBL_OBJEDNAVKY . " obj
            LEFT JOIN " . TBL_OBJEDNAVKY_POLOZKY . " pol ON pol.objednavka_id = obj.id
            WHERE obj.aktivni = 1
            AND obj.financovani IS NOT NULL
            AND obj.financovani != ''
            AND obj.stav_objednavky NOT IN ('Ke schválení', 'Schválená', 'Nová', 'Zamítnutá', 'Zrušena', 'Dokončená', 'Archivovaná', 'Smazaná', 'Rozpracovaná')
            AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
            AND NOT EXISTS (
                SELECT 1
                FROM 25a_objednavky_faktury fakt_vecna
                WHERE fakt_vecna.objednavka_id = obj.id
                AND fakt_vecna.aktivni = 1
                AND fakt_vecna.stav != 'STORNO'
                AND fakt_vecna.potvrdil_vecnou_spravnost_id IS NOT NULL
            )
            GROUP BY obj.id, obj.financovani, obj.max_cena_s_dph
        ";
        
        $stmt_pred = $pdo->prepare($sql_predpoklad);
        $stmt_pred->execute([
            'lp_id_predpoklad' => $lp_id,
            'lp_id_predpoklad_rozpis' => $lp_id,
            'datum_od' => $meta['nejstarsi_platnost'],
            'datum_do' => $meta['nejnovejsi_platnost']
        ]);
        
        $predpokladane_cerpani = 0;
        while ($row = $stmt_pred->fetch(PDO::FETCH_ASSOC)) {
            $financovani_raw = $row['financovani'];
            $financovani = json_decode($financovani_raw, true);
            
            $lp_match = false;
            $pocet_lp = 1;
            
            // NEW formát: JSON s lp_kody array
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $lp_match = true;
                    $pocet_lp = count($lp_ids);
                }
            }
            // OLD formát: plain string LP kód
            elseif (preg_match('/^LP[A-Z]+[0-9]+$/', $financovani_raw)) {
                if ($financovani_raw === $meta['cislo_lp']) {
                    $lp_match = true;
                    $pocet_lp = 1;
                }
            }
            
            if ($lp_match) {
                // ✅ LOGIKA PLÁNOVÁNO (priority):
                // 1. Faktura bez věcné má LP rozpis → použij rozpis (in-progress čerpání)
                // 2. Pokud má obj. POLOŽKY s tímto LP → použij je (suma_lp_polozky)
                // 3. Pokud NEMÁ položky → použij max_cena_s_dph / pocet_lp
                $ma_rozpis_proc = ((int)$row['ma_lp_rozpis_v_procesu']) === 1;
                $suma_rozpis_proc = (float)$row['suma_lp_rozpis_v_procesu'];
                $suma_lp = (float)$row['suma_lp_polozky'];
                if ($ma_rozpis_proc) {
                    // Faktura má LP rozpis – respektuj ho (i 0 Kč pro toto LP, pokud bylo rozděleno jinam)
                    $predpokladane_cerpani += $suma_rozpis_proc;
                } elseif ($suma_lp > 0) {
                    $predpokladane_cerpani += $suma_lp;
                } else {
                    // Fallback: objednávka nemá položky nebo položky nemají lp_id
                    // Použij max_cena_s_dph rozdělené mezi LP kódy
                    $max_cena = (float)$row['max_cena_s_dph'];
                    $podil = $pocet_lp > 0 ? ($max_cena / $pocet_lp) : 0;
                    $predpokladane_cerpani += $podil;
                }
            }
        }

        // KROK 3B: PŘEDPOKLAD - Odborové faktury BEZ potvrzené věcné správnosti
        // ✅ Priorita LP rozpis (25a_faktury_lp_cerpani), fallback fa_castka
        $sql_odbory_predpoklad = "
            SELECT COALESCE(SUM(
                CASE
                    WHEN flp_any.has_rows = 1 THEN COALESCE(flp_sum.lp_castka, 0)
                    ELSE fakt.fa_castka
                END
            ), 0) as predpoklad_odbory_fakt
            FROM 25a_odbory_lp_prirazeni olp
            INNER JOIN 25a_objednavky_faktury fakt ON fakt.id = olp.faktura_id
            LEFT JOIN (
                SELECT faktura_id, SUM(castka) as lp_castka
                FROM 25a_faktury_lp_cerpani
                WHERE lp_id = :lp_id_odbory_pred
                GROUP BY faktura_id
            ) flp_sum ON flp_sum.faktura_id = fakt.id
            LEFT JOIN (
                SELECT DISTINCT faktura_id, 1 as has_rows
                FROM 25a_faktury_lp_cerpani
            ) flp_any ON flp_any.faktura_id = fakt.id
            WHERE olp.lp_id = :lp_id_odbory_pred
            AND fakt.aktivni = 1
            AND fakt.stav != 'STORNO'
            AND fakt.potvrdil_vecnou_spravnost_id IS NULL
            AND DATE(fakt.dt_vytvoreni) BETWEEN :datum_od_odbory_pred AND :datum_do_odbory_pred
        ";
        $stmt_odbory_pred = $pdo->prepare($sql_odbory_predpoklad);
        $stmt_odbory_pred->execute([
            'lp_id_odbory_pred' => $lp_id,
            'datum_od_odbory_pred' => $meta['nejstarsi_platnost'],
            'datum_do_odbory_pred' => $meta['nejnovejsi_platnost']
        ]);
        $row_odbory_pred = $stmt_odbory_pred->fetch(PDO::FETCH_ASSOC);
        $predpokladane_cerpani += (float)($row_odbory_pred['predpoklad_odbory_fakt'] ?? 0);

        // KROK 4: SKUTEČNĚ - suma faktur s POTVRZENOU VĚCNOU SPRÁVNOSTÍ
        // ✅ Započítávají se POUZE faktury s potvrdil_vecnou_spravnost_id IS NOT NULL
        // ✅ PRIMÁRNĚ bere LP rozpis z 25a_faktury_lp_cerpani, fallback na poměr
        $sql_skutecne = "
            SELECT 
                obj.id,
                obj.financovani,
                SUM(fakt.fa_castka) as suma_faktur_vse,
                COALESCE(
                    (SELECT SUM(flp.castka)
                     FROM 25a_faktury_lp_cerpani flp
                     WHERE flp.faktura_id = fakt.id AND flp.lp_id = :lp_id_skutecne),
                    0
                ) as suma_lp_rozpis
            FROM " . TBL_OBJEDNAVKY . " obj
            INNER JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id AND fakt.aktivni = 1
            WHERE obj.aktivni = 1
            AND obj.financovani IS NOT NULL
            AND obj.financovani != ''
            AND obj.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
            AND fakt.stav != 'STORNO'
            AND fakt.potvrdil_vecnou_spravnost_id IS NOT NULL
            AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
            GROUP BY obj.id, obj.financovani
        ";
        
        $stmt_skut = $pdo->prepare($sql_skutecne);
        $stmt_skut->execute([
            'lp_id_skutecne' => $lp_id,
            'datum_od' => $meta['nejstarsi_platnost'],
            'datum_do' => $meta['nejnovejsi_platnost']
        ]);
        
        $fakturovano = 0;
        while ($row = $stmt_skut->fetch(PDO::FETCH_ASSOC)) {
            $financovani_raw = $row['financovani'];
            $financovani = json_decode($financovani_raw, true);
            
            $lp_match = false;
            $pocet_lp = 1;
            
            // NEW formát: JSON s lp_kody array
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $lp_match = true;
                    $pocet_lp = count($lp_ids);
                }
            }
            // OLD formát: plain string LP kód
            elseif (preg_match('/^LP[A-Z]+[0-9]+$/', $financovani_raw)) {
                if ($financovani_raw === $meta['cislo_lp']) {
                    $lp_match = true;
                    $pocet_lp = 1;
                }
            }
            
            if ($lp_match) {
                // ✅ OPRAVA: PRIORITA - LP rozpis z faktur, fallback na poměr
                $suma_lp = (float)$row['suma_lp_rozpis'];
                if ($suma_lp > 0) {
                    $fakturovano += $suma_lp;
                } else {
                    // Fallback: pokud faktury nemají LP rozpis, použít poměr
                    $podil = $pocet_lp > 0 ? ((float)$row['suma_faktur_vse'] / $pocet_lp) : 0;
                    $fakturovano += $podil;
                }
            }
        }
        
        // KROK 5: Čerpání z pokladny (OLD formát - přímý lp_kod)
        // ⚠️ LIVE stav: Počítá se okamžitě po uložení, bez ohledu na uzavření knihy
        // ✅ Filtrace podle platnosti LP (ne podle roku knihy)
        $sql_pokladna = "
            SELECT COALESCE(SUM(pp.castka_vydaj), 0) as cerpano_pokl
            FROM " . TBL_POKLADNI_KNIHY . " pk
            JOIN " . TBL_POKLADNI_POLOZKY . " pp ON pp.pokladni_kniha_id = pk.id
            WHERE pp.lp_kod = :cislo_lp
            AND pp.smazano = 0
            AND DATE(pp.datum_zapisu) BETWEEN :datum_od_pokladna AND :datum_do_pokladna
        ";
        
        $stmt_pokl = $pdo->prepare($sql_pokladna);
        $stmt_pokl->execute([
            'cislo_lp' => $meta['cislo_lp'],
            'datum_od_pokladna' => $meta['nejstarsi_platnost'],
            'datum_do_pokladna' => $meta['nejnovejsi_platnost']
        ]);
        
        $row_pokl = $stmt_pokl->fetch(PDO::FETCH_ASSOC);
        $cerpano_pokladna = (float)($row_pokl['cerpano_pokl'] ?? 0);
        
        // KROK 5A: Odborové faktury - samostatné faktury přiřazené přímo přes 25a_odbory_lp_prirazeni
        // ✅ Započítávají se POUZE faktury s potvrzenou věcnou správností
        // ✅ Tyto faktury NEMAJÍ objednávku (standalone faktury)
        // ✅ Filtrace podle platnosti LP (ne podle roku faktury)
        $sql_odbory_faktury = "
            SELECT COALESCE(SUM(
                CASE
                    WHEN flp_any.has_rows = 1 THEN COALESCE(flp_sum.lp_castka, 0)
                    ELSE fakt.fa_castka
                END
            ), 0) as cerpano_odbory_fakt
            FROM 25a_odbory_lp_prirazeni olp
            INNER JOIN 25a_objednavky_faktury fakt ON fakt.id = olp.faktura_id
            LEFT JOIN (
                SELECT faktura_id, SUM(castka) as lp_castka
                FROM 25a_faktury_lp_cerpani
                WHERE lp_id = :lp_id_odbory_fakt
                GROUP BY faktura_id
            ) flp_sum ON flp_sum.faktura_id = fakt.id
            LEFT JOIN (
                SELECT DISTINCT faktura_id, 1 as has_rows
                FROM 25a_faktury_lp_cerpani
            ) flp_any ON flp_any.faktura_id = fakt.id
            WHERE olp.lp_id = :lp_id_odbory_fakt
            AND fakt.aktivni = 1
            AND fakt.stav != 'STORNO'
            AND fakt.potvrdil_vecnou_spravnost_id IS NOT NULL
            AND DATE(fakt.dt_vytvoreni) BETWEEN :datum_od_odbory_fakt AND :datum_do_odbory_fakt
        ";
        
        $stmt_odbory_fakt = $pdo->prepare($sql_odbory_faktury);
        $stmt_odbory_fakt->execute([
            'lp_id_odbory_fakt' => $lp_id,
            'datum_od_odbory_fakt' => $meta['nejstarsi_platnost'],
            'datum_do_odbory_fakt' => $meta['nejnovejsi_platnost']
        ]);
        
        $row_odbory_fakt = $stmt_odbory_fakt->fetch(PDO::FETCH_ASSOC);
        $cerpano_odbory_faktury = (float)($row_odbory_fakt['cerpano_odbory_fakt'] ?? 0);
        
        // KROK 5B: Odborové pokladna - samostatné pokladní položky přiřazené přímo přes 25a_odbory_lp_prirazeni
        // ✅ Započítávají se okamžitě po uložení
        // ✅ Filtrace podle platnosti LP (ne podle roku knihy)
        $sql_odbory_pokladna = "
            SELECT COALESCE(SUM(pp.castka_vydaj), 0) as cerpano_odbory_pokl
            FROM 25a_odbory_lp_prirazeni olp
            INNER JOIN " . TBL_POKLADNI_POLOZKY . " pp ON pp.id = olp.pokladni_polozka_id
            INNER JOIN " . TBL_POKLADNI_KNIHY . " pk ON pk.id = pp.pokladni_kniha_id
            WHERE olp.lp_id = :lp_id_odbory_pokl
            AND pp.smazano = 0
            AND DATE(pp.datum_zapisu) BETWEEN :datum_od_odbory_pokl AND :datum_do_odbory_pokl
        ";
        
        $stmt_odbory_pokl = $pdo->prepare($sql_odbory_pokladna);
        $stmt_odbory_pokl->execute([
            'lp_id_odbory_pokl' => $lp_id,
            'datum_od_odbory_pokl' => $meta['nejstarsi_platnost'],
            'datum_do_odbory_pokl' => $meta['nejnovejsi_platnost']
        ]);
        
        $row_odbory_pokl = $stmt_odbory_pokl->fetch(PDO::FETCH_ASSOC);
        $cerpano_odbory_pokladna = (float)($row_odbory_pokl['cerpano_odbory_pokl'] ?? 0);
        
        // ⚠️ DŮLEŽITÉ: skutecne_cerpano = faktury (z objednávek) + odborové faktury
        //              cerpano_pokladna = pokladna (OLD formát) + odborové pokladna
        //              UI/API je sečte dohromady jako celkové skutečné čerpání
        $skutecne_cerpano = $fakturovano + $cerpano_odbory_faktury; // Faktury z obj + odbory faktury
        $cerpano_pokladna = $cerpano_pokladna + $cerpano_odbory_pokladna; // Pokladna OLD + odbory
        
        // KROK 6: Vypočítat zůstatky a procenta
        // Zajistit že všechny hodnoty jsou validní floats (ne NULL)
        $celkovy_limit = (float)($meta['celkovy_limit'] ?? 0);
        $rezervovano = (float)($rezervovano ?? 0);
        $predpokladane_cerpani = (float)($predpokladane_cerpani ?? 0);
        $skutecne_cerpano = (float)($skutecne_cerpano ?? 0);
        $cerpano_pokladna = (float)($cerpano_pokladna ?? 0);
        
        // CELKOVÉ skutečné čerpání = faktury + pokladna (pro výpočet zůstatků)
        $celkove_skutecne = $skutecne_cerpano + $cerpano_pokladna;
        
        // OPRAVA 2026-01-30: Předpokládané čerpání obsahuje JEN objednávky BEZ faktur (díky LEFT JOIN fakt.id IS NULL)
        // Skutečné čerpání obsahuje JEN faktury + pokladna
        // Proto se SČÍTAJÍ, ne max()!
        // Pokud obj měla předpoklad 100k a faktura 95k → čerpání = 95k (ušetřili jsme 5k)
        $zbyva_rezervace = $celkovy_limit - ($rezervovano + $celkove_skutecne);
        $zbyva_predpoklad = $celkovy_limit - ($predpokladane_cerpani + $celkove_skutecne);
        $zbyva_skutecne = $celkovy_limit - $celkove_skutecne;
        
        // Omezit procenta na max 999.99 (DECIMAL(5,2) rozsah) a zajistit platnou hodnotu
        $procento_rezervace = $celkovy_limit > 0 ? min(999.99, round(($rezervovano / $celkovy_limit) * 100, 2)) : 0.00;
        $procento_predpoklad = $celkovy_limit > 0 ? min(999.99, round(($predpokladane_cerpani / $celkovy_limit) * 100, 2)) : 0.00;
        // Procento skutečně = (faktury + pokladna) / limit
        $procento_skutecne = $celkovy_limit > 0 ? min(999.99, round(($celkove_skutecne / $celkovy_limit) * 100, 2)) : 0.00;
        
        // KROK 7: UPSERT do čerpání tabulky
        // ✅ OPRAVA 26.5.2026: Přidány sloupce cerpano_odbory_faktury a cerpano_odbory_pokladna
        $sql_upsert = "
            INSERT INTO " . TBL_LP_CERPANI . " (
                cislo_lp, kategorie, usek_id, user_id, rok,
                celkovy_limit, 
                rezervovano, predpokladane_cerpani, skutecne_cerpano, cerpano_pokladna,
                cerpano_odbory_faktury, cerpano_odbory_pokladna,
                zbyva_rezervace, zbyva_predpoklad, zbyva_skutecne,
                procento_rezervace, procento_predpoklad, procento_skutecne,
                pocet_zaznamu, ma_navyseni, posledni_prepocet
            ) VALUES (
                :cislo_lp, :kategorie, :usek_id, :user_id, :rok,
                :celkovy_limit,
                :rezervovano, :predpokladane_cerpani, :skutecne_cerpano, :cerpano_pokladna,
                :cerpano_odbory_faktury, :cerpano_odbory_pokladna,
                :zbyva_rezervace, :zbyva_predpoklad, :zbyva_skutecne,
                :procento_rezervace, :procento_predpoklad, :procento_skutecne,
                :pocet_zaznamu, :ma_navyseni, NOW()
            )
            ON DUPLICATE KEY UPDATE
                celkovy_limit = VALUES(celkovy_limit),
                rezervovano = VALUES(rezervovano),
                predpokladane_cerpani = VALUES(predpokladane_cerpani),
                skutecne_cerpano = VALUES(skutecne_cerpano),
                cerpano_pokladna = VALUES(cerpano_pokladna),
                cerpano_odbory_faktury = VALUES(cerpano_odbory_faktury),
                cerpano_odbory_pokladna = VALUES(cerpano_odbory_pokladna),
                zbyva_rezervace = VALUES(zbyva_rezervace),
                zbyva_predpoklad = VALUES(zbyva_predpoklad),
                zbyva_skutecne = VALUES(zbyva_skutecne),
                procento_rezervace = VALUES(procento_rezervace),
                procento_predpoklad = VALUES(procento_predpoklad),
                procento_skutecne = VALUES(procento_skutecne),
                pocet_zaznamu = VALUES(pocet_zaznamu),
                ma_navyseni = VALUES(ma_navyseni),
                posledni_prepocet = NOW()
        ";
        
        $stmt_upsert = $pdo->prepare($sql_upsert);
        $stmt_upsert->execute([
            'cislo_lp' => $meta['cislo_lp'],
            'kategorie' => $meta['kategorie'],
            'usek_id' => $meta['usek_id'],
            'user_id' => $meta['user_id'],
            'rok' => $meta['rok'],
            'celkovy_limit' => $celkovy_limit,
            'rezervovano' => $rezervovano,
            'predpokladane_cerpani' => $predpokladane_cerpani,
            'skutecne_cerpano' => $skutecne_cerpano,
            'cerpano_pokladna' => $cerpano_pokladna,
            'cerpano_odbory_faktury' => $cerpano_odbory_faktury,
            'cerpano_odbory_pokladna' => $cerpano_odbory_pokladna,
            'zbyva_rezervace' => $zbyva_rezervace,
            'zbyva_predpoklad' => $zbyva_predpoklad,
            'zbyva_skutecne' => $zbyva_skutecne,
            'procento_rezervace' => $procento_rezervace,
            'procento_predpoklad' => $procento_predpoklad,
            'procento_skutecne' => $procento_skutecne,
            'pocet_zaznamu' => $meta['pocet_zaznamu'],
            'ma_navyseni' => $meta['ma_navyseni']
        ]);
        
        return [
            'success' => true,
            'lp_id' => $lp_id,
            'cislo_lp' => $meta['cislo_lp'],
            'data' => [
                'cislo_lp' => $meta['cislo_lp'],
                'kategorie' => $meta['kategorie'],
                'usek_id' => (int)$meta['usek_id'],
                'user_id' => (int)$meta['user_id'],
                'rok' => (int)$meta['rok'],
                'celkovy_limit' => (float)$celkovy_limit,
                
                'rezervovano' => (float)$rezervovano,
                'predpokladane_cerpani' => (float)$predpokladane_cerpani,
                'skutecne_cerpano' => (float)$skutecne_cerpano,
                'cerpano_pokladna' => (float)$cerpano_pokladna,
                'cerpano_odbory_faktury' => (float)$cerpano_odbory_faktury,
                'cerpano_odbory_pokladna' => (float)$cerpano_odbory_pokladna,
                
                'zbyva_rezervace' => (float)$zbyva_rezervace,
                'zbyva_predpoklad' => (float)$zbyva_predpoklad,
                'zbyva_skutecne' => (float)$zbyva_skutecne,
                
                'procento_rezervace' => (float)$procento_rezervace,
                'procento_predpoklad' => (float)$procento_predpoklad,
                'procento_skutecne' => (float)$procento_skutecne,
                
                'pocet_zaznamu' => (int)$meta['pocet_zaznamu'],
                'ma_navyseni' => (int)$meta['ma_navyseni'],
                'posledni_prepocet' => date('Y-m-d H:i:s')
            ]
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Inicializace čerpání všech LP (admin funkce)
 * 
 * @param PDO $pdo Databázové spojení
 * @return array Result with stats
 */
function inicializaceVsechLP_PDO($pdo) {
    try {
        // Získat všechna unikátní LP podle ID
        $sql_lp_ids = "SELECT DISTINCT id FROM " . TBL_LP_MASTER . " ORDER BY id";
        $stmt = $pdo->query($sql_lp_ids);
        $lp_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $uspesne = 0;
        $chyby = 0;
        $errors = [];
        
        foreach ($lp_ids as $lp_id) {
            $result = prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id);
            if ($result['success']) {
                $uspesne++;
            } else {
                $chyby++;
                $errors[] = "LP ID $lp_id: " . $result['error'];
            }
        }
        
        return [
            'success' => true,
            'zpracovano_celkem' => count($lp_ids),
            'uspesne' => $uspesne,
            'chyby' => $chyby,
            'error_details' => $errors
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Získání stavu konkrétního LP
 * 
 * @param PDO $pdo Databázové spojení
 * @param int $lp_id ID LP
 * @return array LP data with stats
 */
function getStavLP_PDO($pdo, $lp_id) {
    try {
        $sql = "
            SELECT 
                c.*,
                u.jmeno as user_jmeno,
                u.prijmeni as user_prijmeni,
                us.nazev as usek_nazev
            FROM " . TBL_LP_CERPANI . " c
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = c.user_id
            LEFT JOIN " . TBL_USEKY . " us ON us.id = c.usek_id
            WHERE c.lp_id = :lp_id
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['lp_id' => $lp_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            return [
                'success' => false,
                'error' => "LP ID '$lp_id' nemá vypočítaná data čerpání"
            ];
        }
        
        return [
            'success' => true,
            'data' => $data
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Získání čerpání LP podle uživatele
 * 
 * @param PDO $pdo Databázové spojení  
 * @param int $lp_id ID LP
 * @return array User consumption data
 */
function getCerpaniPodleUzivatele_PDO($pdo, $lp_id) {
    try {
        // Získat metadata LP
        $sql_meta = "
            SELECT cislo_lp, kategorie, usek_id, user_id, 
                   MIN(platne_od) as platne_od, MAX(platne_do) as platne_do
            FROM " . TBL_LP_MASTER . "
            WHERE id = :lp_id
            GROUP BY cislo_lp, kategorie, usek_id, user_id
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($sql_meta);
        $stmt->execute(['lp_id' => $lp_id]);
        $meta = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$meta) {
            return [
                'success' => false,
                'error' => "LP ID '$lp_id' neexistuje"
            ];
        }
        
        // TODO: Implement user-specific consumption logic
        // This is placeholder for the full implementation
        
        return [
            'success' => true,
            'lp_id' => $lp_id,
            'cislo_lp' => $meta['cislo_lp'],
            'users' => []
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * PDO VERZE: Získá agregované čerpání LP podle úseku (všechna LP + jejich uživatelé)
 * 
 * @param PDO $pdo Databázové spojení (PDO)
 * @param int $usek_id ID úseku
 * @param int|null $rok Rok (default aktuální rok)
 * @return array Agregované čerpání LP podle úseku
 */
function getCerpaniPodleUseku_PDO($pdo, $usek_id, $rok = null) {
    $usek_id = (int)$usek_id;
    $rok = $rok ? (int)$rok : (int)date('Y');
    
    try {
        // KROK 1: Získat informace o úseku
        $sql_usek = "
            SELECT id, usek_nazev
            FROM 25a_useky
            WHERE id = :usek_id
            LIMIT 1
        ";
        
        $stmt_usek = $pdo->prepare($sql_usek);
        $stmt_usek->execute([':usek_id' => $usek_id]);
        $usek_info = $stmt_usek->fetch(PDO::FETCH_ASSOC);
        
        if (!$usek_info) {
            return array(
                'status' => 'error',
                'message' => 'Úsek s tímto ID neexistuje'
            );
        }
        
        // KROK 2: Získat všechna LP pro tento úsek
        $sql_lp_list = "
            SELECT DISTINCT id, cislo_lp
            FROM 25_limitovane_prisliby
            WHERE usek_id = :usek_id
            AND YEAR(platne_od) = :rok
            ORDER BY cislo_lp
        ";
        
        $stmt_lp_list = $pdo->prepare($sql_lp_list);
        $stmt_lp_list->execute([':usek_id' => $usek_id, ':rok' => $rok]);
        $lp_list = $stmt_lp_list->fetchAll(PDO::FETCH_ASSOC);
        
        $lp_data = array();
        $celkovy_limit_usek = 0;
        $celkem_rezervovano_usek = 0;
        $celkem_predpoklad_usek = 0;
        $celkem_skutecne_usek = 0;
        $celkem_pokladna_usek = 0;
        $celkem_lp = 0;
        
        foreach ($lp_list as $lp_row) {
            $lp_id = (int)$lp_row['id'];
            
            // Pro každé LP získat detail čerpání podle uživatelů
            $lp_detail = getCerpaniPodleUzivatele_PDO($pdo, $lp_id);
            
            if ($lp_detail['success']) {
                $lp_data[] = array(
                    'lp_id' => $lp_id,
                    'cislo_lp' => $lp_detail['cislo_lp'],
                    'kategorie' => $lp_detail['kategorie'],
                    'celkovy_limit' => $lp_detail['celkovy_limit'],
                    'prikazce_user_id' => $lp_detail['prikazce_user_id'],
                    'prikazce_prijmeni' => $lp_detail['prikazce_prijmeni'],
                    'prikazce_jmeno' => $lp_detail['prikazce_jmeno'],
                    'cerpani_podle_uzivatelu' => $lp_detail['users'],
                    'cerpano_pokladna' => $lp_detail['cerpano_pokladna'],
                    'celkem' => array(
                        'rezervovano' => $lp_detail['celkem_rezervovano'],
                        'predpokladane_cerpani' => $lp_detail['celkem_predpoklad'],
                        'skutecne_cerpano' => $lp_detail['celkem_skutecne']
                    )
                );
                
                // Agregace za celý úsek
                $celkovy_limit_usek += $lp_detail['celkovy_limit'];
                $celkem_rezervovano_usek += $lp_detail['celkem_rezervovano'];
                $celkem_predpoklad_usek += $lp_detail['celkem_predpoklad'];
                $celkem_skutecne_usek += $lp_detail['celkem_skutecne'];
                $celkem_pokladna_usek += $lp_detail['cerpano_pokladna'];
                $celkem_lp++;
            }
        }
        
        // KROK 3: Agregace uživatelů napříč všemi LP úseku
        $users_aggregate = array();
        
        foreach ($lp_data as $lp) {
            foreach ($lp['cerpani_podle_uzivatelu'] as $user) {
                $user_id = $user['user_id'];
                
                if (!isset($users_aggregate[$user_id])) {
                    $users_aggregate[$user_id] = array(
                        'user_id' => $user_id,
                        'prijmeni' => $user['prijmeni'],
                        'jmeno' => $user['jmeno'],
                        'pocet_objednavek' => 0,
                        'rezervovano' => 0,
                        'predpokladane_cerpani' => 0,
                        'skutecne_cerpano' => 0
                    );
                }
                
                $users_aggregate[$user_id]['pocet_objednavek'] += $user['pocet_objednavek'];
                $users_aggregate[$user_id]['rezervovano'] += $user['rezervovano'];
                $users_aggregate[$user_id]['predpokladane_cerpani'] += $user['predpokladane_cerpani'];
                $users_aggregate[$user_id]['skutecne_cerpano'] += $user['skutecne_cerpano'];
            }
        }
        
        // Zaokrouhlit a převést na pole
        $users_aggregate_array = array_values($users_aggregate);
        foreach ($users_aggregate_array as &$user) {
            $user['rezervovano'] = round($user['rezervovano'], 2);
            $user['predpokladane_cerpani'] = round($user['predpokladane_cerpani'], 2);
            $user['skutecne_cerpano'] = round($user['skutecne_cerpano'], 2);
            
            // Procenta z celkového limitu úseku
            $user['procento_rezervace'] = $celkovy_limit_usek > 0 ? round(($user['rezervovano'] / $celkovy_limit_usek) * 100, 2) : 0;
            $user['procento_predpoklad'] = $celkovy_limit_usek > 0 ? round(($user['predpokladane_cerpani'] / $celkovy_limit_usek) * 100, 2) : 0;
            $user['procento_skutecne'] = $celkovy_limit_usek > 0 ? round(($user['skutecne_cerpano'] / $celkovy_limit_usek) * 100, 2) : 0;
        }
        
        // Seřadit podle rezervovano DESC
        usort($users_aggregate_array, function($a, $b) {
            return $b['rezervovano'] <=> $a['rezervovano'];
        });
        
        return array(
            'status' => 'ok',
            'data' => array(
                'usek_info' => array(
                    'usek_id' => $usek_id,
                    'usek_nazev' => $usek_info['usek_nazev'],
                    'rok' => $rok
                ),
                'lp_seznam' => $lp_data,
                'cerpani_podle_uzivatelu_agregace' => $users_aggregate_array,
                'celkem_usek' => array(
                    'pocet_lp' => $celkem_lp,
                    'celkovy_limit' => round($celkovy_limit_usek, 2),
                    'rezervovano' => round($celkem_rezervovano_usek, 2),
                    'predpokladane_cerpani' => round($celkem_predpoklad_usek, 2),
                    'skutecne_cerpano' => round($celkem_skutecne_usek, 2),
                    'cerpano_pokladna' => round($celkem_pokladna_usek, 2),
                    'zbyva_rezervace' => round($celkovy_limit_usek - $celkem_rezervovano_usek, 2),
                    'zbyva_predpoklad' => round($celkovy_limit_usek - $celkem_predpoklad_usek, 2),
                    'zbyva_skutecne' => round($celkovy_limit_usek - $celkem_skutecne_usek, 2),
                    'procento_rezervace' => $celkovy_limit_usek > 0 ? round(($celkem_rezervovano_usek / $celkovy_limit_usek) * 100, 2) : 0,
                    'procento_predpoklad' => $celkovy_limit_usek > 0 ? round(($celkem_predpoklad_usek / $celkovy_limit_usek) * 100, 2) : 0,
                    'procento_skutecne' => $celkovy_limit_usek > 0 ? round(($celkem_skutecne_usek / $celkovy_limit_usek) * 100, 2) : 0
                )
            ),
            'meta' => array(
                'version' => 'v2.0',
                'timestamp' => date('Y-m-d H:i:s')
            )
        );
        
    } catch (PDOException $e) {
        return array(
            'status' => 'error',
            'message' => 'Database error: ' . $e->getMessage()
        );
    }
}

