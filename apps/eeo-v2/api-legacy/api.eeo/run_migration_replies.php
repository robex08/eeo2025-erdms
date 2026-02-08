#!/usr/bin/env php
<?php
/**
 * Migrace: Přidání parent_comment_id pro odpovědi na komentáře
 * Spuštění: php run_migration_replies.php
 */

// Načtení DB konfigurace
$config = require __DIR__ . '/v2025.03_25/lib/dbconfig.php';

try {
    // Připojení k databázi
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['mysql']['host'],
        $config['mysql']['database']
    );
    
    $db = new PDO($dsn, $config['mysql']['username'], $config['mysql']['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_czech_ci"
    ]);
    
    echo "✅ Připojeno k databázi: " . $config['mysql']['database'] . PHP_EOL;
    echo PHP_EOL;
    
    // Kontrola, zda sloupec už existuje
    $stmt = $db->query("SHOW COLUMNS FROM `25a_objednavky_komentare` LIKE 'parent_comment_id'");
    $exists = $stmt->fetch();
    
    if ($exists) {
        echo "⚠️  Sloupec parent_comment_id již existuje, migrace není potřeba." . PHP_EOL;
        exit(0);
    }
    
    echo "🔨 Přidávám sloupec parent_comment_id..." . PHP_EOL;
    
    // Provedení migrace
    $sql = "
        ALTER TABLE `25a_objednavky_komentare`
          ADD COLUMN `parent_comment_id` BIGINT UNSIGNED NULL DEFAULT NULL 
            COMMENT 'FK na nadřazený komentář (pro odpovědi)' 
            AFTER `objednavka_id`,
          ADD INDEX `idx_parent_comment` (`parent_comment_id`),
          ADD CONSTRAINT `fk_25a_obj_kom_parent` 
            FOREIGN KEY (`parent_comment_id`) 
            REFERENCES `25a_objednavky_komentare`(`id`) 
            ON DELETE CASCADE
    ";
    
    $db->exec($sql);
    
    echo "✅ Sloupec parent_comment_id přidán" . PHP_EOL;
    echo "✅ Index idx_parent_comment vytvořen" . PHP_EOL;
    echo "✅ Foreign key fk_25a_obj_kom_parent vytvořen" . PHP_EOL;
    echo PHP_EOL;
    
    // Ověření struktury
    echo "📋 Ověření struktury tabulky:" . PHP_EOL;
    $stmt = $db->query("SHOW COLUMNS FROM `25a_objednavky_komentare`");
    $columns = $stmt->fetchAll();
    
    foreach ($columns as $col) {
        if ($col['Field'] === 'parent_comment_id') {
            echo "  ✅ " . $col['Field'] . " (" . $col['Type'] . ") - " . $col['Null'] . PHP_EOL;
        }
    }
    
    echo PHP_EOL;
    echo "🎉 Migrace úspěšně dokončena!" . PHP_EOL;
    
} catch (PDOException $e) {
    echo "❌ CHYBA: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
