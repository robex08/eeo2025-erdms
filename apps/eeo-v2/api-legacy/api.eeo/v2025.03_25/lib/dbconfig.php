<?php
// Konfigurace databáze pro API
return [
    'mysql' => [
        'host' => '10.3.172.11', // Remote DB server
        'username' => 'erdms_user', // Nový uživatel pro eeo2025
        'password' => 'AhchohTahnoh7eim', // Heslo z .env
        'database' => 'eeo2025' // Nová databáze
    ],
    'upload' => [
        // Root cesta pro nahrávání příloh - jednotná pro dev i produkci
        'root_path' => '/var/www/erdms-data/eeo-v2/prilohy/',
        
        // Alternativní relativní cesta (stejná jako root_path)
        'relative_path' => '/var/www/erdms-data/eeo-v2/prilohy/',
        
        // Cesta pro DOCX šablony
        'docx_templates_path' => '/var/www/erdms-data/eeo-v2/sablony/',
        
        // Maximální velikost souboru v bajtech (20MB)
        'max_file_size' => 20 * 1024 * 1024,
        
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
        'directory_structure' => [
            'by_date' => true,        // Rozdělit podle data (YYYY/MM/)
            'by_order' => false,      // Rozdělit podle ID objednávky
            'by_user' => false        // Rozdělit podle ID uživatele
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
