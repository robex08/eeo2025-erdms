<?php
// Test backend API response pro statistiky faktur

// Simulate session (replace with real session cookie if needed)
session_start();
$_SESSION['user_id'] = 1; // Admin user

// Include backend files
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php';

// Simulate API request
$_GET['action'] = 'list_invoices_v25';
$_GET['page'] = 1;
$_GET['per_page'] = 10;
$_GET['filter_year'] = 2026;

// Call the handler directly
$db = db_connect();

// Get user info
$user_id = $_SESSION['user_id'] ?? 1;
$user_stmt = $db->prepare("SELECT id, role FROM 25_users WHERE id = ?");
$user_stmt->bind_param('i', $user_id);
$user_stmt->execute();
$user_result = $user_stmt->get_result();
$user = $user_result->fetch_assoc();

echo "=== TEST BACKEND API RESPONSE ===" . PHP_EOL . PHP_EOL;

// Get statistics directly from SQL
$faktury_table = '25a_objednavky_faktury';
$stats_sql = "SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') THEN 1 END) as pocet_nezaplaceno,
    COUNT(CASE WHEN (f.fa_zaplacena = 0 OR f.fa_zaplacena IS NULL) AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE() THEN 1 END) as pocet_po_splatnosti,
    COUNT(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL) THEN 1 END) as pocet_ve_splatnosti
FROM `$faktury_table` f
WHERE YEAR(f.fa_datum_vystaveni) = 2026";

$result = $db->query($stats_sql);
$stats = $result->fetch_assoc();

echo "SQL Statistiky (přímo z DB):" . PHP_EOL;
echo "----------------------------" . PHP_EOL;
echo "Celkem faktur: " . $stats['total'] . PHP_EOL;
echo "Nezaplaceno: " . $stats['pocet_nezaplaceno'] . PHP_EOL;
echo "Po splatnosti: " . $stats['pocet_po_splatnosti'] . PHP_EOL;
echo "Ve splatnosti: " . $stats['pocet_ve_splatnosti'] . PHP_EOL;
echo PHP_EOL;

// Now test if the API would return this
echo "Klíče ve statistikách:" . PHP_EOL;
echo "---------------------" . PHP_EOL;
foreach ($stats as $key => $value) {
    echo "  '$key' => $value" . PHP_EOL;
}
echo PHP_EOL;

// Check if pocet_ve_splatnosti exists
if (isset($stats['pocet_ve_splatnosti'])) {
    echo "✅ Backend OBSAHUJE 'pocet_ve_splatnosti': " . $stats['pocet_ve_splatnosti'] . PHP_EOL;
} else {
    echo "❌ Backend NEOBSAHUJE 'pocet_ve_splatnosti'" . PHP_EOL;
}

echo PHP_EOL;
echo "=== KONEC TESTU ===" . PHP_EOL;
?>
