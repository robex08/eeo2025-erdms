<?php
/**
 * LPCalculationService.php
 * Služba pro automatický přepočet čerpání LP kódů v pokladně
 * Podporuje multi-LP (více LP kódů pod jedním dokladem)
 */

class LPCalculationService {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Přepočítat čerpání všech LP kódů pro danou knihu
     * Podporuje multi-LP: agreguje detail položky + staré single LP
     * 
     * @param int $bookId ID pokladní knihy
     * @return array Agregované čerpání podle LP kódů
     */
    public function recalculateLPForBook(int $bookId): array {
        $sql = "
            SELECT 
                lp_data.lp_kod,
                SUM(lp_data.castka) as celkem_vydano,
                COUNT(DISTINCT lp_data.polozka_id) as pocet_dokladu,
                COUNT(*) as pocet_polozek
            FROM (
                -- Multi-LP: detail položky
                SELECT 
                    d.lp_kod,
                    d.castka,
                    p.id as polozka_id
                FROM 25a_pokladni_polozky_detail d
                JOIN 25a_pokladni_polozky p ON p.id = d.polozka_id
                WHERE p.pokladni_kniha_id = ?
                  AND p.typ_dokladu = 'vydaj'
                  AND p.smazano = 0
                  AND d.lp_kod IS NOT NULL
                  AND d.lp_kod != ''
                
                UNION ALL
                
                -- Single-LP: staré záznamy bez detailů
                SELECT 
                    p.lp_kod,
                    COALESCE(p.castka_vydaj, p.castka_celkem) as castka,
                    p.id as polozka_id
                FROM 25a_pokladni_polozky p
                WHERE p.pokladni_kniha_id = ?
                  AND p.typ_dokladu = 'vydaj'
                  AND p.smazano = 0
                  AND (p.ma_detail = 0 OR p.ma_detail IS NULL)
                  AND p.lp_kod IS NOT NULL
                  AND p.lp_kod != ''
            ) as lp_data
            GROUP BY lp_data.lp_kod
            ORDER BY lp_data.lp_kod
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$bookId, $bookId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Přepočítat čerpání LP pro všechny knihy uživatele v daném roce
     * 
     * @param int $userId ID uživatele
     * @param int $year Rok
     * @return array Agregované čerpání podle LP kódů za celý rok
     */
    public function recalculateLPForUserYear(int $userId, int $year): array {
        $sql = "
            SELECT 
                lp_data.lp_kod,
                SUM(lp_data.castka) as celkem_vydano,
                COUNT(DISTINCT lp_data.kniha_id) as pocet_knih,
                COUNT(DISTINCT lp_data.polozka_id) as pocet_dokladu,
                COUNT(*) as pocet_polozek,
                MIN(lp_data.datum_zapisu) as prvni_datum,
                MAX(lp_data.datum_zapisu) as posledni_datum
            FROM (
                -- Multi-LP: detail položky
                SELECT 
                    d.lp_kod,
                    d.castka,
                    p.id as polozka_id,
                    k.id as kniha_id,
                    p.datum_zapisu
                FROM 25a_pokladni_polozky_detail d
                JOIN 25a_pokladni_polozky p ON p.id = d.polozka_id
                JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
                WHERE k.uzivatel_id = ?
                  AND k.rok = ?
                  AND p.typ_dokladu = 'vydaj'
                  AND p.smazano = 0
                  AND d.lp_kod IS NOT NULL
                  AND d.lp_kod != ''
                
                UNION ALL
                
                -- Single-LP: staré záznamy bez detailů
                SELECT 
                    p.lp_kod,
                    COALESCE(p.castka_vydaj, p.castka_celkem) as castka,
                    p.id as polozka_id,
                    k.id as kniha_id,
                    p.datum_zapisu
                FROM 25a_pokladni_polozky p
                JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
                WHERE k.uzivatel_id = ?
                  AND k.rok = ?
                  AND p.typ_dokladu = 'vydaj'
                  AND p.smazano = 0
                  AND (p.ma_detail = 0 OR p.ma_detail IS NULL)
                  AND p.lp_kod IS NOT NULL
                  AND p.lp_kod != ''
            ) as lp_data
            GROUP BY lp_data.lp_kod
            ORDER BY lp_data.lp_kod
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $year, $userId, $year]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat detailní rozpis čerpání LP kódu
     * Vrátí všechny doklady, které čerpaly daný LP kód
     * 
     * @param string $lpCode LP kód
     * @param int $userId ID uživatele
     * @param int $year Rok
     * @return array Detail čerpání
     */
    public function getLPDetail(string $lpCode, int $userId, int $year): array {
        $sql = "
            SELECT 
                lp_data.*,
                k.mesic,
                k.nazev_uctu as ucet_nazev
            FROM (
                -- Multi-LP: detail položky
                SELECT 
                    p.id as polozka_id,
                    p.datum_zapisu,
                    p.cislo_dokladu,
                    p.obsah_zapisu as hlavni_popis,
                    d.popis as detail_popis,
                    d.castka,
                    d.lp_kod,
                    p.pokladni_kniha_id as kniha_id,
                    'multi' as typ_zaznamu
                FROM 25a_pokladni_polozky_detail d
                JOIN 25a_pokladni_polozky p ON p.id = d.polozka_id
                JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
                WHERE k.uzivatel_id = ?
                  AND k.rok = ?
                  AND d.lp_kod = ?
                  AND p.typ_dokladu = 'vydaj'
                  AND p.smazano = 0
                
                UNION ALL
                
                -- Single-LP: staré záznamy
                SELECT 
                    p.id as polozka_id,
                    p.datum_zapisu,
                    p.cislo_dokladu,
                    p.obsah_zapisu as hlavni_popis,
                    NULL as detail_popis,
                    COALESCE(p.castka_vydaj, p.castka_celkem) as castka,
                    p.lp_kod,
                    p.pokladni_kniha_id as kniha_id,
                    'single' as typ_zaznamu
                FROM 25a_pokladni_polozky p
                JOIN 25a_pokladni_knihy k ON k.id = p.pokladni_kniha_id
                WHERE k.uzivatel_id = ?
                  AND k.rok = ?
                  AND p.lp_kod = ?
                  AND p.typ_dokladu = 'vydaj'
                  AND p.smazano = 0
                  AND (p.ma_detail = 0 OR p.ma_detail IS NULL)
            ) as lp_data
            JOIN 25a_pokladni_knihy k ON k.id = lp_data.kniha_id
            ORDER BY lp_data.datum_zapisu, lp_data.cislo_dokladu
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $year, $lpCode, $userId, $year, $lpCode]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat přehled čerpání LP s informacemi o limitech
     * Spojí data z čerpání s limity z tabulky 25_limitovane_prisliby_cerpani
     * 
     * @param int $userId ID uživatele
     * @param int $year Rok
     * @return array LP kódy s čerpáním a limity
     */
    public function getLPSummaryWithLimits(int $userId, int $year): array {
        // 1. Získat čerpání z pokladny
        $cerpani = $this->recalculateLPForUserYear($userId, $year);
        
        // 2. Získat limity z číselníku
        $sql = "
            SELECT 
                c.cislo_lp,
                c.celkovy_limit,
                c.skutecne_cerpano,
                c.zbyva_skutecne,
                c.nazev_uctu
            FROM 25_limitovane_prisliby_cerpani c
            WHERE c.rok = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$year]);
        $limity = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 3. Indexovat limity podle LP kódu
        $limityIndex = [];
        foreach ($limity as $limit) {
            $limityIndex[$limit['cislo_lp']] = $limit;
        }
        
        // 4. Spojit čerpání s limity
        $result = [];
        foreach ($cerpani as $item) {
            $lpKod = $item['lp_kod'];
            $limit = $limityIndex[$lpKod] ?? null;
            
            $result[] = [
                'lp_kod' => $lpKod,
                'cerpano_pokladna' => floatval($item['celkem_vydano']),
                'pocet_dokladu' => intval($item['pocet_dokladu']),
                'pocet_polozek' => intval($item['pocet_polozek']),
                'pocet_knih' => intval($item['pocet_knih']),
                'prvni_datum' => $item['prvni_datum'],
                'posledni_datum' => $item['posledni_datum'],
                
                // Data z číselníku
                'celkovy_limit' => $limit ? floatval($limit['celkovy_limit']) : null,
                'skutecne_cerpano_celkem' => $limit ? floatval($limit['skutecne_cerpano']) : null,
                'zbyva' => $limit ? floatval($limit['zbyva_skutecne']) : null,
                'nazev_uctu' => $limit['nazev_uctu'] ?? null,
                
                // Výpočty
                'procento_cerpani' => $limit && $limit['celkovy_limit'] > 0 
                    ? round((floatval($item['celkem_vydano']) / floatval($limit['celkovy_limit'])) * 100, 2)
                    : null,
                'prekroceni' => $limit && $limit['celkovy_limit'] > 0 
                    ? floatval($item['celkem_vydano']) > floatval($limit['celkovy_limit'])
                    : false
            ];
        }
        
        return $result;
    }
}
