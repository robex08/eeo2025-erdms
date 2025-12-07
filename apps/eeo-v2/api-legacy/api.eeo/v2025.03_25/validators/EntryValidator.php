<?php
/**
 * EntryValidator.php
 * Validace vstupních dat pro položky pokladní knihy
 * PHP 8.4+ s podporou multi-LP detail položek
 */

class EntryValidator {
    
    private $db;
    
    public function __construct($db = null) {
        $this->db = $db;
    }
    
    // ============================================
    // MULTI-LP VALIDACE (nové metody)
    // ============================================
    
    /**
     * Validovat LP povinnost podle typu dokladu
     * LP je POVINNÝ pouze pro VÝDAJE, pro PŘÍJMY není povinný
     */
    public function validateLpRequired(string $typDokladu, array $detailItems): bool {
        // Pro PŘÍJMY není LP povinný (dotace pokladny)
        if ($typDokladu === 'prijem') {
            return true;
        }
        
        // Pro VÝDAJE je LP POVINNÝ na všech detail položkách
        if ($typDokladu === 'vydaj') {
            if (empty($detailItems)) {
                throw new Exception('Výdaj musí mít alespoň jednu detail položku s LP kódem');
            }
            
            foreach ($detailItems as $idx => $item) {
                if (empty($item['lp_kod'])) {
                    throw new Exception("LP kód je povinný pro všechny výdaje (položka #" . ($idx + 1) . ")");
                }
            }
        }
        
        return true;
    }
    
    /**
     * Validovat, že součet detail položek se shoduje s celkovou částkou
     */
    public function validateDetailsSum(float $masterCastka, array $detailItems): bool {
        if (empty($detailItems)) {
            return true;
        }
        
        $detailSum = array_sum(array_column($detailItems, 'castka'));
        $rozdil = abs($masterCastka - $detailSum);
        
        // Tolerance 1 halíř
        if ($rozdil > 0.01) {
            throw new Exception(
                sprintf(
                    "Součet detail položek (%.2f Kč) se neshoduje s celkovou částkou (%.2f Kč)",
                    $detailSum,
                    $masterCastka
                )
            );
        }
        
        return true;
    }
    
    /**
     * Validovat dostupnost LP limitu
     * Kontroluje čerpání podle tabulky 25_limitovane_prisliby_cerpani
     */
    public function checkLpAvailability(string $lpKod, float $pozadovanaCastka, int $rok): array {
        if (!$this->db) {
            return ['status' => 'ok', 'message' => 'DB validace přeskočena'];
        }
        
        $stmt = $this->db->prepare("
            SELECT 
                lp.cislo_lp,
                lp.nazev,
                lp.celkovy_limit,
                COALESCE(c.skutecne_cerpano, 0) as skutecne_cerpano,
                COALESCE(c.zbyva_skutecne, lp.celkovy_limit) as zbyva
            FROM 25_limitovane_prisliby lp
            LEFT JOIN 25_limitovane_prisliby_cerpani c 
              ON c.cislo_lp = lp.cislo_lp AND c.rok = lp.rok
            WHERE lp.cislo_lp = ? AND lp.rok = ?
        ");
        
        $stmt->execute([$lpKod, $rok]);
        $lp = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$lp) {
            return [
                'status' => 'warning',
                'message' => "LP kód '{$lpKod}' nenalezen pro rok {$rok}"
            ];
        }
        
        $zbyva = (float) $lp['zbyva'];
        $procento = $lp['celkovy_limit'] > 0 
            ? round((($lp['skutecne_cerpano'] + $pozadovanaCastka) / $lp['celkovy_limit']) * 100, 2)
            : 0;
        
        // Překročení limitu
        if ($pozadovanaCastka > $zbyva) {
            return [
                'status' => 'error',
                'message' => sprintf(
                    "⚠️ PŘEKROČENÍ LIMITU! LP %s má zbývající %.2f Kč, požadováno %.2f Kč",
                    $lpKod,
                    $zbyva,
                    $pozadovanaCastka
                )
            ];
        }
        
        // Varování při 90%+
        if ($procento >= 90) {
            return [
                'status' => 'warning',
                'message' => sprintf("⚠️ LP %s bude vyčerpán na %.2f%%", $lpKod, $procento)
            ];
        }
        
        return [
            'status' => 'ok',
            'message' => sprintf("LP %s: %.2f%% vyčerpáno", $lpKod, $procento)
        ];
    }
    
    /**
     * Validovat kompletní záznam s multi-LP
     */
    public function validateEntryWithDetails(array $masterData, array $detailItems, int $rok): array {
        $errors = [];
        $warnings = [];
        
        try {
            // 1. LP povinnost
            $this->validateLpRequired($masterData['typ_dokladu'], $detailItems);
            
            // 2. Součet částek
            $castka_celkem = $masterData['castka_celkem'] 
                ?? ($masterData['castka_vydaj'] ?? $masterData['castka_prijem']);
            $this->validateDetailsSum((float) $castka_celkem, $detailItems);
            
            // 3. Dostupnost LP limitů (pouze pro výdaje)
            if ($masterData['typ_dokladu'] === 'vydaj' && $this->db) {
                foreach ($detailItems as $item) {
                    if (!empty($item['lp_kod'])) {
                        $check = $this->checkLpAvailability($item['lp_kod'], (float) $item['castka'], $rok);
                        
                        if ($check['status'] === 'error') {
                            $warnings[] = $check['message']; // Soft warning, ne hard error
                        } elseif ($check['status'] === 'warning') {
                            $warnings[] = $check['message'];
                        }
                    }
                }
            }
            
        } catch (Exception $e) {
            $errors[] = $e->getMessage();
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }
    
    // ============================================
    // PŮVODNÍ METODY (zachováno pro kompatibilitu)
    // ============================================
    
    /**
     * Validovat data pro vytvoření položky
     */
    public function validateCreate($data) {
        $errors = array();
        
        // Povinné pole: datum_zapisu
        if (empty($data['datum_zapisu'])) {
            $errors[] = 'datum_zapisu je povinné';
        } elseif (!$this->isValidDate($data['datum_zapisu'])) {
            $errors[] = 'datum_zapisu musí být platné datum ve formátu YYYY-MM-DD';
        }
        
        // Povinné pole: obsah_zapisu
        if (empty($data['obsah_zapisu'])) {
            $errors[] = 'obsah_zapisu je povinný';
        } elseif (strlen($data['obsah_zapisu']) > 500) {
            $errors[] = 'obsah_zapisu může mít maximálně 500 znaků';
        }
        
        // Kontrola částky - musí být buď příjem nebo výdaj, ale ne obojí
        // Frontend kontroluje, že alespoň jedna hodnota je nenulová
        $hasPrijem = isset($data['castka_prijem']) && !empty($data['castka_prijem']) && floatval($data['castka_prijem']) > 0;
        $hasVydaj = isset($data['castka_vydaj']) && !empty($data['castka_vydaj']) && floatval($data['castka_vydaj']) > 0;
        
        // Pouze kontrola velikosti, ne povinnost ani nenulovou hodnotu
        // Validace částky příjmu
        if (isset($data['castka_prijem']) && $data['castka_prijem'] !== null && $data['castka_prijem'] !== '') {
            if (!is_numeric($data['castka_prijem'])) {
                $errors[] = 'castka_prijem musí být číslo';
            } elseif (floatval($data['castka_prijem']) > 999999999.99) {
                $errors[] = 'castka_prijem je příliš velká';
            }
        }
        
        // Validace částky výdaje
        if (isset($data['castka_vydaj']) && $data['castka_vydaj'] !== null && $data['castka_vydaj'] !== '') {
            if (!is_numeric($data['castka_vydaj'])) {
                $errors[] = 'castka_vydaj musí být číslo';
            } elseif (floatval($data['castka_vydaj']) > 999999999.99) {
                $errors[] = 'castka_vydaj je příliš velká';
            }
        }
        
        // Volitelné: komu_od_koho
        if (isset($data['komu_od_koho']) && strlen($data['komu_od_koho']) > 255) {
            $errors[] = 'komu_od_koho může mít maximálně 255 znaků';
        }
        
        // Volitelné: lp_kod
        if (isset($data['lp_kod']) && strlen($data['lp_kod']) > 50) {
            $errors[] = 'lp_kod může mít maximálně 50 znaků';
        }
        
        // Volitelné: lp_popis
        if (isset($data['lp_popis']) && strlen($data['lp_popis']) > 255) {
            $errors[] = 'lp_popis může mít maximálně 255 znaků';
        }
        
        if (!empty($errors)) {
            throw new Exception('Validační chyby: ' . implode(', ', $errors));
        }
        
        return $data;
    }
    
    /**
     * Validovat data pro update položky
     */
    public function validateUpdate($data) {
        $errors = array();
        
        // Volitelné: datum_zapisu
        if (isset($data['datum_zapisu']) && !$this->isValidDate($data['datum_zapisu'])) {
            $errors[] = 'datum_zapisu musí být platné datum ve formátu YYYY-MM-DD';
        }
        
        // Volitelné: obsah_zapisu
        if (isset($data['obsah_zapisu'])) {
            if (empty($data['obsah_zapisu'])) {
                $errors[] = 'obsah_zapisu nesmí být prázdný';
            } elseif (strlen($data['obsah_zapisu']) > 500) {
                $errors[] = 'obsah_zapisu může mít maximálně 500 znaků';
            }
        }
        
        // Validace částky příjmu - UPDATE akceptuje NULL/0 (oprava položky)
        if (isset($data['castka_prijem']) && $data['castka_prijem'] !== null && $data['castka_prijem'] !== '') {
            if (!is_numeric($data['castka_prijem'])) {
                $errors[] = 'castka_prijem musí být číslo';
            } elseif (floatval($data['castka_prijem']) > 999999999.99) {
                $errors[] = 'castka_prijem je příliš velká';
            }
        }
        
        // Validace částky výdaje - UPDATE akceptuje NULL/0 (oprava položky)
        if (isset($data['castka_vydaj']) && $data['castka_vydaj'] !== null && $data['castka_vydaj'] !== '') {
            if (!is_numeric($data['castka_vydaj'])) {
                $errors[] = 'castka_vydaj musí být číslo';
            } elseif (floatval($data['castka_vydaj']) > 999999999.99) {
                $errors[] = 'castka_vydaj je příliš velká';
            }
        }
        
        // Volitelné: komu_od_koho
        if (isset($data['komu_od_koho']) && strlen($data['komu_od_koho']) > 255) {
            $errors[] = 'komu_od_koho může mít maximálně 255 znaků';
        }
        
        // Volitelné: lp_kod
        if (isset($data['lp_kod']) && strlen($data['lp_kod']) > 50) {
            $errors[] = 'lp_kod může mít maximálně 50 znaků';
        }
        
        // Volitelné: lp_popis
        if (isset($data['lp_popis']) && strlen($data['lp_popis']) > 255) {
            $errors[] = 'lp_popis může mít maximálně 255 znaků';
        }
        
        if (!empty($errors)) {
            throw new Exception('Validační chyby: ' . implode(', ', $errors));
        }
        
        return $data;
    }
    
    /**
     * Kontrola, zda je datum platné
     */
    private function isValidDate($date) {
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}
