<?php
/**
 * Proxy endpoint pro načítání krypto kurzů z CoinGecko API
 * 
 * Řeší CORS problém při načítání krypto kurzů z frontendu.
 * Frontend volá tento backend endpoint, který načte data z CoinGecko API
 * a vrátí je zpět frontendové aplikaci.
 * 
 * POZNÁMKA: CORS hlavičky jsou nastaveny v .htaccess, ne zde!
 */

// Headers pro JSON response (CORS je v .htaccess)
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Security: Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Only GET requests are supported.'
    ]);
    exit();
}

// 📦 CACHE mechanismus
$cacheDir = __DIR__ . '/cache';
$cacheFile = $cacheDir . '/crypto_rates_cache.json';
$cacheLifetime = 30 * 60; // 30 minut

// Kontrola cache
if (file_exists($cacheFile)) {
    $cacheTime = filemtime($cacheFile);
    if (time() - $cacheTime < $cacheLifetime) {
        // Cache je platná - vrátit cached data
        $cachedData = file_get_contents($cacheFile);
        
        // Přidat cache header
        header('X-Cache: HIT');
        header('X-Cache-Age: ' . (time() - $cacheTime));
        
        echo $cachedData;
        exit();
    }
}

// 🪙 CoinGecko API request
$cryptoCurrencies = [
    'bitcoin',
    'ethereum',
    'cardano',
    'ripple',
    'litecoin',
    'polkadot',
    'dogecoin',
    'solana'
];

$coinsParam = implode(',', $cryptoCurrencies);
$apiUrl = "https://api.coingecko.com/api/v3/simple/price?ids={$coinsParam}&vs_currencies=czk";

// Inicializace cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $apiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'User-Agent: EEO2025-ZachrankaApp/1.0'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Kontrola chyb
if ($response === false || $httpCode !== 200) {
    http_response_code($httpCode ?: 500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch crypto rates from CoinGecko API',
        'details' => $curlError ?: "HTTP {$httpCode}",
        'httpCode' => $httpCode
    ]);
    exit();
}

// Validace JSON response
$cryptoData = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON response from CoinGecko API',
        'details' => json_last_error_msg()
    ]);
    exit();
}

// 🎯 Transformace do konzistentního formátu
$cryptoMapping = [
    'bitcoin' => 'BTC',
    'ethereum' => 'ETH',
    'cardano' => 'ADA',
    'ripple' => 'XRP',
    'litecoin' => 'LTC',
    'polkadot' => 'DOT',
    'dogecoin' => 'DOGE',
    'solana' => 'SOL'
];

$normalizedRates = [];
foreach ($cryptoMapping as $coinId => $symbol) {
    if (isset($cryptoData[$coinId]['czk'])) {
        $normalizedRates[$symbol] = $cryptoData[$coinId]['czk'];
    }
}

// Response wrapper
$finalResponse = [
    'success' => true,
    'rates' => $normalizedRates,
    'timestamp' => date('c'),
    'cached' => false,
    'source' => 'CoinGecko API v3'
];

$jsonResponse = json_encode($finalResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// 💾 Uložit do cache
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
file_put_contents($cacheFile, $jsonResponse);

// Response headers
header('X-Cache: MISS');
header('Cache-Control: public, max-age=1800'); // 30 minut

// Odeslat response
echo $jsonResponse;
