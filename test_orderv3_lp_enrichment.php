<?php
/**
 * Test script pro ověření LP enrichment v Order V3
 * Volá POST /api.eeo/order-v3/list a kontroluje, zda financování obsahuje lp_nazvy
 */

$url = "http://10.3.174.11/api.eeo/order-v3/list";
$data = array(
    'username' => 'milan.gajdusek',
    'token' => 'valid_token_here',
    'page' => 1,
    'per_page' => 10,
    'filters' => array()
);

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);
$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
$http_code = 200; // Default assumption

echo "HTTP Code: $http_code\n";
echo "Response:\n";

if ($response) {
    $json = json_decode($response, true);
    
    if (isset($json['status']) && $json['status'] === 'success') {
        echo "✅ API call successful\n";
        echo "Total orders: " . (isset($json['total']) ? $json['total'] : 'N/A') . "\n";
        
        if (isset($json['data']) && is_array($json['data']) && count($json['data']) > 0) {
            echo "\n🔍 Checking first few orders for LP enrichment:\n\n";
            
            $checked = 0;
            foreach ($json['data'] as $order) {
                if ($checked >= 5) break; // Check only first 5
                
                $cislo = isset($order['cislo_objednavky']) ? $order['cislo_objednavky'] : 'N/A';
                echo "Order #$cislo:\n";
                
                if (isset($order['financovani']) && is_array($order['financovani'])) {
                    $typ = isset($order['financovani']['typ']) ? $order['financovani']['typ'] : 'N/A';
                    echo "  - Typ financování: $typ\n";
                    
                    if ($typ === 'LP') {
                        // Check lp_kody
                        if (isset($order['financovani']['lp_kody'])) {
                            echo "  - lp_kody: " . json_encode($order['financovani']['lp_kody']) . "\n";
                        } else {
                            echo "  - ⚠️ lp_kody MISSING\n";
                        }
                        
                        // Check lp_nazvy (ENRICHED DATA)
                        if (isset($order['financovani']['lp_nazvy'])) {
                            echo "  - ✅ lp_nazvy EXISTS:\n";
                            foreach ($order['financovani']['lp_nazvy'] as $lp) {
                                $id = isset($lp['id']) ? $lp['id'] : 'N/A';
                                $kod = isset($lp['cislo_lp']) ? $lp['cislo_lp'] : (isset($lp['kod']) ? $lp['kod'] : 'N/A');
                                $nazev = isset($lp['nazev']) ? $lp['nazev'] : 'N/A';
                                echo "    - ID: $id, Kód: $kod, Název: $nazev\n";
                            }
                        } else {
                            echo "  - ❌ lp_nazvy MISSING (enrichment failed)\n";
                        }
                        
                        $checked++;
                    } else {
                        echo "  - (Not LP type, skipping)\n";
                    }
                } else {
                    echo "  - No financování data\n";
                }
                
                echo "\n";
            }
            
            if ($checked === 0) {
                echo "ℹ️ No LP type orders found in first 10 results\n";
            }
            
        } else {
            echo "⚠️ No orders in response\n";
        }
    } else {
        echo "❌ API call failed\n";
        echo "Full response: " . print_r($json, true) . "\n";
    }
} else {
    echo "❌ No response from API\n";
}
