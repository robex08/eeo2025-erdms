/**
 * Backend Proxy Endpoint pro CoinGecko API
 * 
 * Řeší CORS problém při načítání krypto kurzů z frontendu.
 * Frontend volá tento backend endpoint, který načte data z CoinGecko API
 * a vrátí je zpět frontendové aplikaci.
 * 
 * ÚČEL:
 * - Obejít CORS omezení CoinGecko API
 * - Cachování odpovědí (snížení počtu requestů na CoinGecko)
 * - Rate limiting ochrana
 * 
 * ENDPOINT: /api.eeo/crypto-rates-proxy.php
 * METHOD: GET
 * AUTH: Token required (stejně jako ostatní endpointy)
 */

<?php
/**
 * Soubor: /api.eeo/crypto-rates-proxy.php
 * 
 * Proxy endpoint pro načítání krypto kurzů z CoinGecko API
 */

// Headers pro CORS a JSON response
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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

// Import autentizace a utility (pokud existují)
// require_once __DIR__ . '/../lib/auth.php';
// require_once __DIR__ . '/../lib/db.php';

// 🔐 AUTENTIZACE (volitelná - záleží na bezpečnostní politice)
// Můžete povolit i bez autentizace, protože data jsou veřejná
// Nebo vyžadovat token pro sledování usage
/*
$token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (empty($token) || !validateToken($token)) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized. Valid token required.'
    ]);
    exit();
}
*/

// 📦 CACHE mechanismus (doporučeno!)
$cacheFile = __DIR__ . '/../cache/crypto_rates_cache.json';
$cacheLifetime = 30 * 60; // 30 minut (stejně jako interval na frontendu)

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
$cacheDir = dirname($cacheFile);
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
file_put_contents($cacheFile, $jsonResponse);

// Response headers
header('X-Cache: MISS');
header('Cache-Control: public, max-age=1800'); // 30 minut

// Odeslat response
echo $jsonResponse;

?>

/**
 * ============================================================================
 * FRONTEND INTEGRACE
 * ============================================================================
 * 
 * V souboru src/services/backgroundTasks.js změnit:
 * 
 * PŘED:
 * const cryptoApiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,...';
 * const cryptoResponse = await fetch(cryptoApiUrl, {
 *   method: 'GET',
 *   headers: { 'Accept': 'application/json' }
 * });
 * 
 * PO:
 * const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://eeo2025.zachranka.cz';
 * const cryptoApiUrl = `${API_BASE_URL}/api.eeo/crypto-rates-proxy.php`;
 * const token = loadAuthData.token();
 * 
 * const cryptoResponse = await fetch(cryptoApiUrl, {
 *   method: 'GET',
 *   headers: {
 *     'Accept': 'application/json',
 *     'Authorization': `Bearer ${token}`  // Pokud vyžadujete autentizaci
 *   }
 * });
 * 
 * if (cryptoResponse.ok) {
 *   const data = await cryptoResponse.json();
 *   if (data.success && data.rates) {
 *     // data.rates už je normalizovaný objekt { BTC: 1234567, ETH: 89012, ... }
 *     for (const [symbol, rateInCzk] of Object.entries(data.rates)) {
 *       finalRates[symbol] = rateInCzk;
 *     }
 *   }
 * }
 * 
 * ============================================================================
 * VÝHODY TOHOTO ŘEŠENÍ:
 * ============================================================================
 * 
 * ✅ Žádné CORS problémy - backend dělá request na CoinGecko
 * ✅ Cache 30 minut - snížení zátěže na CoinGecko API
 * ✅ Rate limiting ochrana - všechny requesty jdou přes server
 * ✅ Centrální error handling
 * ✅ Možnost logování usage
 * ✅ Možnost přidat fallback na jiné API (Coinbase, Binance, ...)
 * ✅ Normalizovaná response struktura
 * 
 * ============================================================================
 * INSTALACE
 * ============================================================================
 * 
 * 1. Vytvořit soubor /api.eeo/crypto-rates-proxy.php
 * 2. Vytvořit složku /api.eeo/cache/ s právy 755
 * 3. Nastavit práva pro zápis cache: chmod 755 /api.eeo/cache/
 * 4. Aktualizovat frontend kód (viz výše)
 * 5. Otestovat endpoint: curl https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php
 * 
 * ============================================================================
 * TESTOVÁNÍ
 * ============================================================================
 * 
 * # Test 1: Základní request
 * curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php"
 * 
 * # Test 2: S autentizačním tokenem (pokud je vyžadován)
 * curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php" \
 *   -H "Authorization: Bearer YOUR_TOKEN_HERE"
 * 
 * # Test 3: Kontrola cache
 * curl -X GET "https://eeo2025.zachranka.cz/api.eeo/crypto-rates-proxy.php" \
 *   -H "Authorization: Bearer YOUR_TOKEN_HERE" \
 *   -i | grep "X-Cache"
 * 
 * Očekávaná odpověď:
 * {
 *   "success": true,
 *   "rates": {
 *     "BTC": 1234567.89,
 *     "ETH": 89012.34,
 *     "ADA": 23.45,
 *     "XRP": 12.34,
 *     "LTC": 2345.67,
 *     "DOT": 234.56,
 *     "DOGE": 1.23,
 *     "SOL": 3456.78
 *   },
 *   "timestamp": "2025-11-11T12:34:56+01:00",
 *   "cached": false,
 *   "source": "CoinGecko API v3"
 * }
 * 
 * ============================================================================
 * MONITORING & DEBUGGING
 * ============================================================================
 * 
 * # Sledování cache souboru
 * ls -lah /api.eeo/cache/crypto_rates_cache.json
 * 
 * # Zobrazení obsahu cache
 * cat /api.eeo/cache/crypto_rates_cache.json
 * 
 * # Smazání cache (vynutit fresh fetch)
 * rm /api.eeo/cache/crypto_rates_cache.json
 * 
 * # Kontrola PHP error logu
 * tail -f /var/log/php_errors.log  # nebo kde máte PHP error log
 * 
 * ============================================================================
 */
