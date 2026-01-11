<?php
/**
 * Test script pro cashbook-entry-delete endpoint
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== CASHBOOK DELETE TEST ===\n\n";

// Načíst API
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/api.eeo/cashbook-entry-delete';

// Načíst API soubory
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';

// Načíst cashbook soubory
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/CashbookModel.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/CashbookEntryModel.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/CashbookAuditModel.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/CashbookService.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/BalanceCalculator.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/services/DocumentNumberService.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/middleware/CashbookPermissions.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/validators/CashbookValidator.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/validators/EntryValidator.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/cashbookHandlers.php';

echo "✓ Všechny soubory načteny\n\n";

// Test získání DB připojení
echo "Test DB připojení...\n";
$config = require '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$db = get_db($config['mysql']);

if ($db) {
    echo "✓ DB připojení OK\n\n";
} else {
    echo "✗ DB připojení FAILED\n\n";
    exit(1);
}

// Test existence funkce
if (function_exists('handle_cashbook_entry_delete_post')) {
    echo "✓ Funkce handle_cashbook_entry_delete_post existuje\n\n";
} else {
    echo "✗ Funkce handle_cashbook_entry_delete_post NEEXISTUJE\n\n";
    exit(1);
}

// Test existence tříd
$classes = array('CashbookModel', 'CashbookEntryModel', 'CashbookService', 'CashbookPermissions');
foreach ($classes as $class) {
    if (class_exists($class)) {
        echo "✓ Třída $class existuje\n";
    } else {
        echo "✗ Třída $class NEEXISTUJE\n";
        exit(1);
    }
}

echo "\n=== VŠECHNY TESTY PROŠLY ===\n";
