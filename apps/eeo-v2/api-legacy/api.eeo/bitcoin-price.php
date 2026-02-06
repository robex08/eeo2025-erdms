<?php
/**
 * Bitcoin Price Proxy Endpoint
 * 
 * Řeší CORS problém při načítání Bitcoin cenových dat z Yahoo Finance API.
 * Frontend volá tento backend endpoint, který načte data z Yahoo Finance API
 * a vrátí je zpět frontendové aplikaci.
 * 
 * Endpoint: /api/bitcoinPrice
 * Method: GET
 * Response: JSON s historickými cenami Bitcoinu od 2021
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
$cacheFile = $cacheDir . '/bitcoin_price_cache.json';
$cacheLifetime = 15 * 60; // 15 minut cache (Bitcoin se mění rychle)

// Vytvořit cache adresář pokud neexistuje
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Kontrola cache
if (file_exists($cacheFile)) {
    $cacheTime = filemtime($cacheFile);
    if (time() - $cacheTime < $cacheLifetime) {
        // Cache je platná - vrátit cached data
        $cachedData = file_get_contents($cacheFile);
        
        // Přidat cache headers
        header('X-Cache: HIT');
        header('X-Cache-Age: ' . (time() - $cacheTime));
        
        echo $cachedData;
        exit();
    }
}

// 🚀 Načíst fresh data z Yahoo Finance API
try {
    // Parametry pro Yahoo Finance API
    $symbol = 'BTC-USD';
    $fromDate = strtotime('2021-01-01'); // Unix timestamp
    $toDate = time(); // Aktuální čas
    $interval = '1wk'; // Týdenní data
    
    $yahooUrl = "https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}?period1={$fromDate}&period2={$toDate}&interval={$interval}";
    
    // Nastavení HTTP kontextu s User-Agent
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: Mozilla/5.0 (compatible; ERDMS-API/1.0; PHP)',
                'Accept: application/json',
                'Accept-Encoding: gzip, deflate'
            ],
            'timeout' => 15 // 15 sekund timeout
        ]
    ]);
    
    // HTTP request na Yahoo Finance
    $response = file_get_contents($yahooUrl, false, $context);
    
    if ($response === false) {
        throw new Exception('Failed to fetch data from Yahoo Finance API');
    }
    
    // Parse JSON response
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON response from Yahoo Finance: ' . json_last_error_msg());
    }
    
    // Validace struktury dat
    if (!isset($data['chart']['result'][0]['timestamp'])) {
        throw new Exception('Invalid Yahoo Finance response format - missing timestamp data');
    }
    
    $result = $data['chart']['result'][0];
    $timestamps = $result['timestamp'];
    $prices = $result['indicators']['quote'][0]['close'];
    
    if (empty($timestamps) || empty($prices)) {
        throw new Exception('No price data found in Yahoo Finance response');
    }
    
    // Zpracování dat pro frontend
    $processedData = [];
    $validPoints = 0;
    
    for ($i = 0; $i < count($timestamps); $i++) {
        $price = isset($prices[$i]) ? $prices[$i] : null;
        
        // Skip null/invalid prices
        if ($price === null || $price <= 0) {
            continue;
        }
        
        $processedData[] = [
            'date' => date('c', $timestamps[$i]), // ISO 8601 format
            'price' => round($price, 2)
        ];
        $validPoints++;
    }
    
    if ($validPoints === 0) {
        throw new Exception('No valid price points found in data');
    }
    
    // Aktuální cena (poslední platná hodnota)
    $currentPrice = end($processedData)['price'];
    
    // Sestavit odpověď
    $response = [
        'success' => true,
        'data' => $processedData,
        'currentPrice' => $currentPrice,
        'source' => 'Yahoo Finance',
        'symbol' => $symbol,
        'interval' => $interval,
        'dataPoints' => $validPoints,
        'fromDate' => date('Y-m-d', $fromDate),
        'toDate' => date('Y-m-d', $toDate),
        'timestamp' => date('c'),
        'cacheTTL' => $cacheLifetime
    ];
    
    $jsonResponse = json_encode($response, JSON_PRETTY_PRINT);
    
    // Uložit do cache
    file_put_contents($cacheFile, $jsonResponse, LOCK_EX);
    
    // Vrátit response s cache miss header
    header('X-Cache: MISS');
    echo $jsonResponse;
    
} catch (Exception $e) {
    // Log error
    error_log("Bitcoin API Error: " . $e->getMessage());
    
    // Vrátit error response
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Failed to fetch Bitcoin price data',
        'timestamp' => date('c')
    ]);
}
?>