<?php
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

$db = get_db();

// Načti jednu fakturu s kontrolou
$stmt = $db->prepare("
    SELECT id, dt_aktualizace, rozsirujici_data
    FROM 25a_objednavky_faktury
    WHERE id = 13
");
$stmt->execute();
$faktura = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== PŘED ZPRACOVÁNÍM ===\n";
echo "ID: {$faktura['id']}\n";
echo "dt_aktualizace: {$faktura['dt_aktualizace']}\n";
echo "rozsirujici_data (raw): " . substr($faktura['rozsirujici_data'], 0, 200) . "...\n\n";

// Zpracuj jako v invoiceHandlers.php
$decoded = json_decode($faktura['rozsirujici_data'], true);
$faktura['rozsirujici_data'] = is_array($decoded) ? $decoded : null;

if (isset($faktura['rozsirujici_data']['kontrola_radku'])) {
    $kontrola = $faktura['rozsirujici_data']['kontrola_radku'];
    
    if (!empty($kontrola['kontrolovano'])) {
        $dt_kontroly = $kontrola['dt_kontroly'] ?? null;
        $dt_aktualizace = $faktura['dt_aktualizace'] ?? null;
        
        if ($dt_kontroly && $dt_aktualizace) {
            $ts_kontroly = strtotime($dt_kontroly);
            $ts_aktualizace = strtotime($dt_aktualizace);
            
            if ($ts_kontroly >= $ts_aktualizace) {
                $faktura['check_status'] = 'checked_ok';
            } else {
                $faktura['check_status'] = 'checked_modified';
            }
        }
    } else {
        $faktura['check_status'] = 'unchecked';
    }
} else {
    $faktura['check_status'] = 'unchecked';
}

echo "=== PO ZPRACOVÁNÍ ===\n";
echo "check_status: " . ($faktura['check_status'] ?? 'NOT_SET') . "\n";
echo "kontrolovano: " . ($faktura['rozsirujici_data']['kontrola_radku']['kontrolovano'] ? 'true' : 'false') . "\n";
echo "dt_kontroly: " . ($faktura['rozsirujici_data']['kontrola_radku']['dt_kontroly'] ?? 'NULL') . "\n\n";

echo "=== JSON ENCODE TEST ===\n";
$json = json_encode($faktura, JSON_UNESCAPED_UNICODE);
echo "Has check_status in JSON: " . (strpos($json, 'check_status') !== false ? 'YES' : 'NO') . "\n";
echo "JSON fragment: " . substr($json, 0, 300) . "...\n";
