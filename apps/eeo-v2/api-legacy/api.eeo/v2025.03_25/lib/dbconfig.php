<?php
// Konfigurace databáze pro API

// ============================================
// NAČTENÍ .ENV SOUBORU
// ============================================
$env_file = __DIR__ . '/../../.env';
if (file_exists($env_file)) {
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // OPRAVENO: Set do $_ENV i putenv pro FastCGI kompatibilitu
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// ============================================
// DATABÁZOVÁ KONFIGURACE Z .ENV
// ============================================
return [
    'mysql' => [
        'host' => $_ENV['DB_HOST'] ?? $_SERVER['DB_HOST'] ?? getenv('DB_HOST') ?: '10.3.172.11',
        'username' => $_ENV['DB_USER'] ?? $_SERVER['DB_USER'] ?? getenv('DB_USER') ?: 'erdms_user',
        'password' => $_ENV['DB_PASSWORD'] ?? $_SERVER['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'AhchohTahnoh7eim',
        'database' => $_ENV['DB_NAME'] ?? $_SERVER['DB_NAME'] ?? getenv('DB_NAME') ?: 'eeo2025'  // PROD fallback
    ],
    'upload' => [
        // Root cesta pro nahrávání příloh - environment aware
        // DEV: /var/www/erdms-dev/data/eeo-v2/prilohy/
        // PROD: /var/www/erdms-platform/data/eeo-v2/prilohy/
        'root_path' => $_ENV['UPLOAD_ROOT_PATH'] ?? $_SERVER['UPLOAD_ROOT_PATH'] ?? getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-platform/data/eeo-v2/prilohy/',
        
        // Alternativní relativní cesta (stejná jako root_path)
        'relative_path' => $_ENV['UPLOAD_ROOT_PATH'] ?? $_SERVER['UPLOAD_ROOT_PATH'] ?? getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-platform/data/eeo-v2/prilohy/',
        
        // Cesta pro DOCX šablony - environment aware
        // DEV: /var/www/erdms-dev/data/eeo-v2/sablony/
        // PROD: /var/www/erdms-platform/data/eeo-v2/sablony/
        'docx_templates_path' => $_ENV['DOCX_TEMPLATES_PATH'] ?? $_SERVER['DOCX_TEMPLATES_PATH'] ?? getenv('DOCX_TEMPLATES_PATH') ?: '/var/www/erdms-platform/data/eeo-v2/sablony/',
        
        // Maximální velikost souboru v bajtech (50MB)
        'max_file_size' => 50 * 1024 * 1024,
        
        // Povolené přípony souborů
        'allowed_extensions' => [
            // Dokumenty
            'pdf', 'doc', 'docx', 'rtf', 'odt',
            // Tabulky
            'xls', 'xlsx', 'ods', 'csv',
            // Prezentace  
            'ppt', 'pptx', 'odp',
            // Text
            'txt', 'md',
            // Obrázky
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
            // Archivy
            'zip', 'rar', '7z', 'tar', 'gz'
        ],
        
        // Struktura adresářů - jak organizovat soubory
        // ✅ PLOCHÁ STRUKTURA - všechny soubory přímo v /var/www/erdms-dev/data/eeo-v2/prilohy/
        // Rozlišení: faktury = fa-*, objednávky = obj-* v názvu souboru
        'directory_structure' => [
            'by_date' => false,       // ❌ Nerozdělit podle data - plochá struktura
            'by_order' => false,      // ❌ Nerozdělit podle ID objednávky
            'by_user' => false        // ❌ Nerozdělit podle ID uživatele
        ],
        
        // URL prefix pro přístup k souborům (pokud budou přístupné přes web)
        'web_url_prefix' => 'https://erdms.zachranka.cz/eeo-v2/prilohy/',
        
        // Bezpečnostní nastavení
        'security' => [
            'sanitize_filename' => true,  // Vyčistit názvy souborů
            'check_mime_type' => true,    // Kontrolovat MIME typy
            'virus_scan' => false         // Skenování virů (vyžaduje externí nástroj)
        ],
        
        // Formát systemového názvu
        'filename_format' => [
            'use_date_prefix' => true,    // Automaticky přidat YYYY-MM-DD_ prefix
            'accepted_formats' => [
                'YYYY-MM-DD_GUID',        // 2025-10-05_e3a4b2c1-d5f6-4e7a-8b9c-1d2e3f4a5b6c
                'GUID',                   // e3a4b2c1-d5f6-4e7a-8b9c-1d2e3f4a5b6c (automaticky se přidá datum)
                'YYYY-MM-DD_xxxxxxxxxx'   // 2025-10-05_15a0c955fe (FE legacy formát)
            ]
        ]
    ]
];
