<?php
/**
 * Přečíslování VŠECH knih v roce 2026 na správnou logiku
 */

$envPath = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';

try {
    $config = array(
        'host' => $_ENV['DB_HOST'] ?? '10.3.172.11',
        'port' => $_ENV['DB_PORT'] ?? '3306', 
        'dbname' => $_ENV['DB_NAME'] ?? 'EEO-OSTRA-DEV',
        'username' => $_ENV['DB_USER'] ?? 'erdms_user',
        'password' => $_ENV['DB_PASSWORD'] ?? 'AhchohTahnoh7eim',
        'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4'
    );

    $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset={$config['charset']}";
    $db = new PDO($dsn, $config['username'], $config['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));

    echo "\n🎯 PŘEČÍSLOVÁNÍ KNIHY 22\n\n";

    $bookId = 22;
    
    echo "=== PŘED PŘEČÍSLOVÁNÍM ===\n";
    $stmt = $db->prepare("
        SELECT p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ? AND YEAR(p.datum_zapisu) = 2026 AND p.smazano = 0
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    foreach ($stmt->fetchAll() as $e) {
        echo sprintf("  %s: %s (pořadí %d) [%s]\n", $e['datum_zapisu'], $e['cislo_dokladu'], $e['cislo_poradi_v_roce'], $e['typ_dokladu']);
    }

    echo "\n🔧 PŘEČÍSLOVÁVÁM podle typu...\n";
    
    $docService = new DocumentNumberService($db);
    $result = $docService->renumberBookDocuments($bookId);
    
    if (!$result) {
        echo "❌ Přečíslování selhalo!\n";
        exit(1);
    }
    
    echo "✅ Přečíslování dokončeno!\n\n";

    echo "=== PO PŘEČÍSLOVÁNÍ ===\n";
    $stmt = $db->prepare("
        SELECT p.datum_zapisu, p.cislo_dokladu, p.cislo_poradi_v_roce, p.typ_dokladu
        FROM 25a_pokladni_polozky p
        WHERE p.pokladni_kniha_id = ? AND YEAR(p.datum_zapisu) = 2026 AND p.smazano = 0
        ORDER BY p.datum_zapisu, p.id
    ");
    $stmt->execute([$bookId]);
    foreach ($stmt->fetchAll() as $e) {
        echo sprintf("  %s: %s (pořadí %d) [%s]\n", $e['datum_zapisu'], $e['cislo_dokladu'], $e['cislo_poradi_v_roce'], $e['typ_dokladu']);
    }

    echo "\n✅ Hotovo! Nyní má každý typ vlastní řadu: P001, P002... a V001, V002...\n";

} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
}
?>