<?php
/**
 * ═══════════════════════════════════════════════════════════════════
 * EVENT TYPES NAMING REFACTOR - PHP MIGRACE JSON
 * ═══════════════════════════════════════════════════════════════════
 * Datum: 2026-01-03
 * Účel: Migrace eventTypes v structure_json org hierarchie
 * Použití: php deployment_event_types_migrate_hierarchy_json.php
 * ═══════════════════════════════════════════════════════════════════
 */

// Načíst config
$configPath = __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/config_db.inc';
if (!file_exists($configPath)) {
    die("❌ Config soubor nenalezen: $configPath\n");
}

require_once $configPath;

// Připojit k DB
try {
    $db = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
        DB_USER,
        DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✅ Připojeno k databázi: " . DB_NAME . "\n\n";
} catch (PDOException $e) {
    die("❌ Chyba připojení: " . $e->getMessage() . "\n");
}

// ═══════════════════════════════════════════════════════════════════
// MAPOVÁNÍ STARÝCH → NOVÝCH EVENT TYPES
// ═══════════════════════════════════════════════════════════════════

$EVENT_TYPE_MAP = [
    // OBJEDNÁVKY
    'order_status_nova' => 'ORDER_CREATED',
    'order_status_rozpracovana' => 'ORDER_DRAFT',
    'order_status_ke_schvaleni' => 'ORDER_PENDING_APPROVAL',
    'order_status_schvalena' => 'ORDER_APPROVED',
    'order_status_zamitnuta' => 'ORDER_REJECTED',
    'order_status_ceka_se' => 'ORDER_AWAITING_CHANGES',
    'order_status_odeslana' => 'ORDER_SENT_TO_SUPPLIER',
    'order_status_ceka_potvrzeni' => 'ORDER_AWAITING_CONFIRMATION',
    'order_status_potvrzena' => 'ORDER_CONFIRMED_BY_SUPPLIER',
    'order_status_registr_ceka' => 'ORDER_REGISTRY_PENDING',
    'order_status_registr_zverejnena' => 'ORDER_REGISTRY_PUBLISHED',
    'order_status_faktura_ceka' => 'ORDER_INVOICE_PENDING',
    'order_status_faktura_pridana' => 'ORDER_INVOICE_ADDED',
    'order_status_faktura_schvalena' => 'ORDER_INVOICE_APPROVED',
    'order_status_faktura_uhrazena' => 'ORDER_INVOICE_PAID',
    'order_status_kontrola_ceka' => 'ORDER_VERIFICATION_PENDING',
    'order_status_kontrola_potvrzena' => 'ORDER_VERIFICATION_APPROVED',
    'order_status_kontrola_zamitnuta' => 'ORDER_VERIFICATION_REJECTED',
    'order_status_dokoncena' => 'ORDER_COMPLETED',
    
    // TODO ALARMY
    'alarm_todo_normal' => 'TODO_ALARM_NORMAL',
    'alarm_todo_high' => 'TODO_ALARM_URGENT',
    'alarm_todo_expired' => 'TODO_ALARM_EXPIRED',
    'todo_completed' => 'TODO_COMPLETED',
    'todo_assigned' => 'TODO_ASSIGNED',
    
    // SYSTÉM
    'system_maintenance_scheduled' => 'SYSTEM_MAINTENANCE_SCHEDULED',
    'system_maintenance_starting' => 'SYSTEM_MAINTENANCE_STARTING',
    'system_maintenance_finished' => 'SYSTEM_MAINTENANCE_FINISHED',
    'system_backup_completed' => 'SYSTEM_BACKUP_COMPLETED',
    'system_update_available' => 'SYSTEM_UPDATE_AVAILABLE',
    'system_update_installed' => 'SYSTEM_UPDATE_INSTALLED',
    'system_security_alert' => 'SYSTEM_SECURITY_ALERT',
    'system_user_login_alert' => 'SYSTEM_USER_LOGIN_ALERT',
    'system_session_expired' => 'SYSTEM_SESSION_EXPIRED',
    'system_storage_warning' => 'SYSTEM_STORAGE_WARNING',
    
    // OSTATNÍ
    'user_mention' => 'USER_MENTIONED',
    'deadline_reminder' => 'DEADLINE_REMINDER',
    'order_unlock_forced' => 'ORDER_FORCE_UNLOCKED'
];

// ═══════════════════════════════════════════════════════════════════
// FUNKCE PRO MIGRACI eventTypes V ARRAY
// ═══════════════════════════════════════════════════════════════════

function migrateEventTypes($eventTypes, $map) {
    if (!is_array($eventTypes)) {
        return $eventTypes;
    }
    
    return array_map(function($type) use ($map) {
        return $map[$type] ?? $type; // Pokud není v mapě, nechat původní
    }, $eventTypes);
}

// ═══════════════════════════════════════════════════════════════════
// NAČÍST PROFILY
// ═══════════════════════════════════════════════════════════════════

echo "🔍 Načítám profily org hierarchie...\n";

$stmt = $db->query("SELECT id, nazev, structure_json FROM 25_notifikace_hierarchie_profily WHERE aktivni = 1");
$profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "✅ Nalezeno " . count($profiles) . " aktivních profilů\n\n";

if (count($profiles) === 0) {
    echo "⚠️ Žádné aktivní profily - migrace ukončena\n";
    exit(0);
}

// ═══════════════════════════════════════════════════════════════════
// MIGRACE KAŽDÉHO PROFILU
// ═══════════════════════════════════════════════════════════════════

$migratedCount = 0;
$errorCount = 0;

foreach ($profiles as $profile) {
    $profileId = $profile['id'];
    $profileName = $profile['nazev'];
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "📝 Profil ID=$profileId: $profileName\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    // Dekódovat JSON
    $structure = json_decode($profile['structure_json'], true);
    
    if (!$structure) {
        echo "❌ Chyba: Neplatný JSON\n\n";
        $errorCount++;
        continue;
    }
    
    $changedNodesCount = 0;
    
    // Projít všechny NODE
    if (isset($structure['nodes']) && is_array($structure['nodes'])) {
        foreach ($structure['nodes'] as &$node) {
            if (isset($node['data']['eventTypes']) && is_array($node['data']['eventTypes'])) {
                $oldEventTypes = $node['data']['eventTypes'];
                $newEventTypes = migrateEventTypes($oldEventTypes, $EVENT_TYPE_MAP);
                
                // Pokud se změnilo
                if ($oldEventTypes !== $newEventTypes) {
                    $node['data']['eventTypes'] = $newEventTypes;
                    $changedNodesCount++;
                    
                    echo "   🔄 NODE '{$node['data']['name']}' (ID: {$node['id']})\n";
                    echo "      PŘED: " . implode(', ', $oldEventTypes) . "\n";
                    echo "      PO:   " . implode(', ', $newEventTypes) . "\n";
                }
            }
        }
        unset($node); // Uvolnit referenci
    }
    
    if ($changedNodesCount === 0) {
        echo "   ℹ️ Žádné změny potřeba\n\n";
        continue;
    }
    
    // Zakódovat zpět do JSON
    $newJson = json_encode($structure, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    if (!$newJson) {
        echo "❌ Chyba: Nelze zakódovat JSON\n\n";
        $errorCount++;
        continue;
    }
    
    // Uložit do DB
    try {
        $updateStmt = $db->prepare("
            UPDATE 25_notifikace_hierarchie_profily 
            SET structure_json = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        $updateStmt->execute([$newJson, $profileId]);
        
        echo "   ✅ Uloženo: $changedNodesCount NODEs změněno\n\n";
        $migratedCount++;
        
    } catch (PDOException $e) {
        echo "❌ Chyba při ukládání: " . $e->getMessage() . "\n\n";
        $errorCount++;
    }
}

// ═══════════════════════════════════════════════════════════════════
// VÝSLEDEK
// ═══════════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📊 VÝSLEDEK MIGRACE\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Migrováno:      $migratedCount profilů\n";
echo "❌ Chyby:          $errorCount\n";
echo "📁 Celkem profilů: " . count($profiles) . "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

if ($errorCount > 0) {
    echo "\n⚠️ POZOR: Byly zaznamenány chyby!\n";
    exit(1);
} else {
    echo "\n✅ Migrace JSON ÚSPĚŠNĚ DOKONČENA\n";
    exit(0);
}
