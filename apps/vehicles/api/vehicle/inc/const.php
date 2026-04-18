<?php
// Načtení .env souboru
if (!function_exists('loadEnv')) {
    function loadEnv($path) {
        if (!file_exists($path)) {
            die("❌ .env soubor nenalezen: $path");
        }
        
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Přeskočit komentáře
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parsovat KEY=VALUE
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            
            // Nastavit do $_ENV
            $_ENV[$name] = $value;
            putenv("$name=$value");
        }
    }
}

// Načíst .env z aktuální složky
loadEnv(__DIR__ . '/../.env');

// WebDispečink API credentials z .env
$kodf = $_ENV['WEBDISPECINK_KODF'];
$username = $_ENV['WEBDISPECINK_USERNAME'];
$pass = $_ENV['WEBDISPECINK_PASSWORD'];

// MySQL Database Connection z .env
$host = $_ENV['DB_HOST'];
$user = $_ENV['DB_USER'];
$password = $_ENV['DB_PASSWORD'];
$database = $_ENV['DB_NAME'];